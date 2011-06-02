PreviewHandler = EditHandler.extend({
	mode: 'preview',

	handle:	function(base, object, node, form) {
		// Apply changes first:
		// First either apply or create the object.
		var result = EditHandler.call(
				req.data.edit_create == 1 ? 'create' : 'apply',
				base, object, node, form);
		if (result == EditForm.COMMIT) {
			// Commit before the html is rendered.
			res.commit();
			res.push();
			// For objects that do a redirect in main_action, allow them
			// to implement a different view for preview, through
			// preview_action:
			res.data.preview = true;
			if (object.preview_action) {
				object.preview_action();
			} else {
				// TODO: Pass on the action that the edit came from
				var renderAction = EditForm.ACTION_RENDER + '_action';
				if (object[renderAction]) {
					object[renderAction]();
				} else if (base[renderAction]) {
					base[renderAction]();
				}
			}
			delete res.data.preview;
			form.addResponse({
				preview: res.pop()
			});
		}
		// We would not need to return COMMIT since that's already taken care of above,
		// but we need to make sure page gets rendered too!
		return result;
	}
});
