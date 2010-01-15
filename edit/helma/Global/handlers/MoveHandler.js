MoveHandler = EditHandler.extend({
	mode: 'move',

	handle:	function(object) {
		// TODO: Make sure this works
		if (req.data.edit_object_ids && req.data.edit_object_id && req.data.edit_item) {
			// first determine sourceItem:
			var sourceItem = EditForm.get(object).getItem(req.data.edit_item, req.data.edit_group);
			if (sourceItem) {
				if (!User.canEdit(object, sourceItem.name))
					return EditForm.NOT_ALLOWED;
				// The prototype of the destination can be specified.
				// if not, it's the same as source
				var destObj = HopObject.getById(req.data.edit_object_id,
							req.data.edit_prototype || sourceItem.form.object._prototype);
				if (destObj) {
					// destObj's editForm needs a item with the name req.data.edit_item which defines a field 'prototypes'
					var noChildren = true;
					var notAllowed = [];
					var destItem = EditForm.get(destObj).getItem(req.data.edit_item, req.data.edit_group);
					if (destItem) {
						if (!User.canEdit(destObj, destItem.name))
							return EditForm.NOT_ALLOWED;
						// Get destObj's allowed prototypes
						var allowedPrototypes = destItem.prototypes;
						var sourceColl = sourceItem.collection;
						var destColl = destItem.collection;
						// For the visible children, a string list is modified that is passed to form.applyItem in the end (they're moved there)
						// the hidden ones need to be moved before
						// the reason for this is that like this, all the updading (specimens, usw) is hanndeled correctly by the handlers through form.applyItem:
						var move = false;
						if (allowedPrototypes && sourceColl && destColl) {
							noChildren = false;
							// TODO: IdList is missing!
							var sourceIds = new IdList(sourceItem.value);
							var destIds = new IdList(destItem.value);
							allowedPrototypes = allowedPrototypes.split(',');
							var prototypeLookup = {};
							for (var i in allowedPrototypes)
								prototypeLookup[allowedPrototypes[i]] = true;
							var ids = req.data.edit_object_ids.split(',');
							for (var i in ids) {
								var obj = sourceColl.getById(ids[i]);
								// is the obj valid and has it an allowed prototype?
								if (obj) {
									if (prototypeLookup[obj._prototype] && obj != destObj) {
										if (destColl.indexOf(obj) == -1) {
											destColl.add(obj);
											if (obj.index != null) {
												// See description above on how exactly hidden and visible objects are handeled:
												obj.index = null;
												// just modify the string lists here:
												sourceIds.remove(obj._id);
												destIds.add(obj._id);
											}
											move = true;
										}
									} else {
										notAllowed.push(obj);
									}
								}
							}
						}
						if (move) {
							// Now apply the children of the current and the destObj, as they have changed:
							var objs = [{
								item: sourceItem,
								ids: sourceIds
							}, {
								item: destItem,
								ids: destIds
							}];
							for (var i in objs) {
								var item = objs[i].item;
								// IdList needs to be passed to applyItem as string
								var ids = objs[i].ids.toString();
								var form = item.form;
								form.beforeApply();
								form.applyItem(item, ids);
								// Update the colleciton so that visibilities don't get mixed up
								item.value.invalidate();
								var changed = new Hash();
								changed[item.name] = item;
								form.afterApply(true, changed);
							}
							// TODO: What's this called now?
							EditStack.remember(true);
							return EditForm.COMMIT;
						} else {
							EditForm.alert('Nothing was moved!');
						}
					}
					// generate error messages:
					if (notAllowed.length > 0) {
						var names = '';
						var prototypes = '';
						var addedPrototypes = {};
						for (var i in notAllowed) {
							var obj = notAllowed[i];
							if (names) names += ', ';
							names += EditForm.getEditName(obj);
							var proto = obj._prototype;
							// add each prototype only once to the list:
							if (!addedPrototypes[proto]) {
								addedPrototypes[proto] = true;
								if (prototypes) prototypes += ', ';
								prototypes += proto;
							}
						}
						EditForm.alert('"' + names + '" cannot be moved because "' +
							EditForm.getEditName(destObj) + '" cannot have children objects of type "' + prototypes + '".');
					} else if (noChildren) {
						EditForm.alert('The objects cannot be move because "' +
							EditForm.getEditName(destObj) + '" cannot have any children objects.');
					}
				}
			}
		}
	}
});
