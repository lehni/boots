Node.inject({
	posts_action: function() {
		this.renderPosts({
			postButton: this.POST_BUTTON,
			container: 'posts'
		}, res);
	}
});
