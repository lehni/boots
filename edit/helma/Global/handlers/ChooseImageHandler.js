ChooseImageHandler = EditHandler.extend({
	mode: 'choose_image',

	handle: function(base, object, node, form, item) {
		if (item) {
			var obj = item.root || object;
			var objId = obj.getFullId();
			res.contentType = 'text/html';
			// TODO: Use Template
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
		 }
	}
});

ChooseCropImageHandler = ChooseImageHandler.extend({
	mode: 'choose_crop'
});
