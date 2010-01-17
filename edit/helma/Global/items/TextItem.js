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
			// Set this.resources so ChooseImageHandler knows where to get them
			// from. We need to do this because CropButton also relies on this.resources,
			// but we want this information in the userland to be clearly grouped
			// with the crop button.
			this.resources = this.buttons.crop.resources;
			buttons.push({
				name: name + '_crop',
				value: 'Crop Image',
				onClick: baseForm.renderHandle('choose_crop', name, this.getEditParam())
			});
		}
		return buttons;
	}
});
