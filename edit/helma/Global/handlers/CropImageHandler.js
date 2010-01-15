ChooseCropImageHandler = EditHandler.extend({
	mode: 'crop',

	handle: function(base, object, node, form) {
		if (User.canEdit(object)) {
			res.contentType = 'text/html';
			var picture = HopObject.get(req.data.edit_picture_id);
			if (picture)
				form.renderTemplate('cropper', picture, res);
		 }
	}
});
