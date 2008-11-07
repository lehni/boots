ObjectWrapper = new function() {
	var Scriptable = Packages.org.mozilla.javascript.Scriptable;
	var ScriptableObject = Packages.org.mozilla.javascript.ScriptableObject;
	var XMLObject = Packages.org.mozilla.javascript.xml.XMLObject;

	return {
		// Produces a wrapper that inherits from object, intercepts modifications
		// and calls a onChange handler if they happen. It also wraps returned
		// values again, in order to detect modifications on any level down the
		// hierarchy.
		wrap: function(obj, onChange) {
			if (obj == Scriptable.NOT_FOUND)
				return obj;
			var type = typeof obj;
			if (type == 'object' || type == 'xml') {
				// Retrieve the NativeJavaObject wrapper for this object, so we can
				// access its java methods directly from the wrapper that we are going
				// to produce bellow.
				obj = toJava(obj);
				var adapter;
				if (type == 'object') {
					// Wrap native objects in a ScriptableObject that delegates the function calls
					// and watches for things to change.
					adapter = new JavaAdapter(ScriptableObject, {
						get: function(name, start) {
							// Wrap sub elements again
							return ObjectWrapper.wrap(obj.get(name, obj), onChange);
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
				} else {
					// Make a special wrapper for XMLObjects. Due to the structure of things in Rhino,
					// We need to wrap them directly in a class inheriting from XMLObject, and override
					// the various ecma commands. Otherwise, E4X will not work with the wrapped object.
					// Other than that, this is identical in structure to the object code above.
					adapter = new JavaAdapter(XMLObject, {
						ecmaGet: function(cx, id) {
							// Wrap sub elements again
							return ObjectWrapper.wrap(obj.ecmaGet(cx, id), onChange);
						},

						ecmaPut: function(cx, id, value) {
							obj.ecmaPut(cx, id, value);
							if (onChange)
								onChange.call(this);
						},

						ecmaHas: function(cx, id) {
							return obj.ecmaHas(cx, id);
						},

						ecmaDelete: function(cx, id) {
							var ret = obj.ecmaDelete(cx, id);
							if (ret && onChange)
								onChange.call(this);
							return ret;
						},

						getDefaultValue: function(hint) {
							return obj.getDefaultValue(hint);
						},

						toString: function() {
							return obj.toString();
						},

						enterDotQuery: function(scope) {
							return obj.enterDotQuery(scope);
						},

						enterWith: function(scope) {
							return obj.enterWith(scope);
						},

						getExtraMethodSource: function(cx) {
							return obj.getExtraMethodSource(cx);
						},

						memberRef: function() {
							// varargs
							return obj.memberRef.apply(obj, arguments);
						},

						getClassName: function() {
							return obj.getClassName();
						}
					});
				}
				// Now set the adapter's prototype ot the object, so it inherits
				// all fields form it.
				toJava(adapter).setPrototype(obj);
				return adapter;
			} else {
				// Basic types, no wrapping needed to detect change
				return obj;
			}
		}
	}
}
