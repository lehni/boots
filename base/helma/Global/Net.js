Net = new function() {
	var urlFiles = {};

	return {
		getHost: function(host) {
			if (!host)
				host = req.data.http_remotehost;
			var hostName = java.net.InetAddress.getByName(host).getCanonicalHostName();
			return hostName ? hostName : host;
		},

		parseUrl: function(url) {
			var values = url.match(/^(?:(\w+):\/\/)?([^:\/]+)(?::([0-9]+))?(\/.*)?/) || {};
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
			return /^\w+:\/\/]/.test(url);
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
			return /^\w+(?!:\/\/)/.test(url);
		},

		/**
		 * Returns true when the url is a absolute or relative local url.
		 */
		isLocal: function(url) {
			return Net.isAbsolute(url) || Net.isRelative(url);
		},

		getLastModified: function(url) {
			// This retruns the modficitation date of files represented by 
			// absolute local urls. It can be used to force loading of script
			// files...			
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
			if (file)
				return file.lastModified;
		}
	};
};