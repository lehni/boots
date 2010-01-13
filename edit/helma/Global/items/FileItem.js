FileItem = EditItem.extend({
	_types: 'file',

	render: function(baseForm, name, value, param, out) {
		if (this.preview)
			out.write('<div>' + this.preview + '</div>');
		Html.input({
			type: 'file', name: name, size: this.size || '20',
			className: this.className
		}, out);
	},

	convert: function(value) {
		// TODO: Fix in Helma: even if no file was attached, we seem to get a
		// mime type object. The solution is to test name too:
		if (value && value.name) {
			return value;
		} else {
			// If there is no file, return EditForm.DONT_APPLY if we already
			// have one set, null otherwise, to make requirements work
			return this.getValue() ? EditForm.DONT_APPLY : null;
		}
	}
});
