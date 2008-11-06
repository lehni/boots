Property = Base.extend({
	_cache: false,

	initialize: function(property, onChange) {
		var that = this;

		this._get = function() {
			var cache = null;
			if (that._cache) {
				cache = this.cache._properties;
				if (!cache)
					cache = this.cache._properties = {};
				var value = cache[property];
				if (value != null)
					return value;
			}
			var value = this[property];
			if (that.get)
				value = that.get(this, property, value);
			if (that.wrap)
				value = that.wrap(this, property, value);
			// Store in cache after conversion from native type
			if (cache)
				cache[property] = value;
			return value;
		}

		this._set = function(value) {
			// Lookup function if it's a string
			if (onChange) {
				if (typeof onChange == 'string')
					onChange = this[onChange];
				if (onChange) {
					var ret = onChange.call(this, value);
					if (ret !== undefined)
						value = ret;
				}
			}
			if (that._cache) {
				// Store in cache before conversion to native type
				cache = this.cache._properties;
				if (!cache)
					cache = this.cache._properties = {};
				if (that.wrap)
					value = that.wrap(this, property, value);
				cache[property] = value;
			}
			if (that.set)
				value = that.set(this, property, value);
			this[property] = value;
		}
	},

	markDirty: function(obj, property) {
		var id = obj.getFullId();
		var entry = Property.objects[id];
		if (!entry) {
			entry = Property.objects[id] = {
				object: obj,
				properties: {}
			};
		}
		entry.properties[property] = this;
	},

	statics: {
		objects: {},

		commit: function() {
			for (var id in this.objects) {
				var entry = this.objects[id];
				var object = entry.object, properties = entry.properties;
				for (var name in properties) {
					var property = properties[name];
					property._set.call(object, property._get.call(object));
					app.log('Commiting ' + name + ' on ' + object + ': ' + object[name]);
				}
			}
			this.objects = {};
		}
	}

	/*
	get: function(obj, property, value) {
		return value;
	}

	set: function(obj, property, value) {
		return value;
	}
	*/
});

function onBeforeCommit() {
	Property.commit();
}

JsonProperty = Property.extend({
	_cache: true,

	wrap: function(obj, property, value) {
		var that = this;
		return new ObjectWrapper(
			value,
			// onChange handler for the json object and any of its children:
			function() {
				that.markDirty(obj, property);
			}
		);
	},
	
	get: function(obj, property, value) {
		return Json.decode(value);
	},

	set: function(obj, property, value) {
		return Json.encode(value);
	}
});

XmlProperty = Property.extend({
	_cache: true,

	wrap: function(obj, property, value) {
		var that = this;
		return new XMLObjectWrapper(
			value,
			// onChange handler for the xml object and any of its children:
			function() {
				that.markDirty(obj, property);
			}
		);
	},
	
	get: function(obj, property, value) {
		return new XML(value);
	},

	set: function(obj, property, value) {
		return value + '';
	}
});
