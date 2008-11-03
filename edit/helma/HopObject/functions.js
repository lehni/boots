HopObject.inject({
	onRequest: function() {
		/*
		var buffer = [];
		for (var i in req.data) {
			if (i != 'http_browser')
				buffer.push(i + '=' + req.data[i]);
		}
		User.log("REQUEST: " + req.path + ' ' + buffer.join(';'));
		*/
		User.autoLogin();
	},

	isEditableBy: function(user) {
		return false;
	},

	isEditable: function() {
		return User.canEdit(this);
	},

	isCreating: function() {
		return !!this.cache.creating;
	},

	setCreating: function(creating, id) {
		if (creating) {
			this.cache.creating = true;
			this.cache.id = id;
			// Make sure the modified getById finds this:
			HopObject.registerById(this._id, this);
			// Unregistering for the above happens when onStore is called,
			// not setCreating(false), since they might still be transient after.
			if (id)
				HopObject.registerById(id, this);
		} else {
			if (this.cache.id)
				HopObject.unregisterById(this.cache.id);
			delete this.cache.creating;
			delete this.cache.id;
		}
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

	getParent: function() {
		// to be used wherever _parent is accessed, so apps can override
		// the way parents are handled (e.g. liento)
		return this._parent; // default is returning _parent
	},

	// getEditParent returns the correct parent for both newly created object's that
	// are still to be inserted into the database
	// and already existing ones by determining the parent from the edit stack for 
	// items about to be created and this.getParent() for the others.
	// this parent can also be overridden by realParent
	getEditParent: function(realParent) {
		if (this.isTransient()) {
			// See if there is a cached edit node, and if so, determine future
			// parent from it:
			var node = EditNode.getCached(this);
			if (node && node.parent)
				return node.parent.object;
		}
		return realParent ? realParent : this.getParent();
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
				// only remove objects that are also allowed to remove directly and
				// don't override the base object
				// TODO: Is it bad not to check for object match? In case of Topic / Post
				// this would not work, as editing a node returns the editor for the
				// first post....
				if (form.removable/* && form.object == this*/) {
					User.log("Removing " + this.getFullId());
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
										User.log("Auto Removing " + child + " " +
											EditForm.getEditName(child));
										item.collection.removeChild(child);
										child.remove();
									}
								} else {
									var value = item.getValue();
									if (value) {
										User.log("Auto Removing " + value + " " +
											EditForm.getEditName(value));
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
				if (user.hasRole(User.UNVERIFIED)) {
					User.setMessage("loginUnverified");
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
				User.setMessage("alreadyLoggedIn", session.user.name);
			}
		}
	},

	handleLogout: function(url) {
		if (session.user)
			session.user.logout();
		res.redirect(url || req.data.url || this.href());	
	},

	renderEditButtons: function(param, out) {
		if (!res.data.preview && (!session.user && param.allowAnonymous || User.canEdit(this))) {
			var buttons = param.buttons ? param.buttons.split(',') : [];
			var items = [];
			for (var i = 0; i < buttons.length; i++) {
				var button = buttons[i].split(':');
				var type = button[0];
				var title = button[1];
				switch (type) {
				case 'create':
					items.push({
						mode: 'new', title: title || 'Create',
						edit_item: param.item, edit_prototype: param.prototype
					});
					break;
				case 'delete':
				case 'remove':
					items.push({
						mode: 'remove', title: title || 'Delete',
						confirm: 'Do you really want to delete "' + EditForm.getEditName(this) + '"' + '?',
						edit_item: param.item, edit_back: 1
					});
					break;
				case 'edit':
					items.push({
						mode: 'edit', title: title || 'Edit'
					});
					break;
				}
			}
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
			return this.renderTemplate("editButtons", param, out);
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