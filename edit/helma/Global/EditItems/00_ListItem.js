// TODO: File is named 00_ListItem.js to ensure it is compiled before the others
// that depend on it. A better way to support this would be if Helma offered an
// inlcude() method...

// Abstract base for SelectItem and EditableListItem
ListItem = EditItem.extend({

	/**
	 * We are supporting two modes of sorting / hiding in lists and
	 * multiselects:
	 *
	 * - Index mode: visible items are sorted by index, hidden ones
	 *   are defined by setting index to null
	 *
	 * - Position / Visible mode: position is used as an index for both
	 *   visible and hidden items, in their respective lists. visible
	 *   controlls the visibility.
	 *
	 * get/setPosition and is/setVisible are here to fasciliate these modes
	 */

	getPosition: function(object) {
		if (object) {
			if (object.position !== undefined) {
				return object.position;
			} else if (object.index !== undefined) {
				return object.index;
			}
		}
		return null;
	},

	setPosition: function(object, position, visible) {
		if (object.position !== undefined && object.visible !== undefined) {
			// Position / Visible mode
			// !A ^ !B == A xor B
			if (object.position != position || !object.visible ^ !visible) {
				object.position = position;
				object.visible = visible;
				return true;
			}
		} else if (object.index !== undefined) {
			// Index mode: Set index to null to hide item
			var index = visible ? position : null;
			if (object.index != index) {
				object.index = index;
				return true;
			}
		} else {
			// If we're not filtering by index or position, maybe it is memory
			// only object that can be sorted through addAt.
			if (this.collection.indexOf(object) != position)
			 	return this.collection.addAt(position, object);
		}
		return false;
	},

	isVisible: function(object) {
		if (object) {
			if (object.visible !== undefined) {
				return object.visible;
			} else if (object.index !== undefined) {
				return object.index != null;
			}
		}
		return false;
	},

	setVisible: function(object, visible) {
		if (object) {
			if (object.visible !== undefined) {
				object.visible = visible;
			} else if (object.index !== undefined) {
				var curVisible = object.index != null;
				// !A ^ !B == A xor B
				if (!curVisible ^ !visible) {
					// Since index is defining both visibility and position,
					// set it to the end of the collection, to make object
					// visible.
					object.index = visible ? this.collection.count() : null;
				}
			}
		}
	},

	/**
	 * Returns a hash containing all full ids of this collection in sequentual
	 * order.
	 */
	getIdHash: function() {
		return this.value.list().each(function(obj) {
			this[obj.getFullId()] = true;
		}, new Hash());
	},

	store: function(object) {
		// This is called by handlers.js when a new object is created in the
		// list. Just add it to the collection and handle position and visible:
		// Don't count on this.value to be set, use getValue instead, since it
		// resolves this.name on the object as well.
		var value = this.getValue();
		if (this.collection) {
			// Add it to the collection(s):
			// Support for visible lists and hidden (all) lists. Since the 
			// object might remain transient for a while, simulate the proper
			// result of collection filtering here: A visible object appears
			// both in value and collection, and hidden one only in collection:
			var list = this.collection;
			if (list.get(object.name))
				throw 'This list already contains an item named "'
						+ object.name + '".';
			list.add(object);
			// TODO: How to support index based position here? Can we use
			// EditItem.setPosition somehow too?
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

