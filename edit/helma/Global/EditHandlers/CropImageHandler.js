CropImageHandler = EditHandler.extend({
	mode: 'crop',

	handle: function(base, object, node, form, item) {
		var picture = HopObject.get(req.data.image_id);
		if (item && picture) {
			var options = item.getCropOptions(object, picture);
			var presets = options.presets;
			if (presets) {
				presets.each(function(preset, i) {
					if (preset) {
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
					}
				});
			}
			var crop = req.data.image_crop && Json.decode(req.data.image_crop);
			if (crop) {
				if (options.min) {
					var resize = options.resize || true;
					if (crop.width < options.min.width || resize !== true && !resize.width)
						crop.width = options.min.width;
					if (crop.height < options.min.height || resize !== true && !resize.height)
						crop.height = options.min.height;
				}
				options.crop = crop;
			}
			res.contentType = 'text/html';
			form.renderTemplate('cropper', {
				picture: picture,
				options: options || { width: 50, height: 50 }
			}, res);
		 }
	}
});

PreviewCropImageHandler = EditHandler.extend({
	mode: 'crop_preview',

	handle: function(base, object, node, form, item) {
		if (item.preview) {
			var crop = req.data.image_crop && Json.decode(req.data.image_crop);
			if (crop) {
				form.sendResponse({
					html: item.renderPreview(crop)
				});
			}
		}
	}
});

