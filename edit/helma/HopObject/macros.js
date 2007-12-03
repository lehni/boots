HopObject.inject({
	edit_buttons_macro: function(param) {
		this.renderEditButtons(param, res);
	},

	random_macro: function() {
		res.write(Math.random());
	}
});