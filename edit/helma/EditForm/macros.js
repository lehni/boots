EditForm.inject({
	additionalParams_macro: function(param) {
	},

	handle_macro: function(param, handler) {
		return this.renderHandle(Array.slice(arguments, 1));
	}
});
