CropPicture.inject({
	crop: new JsonProperty('cropJson'),

	getEditForm: function(param) {
		param.file = false;
		param.hasDimensions = false;
		param.caption = false;
		var form = this.base(param);
		form.add({
			label: 'Crop', name: 'crop', type: 'crop', title: 'Choose',
			json: true, value: this.crop, preview: true, resources: this.getEditParent().resources
		});
		return form;
	},

	render: function(param, out) {
		return  Picture.renderCrop(this.crop, param, out);
	}
});