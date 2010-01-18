Page.inject({
	getEditForm: function(param) {
		if (param.title === undefined)
			param.title = true;
		var form = this.base(param);
		return form;
	},

	getDisplayName: function() {
		return this.title;
	}
});