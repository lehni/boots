ChooseImageHandler = EditHandler.extend({
	mode: 'choose_image',

	handle: function(base, object, node, form, item) {
		// TODO: Use Template
		res.push();
		res.write('<ul>');
		var resources = item.getPictureResources(object).list();
		for (var i = 0; i < resources.length; i++) {
			var resource = resources[i];
			if (resource && resource.instanceOf(Picture)) {
				res.write('<li class="edit-choose-image">');
				res.write('<a href="javascript:'
					+ form.renderHandle(this.mode + '_select', item.getEditParam({
						image_name: resource.name,
						image_id: resource.getFullId()
					})) + '">'
					+ resource.renderImage({ maxWidth: 30, maxHeight: 50 })
					+ '<span>' + EditForm.getEditName(resource) + '</span></a></li>');
			}
		}
		res.write('</ul>');
		form.sendResponse({
			html: res.pop()
		});
	}
});

CropTagParser = ResourceTag.extend({
	_tags: 'crop',
	_context: 'edit',
	_attributes: 'resource',
	// attributes: resource imagewidth imageheight y top width height halign valign

	render: function(content, param) {
		param.crop = this.attributes;
	}
});

ChooseCropImageHandler = ChooseImageHandler.extend({
	mode: 'choose_crop',

	handle: function(base, object, node, form, item) {
		var tag = req.data.crop_tag, crop;
		if (tag) {
			// Use Markup.render to parse the crop tag into a object.
			var param = { context: 'edit' };
			Markup.render(tag, param);
			crop = param.crop;
		}
		if (crop) {
			var resources = item.getPictureResources(object);
			var picture = resources.get(crop.resource);
			delete crop.resource;
			crop.each(function(value, key) {
				crop[key] = value.toInt();
			});
			form.sendResponse(item.getEditParam({
				image_name: EditForm.getEditName(picture),
				image_id: picture.getFullId(),
				// Double encode this so it's passed through as a string
				image_crop: Json.encode(crop)
			}));
		} else {
			this.base.apply(this, arguments);
		}
	}
});
