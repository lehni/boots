TextItem = StringItem.extend({
	_types: 'text',
	_scale: true,

	render: function(baseForm, name, value, param, out) {
		Html.textarea({
			name: name, value: value,
			cols: this.cols || '40',
			rows: this.rows || '5',
			wrap: this.wrap || 'virtual',
			className: this.className + (this.countWords ? ' edit-text-count' : ''),
			onKeyUp: this.countWords ? baseForm.renderHandle('text_count') : null
		}, out);
		// TODO: Find a better way to more generally add buttons underneath
		if (this.hasLinks)
			this.renderLinkButtons(baseForm, name, out);
	},

	convert: function(value) {
		return this.convertBreaks(value);
	}
});
