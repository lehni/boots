NewHandler = EditHandler.extend({
	_types: 'new',

	handle: function(base, object, node, form) {
		// req.data.value_item and req.data.value_group are set
		// if a prototype chooser is used bellow:
		var item = form.getItem(req.data.edit_item, req.data.edit_group);
		if (item) {
			// Make sure the passed prototype is in the list of prototypes allowed
			var prototype = null, prototypes = item.prototypes;
			if (req.data.edit_prototype) {
				prototype = req.data.edit_prototype;
				if (!prototypes.find(prototype))
					prototype = null;
			} else if (prototypes.length == 1) {
				prototype = prototypes[0];
			} else {
				User.log('More than one prototype available, no choice was made: '
						+ prototypes);
			}
			if (prototype && (User.canEdit(form.object, item.name))) {
				// get the prototype constructor and create an instance:
				var ctor = typeof prototype == 'string' ? global[prototype] : prototype;
				if (ctor) {
					// Pass the item through which the object is created to the
					// constructor, so it can determine the editing parent.
					// This all happens automatically, by the time initialize
					// is called, getEditParent works as expected.
					// See edit/Global/Function.js for further explanations.
					var object = new ctor(item);
					var node = EditNode.get(object);
					form = node.getForm();
					if (!form) {
						EditForm.alert('Unable to retrieve edit form from object:\n'
								+ EditForm.getEditName(object, true));
					} else if (form.hasItems()) {
						node.render(base, 'create');
					} else {
						return EditHandler.call('create', base, object, node, form);
					}
				} else {
					EditForm.alert('Unknown Prototype: ' + prototype);
				}
			} else return EditForm.NOT_ALLOWED;
		}
	}
});
