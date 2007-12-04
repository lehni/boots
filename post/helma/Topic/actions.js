Topic.inject({
	main_action: function() {
		this.renderMain();
	},

	// action that does the same as main put automatically display the writePost input fields (see postButton.jstl)
	// TODO: transition!
	write_action: function() {
		this.renderMain();
	},

	posts_action: function() {
		this.renderPosts({
			buttonTitle: this.POST_BUTTON,
			loadDestination: "posts"
		}, res);
	},

	writePost_action: function() {
		var post = this.getCachedPost();
		post.title = "";
		var count = this.count();
		if ((this.AUTO_POST_TITLE && count > 0) || (!this.AUTO_POST_TITLE && count > 1)) {
			var lastTitle = this.get(count - 1).title;
			if (lastTitle != null)
				post.title = lastTitle.startsWith("Re: ") ? lastTitle : "Re: " + lastTitle;
		}
		post.renderEdit(null, true, res);
	},

	createPost_action: function() {
		var post = this.getCachedPost();
		// req.data.key is only set when a new post is submited
		if (req.data.key == post.getPostKey()) {
			var error = null;
			var waitTime = new Date().getTime() - session.data.postTime;
			if (User.getRoles() == User.NONE && waitTime < 60 * 1000) {
				// only allow posting one post per minute
			 	error = "To avoid abuse, only one post per minute is allowed.<br />You can post again in " + Math.round(60 - waitTime / 1000) + " seconds.";
			} else if (post != null) {
				// let's not use loggings for posts
				// the post caches the session id and remains editable for 5 minutes.
				// within this time, it can also be removed again.
				post.cache.sessionId = session._id;
				var topic = post.topic; // might be set to null in submit() if transient.
				error = post.submit();
				if (!error) {
					var redir = this.addPost(post, post.topic ? null : topic);
					session.data.key = null;
					// make sure the cachedPost is not reused, as it has now become a persistent post in the database
					session.data.post = null;
					// if a new topic was created by this post, redirect there now
					if (redir) {
						res.write("__redirect__ ");
						res.write(redir.href());
						return;
					}
				}
			}
			if (error) {
				post.renderEdit(error, true, res);
			} else {
				post.render(false, false, res);
			}
		} else {
			post.renderEdit("You need to enable temporary cookies in order to to post here.", true, res);
		}
	}
});
