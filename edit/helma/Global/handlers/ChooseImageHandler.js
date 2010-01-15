ChooseImageHandler = EditHandler.extend({
	mode: 'choose_image',

	handle: function(base, object, node, form) {
		if (User.canEdit(object)) {
			var obj = HopObject.get(req.data.edit_root_id) || object;

			var objId = obj.getFullId();
			var isRoot = obj == root;

			res.contentType = 'text/html';
			// TODO: Use Template
			res.write('<ul>');
			var children = obj.resources.list().filter(function(resource) {
				// TODO: resource instanceof Picture does not work due to 
				// an error in Helma's lazy loading of HopObjectCtor. Fix this
				// bug and then change to instanceof, as this would support
				// subclasses too.
				return resource._prototype ==  'Picture';
			});
			for (var i = 0; i < children.length; i++) {
				var child = children[i];
				if (child) {
					var name = EditForm.getEditName(child);
					var id = child.getFullId();
					res.write('<li class="' + this.mode.replace('_', '-') + '">');
					res.write('<a href="javascript:'
						+ form.renderHandle(this.mode + '_select', id, name) + '">'
						+ child.renderImage({ maxWidth: 30, maxHeight: 50 })
						+ '&nbsp;' + name + '</a></li>');
				}
			}
			res.write('</ul>');
		 }
	}
});

ChooseCropImageHandler = ChooseImageHandler.extend({
	mode: 'choose_crop'
});
