NumberItem = EditItem.extend({
	_types: 'number,integer',
	_scale: true,

	render: function(baseForm, name, value, param, out) {
		// TODO: What if value is 0? Shouldn't we use it then? Check for
		// undefined instead?
		var def = value || this.defaultValue || "''";
		Html.input({
			type: 'text', name: name, size: this.size || '5', value: value,
			onChange: baseForm.renderHandle('number_format', name, this.type,
				def, this.minValue, this.maxValue),
			className: this.className
		}, out);
		if (this.length)
			input.maxlength = this.length;
	},

	convert: function(value) {
		if (value != null && value != '') {
			value = this.type == 'integer' ? value.toInt() : value.toFloat();
			if (this.minValue != null && value < this.minValue)
				value = this.minValue;
			else if (this.maxValue != null && value > this.maxValue)
				value = this.maxValue;
		} else {
			value = null;
		}
		return value;
	}
});
