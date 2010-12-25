GroupItem = EditItem.extend({
	_types: 'group',

	render: function(baseForm, name, value, param, out) {
		baseForm.renderButton({
			value: 'Edit',
			onClick: baseForm.renderHandle('execute', 'group',
					this.getEditParam())
		}, out);
	}
});
