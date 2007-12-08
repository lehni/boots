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

	isCreating: function() {
		return !!this.cache.creating;
	},

	setCreating: function(creating) {
		if (creating) this.cache.creating = true;
		else {
			delete this.cache.creating;
			delete this.cache.id;
		}
	},

	isRemoving: function() {
		return !!this.cache.removing;
	},

	isTransient: function() {
		return this._id[0] == 't';
	},

	getEditId: function() {
		// Use this.cache.id instead of real _if if set, so transient
		// nodes can pretend to be another node. Used when transient nodes
		// are lost in the cache. See EditNode#initialize
		return this._prototype + '-' + (this.cache.id || this._id);
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
			var node = EditNode.getCached(this);
			if (node && node.parent)
				return node.parent.object;
		}
		return realParent ? realParent : this.getParent();
	},

	// removeObject deletes an object and its subnodes according to the values set
	// in its form. it also calls the onRemove handler.
	removeObject: function() {
		// this removes an editable object after having called it's onRemove handler:
		if (User.canEdit(this) && !this.isRemoving()) {
			// the onBeforeRemove handler can return false to prevent removal,
			// or throw a string exception if called from the EditForm framework
			if (this.onBeforeRemove && this.onBeforeRemove() === false)
				return false;
			var remove = false;
			if (this.getEditForm) {
				this.cache.removing = true;
				// Do not get form through EditNode, as we need to pass true
				// for the remove parameter, and do not want things to be cached.
				var form = this.getEditForm({ removing: true });
				// only remove objects that are also allowed to remove directly and
				// don't override the base object
				// TODO: bad not to check for object match? In case of Topic / Post
				// this would not work, as editing a topic returns the editor for the
				// first post....
				if (form.removable/* && form.object == this*/) {
					User.log("Remove " + this._prototype + ' ' + this._id);
					// now check all the form's items to see wether
					// they define autoRemove:
					if (form.autoRemove) {
						for (var i = 0; i < form.autoRemove.length; i++) {
							var item = form.autoRemove[i];
							if (item) {
								if (item.collection) {
									var list = item.collection.list();
									for (var j = 0; j < list.length; j++) {
										var child = list[j];
										User.log("Auto Remove " + child + " " +
											EditForm.getEditName(child));
										item.collection.removeChild(child);
										child.removeObject();
									}
								} else {
									var value = item.getValue();
									if (value) {
										User.log("Auto Remove " + value + " " +
											EditForm.getEditName(value));
										value.removeObject();
									}
								}
							}
						}
					}
					remove = true;
				}
			} else {
				User.log("Remove " + this._prototype + ' ' + this._id);
				remove = true;
			}
			if (remove) {
				if (this.onRemove)
					this.onRemove();
				this.remove();
			} else {
				delete this.cache.removing;
			}
		}
		return remove;
	},

	handleLogin: function(url) {
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
					res.redirect(url || req.data.url || this.href());
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

	handleLogout: function() {
		if (session.user)
			session.user.logout();
		res.redirect(this.href());	
	},

	renderEditButtons: function(param, out) {
		if (param.allow == 'all' || User.canEdit(this)) {
			var buttons = param.buttons ? param.buttons.split(',') : [];
			var items = [];
			for (var i = 0; i < buttons.length; i++) {
				var button = buttons[i].split(':');
				var type = button[0];
				var title = button[1];
				// TODO: for create and remove, we create new edit_stacks by hand.
				// this could be integrated into EditStack
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
			param.id = this.getEditId();
			param.url = path.href('edit');
			param.popup = param.popup == 'true';
			if (!param.target)
				param.target = param.id;
			if (param.popup) {
				if (!param.width) param.width = 400;
				if (!param.height) param.height = 400;
			}
			param.showProgress = EditForm.SHOW_PROGRESS;
			return this.renderTemplate("editButtons", param, out);
		}
	}
});