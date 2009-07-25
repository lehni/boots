	////////////////////////////////////////////////////////////////////////
// Roles

// Flags to check single attributes. A role consists of more of one of these
// e.g. the superuser has all the flags set.

// TODO: Consider separating flags from combined roles for easier management,
// e.g. User.READ / POST / EDIT / DISABLED / UNVERIFIED
// vs   User.READER / POSTER (includes READER), EDITOR (includes POSTER), etc.
// Maybe separate with prefix... UserRole.READ, UserRole.POST, vs. User.READER

User.NONE = 			0x0000;
User.READER =			0x0001;
User.POSTER =			0x0002;
User.EDITOR =			0x0004;
// Define your own, e.g.:
//User.ROLE1 = 			0x0008;
//User.ROLE2 = 			0x0010;
//User.ROLE3 = 			0x0020;
//User.ROLE4 = 			0x0040;
//User.ROLE5 = 			0x0080;

User.DISABLED =			0x0100;
User.UNVERIFIED =		0x0200;

User.ADMINISTRATOR =	0x1000;
User.SUPERUSER =		0x2000;

////////////////////////////////////////////////////////////////////////
// Needed for EditForm:
//
// User#canEdit
// User.canEdit

////////////////////////////////////////////////////////////////////////
// Edit

User.inject({
	getEditForm: function() {
		var isAdmin = User.hasRole(User.ADMINISTRATOR);
		var isSuperuser = User.hasRole(User.SUPERUSER);
		var editSuperuser = this.hasRole(User.SUPERUSER);
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
				{ name: 'Poster', value: User.READER | User.POSTER },
				{ name: 'Editor', value: User.READER | User.POSTER | User.EDITOR },
				{ name: 'Admin', value: User.READER | User.POSTER | User.EDITOR | User.ADMINISTRATOR }
			];
			if (isSuperuser)
				roles.push({ name: 'Superuser', value: User.READER | User.POSTER | User.EDITOR | User.ADMINISTRATOR | User.SUPERUSER });
			tab.add({ label: 'Role', name: 'roles', type: 'select', options: roles });
		}
		return form;
	},

	onApplyPassword: function(value) {
		if (value != null) {
			value = this.encryptPassword(value);
			if (this.password != value) {
				this.password = value;
				return true;
			}
		}
		return false;
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
		return this.hasRole(User.ADMINISTRATOR)
				// Editors can create new things anywhere as well
				|| !object && this.hasRole(User.EDITOR)
				|| object && ((object.isCreating() && session.user == this) ||
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

	statics: {
		// Override to globally turn of login, e.g. by setting a flag on the root object...
		isLoginAllowed: function() {
			return true;
		},

		encrypt: function(str) {
			// for MD5:
			// return encodeMD5(str);
			// for SHA-1:
			return encodeSHA1(str);
		},

		login: function(username, password, remember) {
			var user = root.users.get(username);
			if (user != null) {
				if (user.hasRole(User.DISABLED)) {
					User.setMessage('loginDisabled');
					return false;
				} else if (!User.isLoginAllowed() && !(user.hasRole(User.SUPERUSER))) {
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
				if (User.isLoginAllowed() || user.hasRole(User.SUPERUSER)) {
					return true;
				} else {
					User.setMessage('loginDisabled');
					user.logout(false);
				}
			}
			// If login is not allowed, also do not allow anonymous posts...
			if (session.data.createdObjects && User.isLoginAllowed()) {
				// If in anonymous mode, see if the object or its parent(s) where added
				// to session.data.createdObjects. Allow editing if they were.
				// TODO: add timeout for session.data. e.g. 15 minutes.
				var obj = object;
				while (obj) {
					if (session.data.createdObjects.find(obj))
						return true;
					obj = obj.getEditParent();
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
			return session.user ? session.user.getRoles() : User.NONE;
		},

		hasRole: function(role) {
			return session.user && session.user.hasRole(role);
		}
	}
});
