Page.inject({
	getEditForm: function(param) {
		if (param.title === undefined)
			param.title = true;
		var form = this.base(param);
		if (param.title) {
			var nodeTab = form.getTabForm('node');
			nodeTab.insertAt(0, form.createItem(param.title, {
				name: 'title', type: 'string', label: 'Title',
				requirements: {
					notNull: true, maxLength: 64
				},
				onApply: function(value) {
					this.title = value;
					// Generate a url friendly and unique name based on title:
					if (this == root) {
						this.name = 'root';
					} else {
						this.name = this.getEditParent().getUniqueChildName(this,
							value, (app.properties.maxNameLength || 64).toInt());
					}
				}
			}));
		}
		return form;
	},

	getDisplayName: function() {
		return this.title;
	}
});