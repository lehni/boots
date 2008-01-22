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
				// Generate a url friendly and unique name based on title:
				if (this == root) {
					this.name = 'root';
				} else {
					this.name = this.getEditParent().getUniqueChildName(this, value, 32);
				}
			}
		});
		return form;
	},

	getDisplayName: function() {
		return this.title;
	}
});