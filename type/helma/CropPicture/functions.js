CropPicture.inject({
	crop: new JsonProperty('cropJson'),

	getEditForm: function(param) {
		param.file = false;
		param.hasDimensions = false;
		var form = this.base(param);
		form.insertAt(0, form.createItem(param.crop, {
			label: 'Crop', name: 'crop', type: 'crop', title: 'Choose',
			json: true, value: this.crop, preview: true,
			resources: this.getParentNode().resources,
			onApply: function(crop) {
				if (crop) {
					this.crop = crop;
					this.width = crop.width;
					this.height = crop.height;
				}
			}
		}));
		return form;
	},

	render: function(param, out) {
		return  Picture.renderCrop(this.crop, param, out);
	}
});