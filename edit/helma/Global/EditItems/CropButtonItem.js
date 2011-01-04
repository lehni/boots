CropButtonItem = EditItem.extend({
	_types: 'crop',
	itemClassName: 'edit-item edit-nolinks',

	render: function(baseForm, name, value, param, out) {
		if (this.hasPictureResources()) {
			var cropAction = baseForm.renderHandle('choose_crop', name,
					this.getEditParam());
			if (this.preview) {
				renderLink({
					content: this.renderPreview(value),
					onClick: cropAction,
					attributes: { className: 'edit-crop-preview' }
				}, res);
			}
			baseForm.renderButtons([
				{ // Crop Button
					name: name + '_crop',
					value: this.title || 'Crop Image',
					onClick: cropAction,
					className: this.className
				}, { // Reset Button
					name: name + '_reset',
					value: 'Clear',
					onClick: baseForm.renderHandle('clear_crop', name),
					className: this.className
				}
			], false, res);
			Html.input({
				type: 'hidden', name: name, value: Json.encode(value)
			}, res);
		}
	},

	convert: function(value) {
		return this.json ? Json.decode(value) : value;
	},

	renderPreview: function(crop, out) {
		var id = this.getEditName() + '_preview';
		var size = this.preview !== true
				? this.preview
				: { width: 100, height: 80 };
		if (crop) {
			var scale = Math.min(1, Math.min(
				size.width / crop.width,
				size.height / crop.height));
			crop = ImageObject.getScaledCrop(crop, scale);
			return Picture.renderCrop(crop, { 
				attributes: { id: id } 
			}, out);
		} else {
			return Html.image({
				width: size.width, height: size.height, id: id,
				src: '/static/edit/assets/spacer.gif'
			}, out);
		}
	},

	getPictureResources: function(object) {
		return this.resources || this.base(object);
	},

	getCropOptions: function(object) {
		return this.options || this.base(object);
	}
});
