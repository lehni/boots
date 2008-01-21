Node.inject({
	posts_action: function() {
		this.renderPosts({
			buttonTitle: this.POST_BUTTON,
			container: 'posts'
		}, res);
	}
});
