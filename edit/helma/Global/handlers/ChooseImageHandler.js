ChooseImageHandler = EditHandler.extend({
	mode: 'choose_image',

	handle: function(base, object, node, form, item) {
		var resources = item.resources || object.resources;
		// TODO: Use Template
		res.push();
		res.write('<ul>');
		var pictures = resources.list().filter(function(resource) {
			return resource.instanceOf(Picture);
		});
		for (var i = 0; i < pictures.length; i++) {
			var picture = pictures[i];
			if (picture) {
				var name = EditForm.getEditName(picture);
				res.write('<li class="' + this.mode.replace('_', '-') + '">');
				res.write('<a href="javascript:'
					+ form.renderHandle(this.mode + '_select', item.getEditParam({
						image_name: name,
						image_id: picture.getFullId()
					})) + '">'
					+ picture.renderImage({ maxWidth: 30, maxHeight: 50 })
					+ name + '</a></li>');
			}
		}
		res.write('</ul>');
		form.addResponse({
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
			var param = { context: 'edit' };
			Markup.render(tag, param);
			crop = param.crop;
		}
		if (crop) {
			var resources = item.resources || object.resources;
			var picture = resources.get(crop.resource);
			delete crop.resource;
			crop.each(function(value, key) {
				crop[key] = value.toInt();
			});
			form.addResponse(item.getEditParam({
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
