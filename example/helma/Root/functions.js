Root.inject({
	getEditForm: function() {
		var form = this.base();
		form.addToGroup("node",
			{ label: "Title Page", name: "titlePage", type: "reference" },
			{ label: "Reference Page", name: "referencePage", type: "reference" },
			{ label: "Test", name: "color", type: "color" }
		);
		if (User.getRole() & User.FLAG_ADMINISTRATOR) {
			form.addTab("Users",
				{ label: "Users", type: "select", name: "users", collection: this.users,
					prototypes: "User", size: 6, autoRemove: true, width: 400 }
			);
		}
		return form;
	}
});