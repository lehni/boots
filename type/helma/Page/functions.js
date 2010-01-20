Page.inject({
	getEditForm: function(param) {
		if (param.title === undefined)
			param.title = true;
		return this.base(param);
	},

	getDisplayName: function() {
		return this.title;
	}
});