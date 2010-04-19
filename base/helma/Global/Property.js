Property = Base.extend({
	_cache: false,
	// Property descriptor values
	configurable: true,
	enumerable: false,

	initialize: function(property, param) {
		if (!param)
			param = {};

		var onChange = param.onChange;
		var that = this;

		// Define get getter that inject will use for the propery. This part is 
		// define in Boots.
		this.get = function() {
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
				value = that._get(this, property, value, param);
			if (value != null && that._observe)
				value = that.observe(this, property, value, param);
			// Store in cache after conversion from native type
			if (cache)
				cache[property] = value;
			return value;
		}

		// Define get setter that inject will use for the propery. This part is 
		// define in Boots.
		this.set = function(value) {
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
				if (value != null && that._observe)
					value = that.observe(this, property, value, param);
				cache[property] = value;
			}
			if (that.set)
				value = that._set(this, property, value, param);
			this[property] = value;
		}
	},

	observe: function(obj, property, value, param) {
		var that = this;
		return createObserver(value, function() {
			// onChange handler for the object and any of its children.
			// TODO: Call param.onChange handler as well?
			that.markDirty(obj, property);
		});
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
					property.set.call(object, property.get.call(object));
				}
			}
			this.objects = {};
		}
	}

	/*
	// To be defined in inheriting classes, to convert to and from the database 
	// representation of the values, mostly strings.

	_get: function(obj, property, value, param) {
		return value;
	}

	_set: function(obj, property, value, param) {
		return value;
	}
	*/
});

function onBeforeCommit() {
	Property.commit();
}

HopProperty = Property.extend(new function() {
	// Use a different writeToString than the one from Xml object since we 
	// do not want indentation.
	function writeToString(obj) {
		var out = new java.io.ByteArrayOutputStream();
		var writer = new Packages.helma.objectmodel.dom.XmlWriter(out, 'UTF-8');
		writer.setDatabaseMode(false);
		writer.setIndent(0);
		writer.write(toJava(obj));
		writer.flush();
		return out.toString('UTF-8');
	}

	// Extract the xml prefix and suffix that is added around each hopobject
	// tag when converting to / from xml:
	var str = writeToString(new HopObject());
	var prefix = str.match(/^([\u0000-\uffff]*)\<hopobject/i)[1];
	var suffix = str.match(/hopobject\>([\u0000-\uffff]*)$/i)[1];

	return {
		_cache: true,
		_observe: true,

		_get: function(obj, property, value, param) {
			if (!value) {
				// Create the object on the fly if createIfNull is set 
				// to either true or the prototype to be created. 
				if (param.createIfNull) {
					var ctor = typeof param.createIfNull == 'function'
						? param.createIfNull : HopObject;
					value = new ctor();
					obj[property] = value;
				}
				return value;
			} else {
				return HopProperty.decode(value);
			}
		},

		_set: function(obj, property, value) {
			return value ? HopProperty.encode(value) : value;
		},

		statics: {
			// Expose these simplified versions through HopProperty.encode / decode:
			encode: function(value) {
				value = writeToString(value);
				return value.substring(prefix.length, value.length - suffix.length);
			},

			decode: function(value) {
				return value ? Xml.readFromString(prefix + value + suffix) : null;
			}
		}
	};
});

JsonProperty = Property.extend({
	_cache: true,
	_observe: true,
	
	_get: function(obj, property, value) {
//		app.log('JSON GET ' + Json.decode(value));
		return Json.decode(value);
	},

	_set: function(obj, property, value) {
//		app.log('JSON SET ' + Json.encode(value));
		return Json.encode(value);
	}
});

XmlProperty = Property.extend({
	_cache: true,
	_observe: true,

	_get: function(obj, property, value) {
		return new XML(value);
	},

	_set: function(obj, property, value) {
		return value + '';
	}
});
