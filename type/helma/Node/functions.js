Node.inject({
	getEditForm: function(param) {
		var form = new EditForm(this, { removable: true });
		var parent = this.getEditParent();
		if (param.children === undefined)
			param.children = true;
		if (param.resources === undefined)
			param.resources = true;
		form.addTab('node', param.tabLabel || 'Node',
			{
				label: 'Name', name: 'name', type: 'string',
				requirements: {
					notNull: true, maxLength: 32,
					uniqueIn: parent && {
						value: parent.all,
						message: 'This name is already in use. Choose a different name.'
					}
				}
			},
			param.children ? {
				type: 'multiselect', name: 'children',
				label: param.children.label || 'Sub Pages',
				ordered: Base.pick(param.children.ordered, true),
				showOptions: Base.pick(param.children.showOptions, true),
				collection: this.all, value: this,
				prototypes: Base.pick(param.children.prototypes, 'Node'),
				movable: Base.pick(param.children.movable, true),
				editable: true, autoRemove: true, // Always
				size: Base.pick(param.children.size, 6)
			} : null,
			param.resources ? {
				type: 'multiselect', name: 'resources',
				label: param.resources.label || 'Resources',
				ordered: Base.pick(param.resources.ordered, true),
				showOptions: Base.pick(param.resources.showOptions, true),
				collection: this.allResources, value: this.resources,
				prototypes: Base.pick(param.resources.prototypes, 'Resource,Medium,Picture'),
				movable: Base.pick(param.resources.movable, true),
				editable: true, autoRemove: true, // Always
				size: Base.pick(param.resources.size, 6)
			} : null
		);
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
			name = (baseName ? baseName + '-' : '') + (count++);
		}
		return name;
	}
});
