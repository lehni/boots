Topic.inject({
	render_macro: function(param) {
		this.render(param, res);
	},

	user_macro: function() {
		this.renderUser(res);
	}
});
