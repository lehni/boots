EditObjectHandler = EditHandler.extend({
	_types: 'edit',

	handle: function(base, object, node, form) {
		if (req.data.edit_item) {
			var obj = null;
			var item = form.getItem(req.data.edit_item, req.data.edit_group);
			if (item) {
				if (req.data.edit_object_id) {
					obj = HopObject.get(req.data.edit_object_id);
				} else {
					obj = item.getValue();
				}
			} else {
				EditForm.alert('Unable to find edit item: ' + req.data.edit_item);
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
