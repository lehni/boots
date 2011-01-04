MoveHandler = EditHandler.extend({
	mode: 'move',

	handle:	function(base, object, node, form, sourceItem) {
		// TODO: Finish porting and testing!
		if (sourceItem && req.data.edit_object_ids && req.data.edit_object_id) {
			if (!User.canEdit(object, sourceItem.name))
				return EditForm.NOT_ALLOWED;
			// The prototype of the destination can be specified.
			// if not, it's the same as source
			var destObj = HopObject.get(req.data.edit_object_id);
			if (destObj) {
				// destObj's editForm needs a item with the name req.data.edit_item which defines a field 'prototypes'
				var noChildren = true;
				var notAllowed = [];
				var destItem = EditForm.get(destObj).getItem(
						req.data.edit_item, req.data.edit_group);
				if (destItem) {
					if (!User.canEdit(destObj, destItem.name))
						return EditForm.NOT_ALLOWED;
					var sourceColl = sourceItem.collection;
					var destColl = destItem.collection;
					// For the visible children, a string list is modified that is passed to form.applyItem in the end (they're moved there)
					// the hidden ones need to be moved before
					// the reason for this is that like this, all the updading (specimens, usw) is hanndeled correctly by the handlers through form.applyItem:
					var move = false;
					if (destItem.prototypes && sourceColl && destColl) {
						noChildren = false;
						var sourceIds = sourceItem.getIdHash();
						var destIds = destItem.getIdHash();
						var prototypeLookup = destItem.prototypes.each(function(name) {
							this[name] = true;
						}, {});
						var ids = req.data.edit_object_ids.split(',');
						for (var i in ids) {
							var obj = HopObject.get(ids[i]);
							// is the obj valid and has it an allowed prototype?
							if (obj) {
								if (obj != destObj
										&& sourceColl.indexOf(obj) != -1
										&& prototypeLookup[obj._prototype]) {
									var visible = sourceItem.isVisible(obj);
									if (destColl.indexOf(obj) == -1) {
										destColl.add(obj);
										if (visible) {
											// See description above on how exactly
											// hidden and visible objects are handeled:
											// just modify the id lists here:
											var id = obj.getFullId();
											delete sourceIds[id];
											destIds[id] = true;
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
							ids: sourceIds.getKeys()
						}, {
							item: destItem,
							ids: destIds.getKeys()
						}];
						for (var i in objs) {
							var item = objs[i].item;
							// Id lists needs to be passed to applyItem as string
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
						// EditStack.remember(true);
						return EditForm.COMMIT;
					} else {
						EditForm.alert('Nothing was moved!');
					}
				}
				// Generate error messages:
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
});
