	////////////////////////////////////////////////////////////////////////
// Roles

// Flags to check single attributes. A role consists of more of one of these
// e.g. the superuser has all the flags set.

User.NONE= 0;
User.READER = 1;
User.EDITOR = 2;
User.ADMINISTRATOR = 4;
User.SUPERUSER = 8;
User.DISABLED = 16;
User.UNVERIFIED = 32;

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
		var tab = form.addTab("User");
		if (isAdmin) {
			if (this.lastLogin !== undefined)
				tab.add({ label: "Last Login", suffix: this.lastLogin ? this.lastLogin.format("dd MMMM yyyy HH:mm") : "never" });
			if (!editSuperuser || isSuperuser)
				tab.add({ label: "Name", name: "name", type: "string", length: 16 });
		}
		if (isSameUser || (isAdmin && !editSuperuser))
			tab.add({ label: "Password", name: "password", type: "password", length: 16, onApply: this.onApplyPassword });
		if (isAdmin && !isSameUser && !editSuperuser) {
			var roles = [
				{ name: "Editor", value: User.READER | User.EDITOR },
				{ name: "Admin", value: User.READER | User.EDITOR | User.ADMINISTRATOR }
			];
			if (isSuperuser)
				roles.push({ name: "Superuser", value: User.READER | User.EDITOR | User.ADMINISTRATOR | User.SUPERUSER });
			tab.add({ label: "Role", name: "role", type: "select", options: roles });
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
		return this.roles & role;
	},

	// call with object = null just to see wether the user is an editor or an admin,
	// otherwise it checks the write access to the object.
	canEdit: function(object) {
		return true;
	},

	isEditableBy: function(user) {
		return user && this == user;
	},

	////////////////////////////////////////////////////////////////////////
	// authentication

	// encrypts the password. the user's _id is part of the salt.
	// beware: don't use this.password but the passed argument,
	// otherwise login will allways succeed!!!!
	encryptPassword: function(password) {
	    if (password) {
			return User.encrypt(getProperty("passwordSalt") + this._id + password);
		} else {
			return "";
		}
	},

	getCookieHash: function() {
		// this.password is already encrypted, so this hash does not lead
		// to the original pw in any way:
		return User.encrypt(req.data.http_remotehost + this.password);
	},

	setAutoLogin: function(remember) {
		if (remember) {
			res.setCookie("autoLogin", this._id + ":" + this.getCookieHash(), 90);
		} else {
			res.setCookie("autoLogin", null);
		}
	},

	logout: function() {
		if (this == session.user) {
			User.setMessage("loggedOut", session.user.name);
			this.setAutoLogin(false);
			session.logout();
		}
	},

	onLogin: function() {
		app.log("Logged In: " + this.name);
		this.lastLogin = new Date();
	},

	statics: {
		// Override to globally turn of login, e.g. by setting a flag on the root object...
		isLoginAllowed: function() {
			return true;
		},

		encrypt: function(str) {
			// for md5:
			// return Packages.helma.util.MD5Encoder.encode(str);

			// for sha-1:
		    var algorithm = java.security.MessageDigest.getInstance("SHA-1");
		    var digest = algorithm.digest(new java.lang.String(str).getBytes());
		    res.push();
		    for (var i = 0; i < digest.length; i++) {
		        var b = digest[i] & 0xff;
		        if (b < 0x10) res.write("0");
		        res.write(java.lang.Integer.toHexString(b));
		    }
		    return res.pop();
		},

		login: function(username, password, remember) {
			var user = root.users.get(username);
			if (user != null) {
				if (user.hasRole(User.DISABLED)) {
					User.setMessage("loginDisabled");
					return false;
				} else if (!User.isLoginAllowed() && !(user.hasRole(User.SUPERUSER))) {
					User.setMessage("loginTemporarilyDisabled");
					return false;
				}
				password = user.encryptPassword(password);
				if (session.login(username, password)) {
					if (session.user.onLogin)
						session.user.onLogin();
					User.setMessage("loggedIn", username);
					if (remember != null)
						session.user.setAutoLogin(remember);
					return true;
				}
			}
			User.setMessage("loginFailed");
			return false;
		},

		autoLogin: function() {
		//	if (!session.user) session.login(root.users.get("Lehni"));
			if (!session.user && req.data.autoLogin) {
				var parts = req.data.autoLogin.split(":");
				if (parts.length > 0) {
					var user = root.users.getById(parts[0]);
					if (user != null &&  parts[1] == user.getCookieHash() &&
						session.login(user)) {
						if (session.user.onLogin)
							session.user.onLogin();
						return true;
					}
				}
			}
			return false;
		},

		canEdit: function(object) {
			var user = session.user;
			if (user && (user.canEdit && user.canEdit(object) ||
				object.isEditableBy && object.isEditableBy(user))) {
				if (User.isLoginAllowed() || user.hasRole(User.SUPERUSER)) {
					return true;
				} else {
					User.setMessage("loginDisabled");
					user.logout(false);
				}
			} else if (session.data.createdObjects) {
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
