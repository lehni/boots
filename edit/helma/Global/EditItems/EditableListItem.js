EditableListItem = ListItem.extend({
	_types: 'list',

	getEditForm: function(object, id, width, force) {
		// Do not use cached forms, but rather ask the object for a new form
		// each time. This reduces memory foot-print and should be faster enough,
		// as most nested editable list forms are quick to generate.
		var form = object.getEditForm({});
		if (id == null)
			id = object._id;
		form.entryId = id;
		// Let edit param know about edit_entry_id to be sent back
		// from client side to identify editable list entry form items.
		form.listEntryId = object.getFullId();
		// Only shrink if it does not fit. It might be the user has already
		// taken care of it.
		if (width && form.width >= width) {
			form.width = width;
		}
		if (this.padding !== undefined) {
			form.padding = this.padding;
		} else if (this.inline) {
			form.padding = 0;
		}
		// Update the edit form's variablePrefix to group by this
		// edit item.
		form.setVariablePrefix(this.getEditName() + '_' + id + '_');
		// Copy over labels setting, to allow list to control whether labels
		// appear or not.
		form.showLabels = this.showLabels;
		return form;
	},

	getAddPrototypeButton: function(baseForm, name, param) {
		if (!this.chooser) {
			// In order to avoid endless recursion, we are first setting
			// the chooser object to the valid name.
			// Since getPrototypeChooserList calls getAddPrototypeButton through
			// renderEntry again, this would lead to an endless recursion
			// otherwise.
			this.chooser = { name: name + '_chooser' };
			this.chooser.list = this.getPrototypeChooserList(baseForm,
				function(ctor) {
					// Create an empty instance in order to render small edit
					// form.
					// Pass ctor.dont and call initialize() explicitely, in
					// order to not rely Boot's internal edit node structure
					// which consumes a lot of memory and performs unneeded
					// initialization steps. 
					var obj = new ctor(ctor.dont);
					// Set the parentNode, which normally gets set automatically
					// in setCreating(). This is required to make 
					// getParentNode() to work in initialize() and getEditForm()
					// Do not rely on the form's edit node, as forms used in
					// editable lists do not have associated nodes.
					var parent = this.form.root.object;
				 	obj.cache.parentNode = parent;
					if (obj.initialize) {
						var ret = obj.initialize();
						if (ret) {
							obj = ret;
							// In case initialize() returns another object,
							// set it again
						 	obj.cache.parentNode = parent;
						}
					}
					var html = this.renderEntry(baseForm, name, obj, {
						add: param.add, width: param.width,
						id: '{%' + name + '_id%}'
					});
					return baseForm.renderHandle('list_add', name, html,
						'{%' + name + '_entry_id%}');
				});
		}
		return this.getPrototypeChooserButton(baseForm, { 
			name: name + (param.entryId ? '_' + param.entryId : ''),
			value: param.value
		}, this.chooser);
	},

	renderEntry: function(baseForm, name, object, param, out) {
		// Force a newly created form each time we're rendering
		var form = this.getEditForm(object, param.id, param.width, true);
		return baseForm.renderTemplate('listItem#entry', {
			id: name + '_' + form.entryId,
			name: name,
			proto: object._prototype,
			hide: this.hideable
					// Default for new items is visible in editable lists.
					? object.visible == null || object.visible ? 0 : 1
					: null,
			width: param.width,
			create: object.isTransient(),
			sortable: this.sortable,
			removable: this.removable,
			items: form.renderItems(baseForm, {
				itemsOnly: true
			}),
			addHandler: this.addEntries
				&& this.getAddPrototypeButton( baseForm, name, {
					width: param.width, entryId: form.entryId
				}).onClick
		}, out);
	},

	render: function(baseForm, name, value, param, out) {
		var width = param.calculatedWidth;
		if (baseForm.getShowLabels(this.showLabels) != 'top') {
			// If there are no labels at the top, remove the width for the
			// editing buttons from the width available to the nested forms
			var buttonWidth = 16; // 12px + 4px margin
			if (this.addEntries)
				width -= buttonWidth;
			if (this.sortable)
				width -= buttonWidth;
			if (this.hideable)
				width -= buttonWidth;
			if (this.removable)
				width -= buttonWidth;
		}
		// Add the button only once to the form!
		// TODO: Rename addButton to better name?
		if (this.addButton && !this.initialized) {
			var button = this.getAddPrototypeButton(baseForm, name, {
				width: width,
				value: this.addButton
			});
			baseForm.addButtons(button);
			this.initialized = true;
		}
		var entries = [];
		var ids = [];
		var list = this.collection.list();
		for (var i = 0; i < list.length; i++) {
			var obj = list[i];
			entries.push(this.renderEntry(baseForm, name, obj, {
				width: width
			}));
			ids.push(obj._id);
		}
		baseForm.renderTemplate('listItem#list', {
			name: name,
			inline: this.inline,
			addEntries: this.addEntries,
			addHandler: this.addEntries
				&& this.getAddPrototypeButton(baseForm, name, {
					width: width
				}).onClick,
			// Chooser needs to come after getAddPrototypeButton:
			chooser: this.chooser,
			entries: entries.join(''),
			ids: ids
		}, out);
	},

	convert: function(value) {
		// Make sure apply gets called
		return value;
	},

	apply: function(value) {
		var changed = false;
		var name = this.getEditName();
		// Scan through all values and group by id
		var create = {};
		var applied = {};
		// Link ids to entries, also for newly created ones (n*)
		var entries = {};
		for (var key in req.data) {
			if (key.startsWith(name)) {
				var rest = key.substring(name.length + 1);
				var pos = rest.indexOf('_');
				var id = rest.substring(0, pos);
				if (/^n/.test(id)) { // Create
					// Group values and process later.
					// This is needed by the onCreate handler that
					// can produce an object based on e.g. file type
					var variable = rest.substring(pos + 1);
					var values = create[id];
					if (!values)
						values = create[id] = {};
					values[variable] = req.data[key];
				} else if (!applied[id]) { // Apply
					// Mark this object as applied once one field was found,
					// since form handles the rest.
					applied[id] = true;
					// Just pass this through the form. No further
					// grouping is needed.
					var obj = this.collection.getById(id);
					if (obj) {
						var prefix = name + '_' + id + '_';
						if (req.data[prefix + 'remove'] == 1) {
							changed = obj.remove();
						} else {
							var form = this.getEditForm(obj);
							if (form)
								changed = form.applyItems() || changed;
							// Set the object's visibility and position
							var visible = Base.pick(
									req.data[prefix + 'hide'], 0) == 0;
							entries[id] = { object: obj, visible: visible };
						}
					}
				}
			}
		}
		// Now produce the new items
		// Determine prototype in case onCreate does not produce the item.
		var prototypes = this.getPrototypes();
		var ctor = prototypes[0];
		for (var id in create) {
			var values = create[id];
			if (values.remove != 1) {
				// Pass prototype value extra, as ctor
				var proto = values.proto;
				delete values.proto;
				var ctor = global[proto];
				if (prototypes.indexOf(ctor) == -1)
					throw 'Unsupported prototype: ' + proto;
				// Support an onCreate handler that can produce special types
				// e.g. based on the file type. That's also the only reason
				// why we collect all values above, so that onCreate can analyse
				// them.
				var obj = this.onCreate && this.onCreate(proto, values);
				if (!obj) {
					// Pass the edit item for editing parent stuff.
					obj = new ctor(this);
				}
				if (obj) {
					// Just like in the rest of edit lib, apply first, persist
					// after
					var form = this.getEditForm(obj, id);
					if (form) {
						form.applyItems();
						changed = this.store(obj) || changed;
						entries[id] = { object: obj, visible: true };
					}
				}
			}
		}
		// Now set positions. It is important that this happens in proper
		// sequence, in case we're modifying memory-only HopObjects through
		// addAt...
		(value || '').split(',').each(function(id, index) {
			var entry = entries[id];
			if (entry) {
				changed = this.setPosition(entry.object, index, entry.visible)
						|| changed;
			}
		}, this);
		return changed;
	}
});
