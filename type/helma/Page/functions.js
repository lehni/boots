Page.inject({
	getEditForm: function(param) {
		var form = this.base(param);
		var nodeForm = form.getTabForm('node');
		nodeForm.insertAt(0, {
			label: 'Title', name: 'title', type: 'string',
			requirements: {
				notNull: true, maxLength: 64,
			},
			onApply: function(value) {
				this.title = value;
				this.name = value.trim().urlize();
			}
		});
		return form;
	},

	getDisplayName: function() {
		return this.title;
	}
});