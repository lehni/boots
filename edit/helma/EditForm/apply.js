////////////////////////////////////////////////////////////////////////
// Appling of values

EditForm.inject({
	beforeApply: function() {
		if (this.object.onBeforeApply != null)
			this.object.onBeforeApply();
	},

	afterApply: function(itemsChanged, changedItems) {
		// Update edit properties, (creator and modifier related properties)
		this.object.updateEditProperties();
		// Call onAfterApply on each item, if defined:
		if (itemsChanged) {
			changedItems.each(function(item) {
				if (item.onAfterApply) {
					item.onAfterApply.call(item.form.object, item.appliedValue,
							item);
					delete item.appliedValue;
				}
			});
		}
		// Forces clearing of cache.
		delete this.version;
		// The same on the form / object
		var onAfterApply = this.object.onAfterApply || this.onAfterApply;
		if (onAfterApply)
			onAfterApply.call(this.object, itemsChanged ? changedItems : null);
	},

	applyItems: function() {
		var changed = false;
		var root = this.root;
		// In some cases (e.g. group items), applyItems is only called on
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
					if (item.type == 'tab') {
						item.groupForm.applyItems();
					} else {
						var name = item.getEditName();
						var value = req.data[name];
						// Make sure the value was defined from the client
						// and ony apply if it is valid
						if (value !== undefined
								&& this.applyItem(item, value)) {
							root.itemsChanged = changed = true;
							root.changedItems[item.name] = item;
						}
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
		try {
			// Empty strings -> null
			if (!value) {
				value = null;
			} else if (item.trim) {
				value = value.trim();
			}
			// Convert values:
			value = item.convert(value);
			// Setting onApply to EditForm.DO_NOTHING prevents execution
			// of EditItem#apply
			// if onApply is set, execute it even if convert returned DONT_APPLY
			// DONT_APPLY is just ot prevent item.apply being called.
			var dontApply = value == EditForm.DONT_APPLY;
			if (dontApply) {
				value = null;
			} else if (item.requirements) {
				EditRequirement.check(item, value);
			}
			// Set the newly applied value, so onAfterApply can pass it
			// too. This is cleared again in #afterApply.
			item.appliedValue = value;
			if (item.onApply && item.onApply != EditForm.DO_NOTHING) {
				// Call the handler
				if (app.properties.debugEdit)
					User.log('EditItem#onApply(): [' + item.name + '], value = '
						+ Json.encode(value));
				var res = item.onApply.call(item.form.object, value, item);
				// If an onApply handler has not returned true or false, 
				// assume that it has done some changes (this is prefered to
				// not detect changes).
				if (res || res === undefined)
					return true;
			}
			// Otherwise use the default behavior for applying values
			if (!item.onApply && !dontApply) {
				if (item.apply(value))
					return true;
			}
		} catch (e) {
			if (typeof e == 'string') {
				User.log("EditForm#applyItem() throw new EditException('"  + e +
					"');");
				e = new EditException(item, e, value);
			} else if (!(e instanceof EditException)) {
				User.logError('EditForm#applyItem()', e);
			}
			throw e;
		}
		return false;
	}
});
