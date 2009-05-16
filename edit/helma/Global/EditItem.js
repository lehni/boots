/* TODO:
- Rename .name -> id?
- Rename getEditName -> getEditId() ?
- Don't pass name in render? but use getEditId like everywhere else?
*/

EditItem = Base.extend(new function() {
	var types = new Hash();

	return {
		_scale: false,

		initialize: function() {
			if (this.prototypes) {
				// Convert prototypes string to array of prototype names
				if (typeof this.prototypes == 'string') {
					this.prototypes = this.prototypes.split(/\s*,\s*/);
				} else if (this.prototypes instanceof Function) {
					// If it's one constructor, create an array containing its name.
					this.prototypes = [this.prototypes.name];
				} else if (this.prototypes instanceof Array) {
					// Make sure the array only contains strings. If constructor functions
					// are listed, access their name field which seems to be defined
					// for HopObject constructors:
					for (var i = 0, j = this.prototypes.length; i < j; i++) {
						var proto = this.prototypes[i];
						// If it's a constructor, assume it's a HopObject and
						// use its name
						if (proto instanceof Function)
							this.prototypes[i] = proto.name;
					}
				}
			}
		},

		render: function(baseForm, name, value, param, out) {
		},

		convert: function(value) {
			return EditForm.DONT_APPLY;
		},

		convertBreaks: function(str) {
			// Helper function: convert any possible kind of line breaks to \n
			// TODO: exchange with platform linebreak here...
			// this can be used when retrieveing values from forms
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
				// Evaluates the content of item.evaluate in the object and returns it.
				// Use a function instead of eval, as only in this way, in "this.evaluate"
				// "this" will point to the right object.
				try {
					return new Function('return ' + this.evaluate).call(this.form.object);
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
				// evaluate string variable to the content of value:
				try {
					new Function(this.evaluate + ' = value;').call(this.form.object);
					return true;
				} catch (e) {
					User.logError('EditItem#setValue(): ' + this.evaluate, e);
				}
			} else if (this.name) {
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
			return Hash.merge({
				edit_item: this.name,
				edit_group: this.form.name
			}, params);
		},

		getPrototypes: function() {
			// Convert string prototype names to constructors
		 	return this.prototypes && this.prototypes.collect(function(name) {
				var proto = global[name];
				if (proto) return proto;
				User.log("WARNING: Prototype '" + name + "' does not exist!");
			});
		},

		getPrototypeEditButton: function(baseForm, param) {
			// Pass an array containing name / creation handler href mappings
			// if there are more than one prototype.
			// If there's only one prototype, directly use the href that produces
			// it.
			var editName = this.getEditName();
			var editParam = this.getEditParam();
			var prototypes = this.prototypes.map(function(proto) {
				return {
					name: proto.uncamelize(),
					href: baseForm.renderHandle('select_new', editName, proto,
						Hash.merge({ edit_prototype: proto }, editParam))
				};
			});
			return Hash.merge({
				name: editName + '_new',
				onClick: prototypes.length == 1
					? prototypes[0].href
					: baseForm.renderHandle('select_new', editName, prototypes, editParam)
			}, param);
		},

		toString: function() {
			var out = [];
			['type', 'name', 'index', 'row', 'groupForm'].each(function(val) {
				if (this[val] != undefined) {
					out.push(val + ': ' + (val == 'row' ? this.row.index : this[val]));
				}
			}, this);
			return '{ ' + out.join(', ') + ' }';
			/*
			return '{ ' + Base.each(this, function(val, key) {
				this.push(key + ': ' + val);
			}, []).join(', ') + ' }';
			*/
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

StringItem = EditItem.extend(new function() {
	// display something that looks like a password
	var pseudoPassword = '\xa0\xa0\xa0\xa0\xa0\xa0';

	return {
		_types: 'string,password',
		_scale: true,

		render: function(baseForm, name, value, param, out) {
			if (this.type == 'password')
				value = pseudoPassword;
			Html.input({
				type: this.type == 'password' ? 'password' : 'text',
				name: name, value: value, size: this.size || '20',
				maxlength: this.length, className: this.className || 'edit-element' 
			}, out);
			if (this.hasLinks && this.type == 'string')
				this.renderLinkButtons(baseForm, name, out);
		},

		convert: function(value) {
			if (this.type == 'password') {
				// in case it's still PSEUDO_PASSWORD, don't apply:
				return value == pseudoPassword ? EditForm.DONT_APPLY : value;
			} else {
				return this.convertBreaks(value);
			}
		},

		renderLinkButtons: function(baseForm, name, out) {
			return baseForm.renderTemplate('button#buttons', {
				spacer: true,
				buttons: baseForm.renderButtons([{
					name: name + '_link',
					value: 'Internal Link',
					onClick: baseForm.renderHandle('choose_link', name, {
						root: this.root ? this.root.getFullId() : '',
						multiple: false
					})
				}, {
					name: name + '_url',
					value: 'External Link',
					onClick: baseForm.renderHandle('choose_url', name)
				}])
			}, out);
		}
	};
});

TextItem = StringItem.extend({
	_types: 'text',
	_scale: true,

	render: function(baseForm, name, value, param, out) {
		Html.textarea({
			name: name, value: value,
			cols: this.cols || '40',
			rows: this.rows || '5',
			wrap: this.wrap || 'virtual',
			className: this.className || 'edit-element' 
		}, out);
		if (this.hasLinks)
			this.renderLinkButtons(baseForm, name, out);
	},

	convert: function(value) {
		return this.convertBreaks(value);
	}
});

HiddenItem = EditItem.extend({
	_types: 'hidden',

	render: function(baseForm, name, value, param, out) {
		Html.input({type: 'hidden', name: name, value: value }, out);
	}
});

NumberItem = EditItem.extend({
	_types: 'number,integer',
	_scale: true,

	render: function(baseForm, name, value, param, out) {
		var def = value || this.defaultValue || "''";
		Html.input({
			type: 'text', name: name, size: this.size || '5', value: value, 
			onChange: baseForm.renderHandle('number_format', name, this.type,
				def, this.minValue, this.maxValue),
			className: this.className || 'edit-element'
		}, out);
		if (this.length)
			input.maxlength = this.length;
	},

	convert: function(value) {
		if (value != null && value != '') {
			if (this.minValue != null && value < this.minValue)
				value = this.minValue;
			else if (this.maxValue != null && value > this.maxValue)
				value = this.maxValue;
		} else value = null;
		return value;
	}
});

BooleanItem = EditItem.extend({
	_types: 'boolean',

	render: function(baseForm, name, value, param, out) {
		baseForm.renderTemplate('booleanItem', {
			name: name, current: value ? 1 : 0,
			className: this.className || 'edit-element',
			text: this.text
		}, out);
	},

	convert: function(value) {
		return value == null ? 0 : value;
	}
});

DateItem = EditItem.extend({
	_types: 'date',

	render: function(baseForm, name, value, param, out) {
		var first = true;
		function renderSelect(name, start, end, format, value) {
			var options = [];
			var months = format == 'MMMM';
			for (var i = start; i <= end; i++) {
				options.push({ 
					value: i,
					name: months ? new Date(2000, i, 1).format(format) : i.format(format),
					selected: i == value
				});
			}
			if (!first) out.write(' ');
			Html.select({
				name: name, options: options, className: this.className
			}, out);
			first = false;
		}
		var now = new Date();
		var date = value ? value : now;
		if (this.day)
			renderSelect(name + '[day]', 1, 31, '00', date.getDate());
		if (this.month)
			renderSelect(name + '[month]', 0, 12, 'MMMM', date.getMonth());
		if (this.year)
			renderSelect(name + '[year]', this.startYear || 2000,
				now.getFullYear() + 2, '0000', date.getFullYear());
		if (this.hours)
			renderSelect(name + '[hours]', 0, 23, '00', date.getHours());
		if (this.minutes)
			renderSelect(name + '[minutes]', 0, 59, '00', date.getMinutes());
		if (this.seconds)
			renderSelect(name + '[seconds]', 0, 59, '00', date.getSeconds());
	},

	convert: function(value) {
		return new Date(
			value.year,
			value.month || 0,
			value.day || 1,
			value.hours || 0,
			value.minutes || 0,
			value.seconds || 0
		);
	}
});

ButtonItem = EditItem.extend({
	_types: 'button',

	render: function(baseForm, name, value, param, out) {
		var onClick = null;
		if (this.onClick) {
			var params = this.getEditParam({ post: true });
			if (this.confirm)
				params.confirm = this.confirm;
			// if onClick is a string, it's js code to be executed
			// on the client side.
			// otherwise it's a callback handler on the server
			if (typeof this.onClick == 'string') {
				onClick = this.onClick;
			} else {
				onClick = baseForm.renderHandle('execute', 'click', Json.encode(params));
			}
		}
		baseForm.renderButton({
			value: this.value,
			name: this.name,
			onClick: onClick,
			className: this.className
		}, out);
	}
})

FileItem = EditItem.extend({
	_types: 'file',

	render: function(baseForm, name, value, param, out) {
		if (value)
			out.write(value + '<br />');
		Html.input({
			type: 'file', name: name, size: this.size || '20',
			className: this.className || 'edit-element'
		}, out);
	},

	convert: function(value) {
		// TODO: Fix in Helma: even if no file was attached, we seem to get a
		// mime type object. The solution is to test name too:
		return value && (!value.getName || !value.getName()) ? EditForm.DONT_APPLY : value;
	}
});

// Abstract baes for SelectItem and EditableListItem
ListItem = EditItem.extend({

	/**
	 * We are supporting two modes of sorting / hiding in lists and multiselects:
	 *
	 * - Index mode: visible items are sorted by index, hidden ones
	 *   are defined by setting index to null
	 *
	 * - Position / Visible mode: position is used as an index for both
	 *   visible and hidden items, in their respective lists. visible
	 *   controlls the visibility.
	 *
	 * setPosition is here to fasciliate these modes
	 */
	setPosition: function(obj, position, visible) {
		if (obj.position !== undefined && obj.visible !== undefined) {
			// Position / Visible mode
			if (obj.position != position || !obj.visible != !visible) {
				obj.position = position;
				obj.visible = visible;
				return true;
			}
		} else if (object.index !== undefined) {
			// Index mode: Set index to null to hide item
			var index = visible ? position : null;
			if (obj.index != index) {
				obj.index = index;
				return true;
			}
		}
		return false;
	},

	store: function(object) {
		// This is called by handlers.js when a new object is created in the list
		// Just add it to the collection and handle position and visible:
		// Don't count on this.value to be set, use getValue instead, since it
		// resolves this.name on the object as well.
		var value = this.getValue();
		if (this.collection) {
			// Add it to the collection(s):
			// Support for visible lists and hidden (all) lists. Since the 
			// object might remain transient for a while, simulate the proper
			// result of collection filtering here: A visible object appears both
			// in value and collection, and hidden one only in collection:
			var list = this.collection;
			if (list.get(object.name))
				throw 'This list already contains an item named "' + object.name + '".';
			list.add(object);
			// TODO: How to support index based position here? Can we use EditItem.setPosition 
			// somehow too?
			if (object.visible && value instanceof HopObject && value != list) {
				// If visible, add it to this.value as well, and use that for
				// position bellow
				value.add(object);
				list = value;
			}
			// Support for position:
			if (object.position !== undefined)
				object.position = list.count() - 1;
		} else if (value instanceof HopObject) {
			value.add(object);
		} else {
			return false;
		}
		return true;
	}
});

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
		
		// convert to id
		if (value != null && value instanceof HopObject)
			value = value.getFullId();
		// mark the selected
		options.each(function(option) {
			if (option.value == value)
				option.selected = true;
		});
		var select = {
			name: name, className: this.className || 'edit-element'
		};
		if (this.size)
			select.size = this.size;

		var editButtons = this.renderEditButtons(baseForm);
		if (editButtons)
			select.onDblClick = baseForm.renderHandle('select_edit', [name], this.getEditParam());
		select.options = options;
		Html.select(select, out);
		if (editButtons)
			baseForm.renderTemplate('button#buttons', {
				// for multi line items, add the buttons bellow,
				// for pulldown, add them to the right
				spacer: this.size,
				buttons: editButtons
			}, out);
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

	renderEditButtons: function(baseForm, out) {
		var name = this.getEditName();
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
				onClick: baseForm.renderHandle('select_move', name, selParam,
					Hash.merge({ edit_prototype: this.destPrototype || '' }, editParam))
			});
		}
		if (this.prototypes)
			buttons.push(this.getPrototypeEditButton(baseForm, { value: 'New '}), {
				value: 'Delete',
				onClick: baseForm.renderHandle('select_remove', selParam, editParam)
			});
		return baseForm.renderButtons(buttons, out);
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
							name: EditForm.getEditName(obj),
							value: obj.getFullId()
						});
					}
				}
				/*
				options = param.list().each(function(obj) {
					if (obj) {
						var name = EditForm.getEditName(obj);
						this.push({
							name: EditForm.getEditName(obj),
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

MultiSelectItem = SelectItem.extend({
	_types: 'multiselect,references',
	_scale: true,

	render: function(baseForm, name, value, param, out) {
		var options = this.toOptions(this.collection || this.linkedCollection || this.options);
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
					EditForm.alert('Unable to get full ids from string list.\nPlease make sure linkedCollection is set.');
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
				onClick: baseForm.renderHandle('choose_reference', name, {
					root: this.root ? this.root.getFullId() : '',
					multiple: true
				})
			}, {
				value: 'Remove',
				onClick: baseForm.renderHandle('references_remove', name)
			}]);
		} else {
			param.buttons = this.renderEditButtons(baseForm);
		}
		var size = Base.pick(this.size, '6');
		var left = name + '_left', right = name + '_right';
		var editParam = param.buttons && this.getEditParam();
		param.left = Html.select({
			size: size, name: left, multiple: true,
			options: values, className: this.className || 'edit-element',
			onDblClick: editParam && baseForm.renderHandle('select_edit', [left], editParam)
		});
		if (this.showOptions) {
			param.right = Html.select({
				size: size, name: right, multiple: true,
				options: options, className: this.className || 'edit-element',
				onDblClick: editParam && baseForm.renderHandle('select_edit', [right], editParam)
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

		// Also make sure the objects are contained in collection if that is defined.
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
					app.log('Filtering out ' + obj);
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

ReferenceItem = EditItem.extend({
	_types: 'reference',
	_scale: true,

	render: function(baseForm, name, value, param, out) {
		if (value != null && !(value instanceof HopObject)) value = null;
		Html.input({
			type: 'text', name: name + '_reference',
			readonly: 'readonly',
			value: value != null ? EditForm.getEditName(value) : ''
		}, out);
		out.write(' ');
		var buttons = [{
			name: name + '_choose', value: 'Choose',
			onClick: baseForm.renderHandle('choose_reference', name, {
				root: this.root ? this.root.getFullId() : '',
				selected: value ? value.getFullId() : '',
				multiple: false
			})
		}];
		if (this.editable) {
			buttons.push({
				name: name + '_edit', value: 'Edit', 
				onClick: baseForm.renderHandle('execute', 'edit', this.getEditParam())
			});
		}
		baseForm.renderButtons(buttons, out);
		Html.input({
			type: 'hidden', name: name,
			value: value ? value.getFullId() : null
		}, out);
	},

	convert: function(value) {
		return HopObject.get(value);
	}
});

ObjectItem = EditItem.extend({
	_types: 'object',

	render: function(baseForm, name, value, param, out) {
		var title = this.title ? ' ' + this.title : '';
		return baseForm.renderButton(value ? {
				value: 'Edit' + title,
				onClick: baseForm.renderHandle('execute', 'edit', this.getEditParam())
			} : this.getPrototypeEditButton(baseForm, {
				value: 'Create' + title
			}), out);
	}
});

GroupItem = EditItem.extend({
	_types: 'group',

	render: function(baseForm, name, value, param, out) {
		baseForm.renderButton({
			value: 'Edit',
			onClick: baseForm.renderHandle('execute', 'group', this.getEditParam())
		}, out);
	}
});

ColorItem = EditItem.extend({
	_types: 'color',

	render: function(baseForm, name, value, param, out) {
		baseForm.renderTemplate('colorItem', {
			name: name, value: value,
			width: this.width,
			className: this.className || 'edit-element'
		}, out);
	},

	convert: function(value) {
		return value;
	}
});

RulerItem = EditItem.extend({
	_types: 'ruler',

	render: function(baseForm, name, value, param, out) {
		baseForm.renderTemplate('rulerItem', null, out);
	}
});

HelpItem = EditItem.extend({
	_types: 'help',

	render: function(baseForm, name, value, param, out) {
		if (!this.initialized) {
			// Add the button only once to the form!
			baseForm.addButtons({
				value: 'Help', className: 'edit-help-button',
				onClick: baseForm.renderHandle('help_toggle')
			});
			this.initialized = true;
		}
		baseForm.renderTemplate('helpItem', {
			text: this.text
		}, out);
	}
});

EditableListItem = ListItem.extend({
	_types: 'list',

	getEditForm: function(obj, id) {
		var form = EditForm.get(obj);
		// Update the edit form's variablePrefix to group by this
		// edit item.
		// TODO: Since we're using cached forms, this means we cannot use
		// the same form elsewhere at the same time.
		if (id == null)
			id = obj.isTransient() ? '<%id%>' : obj._id;
		form.entryId = id;
		form.variablePrefix = this.getEditName() + '_' + id + '_';
		// Change with settings to relative size
		form.setWidth('100%');
		return form;
	},

	renderEditForm: function(baseForm, name, obj, param, out) {
		var form = this.getEditForm(obj);
		baseForm.renderTemplate('listItem#entry', {
			id: name + '_' + form.entryId,
			name: name,
			width: param.calculatedWidth,
			create: obj.isTransient(),
			sortable: this.sortable,
			items: form.renderItems(baseForm, {
				itemsOnly: true
			})
		}, out);
	}.toRender(),

	render: function(baseForm, name, value, param, out) {
		if (this.button && !this.initialized) {
			// Add the button only once to the form!
			var prototypes = this.getPrototypes();
			var proto = prototypes[0];
			if (proto) {
				// Create an empty instance in order to render small edit form:
				var html = this.renderEditForm(baseForm, name, new proto(), param);
				baseForm.addButtons({
					value: this.button,
					onClick: baseForm.renderHandle('list_add', name, html)
				});
			}
			this.initialized = true;
		}
		out.push();
		var ids = [];
		var list = this.collection.list();
		for (var i = 0; i < list.length; i++) {
			var obj = list[i];
			this.renderEditForm(baseForm, name, obj, param, out);
			ids.push(obj._id);
		}
		baseForm.renderTemplate('listItem#list', {
			name: name,
			entries: out.pop(),
			ids: ids
		}, out);
	},

	convert: function(value) {
		// Make sure apply gets called
		return value;
	},

	apply: function(value) {
		// Produce positions
		var positions = value ? value.split(',').each(function(id, index) {
			this[id] = index;
		}, {}) : {};
		var changed = false;
		var name = this.getEditName();
		// Scan through all values and group by id
		var create = {};
		var applied = {};
		for (var key in req.data) {
			if (key.startsWith(name)) {
				var rest = key.substring(name.length + 1);
				var pos = rest.indexOf('_');
				var id = rest.substring(0, pos);
				if (/^n/.test(id)) { // Create
					// Group values and process later.
					// This is neede by the onCreate handler that
					// can produce an object based on e.g. file type
					var variable = rest.substring(pos + 1);
					var entry = create[id];
					if (!entry)
						entry = create[id] = {};
					entry[variable] = req.data[key];
				} else if (!applied[id]) { // Apply
					// Mark this object as applied once one field was found,
					// since form handles the rest.
					applied[id] = true;
					// Just pass this through the form. No further
					// grouping is needed.
					var obj = this.collection.getById(id);
					if (obj) {
						if (req.data[name + '_' + id + '_delete']) {
							changed = obj.remove();
						} else {
							var form = this.getEditForm(obj);
							if (form)
								changed = form.applyItems() || changed;
							// Set the object's position
							changed = this.setPosition(obj, positions[id], true) || changed;
						}
					}
				}
			}
		}
		// Now produce the new items
		// Determine prototype in case onCreate does not produce the item.
		var prototypes = this.getPrototypes();
		var proto = prototypes[0];
		for (var id in create) {
			// Support an onCreate handler that can produce special types
			// e.g. based on the file type. That's also the only reason
			// why we collect all values above, so that onCreate can analyse them.
			var obj = this.onCreate && this.onCreate(create[id]);
			if (obj) {
				// Make sure all additional things are setup correctly
				obj.setCreating(true);
			} else {
				// Use createObject to handle all the special editing stuff
				obj = EditForm.createObject(proto, this);
			}
			if (obj) {
				// Just like in the rest of edit lib, apply first, persist after
				var form = this.getEditForm(obj, id);
				if (form) {
					form.applyItems();
					changed = this.store(obj) || changed;
					// Set the object's position
					changed = this.setPosition(obj, positions[id], true) || changed;
				}
			}
		}
		return changed;
	}
});
