TextItem = StringItem.extend({
	_types: 'text',
	_scale: true,

	render: function(baseForm, name, value, param, out) {
		var textarea = {
			name: name, value: value,
			cols: this.cols || '40',
			rows: this.rows || '5',
			wrap: this.wrap || 'virtual',
			className: this.className + (this.countWords
					? ' edit-text-count' : '')
		};
		if (this.countWords)
			textarea.onKeyUp = baseForm.renderHandle('text_count');
		Html.textarea(textarea, out);
		this.renderButtons(baseForm, name, true, out);
	},

	convert: function(value) {
		return this.convertBreaks(value);
	},

	getButtons: function(baseForm, name) {
		var buttons = this.base(baseForm, name);
		var hasImage = (this.buttons.image || this.buttons.crop)
				&& this.hasPictureResources();
		if (hasImage && this.buttons.image) {
			buttons.push({
				name: name + '_image',
				value: 'Image',
				onClick: baseForm.renderHandle('choose_image', name,
					this.getEditParam())
			});
		}
		if (hasImage && this.buttons.crop) {
			buttons.push({
				name: name + '_crop',
				value: 'Crop Image',
				onClick: baseForm.renderHandle('choose_crop', name,
					this.getEditParam())
			});
		}
		return buttons;
	},

	getPictureResources: function(object) {
		return this.buttons.crop && this.buttons.crop.resources
				|| this.base(object);
	},

	getCropOptions: function(object, picture) {
		return this.base(object, picture,
				this.buttons.crop && this.buttons.crop.options);
	}
});
