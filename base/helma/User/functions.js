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

			// now generate the stacktrace:
			var longDesc = shortDesc;
			if (e.javaException) {
				var sw = new java.io.StringWriter();
				e.javaException.printStackTrace(new java.io.PrintWriter(sw));
				longDesc += '\nStacktrace:\n' + sw.toString();
			}
			User.log(title + ':\n' + longDesc);
			try {
				// Send an error mail:
				// TODO: make these addresses configurable through app.properties
				var mail = new Mail();
				mail.setFrom('error@lineto.com');
				mail.setTo('juerg@vectorama.org');
				mail.setSubject('[' + new Date().format('yyyy/MM/dd HH:mm:ss') + '] ' + title); 
				if (session.user != null)
					longDesc = '[' + session.user.name + '] ' + longDesc;
				mail.addText(longDesc);
				mail.send();
			} catch (e) {
			}
			return shortDesc;
		}
	}
});