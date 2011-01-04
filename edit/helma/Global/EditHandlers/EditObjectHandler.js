EditObjectHandler = EditHandler.extend({
	mode: 'edit',

	handle: function(base, object, node, form, item) {
		if (item) {
			var obj = null;
			if (req.data.edit_object_id) {
				obj = HopObject.get(req.data.edit_object_id);
			} else {
				obj = item.getValue();
			}
			if (!User.canEdit(obj))
				return EditForm.NOT_ALLOWED;
			if (obj) {
				EditNode.get(obj, item).render(base, 'edit');
			} else {
				EditForm.alert('Unable to edit object');
			}
		}
	}
});
