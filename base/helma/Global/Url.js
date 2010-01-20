Url = new function() {
	var urlFiles = {};

	return {
		parse: function(url) {
			var values = url.match(/^(?:(\w+):\/\/)?([^:\/]+)(?::([0-9]+))?(\/.*)?/) || [];
			return {
				protocol: values[1],
				host: values[2],
				port: values[3],
				path: values[4]
			};
		},

		/**
		 * Returns true if the url is remote, meaning it starts with a protocol.
		 */
		isRemote: function(url) {
			return /^\w+:\/\//.test(url);
		},

		/**
		 * Returns true if the url is a absolute local path, false otherwise.
		 * This is the case when it starts with a /.
		 */
		isAbsolute: function(url) {
			return /^\//.test(url);
		},

		/**
		 * Returns true when the url is relative, meaning it starts with a word which
		 * is not describing a protocol.
		 */
		isRelative: function(url) {
			return /^\w+(?!\w*\:\/\/)/.test(url);
		},

		/**
		 * Returns true when the url is a absolute or relative local url.
		 */
		isLocal: function(url) {
			return Url.isAbsolute(url) || Url.isRelative(url);
		},

		// TODO: This should not really be in Net, but where?
		getStaticFile: function(url) {
			// Caching of url files, to speed up lookup
			var file = urlFiles[url];
			if (url && (!file || !file.exists())) {
				var mountpoint = app.appsProperties.staticMountpoint || '/static/';
				if (url.startsWith(mountpoint)) {
					file = new File(app.appsProperties['static']
							+ '/' + url.substring(mountpoint.length));
					if (!file.exists())
						file = null;
					urlFiles[url] = file;
				}
			}
			return file;
		},

		// TODO: This should not really be in Net, but where?
		getLastModified: function(url) {
			// This retruns the modficitation date of files represented by 
			// absolute local urls. It can be used to force loading of script
			// files...
			var file = Url.getStaticFile(url);
			if (file)
				return file.lastModified;
		},

		// TODO: Add support for param.timeout somehow
		load: function(url, param) {
			try {
				var res = getURL(url, param.etag || param.date, param.timeout);
				return res ? new java.lang.String(res.content) : null;
			} catch (e) {
				User.logError('Url.load', e);
			}
		}
	};
};