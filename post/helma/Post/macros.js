Post.inject({
	render_macro: function(param) {
		this.render(param, res);
	},

	user_macro: function() {
		this.renderUser(res);
	},

	fields_macro: function(param) {
	},

	footer_macro: function(param) {
	},

	outer_macro: function(param) {
	}
});
