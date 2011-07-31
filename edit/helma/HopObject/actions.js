HopObject.inject({
	// edit_action is only used in the non-dhtml editor.
	edit_action: function() {
		// sleep(1000);
		EditHandler.handle(this);
		/* TODO: What to do with this?
		if (!EditHandler.handle(this) && this.login_action)
			this.login_action();
		*/
	},

	login_action: function() {
		this.handleLogin();
		this.renderHtml({
			title: 'Login',
			content: this.renderTemplate("editLogin")
		}, res);
	},

	logout_action: function() {
		this.handleLogout();
	},

	editsettings_js_action: function() {
		res.contentType = 'text/javascript';
		this.renderTemplate('editSettings', {}, res);
	}
});
