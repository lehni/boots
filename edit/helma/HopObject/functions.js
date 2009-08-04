HopObject.inject({
	onRequest: function() {
		User.autoLogin();
	},

	/**
	 * Te be called by User.canEdit, not directly to check editability
	 */
	isEditableBy: function(user, item) {
		return false;
	},

	/**
	 * Te be called directly, as a shortcut to User.canEdit(this)
	 */
	isEditable: function(item) {
		return User.canEdit(this, item);
	},

	isCreating: function() {
		return !!this.cache.creationId;
	},

	setCreating: function(creating, id) {
		if (creating) {
			// Make sure the modified getById finds this:
			HopObject.registerById(this._id, this);
			// Unregistering for the above happens when onStore is called,
			// not setCreating(false), since they might still be transient after.
			if (id) {
				this.cache.creationId = id;
				HopObject.registerById(id, this);
			} else {
				// Also set the fake id to _id since there are things during apply 
				// that can force an object to become persited prematurely.
				// This would prevent it from finding its edit parent since the
				// fullId would change and the EditNode could not be found.
				this.cache.creationId = this._id;
			}
			// Update the object's edit properties as it is about to be created.
			this.updateEditProperties();
			// Make sure the object is editable even if there is no registered user.
			User.makeEditable(this);
		} else {
			if (id)
				HopObject.unregisterById(id);
			if (this.cache.creationId) {
				HopObject.unregisterById(this.cache.creationId);
				delete this.cache.creationId;
			}
		}
	},

	/**
	 * A helper to initalise and update creator and modifier fields if they are
	 * defined as fields.
	 */
	updateEditProperties: function() {
		// Initialise the creator and update the modifier fields on the object,
		// Helma returns null for unset existing properties and undefined for
		// not existing properties. Make sure we're only setting modifier and
		// date if the properties are actually defined in type.properties
		if (this.modifier !== undefined)
			this.modifier = session.user;

		if (this.modificationDate !== undefined)
			this.modificationDate = new Date();

		// Set creator and creation date if it was not set yet.
		if (this.creator === null)
			this.creator = session.user;

		if (this.creationDate === null)
			this.creationDate = this.modificationDate || new Date();
	},

	isRemoving: function() {
		return !!this.cache.removing;
	},

	/** 
	 * Returns the target id to be used for inline editing forms.
	 * By default this is just the object's full id.
	 * This can be overridden.
	 */
	getEditId: function() {
		return this.getFullId();
	},

	// getEditParent returns the correct parent for both newly created object's that
	// are still to be inserted into the database
	// and already existing ones by determining the parent from the edit stack for 
	// items about to be created and this.getParent() for the others.
	// this parent can also be overridden by realParent
	getEditParent: function(realParent) {
		var parent = realParent || this.getParent();
		if (!parent) {
			// See if there is a cached edit node, and if so, determine future
			// parent from it:
			var node = EditNode.getCached(this);
			if (node && node.parent)
				parent = node.parent.object;
		}
		return parent;
	},

	// remove deletes an object and its subnodes according to the values set
	// in its edit form. it also calls the onBeforeRemove / onRemove handlers.
	remove: function() {
		if (this.onBeforeRemove) {
			// The onBeforeRemove handler can return false to prevent removal,
			// or throw a string exception if called from the EditForm framework
			var ret = this.onBeforeRemove();
			if (ret != undefined && !ret)
				return false;
		}
		var remove = false;
		if (this.getEditForm) {
			// this removes an editable object after having called it's onRemove handler:
			if (User.canEdit(this) && !this.isRemoving()) {
				this.cache.removing = true;
				// Do not get form through EditNode, as we need to pass true
				// for the remove parameter, and do not want things to be cached.
				var form = this.getEditForm({ removing: true });
				// Only remove objects that are removable
				if (form.removable) {
					User.log('Removing ' + this.getFullId());
					remove = true;
					// Now check all the form's items to see wether
					// they define autoRemove:
					if (form.autoRemove) {
						for (var i = 0; i < form.autoRemove.length; i++) {
							var item = form.autoRemove[i];
							if (item) {
								if (item.collection) {
									var list = item.collection.list();
									for (var j = 0; j < list.length; j++) {
										var child = list[j];
										User.log('Auto Removing ' + child + ' ' +
											EditForm.getEditName(child, true));
										item.collection.removeChild(child);
										child.remove();
									}
								} else {
									var value = item.getValue();
									if (value) {
										User.log('Auto Removing ' + value + ' ' +
											EditForm.getEditName(value, true));
										value.remove();
									}
								}
							}
						}
					}
				}
			}
		} else {
			remove = true;
		}
		if (remove) {
			if (this.onRemove)
				this.onRemove();
			return this.base();
		} else {
			delete this.cache.removing;
			return false;
		}
	},

	handleLogin: function(url) {
		url = url || req.data.url || this.href();
		if (req.data.login) {
			var user = root.users.get(req.data.username);
			var login = true;
			if (user) {
				if (user.hasRole(UserRole.UNVERIFIED)) {
					User.setMessage('loginUnverified');
					login = false;
				}
			}
			if (login && 
				User.login(req.data.username, req.data.password,
				req.data.remember == true)) {
					res.redirect(url);
			}
		} else if (req.data.cancel) {
			res.redirect(this.href());
		} else if (session.user) {
			if (req.data.logout) {
				session.user.logout();
			} else {
				User.setMessage('alreadyLoggedIn', session.user.name);
			}
		}
	},

	handleLogout: function(url) {
		if (session.user)
			session.user.logout();
		res.redirect(url || req.data.url || this.href());	
	},

	renderEditButtons: function(param, out) {
		var buttons = param.buttons ? param.buttons.split(',') : [];
		if (!res.data.preview) {
			var items = [];
			for (var i = 0; i < buttons.length; i++) {
				var button = buttons[i].split(':');
				var type = button[0];
				var title = button[1];
				// Suppot for a third parameter to edit buttons. Right now,
				// only click is supported, which clicks the button right
				// upon display in the user's browser.
				var action = button[2];
				var item = null;
				switch (type) {
				case 'create':
					item = {
						mode: 'new', title: title || 'Create',
						edit_item: param.item, edit_prototype: param.prototype
					};
					break;
				case 'delete':
				case 'remove':
					item = {
						mode: 'remove', title: title || 'Delete',
						// Can't use double quotes here since they break html attributes.
						// TODO: Find a way around this, e.g. using encodeAttributes
						confirm: 'Do you really want to delete\n\'' + EditForm.getEditName(this) + '\'' + '?',
						edit_item: param.item, edit_back: 1
					};
					break;
				case 'edit':
					item = {
						mode: 'edit', title: title || 'Edit'
					};
					break;
				}
				if (item && User.canEdit(this, item.edit_item)) {
					items.push(item);
					item.click = item.scroll = action == 'click';
				}
			}
			if (items.length) {
				param.buttons = items;
				if (!param.id)
					param.id = this.getFullId();
				if (!param.target)
					param.target = this.getEditId();
				param.url = path.href('edit');
				param.popup = param.popup == 'true';
				if (param.popup) {
					if (!param.width) param.width = 400;
					if (!param.height) param.height = 400;
				}
				param.showProgress = EditForm.SHOW_PROGRESS;
				return this.renderTemplate('editButtons', param, out);
			}
		}
	},

	statics: {
		/**
		 * Improve getById so that it can return transient nodes.
		 */
		getById: function(id, prototype) {
			if (id && id.toString().charAt(0) == 't') {
				// Tranisent
				var obj = HopObject._transients[id];
				// Only return it if it is from the right prototype!
				if (obj)
					return !prototype || obj instanceof global[prototype] ? obj : null;
			}
			return this.base(id, prototype);
		},

		// a hash map containing refrences to transient nodes that are to be found
		// in the modified getById:
		_transients: {},

		registerById: function(id, object) {
			this._transients[id] = object;
		},

		unregisterById: function(id) {
			delete this._transients[id];
		}
	}
});