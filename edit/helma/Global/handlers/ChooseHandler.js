ChooseHandler = EditHandler.extend({
	_types: 'choose',

	handle:	function(base, object, node, form) {
		if (User.canEdit(object)) {
			var obj = HopObject.get(req.data.edit_root_id) || root;
			var objId = obj.getFullId();
			var isRoot = obj == root;

			res.contentType = 'text/html';
			// TODO: Use Template
			res.write('<ul id="edit-choose-children-' + objId + '">');
			var children = obj.list();
			for (var i = 0; i < children.length; i++) {
				var child = children[i];
				if (child) {
					var name = EditForm.getEditName(child);
					var id = child.getFullId();
					res.write('<li>');
					if (child.count()) {
						res.write('<a href="javascript:' + form.renderHandle('choose_toggle', id) + '">' +
							'<img id="edit-choose-arrow-' +  id + '" src="/static/edit/media/arrow-close.gif" width="8" height="8"></a>' + 
							'<img src="/static/media/spacer.gif" width="6" height="1">');
					} else {
						res.write('<img src="/static/media/spacer.gif" width="14" height="1">');
					}
					res.write('<a href="javascript:' + form.renderHandle('choose_select', id, name) + '">' + name + '</a><ul id="edit-choose-children-' + id + '" class="hidden"></ul></li>');
				}
			}
			res.write('</ul>');
		}
	}
});
