ChooseHandler = EditHandler.extend({
	mode: 'choose',

	handle: function(base, object, node, form, item) {
		if (item) {
			var obj = HopObject.get(req.data.edit_child_id) || item.root || root;
			var objId = obj.getFullId();
			// TODO: Use Template
			res.push();
			res.write('<ul id="edit-choose-children-' + objId + '">');
			var children = obj.list();
			for (var i = 0; i < children.length; i++) {
				var child = children[i];
				if (child) {
					var name = EditForm.getEditName(child);
					var id = child.getFullId();
					res.write('<li>');
					var hasChildren = child.count();
					// Render arrow if there are children.
					if (hasChildren) {
						res.write('<a href="javascript:' + form.renderHandle('choose_toggle', id) + '">' +
							'<img id="edit-choose-arrow-' +  id + '" src="/static/edit/assets/arrow-close.gif" width="8" height="8"></a>' + 
							'<img src="/static/assets/spacer.gif" width="6" height="1">');
					} else {
						res.write('<img src="/static/assets/spacer.gif" width="14" height="1">');
					}
					res.write('<a href="javascript:'
						+ form.renderHandle('choose_select', id, name) + '">'
						+ name + '</a>'
						+ (hasChildren ? '<ul id="edit-choose-children-' + id + '" class="hidden"></ul>' : '')
						+ '</li>');
				}
			}
			res.write('</ul>');
			res.write(Json.encode({
				html: res.pop()
			}));
		}
	}
});
