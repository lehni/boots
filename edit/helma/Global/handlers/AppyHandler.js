ApplyHandler = EditHandler.extend({
	_types: 'apply',

	handle: function(base, object, node, form) {
		// Get the form description and save the values of all items:
		// Use the object from form, which might differ from the one in node!
		// e.g. in Topic / Post, where editing a Topic actually returns the
		// editForm for the first post.
		var object = form.object;
		if (!User.canEdit(object))
			return EditForm.NOT_ALLOWED;
		var parentItem = node.parentItem;
		if (parentItem && parentItem.type == 'group')
			form = parentItem.groupForm;
		// Erase cached edit stack titleas things might have changed during apply
		delete node.title;
		try {
			form.applyItems();
			// Let the client know that things have been applied here, so the
			// behavior of back can change. See edit.js
			form.addResponse({
				applied: true
			});
			return EditForm.COMMIT;
		} catch (e) {
			if (e instanceof EditException) {
				form.addResponse({
					error: {
						name: e.item.getEditName(),
						value: e.value, tab: e.item.form.tabIndex,
						message: format(e.message)
					}
				});
				req.data.edit_back = 0;
			} else {
				throw e;
			}
		}
	}
});
