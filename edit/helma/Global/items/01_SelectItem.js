// TODO: File is named 01_SelectItem.js to ensure it is compiled before the others
// that depend on it, but after 00_ListItem.js.
// A better way to support this would be if Helma offered an inlcude() method...

SelectItem = ListItem.extend({
	_types: 'select',
	_scale: true,

	getOptions: function() {
		return { scaleToFit: !!this.size };
	},

	render: function(baseForm, name, value, param, out) {
		var options = this.toOptions(this.collection || this.options);
		if (this.allowNull)
			options.unshift({ name: '', value: 'null' });
		
		// Convert to id
		if (value != null && value instanceof HopObject)
			value = value.getFullId();
		// Mark the selected
		options.each(function(option) {
			if (option.value == value)
				option.selected = true;
		});
		var select = {
			name: name, className: this.className
		};
		if (this.size)
			select.size = this.size;

		var buttons = this.renderButtons(baseForm, name, true);
		// Double clicking onto the select input also edits the entry
		if (buttons)
			select.onDblClick = baseForm.renderHandle('select_edit', [name], this.getEditParam());
		select.options = options;
		Html.select(select, out);
		if (buttons)
			out.write(buttons);
	},

	convert: function(value) {
		// Only convert back to HopObject if the options are a HopObject collection
		if ((this.collection || this.options) instanceof HopObject)
			value = HopObject.get(value);
		// Only convert if the current value is not the collection itself,
		// as we cannot override collections (this happens e.g. when
		// using a select item for simply creating a list of objects, not
		// actually selecting and that is associated with a object mapping).
		if (this.collection && !this.linkedCollection) {
			if (this.collection == this.getValue())
				return EditForm.DONT_APPLY;
			// Make sure the specified object is defined in the collection
			if (value && this.collection.indexOf(value) == -1)
				value = null;
		}
		return value;
	},

	getButtons: function(baseForm, name) {
		var editParam = this.getEditParam();
		var selParam = this.type == 'multiselect'
			? [ name + '_left', name + '_right' ]
			: [ name ];

		var buttons = [];
		if (this.prototypes || this.editable) {
			buttons.push({
				value: 'Edit',
				onClick: baseForm.renderHandle('select_edit', selParam, editParam)
			});
		}
		if (this.movable) {
			buttons.push({
				value: 'Move',
				name: name + '_move',
				onClick: baseForm.renderHandle('select_move', name, selParam, editParam)
			});
		}
		if (this.prototypes) {
			buttons.push(this.getPrototypeChooserButton(baseForm, { value: 'New' }), {
				value: 'Delete',
				onClick: baseForm.renderHandle('select_remove', selParam, editParam)
			});
		}
		return buttons;
	},

	// toOptions returns an array with option descriptions:
	// possible values for param:
	// - a HopObject, the children become options (name, _id)
	// - a JavaScript array with options (is return unmodified)
	toOptions: function(param) {
		var options = null;
		if (param != null) {
			if (param instanceof Array) {
				options = param;
			} else if (param instanceof HopObject) {
				options = [];
				var list = param.list();
				for (var i = 0, l = list.length; i < l; i++) {
					var obj = list[i];
					if (obj) {
						options.push({
							name: EditForm.getEditName(obj, true),
							value: obj.getFullId()
						});
					}
				}
				/*
				options = param.list().each(function(obj) {
					if (obj) {
						this.push({
							name: EditForm.getEditName(obj, true),
							value: obj.getFullId()
						});
					}
				}, []);
				*/
			}
		}
		if (options) {
			for (var i = 0, l = options.length; i < l; i++) {
				var option = options[i];
				if (typeof option != 'object') {
					options[i] = {
						name: option,
						value: option
					};
				}
			}
		} else {
			options  = [];
		}
		return options;
	}
});
