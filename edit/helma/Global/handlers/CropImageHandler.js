ChooseCropImageHandler = EditHandler.extend({
	mode: 'crop',

	handle: function(base, object, node, form, item) {
		var picture = HopObject.get(req.data.image_id);
		if (item && picture) {
			res.contentType = 'text/html';
			var presets = this.getSizePresets();
			if (presets) {
				presets.each(function(preset, i) {
					if (!preset.name) {
						if (preset.width && preset.height)
							preset.name = preset.width + ' \xd7 ' + preset.height;
						else if (preset.width)
							preset.name = preset.width + ' wide';
						else if (preset.height)
							preset.name = preset.height + ' high';
					}
					if (!preset.value)
						preset.value = i;
				});
			}
			var crop = req.data.image_crop && Json.decode(req.data.image_crop);
			if (crop) {
				// Translate crop values:
				({ x: 'left', y: 'top', imageWidth: 'imagewidth', imageHeight: 'imageheight' }).each(function(old, key) {
					var value = crop[old];
					if (value !== undefined) {
						crop[key] = value;
						delete crop[old];
					}
				})
			}
			form.renderTemplate('cropper', {
				picture: picture,
				cropper: {
					min: { width: 32, height: 32 },
					presets: presets && presets.length && presets,
					crop: crop
				}
			}, res);
		 }
	},

	getSizePresets: function() {
		return [];
	}
});
