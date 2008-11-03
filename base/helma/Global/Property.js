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
		var commit = Property.commit[id];
		if (!commit) {
			commit = Property.commit[id] = {
				object: obj,
				properties: {}
			};
		}
		commit.properties[property] = this;
	},

	statics: {
		commit: {}
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

function onCommit() {
	for (var id in Property.commit) {
		var commit = Property.commit[id];
		var object = commit.object, properties = commit.properties;
		for (var name in properties) {
			var property = properties[name];
			property._set.call(object, property._get.call(object));
			app.log('Commiting ' + name + ' on ' + object + ': ' + object[name]);
		}
	}
	Property.commit = {};
}

JsonProperty = Property.extend(new function() {

	function wrap(obj, onChange) {
		// Instead of wrapping obj in a ObjectWrapper that inherits from it,
		// we can just set it's __meta__ field. __has__ is unnecessary then:
		obj.__meta__ = {
			__get__: function(prop) {
				var value = this[prop];
				return typeof value == 'object' ? wrap(value, onChange) : value;
			},

			__set__: function(prop, value) {
				this[prop] = value;
				if (onChange)
					onChange();
			},

			__delete__: function(prop) {
				delete this[prop];
				if (onChange)
					onChange();
			}
		};
		return obj;
	}

	return {
		_cache: true,

		wrap: function(obj, property, value) {
			var that = this;
			// return new ObjectWrapper(
			return wrap(
				value,
				// onChange handler for the xml object and any of its children:
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
