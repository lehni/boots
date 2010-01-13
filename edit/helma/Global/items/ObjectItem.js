ObjectItem = EditItem.extend({
	_types: 'object',

	render: function(baseForm, name, value, param, out) {
		var title = this.title ? ' ' + this.title : '';
		return baseForm.renderButton(value ? {
				value: 'Edit' + title,
				onClick: baseForm.renderHandle('execute', 'edit', this.getEditParam())
			} : this.getPrototypeChooserButton(baseForm, {
				value: 'Create' + title
			}), out);
	}
});
