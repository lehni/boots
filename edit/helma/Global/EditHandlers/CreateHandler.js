CreateHandler = EditHandler.extend({
	mode: 'create',

	handle: function(base, object, node, form) {
		// Apply all changes first, add it to the db only at the end
		if (!User.canEdit(object))
			return EditForm.NOT_ALLOWED;
		if (EditHandler.call('apply', base, object, node, form)) {
			// If onCreate returns an object, this object is added instead of our temporary one.
			if (object.onCreate) {
				var ret = object.onCreate();
				if (ret !== undefined && ret != object) {
					object = ret;
					// Call 'apply' again on the new object, as it differs from object.
					if (!EditHandler.call('apply', base, object, node, form))
						return;
				}
			}
			// Create it:
			// The new obj has to be added to the object it belongs to:
			// Find the parent's item through which it is created
			var parentItem = node.parentItem;
			if (!parentItem || !parentItem.store(object))
				EditForm.alert('Cannot store the object.');
			// If the parent's edit item defines an onStore handler, call it now:
			if (parentItem && parentItem.onStore)
				parentItem.onStore.call(parentItem.form.object, object, parentItem);
			return EditForm.COMMIT;
		}
	}
});
