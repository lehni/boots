CropButtonItem = EditItem.extend({
	_types: 'crop',

	render: function(baseForm, name, value, param, out) {
		baseForm.renderButtons([
			{ // Crop Button
				name: name + '_crop',
				value: this.title || 'Crop Image',
				onClick: baseForm.renderHandle('choose_crop', name, this.getEditParam()),
				className: this.className
			}, { // Reset Button
				name: name + '_reset',
				value: 'Clear',
				onClick: baseForm.renderHandle('clear_crop', name),
				className: this.className
			}
		], false, out);
		Html.input({type: 'hidden', name: name, value: Json.encode(value) }, out);
	},

	convert: function(value) {
		return this.json ? Json.decode(value) : value;
	},

	getPictureResources: function(object) {
		return this.resources || this.base(object);
	}
})
