ChooseCropImageHandler = EditHandler.extend({
	mode: 'crop',

	handle: function(base, object, node, form, item) {
		var picture = HopObject.get(req.data.image_id);
		if (item && picture) {
			res.contentType = 'text/html';
			var options = item.getCropOptions(object);
			var presets = settings.options;
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
				['imageWidth', 'imageHeight'].each(function(key) {
					var lower = key.toLowerCase();
					var value = crop[lower];
					if (value !== undefined) {
						crop[key] = value;
						delete crop[lower];
					}
				});
				if (options.min) {
					var resize = options.resize || true;
					if (crop.width < options.min.width || resize !== true && !resize.width)
						crop.width = options.min.width;
					if (crop.height < options.min.height || resize !== true && !resize.height)
						crop.height = options.min.height;
				}
				options.crop = crop;
			}
			form.renderTemplate('cropper', {
				picture: picture,
				options: options || {}
			}, res);
		 }
	}
});
