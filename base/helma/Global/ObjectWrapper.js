// Produces a wrapper that inherits from object and defines a __meta__ object
// to intercept modifications and again wrap returned values, in order to
// detect modifications on any level down the hierarchy.

ObjectWrapper = Base.extend(new function() {
	var ScriptableObject = Packages.org.mozilla.javascript.ScriptableObject;
	var Scriptable = Packages.org.mozilla.javascript.Scriptable;

	return {
		initialize: function(obj, onChange) {
			obj = toJava(obj);

			var ret = new JavaAdapter(ScriptableObject, {
				get: function(name, start) {
					var value = obj.get(name, obj);
					// Wrap sub elements in ObjectWrappers again
					return value != Scriptable.NOT_FOUND && typeof value == 'object'
						? new ObjectWrapper(value, onChange)
						: value;
				},

				put: function(name, start, value) {
					obj.put(name, obj, value);
					if (onChange)
						onChange.call(this);
				},

				has: function(name, start) {
					return obj.has(name, obj);
				},

				'delete': function(name) {
					obj['delete'](name);
					if (onChange)
						onChange.call(this);
				},

				getDefaultValue: function(hint) {
					return obj.getDefaultValue(hint);
				},

				toString: function() {
					return obj.toString();
				}
			});
			toJava(ret).setPrototype(obj);
			return ret;
		}
	}
});


// Making an object wrapper for XMLObjects is a bit more tricky. Due to the structure
// of things in Rhino, we need to wrap them directly in a class inheriting from
// org.mozilla.javascript.xml.XMLObject, and override the various ecma commands.
// Other than that, this is identical in structure to XMLObjectWrapper
XMLObjectWrapper = ObjectWrapper.extend(new function() {
	var XMLObject = Packages.org.mozilla.javascript.xml.XMLObject;
	var Scriptable = Packages.org.mozilla.javascript.Scriptable;

	return {
		initialize: function(xml, onChange) {
			xml = toJava(xml);

			var ret = new JavaAdapter(XMLObject, {
				ecmaGet: function(cx, id) {
					var value = xml.ecmaGet(cx, id);
					// Wrap sub elements in XMLObjectWrappers again
					return value != Scriptable.NOT_FOUND && typeof value == 'xml'
						? new XMLObjectWrapper(value, onChange)
						: value;
				},

				ecmaPut: function(cx, id, value) {
					xml.ecmaPut(cx, id, value);
					if (onChange)
						onChange.call(this);
				},

				ecmaHas: function(cx, id) {
					return xml.ecmaHas(cx, id);
				},

				ecmaDelete: function(cx, id) {
					var ret = xml.ecmaDelete(cx, id);
					if (ret && onChange)
						onChange.call(this);
					return ret;
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
			toJava(ret).setPrototype(xml);
			return ret;
		}
	}
})
