RemoveHandler = EditHandler.extend({
	mode: 'remove',

	handle:	function(base, object, node, form) {
		// If ids and collection are set, delete the objects of the collection with these ids.
		// Otherwise remove the object itself:
		var removed = false;
		// Do not check for canEdit, as remove() does so.
		if (req.data.edit_object_ids) {
			var item = form.getItem(req.data.edit_item, req.data.edit_group);
			req.data.edit_object_ids.split(',').each(function(id) {
				var obj = HopObject.get(id);
				// No need to check canEdit since obj.remove does it for us
				if (obj && obj.remove())
					removed = true;
			});
		} else {
			// The object itself is to be removed.
			removed = object.remove();
		}
		if (removed) {
			return EditForm.COMMIT;
		} else {
			EditForm.alert('Nothing was removed!');
		}
	}
});

