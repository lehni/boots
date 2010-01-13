BooleanItem = EditItem.extend({
	_types: 'boolean',

	render: function(baseForm, name, value, param, out) {
		baseForm.renderTemplate('booleanItem', {
			name: name, current: value ? 1 : 0,
			className: this.className,
			text: this.text
		}, out);
	},

	convert: function(value) {
		return value == null ? 0 : value;
	}
});
