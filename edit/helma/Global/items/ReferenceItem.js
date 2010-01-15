ReferenceItem = EditItem.extend({
	_types: 'reference',
	_scale: true,

	render: function(baseForm, name, value, param, out) {
		if (value != null && !(value instanceof HopObject)) value = null;
		Html.input({
			type: 'text', name: name + '_reference',
			readonly: 'readonly',
			value: value != null ? EditForm.getEditName(value) : ''
		}, out);
		out.write(' ');
		var buttons = [{
			name: name + '_choose', value: 'Choose',
			onClick: baseForm.renderHandle('choose_reference', name, {
				root: this.root ? this.root.getFullId() : '',
				selected: value ? value.getFullId() : '',
				multiple: false
			})
		}];
		if (this.editable) {
			buttons.push({
				name: name + '_edit', value: 'Edit', 
				onClick: baseForm.renderHandle('execute', 'edit', this.getEditParam())
			});
		}
		baseForm.renderButtons(buttons, false, out);
		Html.input({
			type: 'hidden', name: name,
			value: value ? value.getFullId() : null
		}, out);
	},

	convert: function(value) {
		return HopObject.get(value);
	}
});
