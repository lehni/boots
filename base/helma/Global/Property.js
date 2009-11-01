Property = Base.extend({
	_cache: false,

	initialize: function(property, onChange) {
		var that = this;

		// Define get getter that inject will use for the propery. This part is 
		// define in Boots.
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
			if (value != null && that._wrap)
				value = that.wrap(this, property, value);
			// Store in cache after conversion from native type
			if (cache)
				cache[property] = value;
			return value;
		}

		// Define get setter that inject will use for the propery. This part is 
		// define in Boots.
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
				if (value != null && that._wrap)
					value = that.wrap(this, property, value);
				cache[property] = value;
			}
			if (that.set)
				value = that.set(this, property, value);
			this[property] = value;
		}
	},

	wrap: function(obj, property, value) {
		var that = this;
		return ObjectWrapper.wrap(
			value, {
				// onChange handler for the object and any of its children:
				onChange: function() {
					that.markDirty(obj, property);
				},
				modifiers: that._modifiers
			}
		);
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
				}
			}
			this.objects = {};
		}
	}

	/*
	// To be defined in inheriting classes, to convert to and from the database 
	// representation of the values, mostly strings.

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

	var obj = new HopObject();
	// Extract the xml prefix and suffix that is added around each hopobject
	// tag when converting to / from xml:
	var str = writeToString(obj);
	var prefix = str.match(/^([\u0000-\uffff]*)\<hopobject/i)[1];
	var suffix = str.match(/hopobject\>([\u0000-\uffff]*)$/i)[1];

	return {
		_cache: true,
		_wrap: true,
		// HopObject methods that change the object
		_modifiers: ['add', 'addAt', 'remove', 'removeChild'],

		get: function(obj, property, value) {
//			app.log('HOP/XML GET ' + value);
			return value ? Xml.readFromString(prefix + value + suffix) : null;
		},

		set: function(obj, property, value) {
			if (value) {
				value = writeToString(value);
				value = value.substring(prefix.length, value.length - suffix.length);
			}
//			app.log('HOP/XML SET ' + value);
			return value;
		}
	};
});

JsonProperty = Property.extend({
	_cache: true,
	_wrap: true,
	
	get: function(obj, property, value) {
		return Json.decode(value);
	},

	set: function(obj, property, value) {
		return Json.encode(value);
	}
});

XmlProperty = Property.extend({
	_cache: true,
	_wrap: true,

	get: function(obj, property, value) {
		return new XML(value);
	},

	set: function(obj, property, value) {
		return value + '';
	}
});
