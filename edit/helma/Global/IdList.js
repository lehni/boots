// a list of ids, in a preserved order. 
// adding and removing is fast, due to a LinkedHashMap in the background
// the constructor allows construction from strings of coma seperated values and collections

// used in handleEditMove, can also be used for managing string lists.

IdList = Base.extend({
	initialize: function(ids) {
		this.list = new java.util.LinkedHashMap();

		if (ids instanceof HopObject) {
			var objects = ids.list();
			for (var i = 0; i < objects.length; i++) {
				var id = objects[i]._id;
				this.list.put(id, id);
			}
		} else {
			if (typeof ids == "string") {
				ids = ids.split(',');
			}
			if (ids.length != undefined) {
				for (var i = 0; i < ids.length; i++) {
					var id = ids[i];
					this.list.put(id, id);
				}
			}
		}
	},

	remove: function(id) {
		return this.list.remove(id);
	},

	add: function(id) {
		return this.list.put(id, id);
	},

	toArray: function(prototype) {
		var array = [];
		for (var it = this.list.values().iterator(); it.hasNext();) {
			var obj = it.next();
			if (prototype) {
				obj = prototype.getById(obj);
				if (!obj) continue;
			}
			array.push(obj);
		}
		return array;
	},

	toString: function() {
		return this.toArray().join(',');
	},

	statics: {
		toArray: function(ids) {
			if (ids == null) return [];
			else if (ids instanceof HopObject) {
				var objects = ids.list();
				ids = [];
				for (var i = 0; i < objects.length; i++) {
					if (objects[i] != null)
						ids.push(objects[i]._id);
				}
			} else if (typeof ids == "string") {
				ids = ids.split(',');
			}
			return ids.length != undefined ? ids : [];
		}
	}
});
