Root.inject({
	getEditForm: function() {
		var form = this.base();
		if (User.hasRole(User.ADMINISTRATOR)) {
			form.addTab("Users",
				{ label: "Users", type: "select", name: "users", collection: this.users,
					prototypes: "User", size: 6, autoRemove: true, width: 400 }
			);
		}
		return form;
	}
});