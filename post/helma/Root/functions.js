Root.inject({
	checkNotifications: function() {
		var notifications = this.notifications.list();
		var notificationTitle = app.properties.notificationTitle
				|| app.properties.serverName + ': Discussion Notification';
		for (var i = 0; i < notifications.length; i++) {
			// notifications are grouped, so walk through the subgroup and find the topics
			var notifications = notifications[i].list();
			if (notifications.length > 0) {
				var email = notifications[0].email;
				var username = notifications[0].username;

				res.push();
				var numTopics = 0;
				for (var j = 0; j < notifications.length; j++) {
					var notification = notifications[j];
					if (notification.node) {
						this.renderTemplate('emailTopic', {
							notification: notification, 
						}, res);
						numTopics++;
					}
					notification.counter = 0;
				}
				var nodes = res.pop();
				if (numTopics > 0) {
					var text = this.renderTemplate('emailNotification', {
						username: username,
						nodes: nodes
					});
					try {
						var mail = new Mail();
						mail.setFrom(app.properties.serverEmail);
						mail.setTo(username + ' <' + email + '>');
						mail.setSubject();
						mail.addPart(text);
						mail.send();
					} catch (e) {
						logError('checkNotifications' , e);
					}
				}
			}
		}
	},

	/**
	 * Returns a list of users to notify for a certain post. This for example
	 * allows notifying standard users for every post, based on the app 
	 * property 'notificationUsers'.
	 */
	getNotificationUsers: function(post) {
		var users = app.properties.notificationUsers;
		return users && users.split(',');
	}
});
