ColorItem = EditItem.extend({
	_types: 'color',

	render: function(baseForm, name, value, param, out) {
		baseForm.renderTemplate('colorItem', {
			name: name, value: value,
			width: this.width,
			className: this.className
		}, out);
	},

	convert: function(value) {
		return value;
	}
});
