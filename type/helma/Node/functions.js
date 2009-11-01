Node.inject({
	getEditForm: function(param) {
		var form = new EditForm(this, {
			removable: Base.pick(param.removable, true),
			previewable: Base.pick(param.previewable, true),
			width: param.width
		});
		if (param.children === undefined)
			param.children = true;
		if (param.resources === undefined)
			param.resources = true;
		form.addTab('node', param.tabLabel || 'Node',
			form.createItem(param.children, {
				type: 'multiselect', name: 'children', label: 'Sub Pages',
				collection: this.all, value: this,
				prototypes: 'Node',
				sortable: true, showOptions: true,
				editable: true, autoRemove: true,
				movable: false,
				size: 6
			}),
			form.createItem(param.resources, {
				type: 'multiselect', name: 'resources', label: 'Resources',
				collection: this.allResources, value: this.resources,
				prototypes: 'Resource,Medium,Picture',
				sortable: true,	showOptions: true,
				editable: true, autoRemove: true,
				movable: false,
				size: 6
			})
		);
		return form;
	},

	isEditableBy: function(user, item) {
		return user && this.creator == user;
	},

	getChildElement: function(name) {
		var obj = this.get(name);
		// Return hidden elements as well if we're editing
		if (!obj && User.canEdit(this))
			obj = this.all.get(name);
		return obj;
	},

	getUniqueChildName: function(object, name, maxLength) {
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
			name = (baseName ? baseName + '-' : '') + (count++);
		}
		return name;
	}
});
