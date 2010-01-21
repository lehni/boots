Node.inject({
	/**
	 * The posts action is needed by loading of posts through pagination.
	 */
	posts_action: function() {
		this.renderPosts({}, res);
	}
});
