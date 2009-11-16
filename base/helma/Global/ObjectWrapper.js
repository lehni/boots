// Wrap native objects in a ScriptableObject that delegates the function calls
// and watches for things to change.
// Also implement Wrapper, so the original object can be returned in unwrap,
// so passing to java methods works.
ObjectWrapper = Base.extend(new function() {
	var javascript = Packages.org.mozilla.javascript;
	var ScriptableObject = javascript.ScriptableObject;
	var XMLObject = javascript.xml.XMLObject;
	var Wrapper = javascript.Wrapper;
	var NOT_FOUND = javascript.Scriptable.NOT_FOUND;

	return {
		initialize: function(object, param, dontUnwrap) {
			// Retrieve the NativeJavaObject wrapper for this object, so we can
			// access its java methods directly from the wrapper that we are going
			// to produce bellow.
			// Need to tell toJava to not unwrap, as we want the HopObject wrapper
			// for Node, wrapped again in a NativeJavaObject, so we can use it, 
			// instead of the Node directly.
			this.object = object;
			this.param = param;
			this.dontUnwrap = dontUnwrap;
			this.javaObj = toJava(object, false);
			this.hash = this.javaObj.hashCode();
		},

		getClassName: function() {
			return this.javaObj.getClassName();
		},

		getIds: function() {
			return this.javaObj.getIds();
		},

	    getPrototype: function() {
			return this.javaObj.getPrototype();
		},

	    setPrototype: function(prototype) {
			this.javaObj.setPrototype(prototype);
		},

		getParentScope: function() {
			return this.javaObj.getParentScope();
		},

		getDefaultValue: function(hint) {
			return this.javaObj.getDefaultValue(hint);
		},

		hasInstance: function(instance) {
			return this.javaObj.hasInstance(instance);
		},

		toString: function() {
			return this.javaObj.toString();
		},

		unwrap: function() {
			// Do not unwrap the first time unwrap is called 
			// if dontUnwrap is set. See 'get' for an explanation.
			if (this.dontUnwrap) {
				delete this.dontUnwrap;
				return this;
			}
			// unwrappedObj is not always the same as javaObj, e.g. HopObject VS Node
			if (!this.unwrappedObj)
				this.unwrappedObj = toJava(this.object);
			return this.unwrappedObj;
		},

		hashCode: function() {
			return this.javaObj.hashCode();
		},

		statics: {
			// Produces a wrapper that inherits from object, intercepts modifications
			// and calls a onChange handler if they happen. It also wraps returned
			// values again, in order to detect modifications on any level down the
			// hierarchy.
			wrap: synchronize(function(obj, param, dontUnwrap) {
				// Packages.helma.scripting.rhino.wrapper.ObjectWrapper.wrap(obj, null);
				if (obj === null) {
					return null;
				} else if (obj === undefined || obj === NOT_FOUND) {
					// We need to convert undefined back to NOT_FOUND, otherwise it is
					// returned as a string in the end, since we're on the 'java' side
					// here.
				 	return NOT_FOUND;
				}
				var type = typeof obj;
				var isXml = type == 'xml';
				if (isXml || type == 'object'
						&& !(obj instanceof String || obj instanceof Number)) {
					return isXml
						? new JavaAdapter(XMLObject, Wrapper, new XMLObjectWrapper(obj, param, dontUnwrap))
						: new JavaAdapter(ScriptableObject, Wrapper, new ScriptableObjectWrapper(obj, param, dontUnwrap));
				} else {
					// Basic types, no wrapping needed to detect change
					return obj;
				}
			})
		}
	}
});

ScriptableObjectWrapper = ObjectWrapper.extend(new function() {
	var javascript = Packages.org.mozilla.javascript;
	var ScriptableObject = javascript.ScriptableObject;
	var Context = javascript.Context;

	return {
		get: function(name, start) {
			// Wrap sub elements again
			var value = ScriptableObject.getProperty(this.javaObj, name);
			if (typeof value == 'function') {
				if (!this.functions)
					this.functions = {};
				// Return wrapped function that calls the original function
				// instead of being called on the wrapper, since this would
				// often not work as the adapter's class is not necessarily
				// the same as the wrapped object.
				var func = this.functions[name];
				if (!func) {
					var that = this;
					func = this.functions[name] = (function() {
						// Pass on the call to the original function
						// on the original object.
						// Convert arguments by 'unpacking' other wrappers,
						// meaning replacing them with their original objects
						// This is needed especially for HopObjects, since
						// they are not wrapped in a HopObject, and passing
						// the wrapper to native methods would not recognize
						// it as a HopObject then.
						for (var i = 0, l = arguments.length; i < l; i++) {
							var arg = arguments[i];
							// Do not call toObject on other values, such as
							// numbers, since it would make them objects.
							arguments[i] = typeof arg == 'object'
								? Context.toObject(arg, global)
								: arg;
						}
						var ret = that.object[name].apply(that.object, arguments);
						// Call onChange after calling a function that changes the object.
						// The name of these methods need to be passed to wrap.
						if (that.param && that.param.modifiers && that.param.onChange
								&& that.param.modifiers.contains(name))
							that.param.onChange.call(that);
						return ObjectWrapper.wrap(ret, that.param);
					}).pretend(value);
				}
				return func;
			}
			// Pass true for dontUnwrap so the object does not get
			// unwrapped the first time unwrap is called.
			// This is to avoid an issue in JavaAdapter code that
			// would lead to HopObjects being returned as Nodes
			// otherwise.
			return ObjectWrapper.wrap(value, this.param, true);
		},

		put: function(name, start, value) {
			ScriptableObject.putProperty(this.javaObj, name, value);
			if (this.param && this.param.onChange)
				this.param.onChange.call(this);
		},

		has: function(name, start) {
			return ScriptableObject.hasProperty(this.javaObj, name);
		},

		'delete': function(name) {
			ScriptableObject.deleteProperty(this.javaObj, name);
			if (this.param && this.param.onChange)
				this.param.onChange.call(this);
		}
	}
});

// Make a special wrapper for XMLObjects. Due to the structure of things in Rhino,
// We need to wrap them directly in a class inheriting from XMLObject, and override
// the various ecma commands. Otherwise, E4X will not work with the wrapped object.
// Other than that, this is identical in structure to the object code above.
XMLObjectWrapper = ObjectWrapper.extend({
	ecmaGet: function(cx, id) {
		// Wrap sub elements again
		return ObjectWrapper.wrap(this.javaObj.ecmaGet(cx, id), this.param, true);
	},

	ecmaPut: function(cx, id, value) {
		this.javaObj.ecmaPut(cx, id, value);
		if (this.param && this.param.onChange)
			this.param.onChange.call(this);
	},

	ecmaHas: function(cx, id) {
		return this.javaObj.ecmaHas(cx, id);
	},

	ecmaDelete: function(cx, id) {
		var ret = this.javaObj.ecmaDelete(cx, id);
		if (ret && this.param && this.param.onChange)
			this.param.onChange.call(this);
		return ret;
	},

	enterDotQuery: function(scope) {
		return this.javaObj.enterDotQuery(scope);
	},

	enterWith: function(scope) {
		return this.javaObj.enterWith(scope);
	},

	getExtraMethodSource: function(cx) {
		return this.javaObj.getExtraMethodSource(cx);
	},

	memberRef: function() {
		return this.javaObj.memberRef.apply(this.javaObj, arguments);
	}
});
