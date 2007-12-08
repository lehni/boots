EditItem = Base.extend(new function() {
	var types = new Hash();

	return {
		_scale: false,

		render: function(baseForm, name, value, param, out) {
		},

		convert: function(value) {
			return EditForm.DONT_APPLY;
		},

		convertBreaks: function(str) {
			// Helper function: convert any possible kind of line breaks to \n
			// TODO: exchange with platform linebreak here...
			// this can be used when retrieveing values from forms
			return str ? str.replace(/\n\r|\r\n|\r/g, '\n') : str;
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
			} else if (this.variable) {
				// evaluates the content of item.variable in the object and returns it.
				// Use a function instead of eval, as only in this way, in "this.variable"
				// "this" will point to the right object.
				try {
					return new Function('return ' + this.variable).call(this.form.object);
				} catch (e) {
					User.logError('EditItem#getValue(): ' + this.variable, e);
				}
			} else if (this.name) {
				 // read the property with given name
				return this.form.object[this.name];
			}
			return null;
		},

		setValue: function(value) {
			if (this.variable) {
				// evaluate string variable to the content of value:
				try {
					new Function(this.variable + ' = value;').call(this.form.object);
					return true;
				} catch (e) {
					User.logError('EditItem#setValue(): ' + this.variable, e);
				}
			} else if (this.name) {
				this.form.object[this.name] = value;
				return true;
			}
			return false;
		},

		getOptions: function() {
			return { scaleToFit: this._scale };
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
				return src._types.split(',').each(function(type) {
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
			out.write('<div class="edit-spacer"></div>');
			this.form.renderButtons([{
				name: name + '_link',
				value: 'Internal Link',
				onClick: baseForm.renderHandle('choose_link', name)
			}, {
				name: name + '_url',
				value: 'External Link',
				onClick: baseForm.renderHandle('choose_url', name)
			}], out);
		}.toRender(),
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
		Html.input({
			type: 'checkbox', name: name, current: value ? 1 : 0,
			className: this.className || 'edit-element'
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
					name: months ? new Date(2000, i, 1).format(format) :
						i.format(format),
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
			renderSelect(name + '_day', 1, 31, '00',
				date.getDate());
		if (this.month)
			renderSelect(name + '_month', 0, 12, 'MMMM',
				date.getMonth());
		if (this.year)
			renderSelect(name + '_year', 1999, now.getFullYear() + 2, '0000',
				date.getFullYear());
		if (this.hours)
			renderSelect(name + '_hours', 0, 23, '00',
				date.getHours());
		if (this.minutes)
			renderSelect(name + '_minutes', 0, 59, '00',
				date.getMinutes());
		if (this.seconds)
			renderSelect(name + '_seconds', 0, 59, '00',
				date.getSeconds());
	},

	convert: function(value) {
		var prefix = this.form.variablePrefix + this.name;
		return new Date(
			req.data[prefix + '_year'],
			req.data[prefix + '_month'],
			req.data[prefix + '_day'],
			req.data[prefix + '_hours'],
			req.data[prefix + '_minutes'],
			req.data[prefix + '_seconds']
		);
	}
});

ButtonItem = EditItem.extend({
	_types: 'button',

	render: function(baseForm, name, value, param, out) {
		var onClick = null;
		if (this.onClick) {
			var params = {
				post: true,
				edit_item: this.name,
				edit_group: this.form.name
			}
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
		this.form.renderButton({
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
		// TODO: Fix in Helma: even if no file was attached,
		// i seem to get a mime type object. test name:
		return value && (!value.getName || !value.getName()) ? EditForm.DONT_APPLY : value;
	}
});

SelectItem = EditItem.extend({
	_types: 'select',
	_scale: true,

	initialize: function() {
		// Convert prototypes to array containing strings
		if (typeof this.prototypes == 'string') {
			this.prototypes = this.prototypes.split(/\s*,\s*/);
		} else if (this.prototypes instanceof Array) {
			// Make sure the array only contains strings. If constructor functions
			// are listed, access their name field which seems to be defined
			// for HopObject constructors:
			for (var i = 0, j = this.prototypes.length; i < j; i++) {
				var proto = this.prototypes[i];
				if (typeof proto == 'function')
					this.prototypes[i] = proto.name;
			}
		}
	},

	getOptions: function() {
		return { scaleToFit: !!this.size };
	},

	render: function(baseForm, name, value, param, out) {
		var options = this.toOptions(this.collection || this.options);
		if (this.allowNull)
			options.unshift({ name: '', value: 'null' });
		
		// convert to id
		if (value != null && value instanceof HopObject)
			value = value._id;
		
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
		if (editButtons) {
			select.onDblClick = baseForm.renderHandle('select_edit', [name],
				{ edit_item: this.name, edit_group: this.form.name });
			select.options = options;
			Html.select(select, out);
			// for multi line items, add the buttons bellow,
			// for pulldown, add them to the right
			out.write(this.size ? '<div class="edit-spacer"></div>' : ' ');
			out.write(editButtons);
		}
	},

	convert: function(value) {
		return value;
	},

	apply: function(value) {
		// Only set if it changed, and if the current value is not the collection
		// itself, as we cannot override collections (this happens e.g. when
		// using a select item for simply creating a list of objects, not
		// actually selecting and that is associated with a object mapping
		if (this.collection && !this.linkedCollection) {
			if (this.collection == this.getValue())
				return false;
			if (value)
				value = this.collection.getById(value);
		}
		return this.base(value);
	},

	renderEditButtons: function(baseForm, out) {
		var name = this.form.variablePrefix + this.name;
		var editParams = {
			edit_item: this.name,
			edit_group: this.form.name
		};
		var selParams = this.type == 'multiselect'
			? [ name + '_left', name + '_right' ]
			: [ name ];

		var buttons = [];
		if (this.prototypes || this.editable) {
			buttons.push({
				value: 'Edit',
				onClick: baseForm.renderHandle('select_edit', selParams, editParams)
			});
		}
		if (this.movable) {
			buttons.push({
				value: 'Move',
				name: name + '_move',
				onClick: baseForm.renderHandle('select_move', name, selParams,
					Hash.merge({ edit_prototype: this.destPrototype || '' }, editParams))
			});
		}
		if (this.prototypes) {
			// Pass an array containing name / creation handler href mappigns
			// if there are more than one prototype.
			// If there's only one prototype, directly use the href that produces
			// it.
			var prototypes = this.prototypes.map(function(proto) {
				return {
					name: proto.uncamelize(' ', false),
					href: baseForm.renderHandle('select_new', name, proto,
						Hash.merge({ edit_prototype: proto }, editParams))
				};
			});
			buttons.push({
				value: 'New',
				name: name + '_new',
				onClick: prototypes.length == 1
					? prototypes[0].href
					: baseForm.renderHandle('select_new', name, prototypes, editParams)
			},{
				value: 'Delete',
				onClick: baseForm.renderHandle('select_remove', selParams, editParams)
			});
		}
		return this.form.renderButtons(buttons, out);
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
				// TODO: optimize
				options = [];
				var list = param.list();
				for (var i = 0; i < list.length; i++) {
					var obj = list[i];
					if (obj != null) {
						var name = EditForm.getEditName(obj);
						options.push({
							name: name ? name :
								'[' + obj._prototype + ' ' + obj._id + ']',
							value: obj._id
						});
					}
				}
			}
		}
		if (options) {
			for (var i = 0; i < options.length; i++) {
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
		// convert values to a list of ids.
		var ids = IdList.toArray(value);
		// find the chosen ones.
		// create ids indices lookup table:
		var indices = {};
		for (var i = 0; i< ids.length; i++) {
			indices[ids[i]] = i;
		}

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
		// render the ids of the left column as a hidden input.
		// This value is manipulated by select_* handlers
		param.ids = ids.join(',');
		if (this.type == 'references') {
			// references has only the name + _left column and
			// different edit buttons
			param.buttons = [{
				value: 'Add',
				onClick: baseForm.renderHandle('choose_reference', name + '_left')
			}, {
				value: 'Delete',
				onClick: baseForm.renderHandle('reference_remove', [name + '_left'])
			}];
		} else {
			param.buttons = this.renderEditButtons(baseForm);
		}
		var size = this.size || '6';
		// var width = this.width || '120';
		var left = name + '_left', right = name + '_right';
		var editParam = param.buttons ? { edit_item: this.name, edit_group: this.form.name } : null;
		param.left = Html.select({
			size: size, name: left, multiple: true,
			/* style: 'width: ' + width + 'px;', */ 
			options: values, className: this.className || 'edit-element',
			onDblClick: !editParam ? null
				: baseForm.renderHandle('select_edit', [left], editParam)
		});
		if (this.showOptions) {
			param.right = Html.select({
				size: size, name: right, multiple: true,
				/* style: 'width: ' + width + 'px;', */
				options: options, className: this.className || 'edit-element',
				onDblClick: !editParam ? null
					: baseForm.renderHandle('select_edit', [right], editParam)
			});
		}
		baseForm.renderTemplate('multiSelectItem', param, out);
	},

	convert: function(value) {
		if (this.type == 'multiselect') {
			// don't  convert to array for string id lists
			if (!this.linkedCollection)
				value = value ? value.split(',') : [];
		}
		return value;
	},

	apply: function(value) {
		var changed = false;
		if (this.linkedCollection) {
			// For string id lists:
			changed = this.base(value);
			// Refresh the collection:
			if (changed)
				this.linkedCollection.invalidate();
		} else if (this.type == 'multiselect') {
			// Standard procedure for multiselects assumes
			// 'position' property that controls the ordering of the objects
			// 'visible' property that controls their visibility
			var options = this.collection;
			// Look-up table for used items
			if (options) {
				var used = {};
				for (var i = 0; i < value.length; i++) {
					var id = value[i];
					used[id] = true;
					var obj = options.getById(id);
					if (obj && (obj.position != i || !obj.visible)) {
						obj.position = i;
						obj.visible = true;
						changed = true;
					}
				}
				// Now delete the positions of the unused items:
				var list = options.list();
				for (var i = 0; i < list.length; i++) {
					var obj = list[i];
					var pos = value.length + i;
					if (!used[obj._id] && (obj.position != pos || obj.visible)) {
						obj.position = pos;
						obj.visible = false;
						changed = true;
					}
				}
			}
		} else {
			changed = this.base(value);
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
			// TODO: allow display of current selection in object choosers!
			onClick: baseForm.renderHandle('choose_reference', name, false /*, value ? value.getEditId() : ''*/)
		}];
		if (this.editable) {
			buttons.push({
				name: name + '_edit', value: 'Edit', 
				onClick: baseForm.renderHandle('execute', 'edit',
					{ edit_item: this.name, edit_group: this.form.name })
			});
		}
		this.form.renderButtons(buttons, out);
		Html.input({
			type: 'hidden', name: name,
			value: value ? value.getEditId() : null
		}, out);
	},

	convert: function(value) {
		return value ? HopObject.get(value) : null;
	},

	apply: function(value) {
		this.base(value);
	}
});

ObjectItem = EditItem.extend({
	_types: 'edit', // TODO: rename!

	render: function(baseForm, name, value, param, out) {
		var title = this.title ? ' ' + this.title : '';
		var mode;
		if (value) {
			title = 'Edit' + title;
			mode = 'edit';
		} else {
			title = 'Create' + title;
			mode = 'new';
		}
		this.form.renderButton({
			value: title,
			onClick: baseForm.renderHandle('execute', mode,
				{ edit_item: this.name, edit_group: this.form.name })
		}, out);
	}
});

GroupItem = EditItem.extend({
	_types: 'group',

	render: function(baseForm, name, value, param, out) {
		this.form.renderButton({
			value: 'Edit',
			onClick: baseForm.renderHandle('execute', 'group',
				{ edit_item: this.name, edit_group: this.form.name })
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
			// TODO: this.form or baseForm?
			this.form.addButtons({
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
