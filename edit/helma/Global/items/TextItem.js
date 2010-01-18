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
		this.renderButtons(baseForm, name, true, out);
	},

	convert: function(value) {
		return this.convertBreaks(value);
	},

	getButtons: function(baseForm, name) {
		var buttons = this.base(baseForm, name);
		if (this.buttons.crop) {
			buttons.push({
				name: name + '_crop',
				value: 'Crop Image',
				onClick: baseForm.renderHandle('choose_crop', name, this.getEditParam())
			});
		}
		return buttons;
	},

	getPictureResources: function(object) {
		return this.buttons.crop && this.buttons.crop.resources || this.base(object);
	},

	getCropOptions: function(object) {
		return this.buttons.crop && this.buttons.crop.options || this.base(object);
	}
});
