/* TODO:
- Rename .name -> id?
- Rename getEditName -> getEditId() ?
- Don't pass name in render? but use getEditId like everywhere else?
*/

EditItem = Base.extend(new function() {
	var types = new Hash();

	return {
		_scale: false,
		itemClassName: 'edit-item',
		// Facilitate adding buttons through this.buttons object by making
		// sure it one always there...
		buttons: {},

		initialize: function() {
			if (this.prototypes) {
				// Convert prototypes string to array of prototype names
				if (typeof this.prototypes == 'string') {
					this.prototypes = this.prototypes.split(/\s*,\s*/);
				} else if (this.prototypes instanceof Function) {
					// If it's one constructor, create an array containing its
					// name.
					this.prototypes = [this.prototypes.name];
				} else if (this.prototypes instanceof Array) {
					// Make sure the array only contains strings. If constructor
					// functions are listed, access their name field which seems
					// to be defined for HopObject constructors:
					for (var i = 0, j = this.prototypes.length; i < j; i++) {
						var proto = this.prototypes[i];
						// If it's a constructor, assume it's a HopObject and
						// use its name
						if (proto instanceof Function)
							this.prototypes[i] = proto.name;
					}
				}
			}
			// Automatically prepend edit-element to the classname
			this.className = this.className ? 'edit-element ' + this.className
					: 'edit-element';
		},

		render: function(baseForm, name, value, param, out) {
		},

		convert: function(value) {
			return EditForm.DONT_APPLY;
		},

		convertBreaks: function(str) {
			// Helper function: convert any possible kind of line breaks to \n.
			// This can be used when retrieveing values from forms
			return str ? str.replace(/\r\n|\n\r|\r/mg, '\n') : str;
		},

		apply: function(value) {
			// Only set if it changed
			if (this.getValue() != value) {
				return this.setValue(value);
			} else {
				return false;
			}
		},

		getValue: function() {
			if (this.value != null) {
				return this.value;
			} else if (this.evaluate) {
				// Evaluates the content of item.evaluate in the object and
				// returns it. Use a function instead of eval, as only in this
				// way, in "this.evaluate", "this" will point to the right
				// object.
				try {
					return new Function('return ' + this.evaluate).call(
							this.form.object);
				} catch (e) {
					User.logError('EditItem#getValue(): ' + this.evaluate, e);
				}
			} else if (this.name) {
				 // Read the property with given name
				return this.form.object[this.name];
			}
			return null;
		},

		setValue: function(value) {
			if (this.evaluate) {
				if (app.properties.debugEdit)
					User.log('EditItem#setValue(): ' + this.evaluate + ' = '
							+ Json.encode(value));
				// Evaluate string variable to the content of value:
				try {
					if (app.properties.debugEdit)
						User.log('EditItem#setValue(): ' + this.evaluate + ' = '
								+ Json.encode(value));
					new Function('value', this.evaluate + ' = value;')
							.call(this.form.object, value);
					return true;
				} catch (e) {
					User.logError('EditItem#setValue(): ' + this.evaluate, e);
				}
			} else if (this.name) {
				if (app.properties.debugEdit)
					User.log('EditItem#setValue(): ' + this.name + ' = '
							+ Json.encode(value));
				this.form.object[this.name] = value;
				return true;
			}
			return false;
		},

		store: function(object) {
			return this.setValue(object);
		},

		getOptions: function() {
			return { scaleToFit: this._scale };
		},

		getEditName: function() {
			return this.name && this.form.variablePrefix + this.name;
		},

		getEditParam: function(params) {
			var obj = {
				edit_item: this.name,
				edit_group: this.form.name
			};
			// Add the list entry id needed to identify forms for editable list
			// entries, or pass it on if the editing request already came from
			// such an entry.
			if (this.form.listEntryId)
				obj.edit_entry_id = this.form.listEntryId;
			else if (req.data.edit_entry_id)
				obj.edit_entry_id = req.data.edit_entry_id;
			return Hash.append(obj, params);
		},

		getPrototypes: function() {
			// Convert string prototype names to constructors
		 	return this.prototypes && this.prototypes.collect(function(name) {
				var proto = global[name];
				if (proto) return proto;
				User.log("WARNING: Prototype '" + name + "' does not exist!");
			});
		},

		getPrototypeChooserList: function(baseForm, renderHandler) {
			var editParam = this.getEditParam();
		 	return this.prototypes && this.prototypes.collect(function(name) {
				var proto = global[name];
				if (proto) {
					return {
						name: proto.name.uncamelize(),
						handler: renderHandler
							? renderHandler.call(this, proto)
							: baseForm.renderHandle('execute', 'new',
								Hash.append({ edit_prototype: proto.name },
									editParam))
					};
				}
				User.log("WARNING: Prototype '" + name + "' does not exist!");
			}, this) || [];
		},

		getPrototypeChooserButton: function(baseForm, param, chooser) {
			// If a chooser object is passed, it contains the prerendered
			// chooser values, to be reused for multiple list entries.
			// In this case pass its name as a string, otherwise, render the
			// chooser list now and pass it to the select_new function.
			var value = chooser 
				? chooser.name
				: this.getPrototypeChooserList(baseForm);
			param = new Hash(param);
			param.name = (param.name || this.getEditName()) + '_new';
			param.onClick = param.onClick || baseForm.renderHandle(
					'select_new', param.name, value, this.getEditParam())
			return param;
		},

		/**
		 * Used by image related items to receive a hopoject collection that
		 * contains pictures resources. The list can contain other resources
		 * too, as it then gets filtered as well. This can be overridden in
		 * apps. Returning arrays is not supported.
		 */
		getPictureResources: function(object) {
			return object.resources;
		},

		hasPictureResources: function() {
			var resources = this.getPictureResources(this.form.object);
			return resources && resources.list().find(function(resource) {
				return resource.instanceOf(Picture);
			});
		},

		getCropOptions: function(object, picture, options) {
			// options is only optionally provided by overriding prototypes.
			// By default it is null.
			if (!options)
				options = {};
			if (!options.crop) {
				// If no crop is provided for a new picture yet, calculate a
				// default one now.
				var crop = options.crop = { width: 50, height: 50 };
				// Scan through presets and select one if none is selected
				var presets = options.presets;
				if (presets) {
					// Find selected preset first
					var selected = presets.find(function(preset) {
						if (preset.selected)
							return preset;
					});
					// If there is none, find the first and select it.
					if (!selected) {
						selected = presets.find(function(preset) {
							if (preset)
								return preset;
						});
						if (selected)
							selected.selected = true;
					}
					if (selected) {
						if (crop.width < selected.width)
							crop.width = selected.width;
						if (crop.height < selected.height)
							crop.height = selected.height;
					}
				}
				crop.left = Math.round((picture.width - crop.width) / 2);
				crop.top = Math.round((picture.height - crop.height) / 2);
			}
			return options;
		},

		getButtons: function(baseForm, name) {
			return null;
		},

		renderButtons: function(baseForm, name, wrapped, out) {
			var buttons = this.getButtons(baseForm, name);
			if (buttons && buttons.length)
				return baseForm.renderButtons(buttons, wrapped, out);
		},

		toString: function() {
			var out = [];
			['type', 'name', 'index', 'row', 'groupForm'].each(function(val) {
				if (this[val] !== undefined) {
					out.push(val + ': ' + (val == 'row' 
							? this.row.index : this[val]));
				}
			}, this);
			return '{ ' + out.join(', ') + ' }';
		},

		statics: {
			extend: function(src) {
				return (src._types || '').split(',').each(function(type) {
					types[type] = this;
				}, this.base(src));
			},

			initialize: function(item) {
				// Convert the item which is a plain object to that prototype
				// by setting its __proto__ field.
				// This hack works on Rhino but not on every browser:
				var type = item.type && types[item.type] || EditItem;
				item.__proto__ = type.prototype;
				return item.initialize && item.initialize() || item;
			}
		}
	}
});
