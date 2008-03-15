////////////////////////////////////////////////////////////////////////
// Basic setup

EditForm.inject(new function() {
	/**
	 * Private functions, taking a reference to the form in "that"
	 */
	function initializeItem(that, item, row, index) {
		// Every item knows about it's form.
		// the sub form of group items is called groupForm, not form!
		if (item instanceof Array) {
			// init items that are to be merged into one cell
			for (var i = 0; i < item.length; i++)
				initializeItem(that, item[i], row, index);
		} else {
			// Convert the item now by setting its __proto__ to the right
			// prototype:
			item = EditItem.initialize(item);
			// init single item
			item.form = that;
			item.row = row;
			item.index = index;
			// Only store real items in the global
			// items, not tabs or groups, as they
			// often have the same id as a item within them
			if (item.name) {
				if (item.groupForm) {
					that.groups[item.name] = item;
					that.root.allGroups[item.name] = item;
				} else {
					that.items[item.name] = item;
					that.root.allItems[item.name] = item;
				}
			}
			// collect the autoRemove items:
			if (item.autoRemove) {
				if (that.root.autoRemove == null)
					that.root.autoRemove = [];
				that.root.autoRemove.push(item);
			}
		}
	}

	function clearItem(item) {
		if (item.name) {
			if (item.groupForm) {
				delete item.form.groups[item.name];
				delete item.form.root.allGroups[item.name];
			} else {
				delete item.form.items[item.name];
				delete item.form.root.allItems[item.name];
			}
		}
	}

	function removeItem(item) {
		if (item) {
			// Remove item
			// Carefull: The item might be part of a sub form,
			// so dont use 'this' for the form
			item.row.splice(item.index, 1);
			clearItem(item);
			if (item.row.length > 0) {
				// adjust indices:
				for (var i = item.index; i < item.row.length; i++)
					item.row[i].index = i;
			} else {
				// row empty: remove it as well:
				item.form.removeRow(item.row.index);
			}
		}
		return item;
	}

	/**
	 * Inserts rows into the form
	 */
	function insertRows(that, index, args, start) {
		var startIndex = index;
		for (var i = start; i < args.length; i++) {
			var obj = args[i];
			if (obj) {
				// Create the row object and add it:
				// add the items for that row
				var row = (obj instanceof Array) ? obj : [obj];
				// Store references to index and form.
				row.index = index;
				row.form = that;
				that.rows.splice(index, 0, row);
				for (var j = 0; j < row.length; j++) {
					if (!row[j]) row.splice(j--, 1);
					else initializeItem(that, row[j], row, j);
				}
				index++;
			}
		}
		// update row indices above:
		for (var i = index; i < that.rows.length; i++)
			that.rows[i].index = i;
		return startIndex != index;
	}

	/**
	 * Inserts items into a row
	 */
	function insertItems(that, rowIndex, itemIndex, args, start) {
		var startIndex = itemIndex;
		var row = that.rows[rowIndex];
		if (row) {
			for (var i = start; i < args.length; i++) {
				var item = args[i];
				if (item) {
					row.splice(itemIndex, 0, item);
					initializeItem(that, item, row, itemIndex++);
				}
			}
			// update item indices above:
			for (var i = itemIndex; i < row.length; i++)
				row[i].index = i;
		}
		return startIndex != itemIndex;
	}

	function createGroupItem(that, type, name, label, args) {
		var form = null;
		var startIndex = 2;
		// Parameter 'label' can be skipped in the functiosn addTab, createGroupItem
		// bellow! In this case, name is assumed to be the label and then converted
		// to lowerCase for the real name
		if (typeof label != 'string') {
			startIndex = 1;
			label = name;
			name = name.hyphenate().replace(/\s+/gi, '-');
		}
		// See if the parameter was a previously created form already,
		// or a HopObject that creates its own:
		var addRows = false;
		if (args.length == startIndex + 1 && args[startIndex]) {
			var obj = args[startIndex];
			if (obj instanceof EditForm) {
				form = obj;
			} else if (obj instanceof HopObject) {
				form = EditForm.get(obj);
			}
		}
		if (!form) { // Otherwise create a new one and insert the items:
			form = new EditForm(that.object, { parent: that, title: label });
			addRows = true;
		}
		form.name = name;
		if (addRows)
			insertRows(form, 0, args, startIndex);
		// Use a different variable prefix for the values of this tab:
		// append name + '_':
		form.variablePrefix = that.variablePrefix + name + '_';
		var group = { name: name, label: label, type: type, groupForm: form };
		// Keep all groups in root, so things can be nested endlessly.
		// but only unique group names in nested structures work
		if (!that.root.groups)
			that.root.groups = {};
		that.root.groups[name] = group;
		return group;
	}
	
	// These functions can reference "this", as they are set to properties bellow:
	function addToGroup(name /*, ... */) {
		var form = this.getGroupForm(name);
		if (form) {
			return insertRows(form, form.rows.length, arguments, 1);
		}
		return false;
	}
	
	function getGroupForm(name /*, ... */) {
		var group = this.root.groups ? this.root.groups[name] : null;
		return group ? group.groupForm : null;
	}

	function getGroup(name, group) {
		var form = this;
		if (group)
			form = this.getGroupForm(group);
		if (form) {
			// Only try allGroups after it was not found in form.groups,
			// as some items in different groups could have the same name
			// in which case only one would be found through allItems.
			return form.root.groups[name] || form.root.allGroups[name];
		}
		return null;
	}

	function removeGroup(name) {
		return removeItem(this.getGroup(name));
	}

	function insertBefore(nameOrIndex /*, ... */) {
		var row = this.getRow(nameOrIndex);
		if (row) {
			var index = row.index;
			if (index < 0) index = 0;
			return insertRows(row.form, index, arguments, 1);
		} else if (this.rows.length == 0) {
			// Insert still if there is no row in the form currently
			return insertRows(this, this.rows.length, arguments, 0);
		}
		return false;
	}

	function insertAfter(nameOrIndex /*, ... */) {
		var row = this.getRow(nameOrIndex);
		if (row) {
			var index = row.index;
			if (index >= 0) index++;
			else index = this.rows.length;
			return insertRows(row.form, index, arguments, 1);
		} else if (this.rows.length == 0) {
			// Insert still if there is no row in the form currently
			return insertRows(this, this.rows.length, arguments, 0);
		}
		return false;
	}

	/**
	 * Public functions
	 */
	return {
		/**
		 * Constructor
		 */
		initialize: function(object, param) {
			param = param || {};
			this.removable = !!param.removable; // convert to boolean
			this.title = param.title;
			this.rows = [];
			this.buttons = [];
			this.items = {};
			this.groups = {};
			this.parent = null;
			this.tabs = null;
			this.name = ''; // empty, only set for groups
			// the object that's edited by this form:
			this.object = object;
			// the default variablePrefix for root edit forms.
			this.variablePrefix = param.variablePrefix || 'value_';

			for (var i in param)
				this[i] = param[i];
			// The titles object for button titles
			if (!this.titles)
				this.titles = {};

			// for group items, only to be used internally here:
			if (this.parent) {
				// determine root:
				var root = this.parent;
				while (root.parent)
					root = root.parent;
				this.root = root;
				// inherit width settings from root:
				this.width = root.width;
				this.spacerWidth = root.spacerWidth;
				this.widthInPercent = root.widthInPercent;
				// dont cache
				this.dontCache = root.dontCache;
			} else {
				this.root = this;
				this.allItems = {};
				this.allGroups = {};
				// the width of the table, defaults to 100 percent, but can
				// be specified in pixels too
				var width = this.width || EditForm.WIDTH;
				this.width = parseFloat(width);
				this.widthInPercent = typeof width == 'string' && /%$/.test(width);
				if (this.spacerWidth) {
					this.spacerWidth = parseFloat(this.spacerWidth);
				} else {
					// defaults, maybe define in config switches
					this.spacerWidth = this.widthInPercent ? 2 : 8;
				}
			}
		},

		/**
		 * returns the row at index "nameOrIndex" or of the item with given
		 * "nameOrIndex"
		 */
		getRow: function(nameOrIndex) {
			var index = parseInt(nameOrIndex);
			if (index >= 0) return this.rows[index];
			else {
				var item = this.getItem(nameOrIndex);
				if (item) return item.row;
			}
			return null;
		},

		/**
		 * adds rows at the end of this form
		 */
		add: function(/* ... */) {
			return insertRows(this, this.rows.length, arguments, 0);
		},

		/**
		 * inserts rows before an existing row,
		 * that can be either specified by name or index
		 */
		insertBefore: insertBefore,
		insertAt: insertBefore,

		/**
		 * inserts rows after an existing row,
		 * that can be either specified by name or index
		 */
		insertAfter: insertAfter,

		/**
		 * Removes a row that can be either specified by a item name or index
		 */
		removeRow: function(nameOrIndex) {
			var row = this.getRow(nameOrIndex);
			if (row) {
				var index = row.index;
				// remove all row items:
				// Carefull: The row might be part of a sub form,
				// so dont use 'this' for the form
				for (var i = 0, l = row.length; i < l; ++i)
					clearItem(row[i]);
				var rows = row.form.rows;
				rows.splice(index, 1);
				// adjust indices:
				for (var i = index; i < rows.length; i++)
					rows[i].index = i;
				return true;
			}
			return false;
		},

		/**
		 * removes item with given name
		 */
		removeItem: function(name) {
			return removeItem(this.getItem(name));
		},

		/**
		 * returns the item with given name, group is optional
		 */
		getItem: function(name, group) {
			var form = this;
			if (group)
				form = this.getGroupForm(group);
			if (form) {
				// Only try allItems after it was not found in form.items,
				// as some items in different groups could have the same name
				// in which case only one would be found through allItems.
				return form.items[name] || form.root.allItems[name];
			}
			return null;
		},

		getGroup: getGroup, 
		getTab: getGroup,

		removeGroup: removeGroup,
		removeTab: removeGroup,

		rowIndexOf: function(name) {
			var item = this.items[name];
			if (item) return item.row.index;
			else return -1;
		},

		itemIndexOf: function(name) {
			var item = this.items[name];
			if (item) return item.index;
			else return -1;
		},

		/**
		 * inserts items at a given row
		 */
		addToRow: function(nameOrIndex /*, ... */) {
			var row = this.getRow(nameOrIndex);
			if (row) {
				return insertItems(rowm.form, row.index, row.length, arguments, 1);
			}
			return false;
		},

		/**
		 * inserts items before an existing item in the same row
		 */
		insertLeft: function(name /*, ... */) {
			var item = this.getItem(name);
			if (item) {
				var index = item.index;
				if (index < 0) index = 0;
				return insertItems(item.form, item.row.index, index, arguments, 1);
			}
			return false;
		},

		/**
		 * inserts items after an existing item in the same row
		 */
		insertRight: function(name /*, ... */) {
			var item = this.getItem(name);
			if (item) {
				var index = item.index;
				if (index >= 0) index++;
				else index = item.row.length;
				return insertItems(item.form, item.row.index, index, arguments, 1);
			}
			return false;
		},

		/**
		 * Creates and adds a group to the form. parameter label is optional
		 */
		addGroup: function(name, label /*, ... */) {
			var group = createGroupItem(this, 'group', name, label, arguments);
			this.add(group);
			return group.groupForm;
		},

		/**
		 * Creates and adds a tab to the form. parameter label is optional
		 */
		addTab: function(name, label /*, ... */) {
			var tab = createGroupItem(this, 'tab', name, label, arguments);
			// all tabs are added in one row, that is referenced from this.tabs
			if (!this.tabs) {
				this.tabs = [];
				// add one empty row that's going to be the tab row:
				this.add(this.tabs);
			}
			// add to the items
			// tabIndex is needed for error reporting, to be able to switch to
			// the right place
			tab.groupForm.tabIndex = this.tabs.length;
			// use tab.groupForm.label instead of tab.label in EditForm, so
			// labels of tabs can be changed at a later point. see renderItems
			tab.groupForm.label = tab.label;
			insertItems(this, this.tabs.index, this.tabs.length, [tab], 0);
			return tab.groupForm;
		},

		/**
		 * Add rows to an existing group
		 */
		addToGroup: addToGroup,
		addToTab: addToGroup,

		/**
		 * Returns the form of a group with the given name, if any
		 */
		getGroupForm: getGroupForm,
		getTabForm: getGroupForm,

		hasItems: function() {
			return this.rows.length > 0;
		},

		/**
		 * Adds buttons to the left of the default buttons bellow the item pane
		 */
		addButtons: function() {
			for (var i = 0; i < arguments.length; i++) {
				var item = arguments[i];
				if (!item.type)
					item.type = 'button';
				/* TODO: Is this still needed?
				// If label is set, move it to title so it can be distinguised
				// by HopObject.renderEditItem
					if (item.label)
					item.title = item.label;
				*/
				initializeItem(this, item, this.buttons, this.buttons.push(item));
				/* TODO: is not initializeItem doing this already?
				if (item.name) {
					this.items[item.name] = item;
					this.root.allItems[item.name] = item;
				}
				*/
				item.form = this;
			}
		},

		toString: function() {
			var out = [];
			for (var i = 0; i < this.rows.length; i++) {
				var items = this.rows[i];
				var row = []
				for (var j = 0; j < items.length; j++) {
					var item = items[j];
					row.push('#' + j +': ' + item.toString());
					/*
					if (item.type == 'tab')
						item.groupForm.formatString(out);
					*/
				}
				out.push('[#' + i + ': ' + row.join(', ') + ' ]');
			}
			return '[' + this.rows.length + ' ' + out.join(',\n') + ' ]';
		},

		log: function(title) {
			User.log((title || 'Form') + ': ' + this.toString());
		},

		statics: {
			get: function(obj) {
				return EditNode.get(obj).form;
			},

			/**
			 * HopObjects can define a function getEditName that overrides
			 * the default name.
			 */
			getEditName: function(obj) {
				if (obj == null) return 'null';
				var name;
				if (obj.getEditName)
					name = obj.getEditName();
				else if (obj.getDisplayName)
					name = obj.getDisplayName();
				if (!name) {
					if (obj.name) name = obj.name;
					else name = '[' + obj.getFullId() + ']';
				}
				return name;
			},

			alert: function(str) {
				EditForm.addMessage('editMessage', str);
			},

			reportError: function(e) {
				User.log(e);
				if (typeof e == 'string') {
					EditForm.alert(e);
				} else {
					EditForm.addMessage('editError', [
						new Date().format('yyyy/MM/dd HH:mm:ss'), 
						User.logError('Error During Edit', e) 
					]);
				}
			},

			// Constants

			// A constant object for item.convert to return when nothing should be
			// done afterwards. Used by items of type "button" and "hidden".
			DONT_APPLY: {},

			// Setting onApply to EditForm.DO_NOTHING prevents execution of onApply
			DO_NOTHING: function() {}
		}
	}
});
