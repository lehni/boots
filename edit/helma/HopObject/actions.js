HopObject.inject({
	// edit_action is only used in the non-dhtml editor.
	edit_action: function() {
		// sleep(1000);
		EditForm.handle(this);
		/* TODO: What to do with this?
		if (!EditForm.handle(this) && this.login_action)
			this.login_action();
		*/
	},

	login_action: function() {
		this.handleLogin();
		this.renderHtml({
			content: this.renderTemplate("editLogin")
		}, res);
	},

	logout_action: function() {
		this.handleLogout();
	}
});
