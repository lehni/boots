ChooseCropImageHandler = EditHandler.extend({
	mode: 'crop',

	handle: function(base, object, node, form, item) {
		if (item && User.canEdit(object)) {
			res.contentType = 'text/html';
			var picture = HopObject.get(req.data.image_id);
			if (picture)
				form.renderTemplate('cropper', picture, res);
		 }
	}
});
