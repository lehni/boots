/**
 * A global container for different edit handlers.
 * EditForm.register() allows the registration of new hanlers for your application.
 */

EditForm.inject(new function() {
	var handlers = new Hash();

	return {
		statics: {
			// Constants
			COMMIT: {},
			NOT_ALLOWED: {},

			/**
			 * Allows registration of additional handlers or overriding of existing ones
			 */
			register: function(items) {
				handlers.merge(items);
			},

			/*
			 * handle returns the object to handle the further editing when the content was modified
			 * if "this" was removed in handleEditMode, it returns its parent to take of the next steps
			 */
			handle: function(base) {
				var editObj = null;
				// default for response content-type is javascript, set only if 
				// other type is needed
				res.contentType = 'text/javascript';
				EditNode.onRequest();
				res.data.editResponse = new Hash();
				var parent = base.getParent();
				var mode = req.data.edit_mode || 'edit';
				var fullId = req.data.edit_id || base.getFullId();
				var handler = handlers[mode];
				var out = null;
				// Only allow editing modes if the edi stack is valid.
				// Otherwise it just renders the edit form again and ignores
				// the editing step.
				var handled = true;
				if (req.data.helma_upload_error) {
					EditForm.alert(req.data.helma_upload_error);
				} else if (handler) {
					res.push();
					try {
						// Make sure a new form is produced each time when editing
						var node = EditNode.get(fullId, null, mode == 'edit');
						// check again that we have the rights to edit:
						if (node) {
							// call the handler and commit changes if there are any
							// use handlers as the object, so the handler can other handlers by using "this".
							var result = handler.call(handlers, base, node);
							if (result == EditForm.COMMIT) {
								res.commit();
								if (base.main_action) {
									// Render the page into res.data.editResponse.page:
									res.push();
									base.main_action();
									res.data.editResponse.page = res.pop();
								}
							} else if (result == EditForm.NOT_ALLOWED) {
								EditForm.setMessage("editNotAllowed");
								handled = false;
							}
						}
					} catch (e) {
						EditForm.reportError(e);
					}
					var out = res.pop();
					if (!out && !res.data.editResponse.id) {
						// Go back the given amount, if any
						if (req.data.edit_back) {
							var back = parseInt(req.data.edit_back);
							while (node && node.visible && back--)
								node = node.parent;
							if (node && !node.visible)
								node = null;
						}
						if (node) {
							try {
								node.render(base, 'edit');
							} catch (e) {
								EditForm.reportError(e);
							}
						}
					}
				}
				if (!out) {
					if (res.message)
						res.data.editResponse.alert = res.message;
					out = Json.encode(res.data.editResponse);
				}
				res.write(out);
				return handled;
			}
		}
	};
});

////////////////////////////////////////////////////////////////////////
// handlers

EditForm.register({
	'new': function(base, node) {
		node.log('new');
		// req.data.value_item and req.data.value_group are set
		// if a prototype chooser is used bellow:
		var item = node.form.getItem(req.data.edit_item, req.data.edit_group);
		if (item) {
			// Make sure the passed prototype is in the list of prototypes allowed
			var prototype = null, prototypes = item.prototypes;
			if (req.data.edit_prototype) {
				prototype = req.data.edit_prototype;
				if (!prototypes.find(prototype))
					prototype = null;
			} else if (prototypes.length == 1) {
				prototype = prototypes[0];
			}
			// Creation can be allowed to anonymous users, by setting item.allow to true:
			if (prototype && (User.canEdit(node.form.object) || item.allow == 'all')) {
				// get the prototype constructor and create an instance:
				var ctor = typeof prototype == 'string' ? global[prototype] : prototype;
				if (ctor) {
					var object = new ctor();
					object.setCreating(true);
					// Make sure the object is editable even in anonymous mode.
					User.makeEditable(object);
					node = EditNode.get(object, item);
					if (node.form.hasItems()) {
						node.render(base, 'create');
					} else {
						return this.create(base, node);
					}
				} else {
					EditForm.alert("Unknown Prototype: " + prototype);
				}
			} else return EditForm.NOT_ALLOWED;
		}
	},

	create: function(base, node) {
		node.log('create');
		// Apply all changes first, add it to the db only at the end
		var object = node.object;
		if (!User.canEdit(object))
			return EditForm.NOT_ALLOWED;
		if (this.apply(base, node)) {
			// If onCreate returns an object, this object is added instead of our temporary one.
			if (object.onCreate) {
				var res = object.onCreate();
				if (res !== undefined && res != object) {
					object = res;
					// Call this.apply() again on the new object, as it differs from object.
					if (!this.apply(object))
						return;
				}
			}
			if (object.creator !== undefined)
				object.creator = session.user;
			if (object.creationDate !== undefined) // modificationDate was set in apply
				object.creationDate = object.modificationDate || new Date();
			// Create it:
			var created = false;
			// The new obj has to be added to the object it belongs to:
			// Find the parent's item through which it is created
			var transientId = object._id;
			var parentItem = node.parentItem;
			if (parentItem) {
				if (parentItem.collection) {
					// Add it to the collection:
					parentItem.collection.add(object);
					created = true;
				} else if (parentItem.setValue(object)) {
					created = true;
				}
				if (!created)
					throw "Cannot store the object.";
			}
			// Only call onAfterCreate if the object stoped being transient through
			// the above. If there is a change of transient objects, they become
			// persistent when the parent of them all becomes persistent:
			if (object.isTransient()) {
				// Walk up the change to the last object that is transient,
				// then create an array of all the object that want onAfterCreate
				// to be called there:
				var parent = object.getEditParent();
				while (true) {
					var next = parent.getEditParent();
					if (!next || !next.isTransient())
						break;
					parent = next;
				}
				if (!parent.cache.createdChildren)
					parent.cache.createdChildren = [];
				parent.cache.createdChildren.push({
					object: object,
					transientId: object._id
				});
			} else {
				// First call children's onAfterCreate handlers:
				var children = object.cache.createdChildren;
				if (children) {
					for (var i = 0; i < children.length; i++) {
						var ch = children[i];
						var obj = ch.object;
						User.log('Created ' + obj.getFullId() + " from: " + ch.transientId);
						if (obj.onAfterCreate)
							obj.onAfterCreate(ch.transientId);
					}
					delete object.cache.createdChildren;
				}
				User.log('Created ' + object.getFullId() + " from: " + transientId);
				// Call the onAfterCreate handler:
				if (object.onAfterCreate)
					object.onAfterCreate(transientId);
			}
			// If the parent's edit form defines an onAfterCreate handler, call it now:
			if (parentItem && parentItem.onAfterCreate)
				parentItem.onAfterCreate.call(parentItem.form.object, object, parentItem);
			// Clear the creating flag both the node object and the form object,
			// As they might be two different ones! (e.g. Topic / Post)
			object.setCreating(false);
			node.form.object.setCreating(false);
			return EditForm.COMMIT;
		}
	},

	apply: function(base, node) {
		node.log('apply');
		// Get the form description and save the values of all items:
		var form = node.form;
		// Use the object from form, which might differ from the one in node!
		// e.g. in Topic / Post, where editing a Topic actually returns the
		// editForm for the first post.
		var object = form.object;
		if (!User.canEdit(object))
			return EditForm.NOT_ALLOWED;
		var parentItem = node.parentItem;
		if (parentItem && parentItem.type == 'group')
			form = parentItem.groupForm;
		// Erase cached edit stack titleas things might have changed during apply
		delete node.title;
		try {
			form.applyItems();
			return EditForm.COMMIT;
		} catch (e) {
			if (e instanceof EditException) {
				form.addResponse({
					error: {
						name: e.item.form.variablePrefix + e.item.name,
						tab: e.item.form.tabIndex,
						message: format(e.message)
					}
				});
				req.data.edit_back = 0;
				User.log(e.message);
			} else throw e;
		}
	},

	edit: function(base, node) {
		node.log('edit');
		if (req.data.edit_item) {
			var obj = null;
			var item = node.form.getItem(req.data.edit_item, req.data.edit_group);
			if (item) {
				if (req.data.edit_object_id != null) {
					if (item.collection) {
						// Fetch by full id, then see that it is really contained
						// in the collection:
						obj = HopObject.get(req.data.edit_object_id);
						if (item.collection.indexOf(obj) == -1)
							obj = null;
					}
				} else {
					obj = item.getValue();
				}
			} else {
				EditForm.alert('Unable to find edit item: ' + req.data.edit_item);
			}
			if (!User.canEdit(obj))
				return EditForm.NOT_ALLOWED;
			if (obj) {
				// Do not use cached forms when editing, force creation of new
				// form each time, by passing true:
				EditNode.get(obj, item, true).render(base, 'edit');
			} else {
				EditForm.alert('Unable to edit object');
			}
		}
	},

	move: function(object) {
		node.log('move');
		// TODO: canEdit()!
		if (req.data.edit_object_ids && req.data.edit_object_id && req.data.edit_item) {
			// first determine sourceItem:
			var sourceItem = EditForm.get(object).getItem(req.data.edit_item, req.data.edit_group);
			if (sourceItem != null) {
				// the prototype of the destination can be specified. if not, it's the same as source
				var prototype = req.data.edit_prototype;
				if (!prototype)
					prototype = sourceItem.form.object._prototype;
				// now destObj:
				var destObj = HopObject.getById(req.data.edit_object_id, prototype);
				if (destObj != null) {
					// destObj's editForm needs a item with the name req.data.edit_item which defines a field 'prototypes'
					var noChildren = true;
					var notAllowed = [];
					var destItem = EditForm.get(destObj).getItem(req.data.edit_item, req.data.edit_group);
					if (destItem != null) {
						// get destObj's allowed prototypes
						var allowedPrototypes = destItem.prototypes;
						var sourceColl = sourceItem.collection;
						var destColl = destItem.collection;
						// for the visible children, a string list is modified that is passed to form.applyItem in the end (they're moved there)
						// the hidden ones need to be moved before
						// the reason for this is that like this, all the updading (specimens, usw) is hanndeled correctly by the handlers through form.applyItem:
						var move = false;
						if (allowedPrototypes != null && sourceColl != null && destColl != null) {
							noChildren = false;
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
								if (obj != null) {
									if (prototypeLookup[obj._prototype] && obj != destObj) {
										if (destColl.indexOf(obj) == -1) {
											destColl.add(obj);
											if (obj.index != null) {
												// see description above on how exactly hidden and visible objects are handeled:
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
							// now apply the children of the current and the destObj, as they have changed:
							var objs = [[sourceItem, sourceIds], [destItem, destIds]];
							for (var i in objs) {
								var item = objs[i][0];
								var ids = objs[i][1].toString(); // IdList needs to be passed to applyItem as string
								var form = item.form;
								form.beforeApply();
								form.applyItem(item, ids);
								// update the colleciton so that visibilities don't get mixed up
								item.value.invalidate();
								var changed = {};
								changed[item.name] = true;
								form.afterApply(changed);
							}
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
	},

	group: function(base, node) {
		// TODO: canEdit!
		node.log('group');
		if (req.data.edit_item) {
			var group = node.form.getItem(req.data.edit_item, req.data.edit_group);
			if (group != null && group.groupForm != null) {
				node.render(base, 'edit', group);
			}
		}
	},

	click: function(base, node) {
		// TODO: canEdit!
		node.log('click');
		if (req.data.edit_item) {
			var item = node.form.getItem(req.data.edit_item, req.data.edit_group);
			if (item && item.onClick) {
				if (item.onClick.call(node.object, item))
					return EditForm.COMMIT
			}
		}
	},

	remove: function(base, node) {
		node.log('remove');
		// If ids and collection are set, delete the objects of the collection with these ids.
		// Otherwise remove the object itself:
		var removed = false;
		// Do not check for canEdit, as removeObject() does so.
		if (req.data.edit_object_ids) {
			var item = node.form.getItem(req.data.edit_item, req.data.edit_group);
			var collection = item && item.collection;
			if (collection) {
				req.data.edit_object_ids.split(',').each(function(id) {
					// Fetch by full id, then see that it is really contained
					// in the collection:
					var obj = HopObject.get(id);
					if (obj && collection.indexOf(obj) != -1 && obj.removeObject())
						removed = true;
				});
			}
		} else {
			// The object itself is to be removed.
			removed = node.object.removeObject();
		}
		if (removed) {
			return EditForm.COMMIT;
		} else {
			EditForm.alert('Nothing was removed!');
		}
	},

	choose: function(base, node) {
		// TODO: canEdit?!
//		if (User.canEdit()) {
			var obj = HopObject.get(req.data.edit_base_id) || root;
			var objId = obj.getFullId();
			var isRoot = obj == root;

			res.write('<ul id="edit-choose-children-' + objId + '">');
			var children = obj.list();
			for (var i = 0; i < children.length; i++) {
				var child = children[i];
				if (child != null) {
					var name = EditForm.getEditName(child);
					var id = child.getFullId();
					res.write('<li>');
					if (child.count()) {
						res.write('<a href="javascript:' + node.form.renderHandle('choose_toggle', id) + '">' +
							'<img id="edit-choose-arrow-' +  id + '" src="/static/edit/media/arrow-close.gif" width="8" height="8" border="0"></a>' + 
							'<img src="/static/media/spacer.gif" width="6" height="1">');
					} else {
						res.write('<img src="/static/media/spacer.gif" width="14" height="1">');
					}
					res.write('<a href="javascript:' + node.form.renderHandle('choose_select', id, name) + '">' + name + '</a><ul id="edit-choose-children-' + id + '" class="hidden"></ul></li>');
				}
			}
			res.write('</ul>');
//		}
	},

	upload_status: function(base, node) {
		res.write(session.getUploadStatus(req.data.upload_id) || '{}');
	}
});
