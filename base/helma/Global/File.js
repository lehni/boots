File = Base.extend(new function() {
	var mimeTypes = null;

	function listFiles(file, iter, method) {
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
		_beans: true,

		/**
		 * Constructor for File objects, providing read and 
		 * write access to the file system.
		 * @class This class represents a local file or directory 
		 * @param {String|java.io.File} path as String, can be either absolute or relative
		 *		  to the helma home directory
		 * @constructor
		 */
		initialize: function(path, name) {
			if (name !== undefined) {
				this.file = new java.io.File(path, name);
			} else if (path instanceof java.io.File) {
				this.file = path;
			} else {
				this.file = new java.io.File(path);
			}
			if (!this.file.isAbsolute()) {
				// Immediately convert to absolute path - java.io.File is
				// incredibly stupid when dealing with relative file names
				this.file = this.file.getAbsoluteFile();
			}
			this.readerWriter = null;
			this.isEof = false;
			this.lastLine = null;
		},

		/** @ignore */
		toString: function() {
			return this.file.toString();
		},

		/**
		 * Returns the name of the file or directory represented by this File object.
		 * <br /><br />
		 * This is just the last name in the pathname's name sequence. 
		 * If the pathname's name sequence is empty, then the empty 
		 * string is returned.
		 * 
		 * @returns String containing the name of the file or directory
		 * @type String
		 */
		getName: function() {
			return this.file.getName() || '';
		},

		/**
		 * Returns true if the file represented by this File object
		 * is currently open.
		 * 
		 * @returns Boolean
		 * @type Boolean
		 */
		isOpened: function() {
			return !!this.readerWriter;
		},

		/**
		 * Opens the file represented by this File object. If the file exists,
		 * it is used for reading, otherwise it is opened for writing.
		 * If the encoding argument is specified, it is used to read or write
		 * the file. Otherwise, the platform's default encoding is used.
		 *
		 * @param {Object} options an optional argument holder object.
		 *  The following options are supported:
		 *  <ul><li>charset name of encoding to use for reading or writing</li>
		 *  <li>append whether to append to the file if it exists</li></ul>
		 * @returns Boolean true if the operation succeeded
		 * @type Boolean
		 */
		open: function(options) {
			if (this.isOpened()) {
				throw new java.lang.IllegalStateException("File already open");
			}
			// We assume that the BufferedReader and PrintWriter creation
			// cannot fail except if the FileReader/FileWriter fails.
			// Otherwise we have an open file until the reader/writer
			// get garbage collected.
			var charset = options && options.charset;
			var append = options && options.append;
			if (this.file.exists() && !append) {
				if (charset) {
					this.readerWriter = new java.io.BufferedReader(
						new java.io.InputStreamReader(new java.io.FileInputStream(this.file), charset));
				} else {
					this.readerWriter = new java.io.BufferedReader(new java.io.FileReader(this.file));
				}
			} else {
				if (append && charset)  {
					this.readerWriter = new java.io.PrintWriter(
						new java.io.OutputStreamWriter(new java.io.FileFileOutputStream(this.file, true), charset));
				} else if (append) {
					this.readerWriter = new java.io.PrintWriter(
						new java.io.OutputStreamWriter(new java.io.FileFileOutputStream(this.file, true)));
				} else if (charset) {
					this.readerWriter = new java.io.PrintWriter(this.file, charset);
				} else {
					this.readerWriter = new java.io.PrintWriter(this.file);
				}
			}
			return true;
		},

		createNewFile: function() {
			return this.file.createNewFile();
		},

		/**
		 * Create a new empty temporary file in the this directory, or in the directory
		 * containing this file.
		 * @param {String} prefix the prefix of the temporary file; must be at least three characters long
		 * @param {String} suffix the suffix of the temporary file; may be null
		 * @return {File} the temporary file 
		 */
		createTempFile: function(prefix, suffix) {
			var dir = this.isDirectory() ? this.file : this.file.getParentFile();
			return new File(java.io.File.createTempFile(prefix, suffix, dir));
		},

		/**
		 * Tests whether the file or directory represented by this File object exists.
		 * 
		 * @returns Boolean true if the file or directory exists; false otherwise
		 * @type Boolean
		 */
		exists: function() {
			return this.file.exists();
		},

		/**
		 * Returns the pathname string of this File object's parent directory.
		 * 
		 * @returns String containing the pathname of the parent directory
		 * @type String
		 */
		getParent: function() {
			if (!this.file.getParent())
				return null;
			return new File(this.file.getParent());
		},

		/**
		 * This methods reads characters until an end of line/file is encountered 
		 * then returns the string for these characters (without any end of line 
		 * character).
		 * 
		 * @returns String of the next unread line in the file
		 * @type String
		 */
		readln: function() {
			if (!this.isOpened()) {
				throw new java.lang.IllegalStateException("File not opened");
			}
			if (!(this.readerWriter instanceof java.io.BufferedReader)) {
				throw new java.lang.IllegalStateException("File not opened for reading");
			}
			if (this.isEof) {
				throw new java.io.EOFException();
			}
			var line;
			if (this.lastLine != null) {
				line = this.lastLine;
				this.lastLine = null;
				return line;
			}
			// Here lastLine is null, return a new line
			line = this.readerWriter.readLine();
			if (line == null) {
				this.isEof = true;
				throw new java.io.EOFException();
			}
			return line;
		},

		/**
		 * Appends a string to the file represented by this File object.
		 * 
		 * @param {String} what as String, to be written to the file
		 * @returns Boolean
		 * @type Boolean
		 * @see #writeln
		 */
		write: function(what) {
			if (!this.isOpened()) {
				throw new java.lang.IllegalStateException("File not opened");
			}
			if (!(this.readerWriter instanceof java.io.PrintWriter)) {
				throw new java.lang.IllegalStateException("File not opened for writing");
			}
			if (what != null) {
				this.readerWriter.print(what.toString());
			}
			return true;
		},

		/**
		 * Appends a string with a platform specific end of 
		 * line to the file represented by this File object.
		 * 
		 * @param {String} what as String, to be written to the file
		 * @returns Boolean
		 * @type Boolean
		 * @see #write
		 */
		writeln: function(what) {
			if (this.write(what)) {
				this.readerWriter.println();
				return true;
			}
			return false;
		},

		/**
		 * Tests whether this File object's pathname is absolute. 
		 * <br /><br />
		 * The definition of absolute pathname is system dependent. 
		 * On UNIX systems, a pathname is absolute if its prefix is "/". 
		 * On Microsoft Windows systems, a pathname is absolute if its prefix 
		 * is a drive specifier followed by "\\", or if its prefix is "\\".
		 * 
		 * @returns Boolean if this abstract pathname is absolute, false otherwise
		 * @type Boolean
		 */
		isAbsolute: function() {
			return this.file.isAbsolute();
		},

		/**
		 * Deletes the file or directory represented by this File object.
		 * 
		 * @returns Boolean
		 * @type Boolean
		 */
		remove: function() {
			if (this.isOpened())
				throw new java.lang.IllegalStateException("An openened file cannot be removed");
			return this.file['delete']();
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
			if (this.isOpened() || !this.file.isDirectory())
				return null;
			return listFiles(this.file, iter, 'list');
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
			if (this.isOpened() || !this.file.isDirectory())
				return null;
			var files = listFiles(this.file, iter, 'listFiles');
			return files && files.map(function(file) {
				return new File(file.path);
			});
		},

		/**
		 * Purges the content of the file represented by this File object.
		 * 
		 * @returns Boolean
		 * @type Boolean
		 */
		flush: function() {
			if (!this.isOpened())
				throw new java.lang.IllegalStateException("File not opened");
			if (this.readerWriter instanceof java.io.Writer) {
				this.readerWriter.flush();
			} else {
				throw new java.lang.IllegalStateException("File not opened for write");
			}
			return true;
		},

		/**
		 * Closes the file represented by this File object.
		 * 
		 * @returns Boolean
		 * @type Boolean
		 */
		close: function() {
			if (!this.isOpened()) {
				return false;
			}
			this.readerWriter.close();
			this.readerWriter = null;
			this.isEof = false;
			this.lastLine = null;
			return true;
		},

		/**
		 * Returns the pathname string of this File object. 
		 * <br /><br />
		 * The resulting string uses the default name-separator character 
		 * to separate the names in the name sequence.
		 * 
		 * @returns String of this file's pathname
		 * @type String
		 */
		getPath: function() {
			return this.file.getPath() || '';
		},

		/**
		 * Tests whether the application can read the file 
		 * represented by this File object.
		 * 
		 * @returns Boolean true if the file exists and can be read; false otherwise
		 * @type Boolean
		 */
		canRead: function() {
			return this.file.canRead();
		},

		/**
		 * Tests whether the file represented by this File object is writable.
		 * 
		 * @returns Boolean true if the file exists and can be modified; false otherwise.
		 * @type Boolean
		 */
		canWrite: function() {
			return this.file.canWrite();
		},

		/**
		 * Returns the absolute pathname string of this file.
		 * <br /><br />
		 * If this File object's pathname is already absolute, then the pathname 
		 * string is simply returned as if by the getPath() method. If this 
		 * abstract pathname is the empty abstract pathname then the pathname 
		 * string of the current user directory, which is named by the system 
		 * property user.dir, is returned. Otherwise this pathname is resolved 
		 * in a system-dependent way. On UNIX systems, a relative pathname is 
		 * made absolute by resolving it against the current user directory. 
		 * On Microsoft Windows systems, a relative pathname is made absolute 
		 * by resolving it against the current directory of the drive named by 
		 * the pathname, if any; if not, it is resolved against the current user 
		 * directory.
		 * 
		 * @returns String The absolute pathname string
		 * @type String
		 */
		getAbsolutePath: function() {
			return this.file.getAbsolutePath() || '';
		},

		/**
		 * Returns the size of the file represented by this File object. 
		 * <br /><br />
		 * The return value is unspecified if this pathname denotes a directory.
		 * 
		 * @returns Number The length, in bytes, of the file, or 0L if the file does not exist
		 * @type Number
		 */
		// Do not use getLength as a name, since this will produce the .length bean
		// and make BootStrap think it's iterable as an array.
		getSize: function() {
			return this.file.length();
		},

		getSizeAsString: function() {
			var size = this.getLength();
			if (size < 1024) return size + ' B';
			else if (size < 1048576) return Math.round(size / 10.24) / 100 + ' KB';
			else return Math.round(size / 10485.76) / 100 + ' MB';
		},

		/**
		 * Tests whether the file represented by this File object is a directory.
		 * 
		 * @returns Boolean true if this File object is a directory and exists; false otherwise
		 * @type Boolean
		 */
		isDirectory: function() {
			return this.file.isDirectory();
		},

		/**
		 * Tests whether the file represented by this File object is a normal file. 
		 * <br /><br />
		 * A file is normal if it is not a directory and, in addition, satisfies 
		 * other system-dependent criteria. Any non-directory file created by a 
		 * Java application is guaranteed to be a normal file.
		 * 
		 * @returns Boolean true if this File object is a normal file and exists; false otherwise
		 * @type Boolean
		 */
		isFile: function() {
			return this.file.isFile();
		},

		/**
		 * Tests whether the file represented by this File object is a hidden file.
		 * <br /><br />
		 * What constitutes a hidden file may depend on the platform we are running on.
		 *
		 * @returns Boolean true if this File object is hidden
		 * @type Boolean
		 */
		isHidden: function() {
			return this.file.isHidden();
		},

		/**
		 * Returns the time when the file represented by this File object was last modified.
		 * <br /><br />
		 * A number representing the time the file was last modified, 
		 * measured in milliseconds since the epoch (00:00:00 GMT, January 1, 1970), 
		 * or 0L if the file does not exist or if an I/O error occurs.
		 * 
		 * @returns Number in milliseconds since 00:00:00 GMT, January 1, 1970
		 * @type Number
		 */
		getLastModified: function() {
			return this.file.lastModified();
		},

		setLastModified: function(lastModified) {
			this.file.setLastModified(lastModified);
		},

		/**
		 * Creates the directory represented by this File object.
		 * 
		 * @returns Boolean true if the directory was created; false otherwise
		 * @type Boolean
		 */
		makeDirectory: function() {
			// Don't do anything if file exists or use multi directory version
			return !this.isOpened() && (this.file.isDirectory() || this.file.mkdirs());
		},

		/**
		 * Renames the file represented by this File object.
		 * <br /><br />
		 * Whether or not this method can move a file from one 
		 * filesystem to another is platform-dependent. The return 
		 * value should always be checked to make sure that the 
		 * rename operation was successful. 
		 * 
		 * @param {File} toFile File object containing the new path
		 * @returns true if the renaming succeeded; false otherwise
		 * @type Boolean
		 */
		renameTo: function(toFile) {
			if (!toFile)
				throw new java.lang.IllegalArgumentException("Uninitialized target File object");
			if (this.isOpened())
				throw new java.lang.IllegalStateException("An openened file cannot be renamed");
			if (toFile.isOpened())
				throw new java.lang.IllegalStateException("You cannot rename to an openened file");
			return this.file.renameTo(new java.io.File(toFile.getAbsolutePath()));
		},

		/**
		 * Returns true if the file represented by this File object
		 * has been read entirely and the end of file has been reached.
		 * 
		 * @returns Boolean
		 * @type Boolean
		 */
		isEof: function() {
			if (!this.isOpened())
				throw new java.lang.IllegalStateException("File not opened");
			if (!(this.readerWriter instanceof java.io.BufferedReader))
				throw new java.lang.IllegalStateException("File not opened for read");
			if (this.isEof) {
				return true;
			} else if (this.lastLine != null) {
				return false;
			}
			this.lastLine = this.readerWriter.readLine();
			if (this.lastLine == null)
				this.isEof = true;
			return this.isEof;
		},

		/**
		 * This methods reads all the lines contained in the 
		 * file and returns them.
		 * 
		 * @return String of all the lines in the file
		 * @type String
		 */
		readAll: function() {
			// Open the file for readAll
			if (this.isOpened())
				throw new java.lang.IllegalStateException("File already open");
			if (this.file.exists()) {
				this.readerWriter = new java.io.BufferedReader(new java.io.FileReader(this.file));
			} else {
				throw new java.lang.IllegalStateException("File does not exist");
			}
			if (!this.file.isFile())
				throw new java.lang.IllegalStateException("File is not a regular file");
			// Read content line by line to setup proper eol
			var buffer = new java.lang.StringBuffer(this.file.length() * 1.10);
			while (true) {
				var line = this.readerWriter.readLine();
				if (line == null)
					break;
				if (buffer.length() > 0)
					buffer.append("\n");  // EcmaScript EOL
				buffer.append(line);
			}
			// Close the file
			this.readerWriter.close();
			this.readerWriter = null;
			return buffer.toString();
		},

		/**
		 * This method removes a directory recursively .
		 * <br /><br />
		 * DANGER! DANGER! HIGH VOLTAGE!
		 * The directory is deleted recursively without 
		 * any warning or precautious measures.
		 */
		removeDirectory: function() {
			if (!this.file.isDirectory())
				return false;
			var files = this.file.list();
			for (var i = 0; i < files.length; i++) {
				var file = new File(this.file, files[i]);
				if (file.isDirectory())
					file.removeDirectory();
				else
					file.remove();
			}
			return this.remove();
		},

		/**
		 * Recursivly lists all files below a given directory
		 * you may pass a RegExp Pattern to return just
		 * files matching this pattern.
		 * 
		 * @param {RegExp} pattern as RegExp, to test each file name against
		 * @returns Array the list of absolute file paths
		 */
		listRecursive: function(pattern) {
			if (!this.file.isDirectory())
				return false;
			var result;
			if (!pattern || pattern.test(this.file.getName()))
				result = [this.file.getAbsolutePath()];
			else
				result = [];
			var arr = this.file.list();
			for (var i=0; i<arr.length; i++) {
				var f = new File(this.file, arr[i]);
				if (f.isDirectory())
					result = result.concat(f.listRecursive(pattern));
				else if (!pattern || pattern.test(arr[i]))
					result.push(f.getAbsolutePath());
			}
			return result;
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
				file.setLastModified(this.getLastModified());
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
			// do a copyTo and then remove the source file. This way
			// file locking shouldn't be an issue
			this.copyTo(dest);
			// remove the source file
			this.remove();
			return true;
		},

		/**
		 * Returns file as ByteArray.
		 * <br /><br />
		 * Useful for passing it to a function instead of an request object.
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
	            file = file.file;
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
