User.inject({
	statics: {
		log: function(str) {
			if (session.user != null)
				str = '[' + session.user.name + '] ' + str;
			app.log(str);
		},

		logError: function(title, e) {
			var shortDesc;
			if (e.fileName) shortDesc = 'Error in ' + e.fileName + ', Line ' + e.lineNumber + ': ' + e;
			else shortDesc = e;

			// Generate the stacktrace:
			var longDesc = shortDesc;
			if (e.javaException) {
				var sw = new java.io.StringWriter();
				e.javaException.printStackTrace(new java.io.PrintWriter(sw));
				longDesc += '\nStacktrace:\n' + sw.toString();
			}
			User.log(title + ':\n' + longDesc);
			var from = getProperty('errorFromAddress') || getProperty('serverAddress');
			var to = getProperty('errorToAddress');
			if (from && to) {
				try {
					// Send an error mail:
					// TODO: make these addresses configurable through app.properties
					var mail = new Mail();
					mail.setFrom(from);
					mail.setTo(to);
					mail.setSubject('[' + new Date().format('yyyy/MM/dd HH:mm:ss') + '] ' + title); 
					if (session.user != null)
						longDesc = '[' + session.user.name + '] ' + longDesc;
					mail.addText(longDesc);
					mail.send();
				} catch (e) {
				}
			}
			return shortDesc;
		}
	}
});