HopObject.inject({
	editButtons_macro: function(param) {
		this.renderEditButtons(param, res);
	},

	editId_macro: function() {
		return this.getEditId();
	},

	random_macro: function() {
		res.write(Math.random());
	}
});