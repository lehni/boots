User.inject({
	getEditForm: function(param) {
		var isAdmin = User.hasRole(UserRole.ADMIN);
		var isSuperuser = User.hasRole(UserRole.ROOT);
		var editSuperuser = this.hasRole(UserRole.ROOT);
		var isSameUser = session.user == this;
		var form = new EditForm(this, { removable: isAdmin && !editSuperuser && !isSameUser });
		var tab = form.addTab('User');
		if (isAdmin) {
			if (this.lastLogin !== undefined)
				tab.add({ label: 'Last Login', suffix: this.lastLogin ? this.lastLogin.format('dd MMMM yyyy HH:mm') : 'never' });
			if (!editSuperuser || isSuperuser)
				tab.add({ label: 'Name', name: 'name', type: 'string', length: 16 });
		}
		if (isSameUser || (isAdmin && !editSuperuser))
			tab.add({ label: 'Password', name: 'password', type: 'password', length: 16, onApply: this.onApplyPassword });
		if (isAdmin && !isSameUser && !editSuperuser) {
			var roles = [
				{ name: 'Reader', value: User.READER },
				{ name: 'Poster', value: User.POSTER },
				{ name: 'Editor', value: User.EDITOR },
				{ name: 'Administrator', value: User.ADMINISTRATOR }
			];
			if (isSuperuser)
				roles.push({ name: 'Superuser', value: User.SUPERUSER });
			tab.add({ label: 'Role', name: 'roles', type: 'select', options: roles });
		}
		return form;
	},

	onApplyPassword: function(value) {
		if (value != null) {
			// Do not store the password encrypted while the node is still
			// transient, since the node id is part of the encryption mechanism
			// and is not known yet. onStore is taking care of the first encryption.
			if (!this.isTransient())
				value = this.encryptPassword(value);
			if (this.password != value) {
				this.password = value;
				return true;
			}
		}
		return false;
	},

	onStore: function() {
		this.password = this.encryptPassword(this.password);
	},

	getRoles: function() {
		return this.roles;
	},

	hasRole: function(role) {
		return !!(this.roles & role);
	},

	// Call with object = null just to see wether the user is an editor or an admin,
	// otherwise it checks the write access to the object.
	canEdit: function(object, item) {
		// Admins can edit everything
		return this.hasRole(UserRole.ADMIN)
				// Editors can create new things anywhere as well
				|| !object && this.hasRole(UserRole.EDIT)
				|| object && ((object.isCreating() && this == session.user) ||
						object.isEditableBy(this, item));
	},

	isEditableBy: function(user, item) {
		return user && this == user;
	},

	////////////////////////////////////////////////////////////////////////
	// authentication

	// encrypts the password. the user's _id is part of the salt.
	// beware: don't use this.password but the passed argument,
	// otherwise login will allways succeed!!!!
	encryptPassword: function(password) {
	    if (password) {
			return User.encrypt(app.properties.passwordSalt + this._id + password);
		} else {
			return '';
		}
	},

	getCookieHash: function() {
		// This.password is already encrypted, so this hash does not lead
		// to the original pw in any way:
		return User.encrypt(req.data.http_remotehost + this.password);
	},

	setAutoLogin: function(remember) {
		if (remember) {
			res.setCookie('autoLogin', this._id + ':' + this.getCookieHash(), 90);
		} else {
			res.setCookie('autoLogin', null);
		}
	},

	logout: function() {
		if (session.user == this) {
			User.setMessage('loggedOut', session.user.name);
			this.setAutoLogin(false);
			session.logout();
		}
	},

	onLogin: function() {
		app.log('Logged In: ' + this.name);
		this.lastLogin = new Date();
	},

	// Override to allow turning of login (and editing) per user
	isLoginAllowed: function() {
		return true;
	},

	statics: {
		// Override to globally turn of editing,
		// e.g. by setting a flag on the root object.
		isEditingAllowed: function() {
			return true;
		},

		encrypt: function(str) {
			// for MD5:
			// return encodeMd5(str);
			// for SHA-1:
			return encodeSha1(str);
		},

		login: function(username, password, remember) {
			var user = root.users.get(username);
			if (user) {
				if (user.hasRole(UserRole.DISABLED)) {
					User.setMessage('loginDisabled');
					return false;
				} else if (!user.isLoginAllowed() && !(user.hasRole(UserRole.ROOT))) {
					User.setMessage('loginTemporarilyDisabled');
					return false;
				}
				password = user.encryptPassword(password);
				if (session.login(username, password)) {
					if (session.user.onLogin)
						session.user.onLogin();
					User.setMessage('loggedIn', username);
					if (remember != null)
						session.user.setAutoLogin(remember);
					return true;
				}
			}
			User.setMessage('loginFailed');
			return false;
		},

		autoLogin: function() {
		//	if (!session.user) session.login(root.users.get('Lehni'));
			if (!session.user && req.data.autoLogin) {
				var parts = req.data.autoLogin.split(':');
				if (parts.length > 0) {
					var user = root.users.getById(parts[0]);
					if (user != null && parts[1] == user.getCookieHash() &&
							session.login(user)) {
						if (session.user.onLogin)
							session.user.onLogin();
						return true;
					}
				}
			}
			return false;
		},

		canEdit: function(object, item) {
			var user = session.user;
			if (user && user.canEdit(object, item) 
					|| !user && object && object.isEditableBy(null, item)) {
				if (User.isEditingAllowed() && (!user || user.isLoginAllowed()
						|| user.hasRole(UserRole.ROOT))) {
					return true;
				} else {
					User.setMessage('loginDisabled');
					if (user)
						user.logout(false);
				}
			}
			if (session.data.createdObjects && User.isEditingAllowed()) {
				// If in anonymous mode, see if the object or its parent(s) where added
				// to session.data.createdObjects. Allow editing if they were.
				// TODO: add timeout for session.data. e.g. 15 minutes.
				var obj = object;
				while (obj) {
					if (session.data.createdObjects.find(obj))
						return true;
					obj = obj.getParentNode();
				}
			}
			return false;
		},

		makeEditable: function(object) {
			// Make the object editable in anonymous mode, by adding it to 
			// sesssion.data.createdObjets. See User.canEdit
			// TODO: Implement a configurable time limit for this?
			if (!session.user) {
				if (!session.data.createdObjects)
					session.data.createdObjects = [];
				session.data.createdObjects.push(object);
			}
		},

		getRoles: function() {
			return session.user ? session.user.getRoles() : UserRole.NONE;
		},

		hasRole: function(role) {
			return session.user && session.user.hasRole(role);
		}
	}
});

// Commonly used combined Roles

User.READER = UserRole.READ;
User.POSTER = User.READER | UserRole.POST;
User.EDITOR = User.POSTER | UserRole.EDIT;
User.ADMINISTRATOR = User.EDITOR | UserRole.ADMIN;
User.SUPERUSER = User.ADINISTRATOR | UserRole.ROOT;
