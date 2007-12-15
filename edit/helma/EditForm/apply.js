
////////////////////////////////////////////////////////////////////////
// appling of values

EditForm.inject(new function() {
	// each requirements setting can either be a simple value
	// defining the condition,  or a hash containing both a value
	// and a message that overrides the default message:
	function checkRequirement(item, name, value) {
		var req = item.requirements[name], message = null;
		if (req) {
			if (req.value !== undefined) {
				message = req.message;
				req = req.value;
			}
			switch (name) {
			case 'notNull':
				if (req && value == null)
					throw message || "cannot be empty.";
				break;
			case 'length':
				if (value.length != req)
					throw message || "needs to contain exactly " + 
						req + " characters.";
				break;
			case 'minLength':
				if (value.length < req)
					throw message || "needs to contain at least " + 
						req + " characters.";
				break;
			case 'maxLength':
				if (value.length > req)
					throw message || "cannot contain more than " + 
						req + " characters.";
				break;
			case 'match':
				if (!req.test || !req.test(value))
					throw message || "is not correctly formated.";
				break;
			case 'email':
				if (req && !/^([a-zA-Z0-9\-\.\_]+)(\@)([a-zA-Z0-9\-\.]+)(\.)([a-zA-Z]{2,4})$/.test(value))
					throw message || "is not a valid address.";
				break;
			case 'uniqueIn':
				var obj = req.get(value);
				if (obj != null && obj != item.form.object)
					throw message || "is already in use.";
				break;
			case 'callback':
				// the callback handler can either return an error as
				// a string or throw it directly.
				var msg = req.call(item.form.object, value);
				if (msg)
					throw msg;
				break;
			}
		}
	}
	
	return {
		beforeApply: function() {
			if (this.object.onBeforeApply != null)
				this.object.onBeforeApply();
		},

		afterApply: function(changedItems) {
			var obj = this.object;
			if (obj.modifier !== undefined)
				obj.modifier = session.user;

			if (obj.modificationDate !== undefined)
				obj.modificationDate = new Date();

			// Set creation date if it was not set yet.
			if (obj.creationDate === null)
				obj.creationDate = obj.modificationDate;

			if (obj.onApply != null)
				obj.onApply(changedItems);
		},

		applyItems: function() {
			var root = this.root;
			// in some cases (e.g. group items), applyItems is only called on
			// a group form, not the main form. reflect this here
			if (this == root || !root.changedItems) {
				root.beforeApply();
				root.itemsChanged = false;
				root.changedItems = {};
				// afterApply is only called when applyItems is finished on the
				// changeObserver. This might be different from root for group items
				root.changeObserver = this;
			}
			var obj = this.object;
			var changed = false;
			var changedItems = {};
			var rows = this.rows;
			for (var i = 0; i < rows.length; i++) {
				var row = rows[i];
				for (var j = 0; j < row.length; j++) {
					var item = row[j];
					if (item.name != null) {
						var value = req.data[this.variablePrefix + item.name];
						if (value !== undefined && this.applyItem(item, value)) {
							root.itemsChanged = true;
							root.changedItems[item.name] = true;
						}
					}
				}
			}
			if (this == root.changeObserver) {
				this.afterApply(root.itemsChanged ? root.changedItems : null);
				delete root.changedItems;
				delete root.itemsChanged;
			}
		},

		applyItem: function(item, value) {
			// do not apply hidden items, as there cannot be any data coming from them
			if (item.hidden)
				return false;

			if (item.type == 'tab') {
				item.groupForm.applyItems();
			} else {
				try {
					// empty strings -> null
					if (!value) {
						value = null;
					} else if (item.trim) {
						value = value.trim();
					}
					// convert values:
					value = item.convert(value);
					// check any defined requirements for this item and throw exceptions
					// if requirements are not met.
					if (item.requirements) {
						// first we allways check for notNull:
						checkRequirement(item, 'notNull', value);
						// now all the others:
						for (var name in item.requirements)
							if (name != 'notNull')
								checkRequirement(item, name, value);
					}
					// Setting onApply to EditForm.DO_NOTHING prevents execution
					// of applyDefault
					// if onApply is set, execute it even if convert returned DONT_APPLY
					// DONT_APPLY is just ot prevent item.apply being called.
					/// TODO: find out why this was added!
					if (item.onApply && item.onApply != EditForm.DO_NOTHING) {
						// call the handler, prevent passing DONT_APPLY 
						if (item.onApply.call(item.form.object,
							value == EditForm.DONT_APPLY ? null : value, item))
							return true;
					}
					// otherwise use the default behavior for applying values
					if (!item.onApply && value != EditForm.DONT_APPLY) {
						if (item.apply(value))
							return true;
					}
				} catch(e) {
					if (typeof e != "string")
						User.logError("applyItem", e);
		 			throw new EditException(item, e);
				}
			}
			return false;
		}
	}
});
