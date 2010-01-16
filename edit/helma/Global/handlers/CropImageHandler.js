ChooseCropImageHandler = EditHandler.extend({
	mode: 'crop',

	handle: function(base, object, node, form, item) {
		var picture = HopObject.get(req.data.image_id);
		if (item && picture) {
			res.contentType = 'text/html';
			var sizePresets = this.getSizePresets();
			if (sizePresets) {
				sizePresets.each(function(preset, i) {
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
			form.renderTemplate('cropper', {
				picture: picture,
				cropper: {
					min: { width: 32, height: 32 },
					sizePresets: sizePresets
				}
			}, res);
		 }
	},

	getSizePresets: function() {
		var sizes = [];
		if (global.Blueprint) {
			for (var i = 1, l = Blueprint.columnCount; i < l; i++) {
				sizes.push({
					name: 'span ' + i,
					selected: i == 4,
					width: Blueprint.getWidth(i),
					resize: {
						width: false,
						height: true
					}
				});
			}
		}
		sizes.push({
			width: 320,
			height: 240,
			resize: true
		});
		return sizes;
	}
});
