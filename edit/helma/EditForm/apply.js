
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
					throw message || 'cannot be empty.';
				break;
			case 'length':
				if (value != null && value.length != req)
					throw message || 'needs to contain exactly ' + 
						req + ' characters.';
				break;
			case 'minLength':
				if (value != null && value.length < req)
					throw message || 'needs to contain at least ' + 
						req + ' characters.';
				break;
			case 'maxLength':
				if (value != null && value.length > req)
					throw message || 'cannot contain more than ' + 
						req + ' characters.';
				break;
			case 'match':
				if (value != null && (!req.test || !req.test(value)))
					throw message || 'is not correctly formated.';
				break;
			case 'email':
				if (value != null && req && !/^([a-zA-Z0-9\-\.\_]+)(\@)([a-zA-Z0-9\-\.]+)(\.)([a-zA-Z]{2,4})$/.test(value))
					throw message || 'is not a valid address.';
				break;
			case 'uri':
				if (value != null && req && !/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/.test(value))
					throw message || 'is not a valid URI.';
				break;
			case 'uniqueIn':
				var obj = req.get(value);
				if (obj != null && obj != item.form.object)
					throw message || 'is already in use.';
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

		afterApply: function(itemsChanged, changedItems) {
			var obj = this.object;

			// Helma returns null for unset existing properties and undefined for
			// not existing properties. Make sure we're only setting modifier and date
			// if the properties are actually defined in type.properties

			if (obj.modifier !== undefined)
				obj.modifier = session.user;

			if (obj.modificationDate !== undefined)
				obj.modificationDate = new Date();

			// Set creator and creation date if it was not set yet.
			if (obj.creator === null)
				obj.creator = session.user;

			if (obj.creationDate === null)
				obj.creationDate = obj.modificationDate;

			// Now call onAfterApply on each item, if defined:
			if (itemsChanged) {
				changedItems.each(function(item) {
					if (item.onAfterApply) {
						item.onAfterApply.call(item.form.object, item.appliedValue, item);
						delete item.appliedValue;
					}
				});
			}

			// Forces clearing of cache.
			delete this.version;

			// The same on the form / object
			var onAfterApply = obj.onAfterApply || this.onAfterApply;
			if (onAfterApply)
				onAfterApply.call(obj, itemsChanged ? changedItems : null);
		},

		applyItems: function() {
			var changed = false;
			var root = this.root;
			// in some cases (e.g. group items), applyItems is only called on
			// a group form, not the main form. reflect this here
			if (this == root || !root.changedItems) {
				root.beforeApply();
				root.itemsChanged = false;
				root.changedItems = new Hash();
				// afterApply is only called when applyItems is finished on the
				// changeObserver. This might be different from root for group items
				root.changeObserver = this;
			}
			var rows = this.rows;
			for (var i = 0; i < rows.length; i++) {
				var row = rows[i];
				for (var j = 0; j < row.length; j++) {
					var item = row[j];
					if (item.name != null) {
						var value = req.data[item.getEditName()];
						if (this.applyItem(item, value)) {
							root.itemsChanged = changed = true;
							root.changedItems[item.name] = item;
						}
					}
				}
			}
			if (this == root.changeObserver) {
				this.afterApply(root.itemsChanged, root.changedItems);
				delete root.changedItems;
				delete root.itemsChanged;
			}
			return changed;
		},

		applyItem: function(item, value) {
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
					// of EditItem#apply
					// if onApply is set, execute it even if convert returned DONT_APPLY
					// DONT_APPLY is just ot prevent item.apply being called.
					var dontApply = value == EditForm.DONT_APPLY;
					if (dontApply)
						value = null;
					// Set the newly applied value, so onAfterApply can pass it
					// too. This is cleared again in #afterApply.
					item.appliedValue = value;
					if (item.onApply && item.onApply != EditForm.DO_NOTHING) {
						// Call the handler 
						if (item.onApply.call(item.form.object, value, item))
							return true;
					}
					// Otherwise use the default behavior for applying values
					if (!item.onApply && !dontApply) {
						if (item.apply(value))
							return true;
					}
				} catch (e) {
					if (typeof e != 'string')
						User.logError('applyItem', e);
		 			throw new EditException(item, e, value);
				}
			}
			return false;
		}
	}
});
