Post.inject({
	main_action: function() {
		// Just redirect
		this.redirect();
	},

	preview_action: function() {
		// This action is only required since main_action does a redirect.
		// See EditForm#handler
		this.getNode().main_action();
	}
});
