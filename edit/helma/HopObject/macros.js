HopObject.inject({
	edit_buttons_macro: function(param) {
		this.renderEditButtons(param, res);
	},

	edit_id_macro: function() {
		return this.getEditId();
	},

	random_macro: function() {
		res.write(Math.random());
	}
});