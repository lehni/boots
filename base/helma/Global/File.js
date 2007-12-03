File.inject({
	// writeToFile mimics MimePart writeToFile and uses java.nio.channels for the copying
	writeToFile: function(dir, filename) {
		var file = filename ? new java.io.File(dir, filename) : new java.io.File(dir);
		// copy the file with FileChannels:
		file.createNewFile();
		var src = new java.io.FileInputStream(this.getPath()).getChannel();
		var dst = new java.io.FileOutputStream(file.getPath()).getChannel();
		dst.transferFrom(src, 0, src.size());
		src.close();
		dst.close();
		file.setLastModified(this.lastModified());
	},

	// found here: http://joust.kano.net/weblog/archives/000071.html
	removeDir: function() {
		// to see if this directory is actually a symbolic link to a directory,
		// we want to get its canonical path - that is, we follow the link to
		// the file it's actually linked to
		var canDir;
		try {
			canDir = new File(new java.io.File(this.path).canonicalPath);
		} catch (e) {
			return false;
		}
		// a symbolic link has a different canonical path than its actual path,
		// unless it's a link to itself
		if (canDir.path != this.absolutePath) {
			// this file is a symbolic link, and there's no reason for us to
			// follow it, because then we might be deleting something outside of
			// the directory we were told to delete
			return false;
		}
		// now we go through all of the files and subdirectories in the
		// directory and delete them one by one
		var files = canDir.list();
		if (files != null) {
			for (var i = 0; i < files.length; i++) {
				var file = new File(this.path, files[i]);

				// in case this directory is actually a symbolic link, or it's
				// empty, we want to try to delete the link before we try
				// anything
				var deleted = !file.remove();
				if (deleted) {
					// deleting the file failed, so maybe it's a non-empty
					// directory
					if (file.directory) file.removeDir();
					// otherwise, there's nothing else we can do
				}
			}
		}
		// now that we tried to clear the directory out, we can try to delete it
		return this.remove();  
	},

	getRelativePath: function(base) {
		var file = new java.io.File(this);
		var base = new java.io.File(base);
		var res = [];
		do {
			res.unshift(file.name);
			file = file.parentFile;
		} while (file && !file.equals(base));
		return res.join('/');
	},

	getLengthAsString: function() {
		var size = this.getLength();
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
		getExtension: function(name) {
			var pos = name.lastIndexOf('.');
			return pos != -1 ? name.substring(pos + 1, name.length) : null;
		},

		getContentType: function(extension) {
			// Read in mime.types resource and create a lookup table.
			if (!this.MIME_TYPES) {
				// read extension to mime type mappings from mime.types:
				var resource = getResource("mime.types");
				var reader = new java.io.BufferedReader(
					new java.io.InputStreamReader(resource.getInputStream())
				);
				// parse mime.types: 
				this.MIME_TYPES = {};
				var line;
				while ((line = reader.readLine()) != null) {
					line = line.trim();
					if (line && line[0] != '#') { // skip empty lines and comments
						// split the line at white spaces
						line = line.split(/\s+/gi);
						for (var i = 1; i < line.length; i++)
							this.MIME_TYPES[line[i]] = line[0];
					}
				}
			}
			return this.MIME_TYPES[extension] || "application/octetstream";
		}
	}
});
