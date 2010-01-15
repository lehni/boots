GroupHandler = EditHandler.extend({
	mode: 'group',

	handle:	function(base, object, node, form) {
		if (req.data.edit_item) {
			var group = form.getItem(req.data.edit_item, req.data.edit_group);
			if (group && group.groupForm && User.canEdit(group.groupForm.object)) {
				node.render(base, 'edit', group);
			}
		}
	}
});
