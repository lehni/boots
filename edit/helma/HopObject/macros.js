HopObject.inject({
	editId_macro: function() {
		return this.getEditId();
	},

	editButtons_macro: function(param) {
		this.renderEditButtons(param, res);
	}
});