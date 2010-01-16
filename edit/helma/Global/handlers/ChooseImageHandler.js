ChooseImageHandler = EditHandler.extend({
	mode: 'choose_image',

	handle: function(base, object, node, form, item) {
		if (item) {
			var obj = item.root || object;
			var objId = obj.getFullId();
			// TODO: Use Template
			res.push();
			res.write('<ul>');
			var pictures = obj.resources.list().filter(function(resource) {
				return resource.instanceOf(Picture);
			});
			for (var i = 0; i < pictures.length; i++) {
				var picture = pictures[i];
				if (picture) {
					var name = EditForm.getEditName(picture);
					res.write('<li class="' + this.mode.replace('_', '-') + '">');
					res.write('<a href="javascript:'
						+ form.renderHandle(this.mode + '_select', item.getEditParam({
							image_id: picture.getFullId(),
							image_name: name
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
			form.addResponse({
				crop: crop
			});
		} else {
			this.base.apply(this, arguments);
		}
	}
});
