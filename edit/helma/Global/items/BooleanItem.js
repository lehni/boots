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
		if (value != null)
			return value.toInt() != 0;
		return false;
	}
});
