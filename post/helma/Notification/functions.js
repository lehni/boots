Notification.inject({
	initialize: function(user, email, username) {
		this.user = user;
		this.username = username;
		this.email = email;
		this.counter = 0;
		this.hash = encodeMD5(email + " " + new Date() + req.data.http_remotehost);
	}
});
