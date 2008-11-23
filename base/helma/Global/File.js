File.inject(new function() {
	var mimeTypes = null;

	function listFiles(file, iter, method) {
		file = toJava(file);
		if (iter) {
			var regexp = Base.type(iter) == 'regexp';
			return file[method](new java.io.FilenameFilter() {
				accept: function(dir, name) {
				 	return regexp && iter.test(name) || !regexp && iter(new File(dir), name);
				}
			});
		} else {
			return file[method]();
		}
	}

	return {
		_type: 'file',

		getParentFile: function() {
			var parent = toJava(this).getParentFile();
			return parent ? new File(parent) : null;
		},

		createNewFile: function() {
			return toJava(this).createNewFile();
		},

		/**
		 * Create a new empty temporary file in the this directory, or in the directory
		 * containing this file.
		 * @param {String} prefix the prefix of the temporary file; must be at least three characters long
		 * @param {String} suffix the suffix of the temporary file; may be null
		 * @return {File} the temporary file 
		 */
		createTempFile: function(prefix, suffix) {
			var dir = this.isDirectory() ? this : this.getParentFile();
			return new File(java.io.File.createTempFile(prefix, suffix, dir));
		},

		/**
		 * List of all files within the directory represented by this File object.
		 * <br /><br />
		 * You may pass a RegExp Pattern to return just files matching this pattern.
		 * <br /><br />
		 * Example: var xmlFiles = dir.list(/.*\.xml/);
		 * 
		 * @param {RegExp} pattern as RegExp, optional pattern to test each file name against
		 * @returns Array the list of file names
		 * @type Array
		 */
		list: function(iter) {
			if (this.isOpened() || !this.isDirectory())
				return null;
			return listFiles(this, iter, 'list');
		},

		/**
		 * List of all files within the directory represented by this File object.
		 * <br /><br />
		 * You may pass a RegExp Pattern to return just files matching this pattern.
		 * <br /><br />
		 * Example: var xmlFiles = dir.list(/.*\.xml/);
		 *
		 * @param {RegExp} pattern as RegExp, optional pattern to test each file name against
		 * @returns Array the list of File objects
		 * @type Array
		 */
		listFiles: function(iter) {
			if (this.isOpened() || !this.isDirectory())
				return null;
			var files = listFiles(this, iter, 'listFiles');
			return files && files.map(function(file) {
				return new File(file.path);
			});
		},

		/**
		 * Creates the directory represented by this File object.
		 * 
		 * @returns Boolean true if the directory was created; false otherwise
		 * @type Boolean
		 */
		makeDirectory: function() {
			// Don't do anything if file exists or use multi directory version
			return !this.isOpened() && (this.isDirectory() || toJava(this).mkdirs());
		},

		/**
		 * This method removes a directory recursively .
		 * <br /><br />
		 * DANGER! DANGER! HIGH VOLTAGE!
		 * The directory is deleted recursively without 
		 * any warning or precautious measures.
		 */
		removeDirectory: function() {
			if (!this.isDirectory())
				return false;
			var files = this.list();
			for (var i = 0; i < files.length; i++) {
				var file = new File(this, files[i]);
				if (file.isDirectory())
					file.removeDirectory();
				else
					file.remove();
			}
			return this.remove();
		},

		/**
		 * Makes a copy of a file or directory, possibly over filesystem borders.
		 * 
		 * @param {String|helma.File} dest as a File object or the String of
		 *		  full path of the new file
		 */
		copyTo: function(file, filename) {
			file = filename ? new File(file, filename) : typeof file == 'string' ? new File(file) : file;
			if (this.isDirectory()) {
				if (!file.exists() && !file.makeDirectory())
					throw new Error("Could not create directory " + file);
				var ok = true;
				for each (var f in this.listFiles())
					ok = ok && f.copyTo(new File(file, f.getName()));
				return ok;
			} else {
				// Copy the file with FileChannels:
				file.createNewFile();
				var src = new java.io.FileInputStream(this.getPath()).getChannel();
				var dst = new java.io.FileOutputStream(file.getPath()).getChannel();
				var amount = dst.transferFrom(src, 0, src.size());
				src.close();
				dst.close();
				file.setLastModified(this.lastModified());
				return amount > 0 || src.size() == 0;
			}
		},

		// writeToFile mimics MimePart writeToFile and uses java.nio.channels for the copying
		writeToFile: function(file, filename) {
			return this.copyTo(file, filename);
		},

		/**
		 * Moves a file to a new destination directory.
		 * 
		 * @param {String} dest as String, the full path of the new file
		 * @returns Boolean true in case file could be moved, false otherwise
		 */
		move: function(dest) {
			// instead of using the standard File method renameTo()
			// do a hardCopy and then remove the source file. This way
			// file locking shouldn't be an issue
			this.copyTo(dest);
			// remove the source file
			this.remove();
			return true;
		},

		/**
		 * Returns file as ByteArray.
		 * <br /><br />
		 * Useful for passing it to a function instead of a request object.
		 */
		toByteArray: function() {
			if (!this.exists())
				return null;
			var body = new java.io.ByteArrayOutputStream();
			var stream = new java.io.BufferedInputStream(
				new java.io.FileInputStream(this.getAbsolutePath())
			);
			var buf = java.lang.reflect.Array.newInstance(
				java.lang.Byte.TYPE, 1024
			);
			var read;
			while ((read = stream.read(buf)) > -1)
				body.write(buf, 0, read);
			stream.close();
			return body.toByteArray();
		},

		/**
		 * Define iterator to loop through the lines of the file for ordinary files,
		 * or the names of contained files for directories.
		 *
		 *	for each (var line in file) ...
		 *
		 *	for each (var filename in dir) ...
		 */
		/* TODO:
		__iterator__: function() {
			if (this.isDirectory()) {
				var files = this.list();
				for (var i = 0; i < files.length; i++) {
					 yield files[i];
				}
			} else if (this.exists()) {
				if (this.open()) {
					try {
						while(true) {
							yield this.readln();
						}
					} catch (e if e instanceof java.io.EOFException) {
						throw StopIteration;
					} finally {
						this.close();
					}
				}
			}
			throw StopIteration;
		},
		*/

		equals: function(object) {
			var file = null;
			if (object instanceof File) {
	            file = toJava(object);
	        } else if (object instanceof java.io.File) {
	            file = object;
	        } else if (object instanceof String) {
	            file = new java.io.File(object);
	        } 
	        return file && file.equals(this);
		},

		getRelativePath: function(base) {
			var file = this;
			base = new File(base);
			var res = [];
			do {
				res.unshift(file.getName());
				file = file.getParentFile();
				User.log(file, base, file.equals(base));
			} while (file && !file.equals(base));
			return res.join(File.separator);
		},

		getSize: function() {
			return this.getLength();
		},

		getSizeAsString: function() {
			var size = this.getSize();
			if (size < 1024) return size + ' B';
			else if (size < 1048576) return Math.round(size / 10.24) / 100 + ' KB';
			else return Math.round(size / 10485.76) / 100 + ' MB';
		},

		getExtension: function() {
			return File.getExtension(this.getName());
		},

		getContentType: function() {
			return File.getContentType(this.getExtension());
		},

		statics: {
			separator: java.io.File.separator,

			/**
			 * Create a new empty temporary file in the default temporary-file directory.
			 * @param {String} prefix the prefix of the temporary file; must be at least three characters long
			 * @param {String} suffix the suffix of the temporary file; may be null
			 * @return {File} the temporary file
			 */
			createTempFile: function(prefix, suffix) {
				return new File(java.io.File.createTempFile(prefix, suffix));
			},

			getExtension: function(name) {
				var pos = name.lastIndexOf('.');
				return pos != -1 ? name.substring(pos + 1, name.length) : null;
			},

			getMimeTypes: function() {
				// Read in mime.types resource and create a lookup table.
				if (!mimeTypes) {
					// read extension to mime type mappings from mime.types:
					var resource = getResource('mime.types');
					var reader = new java.io.BufferedReader(
						new java.io.InputStreamReader(resource.getInputStream())
					);
					// parse mime.types: 
					mimeTypes = {};
					var line;
					while ((line = reader.readLine()) != null) {
						line = line.trim();
						if (line && line[0] != '#') { // skip empty lines and comments
							// split the line at white spaces
							line = line.split(/\s+/gi);
							for (var i = 1; i < line.length; i++)
								mimeTypes[line[i]] = line[0];
						}
					}
				}
				return mimeTypes;
			},

			getContentType: function(extension) {
				return File.getMimeTypes()[extension] || 'application/octetstream';
			}
		}
	}
});
