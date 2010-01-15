ClickHandler = EditHandler.extend({
	mode: 'click',

	handle:	function(base, object, node, form) {
		if (req.data.edit_item) {
			var item = form.getItem(req.data.edit_item, req.data.edit_group);
			if (item && item.onClick && User.canEdit(object, item.name)) {
				if (item.onClick.call(object, item))
					return EditForm.COMMIT
			}
		}
	}
});
