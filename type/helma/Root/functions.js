Root.inject({
	getEditForm: function(param) {
		var form = this.base(param);
		if (User.hasRole(UserRole.ADMIN)) {
			form.addTab('Users',
				{ label: 'Users', type: 'select', name: 'users', collection: this.users,
					prototypes: 'User', size: 6, autoRemove: true, width: 400 }
			);
		}
		return form;
	}
});