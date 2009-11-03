ObjectWrapper = new function() {
	var javascript = Packages.org.mozilla.javascript;
	var ScriptableObject = javascript.ScriptableObject;
	var XMLObject = javascript.xml.XMLObject;
	var Wrapper = javascript.Wrapper;
	var Context = javascript.Context;
	var NOT_FOUND = javascript.Scriptable.NOT_FOUND;

	// Cache for the produced adapters, and the objects they wrap.
	var adapters = {};

	return {
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
			if (isXml || type == 'object' || type == 'array') {
				// Retrieve the NativeJavaObject wrapper for this object, so we can
				// access its java methods directly from the wrapper that we are going
				// to produce bellow.
				// Need to tell toJava to not unwrap, as we want the HopObject wrapper
				// for Node, wrapped again in a NativeJavaObject, so we can use it, 
				// instead of the Node directly.
				var javaObj = toJava(obj, false);
				var unwrappedObj = toJava(obj);
				// unwrappedObj is not always the same as javaObj, e.g. HopObject VS Node
				var hash = javaObj.hashCode();
				// Store dontUnwrap values per thread, for thread savety!
				if (!thread.data.dontUnwrap)
					thread.data.dontUnwrap = {};
				// Make sure this returned adapter makes it through the
				// JavaAdapter auto-unwrap mechanism.
				if (dontUnwrap) {
					thread.data.dontUnwrap[hash] = true;
				} else {
					// Delete instead of setting to false, in order to not occupy too much memory.
					delete thread.data.dontUnwrap[hash];
				}
				// TODO: Implement some sort of cache rotation, otherwise this will 
				// potentiall grow endlessly...
				// Or use Scriptographer's WeakIdentityHashMap and WeakReferences.
				var adapter = adapters[hash];
				if (adapter) {
					// app.log('Reusing cached adapter: ' + adapter + ' @' + hash.toPaddedString(4, 16));
					return adapter.object;
				}
				// Common fields among the different implementations.
				var fields = {
					getClassName: function() {
						return javaObj.getClassName();
					},

					getIds: function() {
						return javaObj.getIds();
					},

				    getPrototype: function() {
						return javaObj.getPrototype();
					},

				    setPrototype: function(prototype) {
						javaObj.setPrototype(prototype);
					},

					getParentScope: function() {
						return javaObj.getParentScope();
					},

					getDefaultValue: function(hint) {
						return javaObj.getDefaultValue(hint);
					},

					hasInstance: function(instance) {
						return javaObj.hasInstance(instance);
					},

					toString: function() {
						return javaObj.toString();
					},

					unwrap: function() {
						// Do not unwrap the first time unwrap is called 
						// if dontUnwrap is set. See 'get' for an explanation.
						if (thread.data.dontUnwrap[hash]) {
							delete thread.data.dontUnwrap[hash];
							return this;
						}
						return unwrappedObj;
					},

					hashCode: function() {
						return hash;
					}
				};
				if (isXml) {
					// Make a special wrapper for XMLObjects. Due to the structure of things in Rhino,
					// We need to wrap them directly in a class inheriting from XMLObject, and override
					// the various ecma commands. Otherwise, E4X will not work with the wrapped object.
					// Other than that, this is identical in structure to the object code above.
					fields.ecmaGet = function(cx, id) {
						// Wrap sub elements again
						return ObjectWrapper.wrap(javaObj.ecmaGet(cx, id), param, true);
					}

					fields.ecmaPut = function(cx, id, value) {
						javaObj.ecmaPut(cx, id, value);
						if (param && param.onChange)
							param.onChange.call(this);
					}

					fields.ecmaHas = function(cx, id) {
						return javaObj.ecmaHas(cx, id);
					}

					fields.ecmaDelete = function(cx, id) {
						var ret = javaObj.ecmaDelete(cx, id);
						if (ret && param && param.onChange)
							param.onChange.call(this);
						return ret;
					}

					fields.enterDotQuery = function(scope) {
						return javaObj.enterDotQuery(scope);
					}

					fields.enterWith = function(scope) {
						return javaObj.enterWith(scope);
					}

					fields.getExtraMethodSource = function(cx) {
						return javaObj.getExtraMethodSource(cx);
					}

					fields.memberRef = function() {
						// varargs
						return javaObj.memberRef.apply(javaObj, arguments);
					}

					adapter = new JavaAdapter(XMLObject, Wrapper, fields);
				} else {
					// Wrap native objects in a ScriptableObject that delegates the function calls
					// and watches for things to change.
					// Also implement Wrapper, so the original object can be returned in unwrap,
					// so passing to java methods works.
					var functions = {};

					fields.get = function(name, start) {
						// Wrap sub elements again
						var value = ScriptableObject.getProperty(javaObj, name);
						if (typeof value == 'function') {
							// Return wrapped function that calls the original function
							// instead of being called on the wrapper, since this would
							// often not work as the adapter's class is not necessarily
							// the same as the wrapped object.
							var func = functions[name];
							if (!func) {
								func = functions[name] = (function() {
									// Pass on the call to the original function
									// on the original object.
									// Convert arguments by 'unpacking' other wrappers,
									// meaning replacing them with their original objects
									// This is needed especially for HopObjects, since
									// they are not wrapped in a HopObject, and passing
									// the wrapper to native methods would not recognize
									// it as a HopObject then.
									for (var i = 0, l = arguments.length; i < l; i++)
										arguments[i] = Context.toObject(arguments[i], global);
									var ret = obj[name].apply(obj, arguments);
									// Call onChange after calling a function that changes the object.
									// The name of these methods need to be passed to wrap.
									if (param && param.modifiers && param.onChange
											&& param.modifiers.contains(name))
										param.onChange.call(this);
									return ObjectWrapper.wrap(ret, param);
								}).pretend(value);
							}
							return func;
						}
						// Pass true for dontUnwrap so the object does not get
						// unwrapped the first time unwrap is called.
						// This is to avoid an issue in JavaAdapter code that
						// would lead to HopObjects being returned as Nodes
						// otherwise.
						return ObjectWrapper.wrap(value, param, true);
					}

					fields.put = function(name, start, value) {
						ScriptableObject.putProperty(javaObj, name, value);
						if (param && param.onChange)
							param.onChange.call(this);
					}

					fields.has = function(name, start) {
						return ScriptableObject.hasProperty(javaObj, name);
					}

					fields['delete'] = function(name) {
						ScriptableObject.deleteProperty(javaObj, name);
						if (param && param.onChange)
							param.onChange.call(this);
					}

					adapter = new JavaAdapter(ScriptableObject, Wrapper, fields);
				}
				adapters[hash] = adapter;
				return adapter;
			} else {
				// Basic types, no wrapping needed to detect change
				return obj;
			}
		})
	};
}
