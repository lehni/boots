Root.inject({
	checkNotifications: function() {
		var notifications = this.notifications.list();
		var serverUrl = getProperty("serverUrl");
		for (var i = 0; i < notifications.length; i++) {
			// notifications are grouped, so walk through the subgroup and find the topics
			var notifications = notifications[i].list();
			if (notifications.length > 0) {
				var email = notifications[0].email;
				var username = notifications[0].username;
				app.log(username + " " + email);

				res.push();
				var numTopics = 0;
				for (var j = 0; j < notifications.length; j++) {
					var notification = notifications[j];
					if (notification.topic) {
						this.renderTemplate("emailTopic", {
							notification: notification, 
							serverUrl: serverUrl
						}, res);
						numTopics++;
					}
					notification.counter = 0;
				}
				var topics = res.pop();
				if (numTopics > 0) {
					var text = this.renderTemplate("emailNotification", {
						username: username,
						serverUrl: serverUrl,
						topics: topics
					});
					try {
						var mail = new Mail();
						mail.setFrom(getProperty("serverEmail"));
						mail.setTo(username + ' <' + email + '>');
						mail.setSubject("// Scriptographer.com: Discussion Notification //");
						mail.addPart(text);
						mail.send();
					} catch(e) {
						logError("checkNotifications" , e);
					}
				}
			}
		}
	}
});
