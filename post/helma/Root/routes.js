// No need to define UrlRouting getChildElement for Root since baseLib does it for us.

UrlRouting.draw(this, {
	"unsubscribe/$hash": {
		handler: "unsubscribe",
		requirements: {
			hash: /[a-z0-9]{32}/
		}
	}
});

Root.inject({
	unsubscribe: function(hash) {
		var notification = this.notificationsByHash.get(hash);
		if (notification != null) {
			var topic = notification.topic;
			notification.remove();
			res.message = "Your email was removed from the list.<br />You will not recieve notifiactions any longer.<br /><br />";
			res.redirect(topic.href());
		} else {
			// TODO: renderHtml is not a globally available function, it's scriptographer specific!
			this.renderHtml({ content: "You are already unsubscribed from this discussion." });
		}
	}
});

