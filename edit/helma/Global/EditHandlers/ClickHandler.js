ClickHandler = EditHandler.extend({
	mode: 'click',

	handle:	function(base, object, node, form, item) {
		if (item && item.onClick && User.canEdit(object, item.name)) {
			if (item.onClick.call(object, item))
				return EditForm.COMMIT
		}
	}
});
