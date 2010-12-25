User.inject({
	statics: {
		log: function() {
			var str = Array.create(arguments).join(' ');
			if (session && session.user)
				str = '[' + session.user.name + '] ' + str;
			app.log(str);
		},

		logError: function(title, e) {
			var shortDesc = (e.fileName
				? 'Error in ' + e.fileName + ', Line ' + e.lineNumber
				: 'Error')
					+ ' (' + title + '): ' + e;
			// In some situations, the global req object might not be available,
			// so make sure we check to not produce another error.
			if (global.req && req.path)
				shortDesc += '\n(' + req.path + ')';
			// Generate the stacktrace:
			var longDesc = shortDesc;
			if (e.javaException) {
				var sw = new java.io.StringWriter();
				e.javaException.printStackTrace(new java.io.PrintWriter(sw));
				longDesc += '\nStacktrace:\n' + sw.toString();
			}
			User.log(longDesc);
			var from = app.properties.errorFromAddress
					|| app.properties.serverAddress;
			var to = app.properties.errorToAddress;
			if (from && to) {
				try {
					// Send an error mail:
					var mail = new Mail();
					mail.setFrom(from);
					mail.setTo(to);
					mail.setSubject('[' + new Date().format(
							'yyyy/MM/dd HH:mm:ss') + '] ' + title); 
					if (session.user != null)
						longDesc = '[' + session.user.name + '] ' + longDesc;
					mail.addText(longDesc);
					mail.send();
				} catch (e) {
				}
			}
			return shortDesc;
		},

		getHost: function() {
			var host = req.data.http_remotehost;
			var address = java.net.InetAddress.getByName(host);
			var name = address && address.getCanonicalHostName();
			return name || host;
		}
	}
});