MultiSelectItem = SelectItem.extend({
	_types: 'multiselect,references',
	_scale: true,

	render: function(baseForm, name, value, param, out) {
		var options = this.toOptions(this.collection || this.linkedCollection
				|| this.options);
		// Convert values to a list of full ids.
		var ids = [];
		if (value != null) {
			if (value instanceof HopObject) {
				var list = value.list();
				for (var i = 0; i < list.length; i++) {
					var obj = list[i];
					if (obj) ids.push(obj.getFullId());
				}
			} else if (typeof value == 'string') {
				var shortIds = value.split(',');
				if (this.linkedCollection) {
					// Convert short ids as used by string lists to full ids:
					for (var i = 0; i < shortIds.length; i++) {
						var obj = this.linkedCollection.getById(shortIds[i]);
						if (obj) ids.push(obj.getFullId());
					}
				} else {
					EditForm.alert(
						'Unable to get full ids from string list.\n'
						+ 'Please make sure linkedCollection is set.');
				}
			}
		}
		// Find the chosen ones.
		// Create ids indices lookup table:
		var indices = {};
		for (var i = 0, l = ids.length; i < l; i++)
			indices[ids[i]] = i;

		// walk through options and move to value what is selected...
		var values = [];
		for (var i = options.length - 1; i >= 0; i--) {
			var option = options[i];
			var index = indices[option.value];
			if (index != null) {
				values[index] = option;
				options.splice(i, 1);
			}
		}
		// param already contains width, calculatedWidth, etc
		param.name = name;
		param.sortable = this.sortable;
		// render the ids of the left column as a hidden input.
		// This value is manipulated by select_* handlers
		param.ids = ids.join(',');
		if (this.type == 'references') {
			// references has only the name + _left column and
			// different edit buttons
			param.buttons = baseForm.renderButtons([{
				name: name + '_choose', value: 'Add',
				onClick: baseForm.renderHandle('choose_reference', name,
						this.getEditParam({ multiple: true }))
			}, {
				value: 'Remove',
				onClick: baseForm.renderHandle('references_remove', name)
			}]);
		} else {
			param.buttons = this.renderButtons(baseForm, name);
		}
		var size = Base.pick(this.size, '6');
		var left = name + '_left', right = name + '_right';
		var editParam = param.buttons && this.getEditParam();
		param.left = Html.select({
			size: size, name: left, multiple: true,
			options: values, className: this.className,
			onDblClick: editParam && baseForm.renderHandle('select_edit',
				[left], editParam)
		});
		if (this.showOptions) {
			param.right = Html.select({
				size: size, name: right, multiple: true,
				options: options, className: this.className,
				onDblClick: editParam && baseForm.renderHandle('select_edit',
					[right], editParam)
			});
		}
		baseForm.renderTemplate('multiselectItem', param, out);
	},

	convert: function(value) {
		value = value ? value.split(',') : [];
		// Convert full id lists to lists of objects or ids by filtering out
		// the prototypes that are not allowed, as defined by prototypes.
		// It is the user's responisibility to make sure they are all in the
		// same table, so ids alone are enough a reference!
		var prototypes = this.getPrototypes();

		// Also make sure the objects are contained in collection if that is
		// defined.
		var collection = this.collection;
		var stringIds = !!this.linkedCollection;

		// Now convert the fullIds in the array to objects, by filtering
		// according to prototypes.
		value = value.each(function(id) {
			var obj = HopObject.get(id);
			// See if the object is an instance of any of the allowed
			// prototypes, and if so, add its id to the list
			if (obj) {
				if (prototypes && !prototypes.find(function(proto) {
					return obj instanceof proto;
				})) {
					User.log('Filtering out', obj);
				} else {
					this.push(stringIds ? obj._id : obj);
				}
			}
		}, []);

		// Create a string for string id lists:
		return stringIds ? (value.length ? value.join(',') : null) : value;
	},

	apply: function(value) {
		var changed = false;
		if (this.type == 'multiselect' && !this.linkedCollection) {
			if (this.collection) {
				// The code bellow automatically decides which mode to use by
				// looking at the first available option.
				var options = this.collection.list();
				// Look-up table for used items
				var used = {};
				for (var i = 0; i < value.length; i++) {
					var obj = value[i];
					used[obj._id] = true;
					if (obj)
						changed = this.setPosition(obj, i, true) || changed;
				}
				// Now make the unused items invisible:
				for (var i = 0; i < options.length; i++) {
					var obj = options[i];
					var pos = value.length + i;
					if (!used[obj._id])
						changed = this.setPosition(obj, pos, false) || changed;
				}
			}
		} else {
			changed = this.base(value);
			// Refresh the linked collection:
			if (changed && this.linkedCollection)
				this.linkedCollection.invalidate();
		}
		return changed;
	}
});
