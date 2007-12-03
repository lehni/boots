Node.inject({
	getEditForm: function() {
		var form = new EditForm(this, { removable: true });
		var nodeTab = form.addTab("Node");
		var parent = this.getEditParent();
		nodeTab.add({
			label: "Name", name: "name", type: "string",
			requirements: {
				notNull: true, maxLength: 32,
				uniqueIn: parent && {
					value: parent.all,
					message: "This name is already in use. Choose a different name."
				}
			}
		}, {
			label: "Sub Pages", type: "multiselect", name: "children",
			showOptions: true, prototypes: "Page, Forum, Users", moveable: true,
			collection: this.all, value: this, autoRemove: true, size: 6
		}, {
			label: "Resources", type: "multiselect", name: "resources",
			showOptions: true, collection: this.allResources, value: this.resources,
			prototypes: "Resource,Medium,Picture", moveable: true,
			size: 6, autoRemove: true
		});
		return form;
	},

	isEditableBy: function(user) {
		return user && this.creator == user;
	},

	isVisible: function() {
		var obj = this;
		while (obj && obj != root && obj.position != null)
			obj = obj.parent;
		return obj == root;
	},

	getUniqueNameFor: function(object, name, maxLength) {
		name = name.trim().urlize();
		if (name.length > maxLength)
			name = name.substring(0, maxLength).trim('-');
		var baseName = name;
		var count = 1;
		while (true) {
			if (name) {
				var obj = this.all.get(name);
				if (!obj || obj == object)
					break;
			}
			// try a different number at the end of the name:
			name = (baseName ? baseName + '-' : "") + (count++);
		}
		return name;
	}
});
