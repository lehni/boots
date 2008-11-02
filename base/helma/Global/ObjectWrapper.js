// Produces a wrapper that inherits from object and defines a __meta__ object
// to intercept modifications and again wrap returned values, in order to
// detect modifications on any level down the hierarchy.

function ObjectWrapper(obj, onChange) {
	this.__proto__ = obj;
	this.__meta__ = {
		__get__: function(prop) {
			var value = this[prop];
			// Wrap sub elements in ObjectWrappers again
			return typeof value == 'object' ? new ObjectWrapper(value, onChange) : value;
		},

		__has__: function(prop) {
			// This is needed so we say yes even for field defined only in __proto__.
			// This leads to them being deleted on this rather than __proto__,
			// which is needed for __delete__ to be called.
			return prop in this;
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
}

// Making an object wrapper for XMLObjects is a bit more tricky. Due to the structure
// of things in Rhino, we need to wrap them directly in a class inheriting from
// org.mozilla.javascript.xml.XMLObject, and override the various ecma commands.
// Other than that, this is identical in structure to XMLObjectWrapper
function XMLObjectWrapper(xml, onChange) {
	xml = toJava(xml);

	return new JavaAdapter(Packages.org.mozilla.javascript.xml.XMLObject, {
		ecmaDelete: function(cx, id) {
			var ret = xml.ecmaDelete(cx, id);
			if (onChange)
				onChange.call(this);
			return ret;
		},

		ecmaGet: function(cx, id) {
			var value = xml.ecmaGet(cx, id);
			// Wrap sub elements in XMLObjectWrappers again
			return typeof value == 'xml' ? new XMLObjectWrapper(value, onChange) : value;
		},

		ecmaHas: function(cx, id) {
			return xml.ecmaHas(cx, id);
		},

		ecmaPut: function(cx, id, value) {
			xml.ecmaPut(cx, id, value);
			if (onChange)
				onChange.call(this);
		},

		enterDotQuery: function(scope) {
			return xml.enterDotQuery(scope);
		},

		enterWith: function(scope) {
			return xml.enterWith(scope);
		},

		getExtraMethodSource: function(cx) {
			return xml.getExtraMethodSource(cx);
		},

		memberRef: function() {
			// varargs
			return xml.memberRef.apply(xml, arguments);
		},

		getClassName: function() {
			return xml.getClassName();
		},

		getDefaultValue: function(hint) {
			return xml.getDefaultValue(hint);
		},

		toString: function() {
			return xml.toString();
		}
	});
}
