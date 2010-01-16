GroupHandler = EditHandler.extend({
	mode: 'group',

	handle:	function(base, object, node, form, item) {
		if (item && item.groupForm && User.canEdit(item.groupForm.object)) {
			node.render(base, 'edit', item);
		}
	}
});
