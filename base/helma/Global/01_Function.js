Function.inject({
	/**
	 * Converts the function to a render function, by adding some glue
	 * that checks if the last parameter (usually called 'out') is set.
	 * If it is null, it is set to res, and res.push() / res.pop() is
	 * used to render to a string and return it.
	 * Otherwise, the function renders directly into res.
	 */
	/*
	toRender: function() {
		var params = this.parameters();
		var last = params.last();
		return Function.compile(params, 
			'var _asString = ' + last + ' == null;' +
			'if (_asString) (' + last + ' = res).push();' +
			this.body() +
			'if (_asString) return res.pop();');
	},
	*/
	toRender: function(count) {
		var length = count == undefined ? this.parameters().length : count;
		var last = length ? length - 1 : 0;
		var that = this;
		return function() {
			// look at the last argument. if it's null, 
			// render into a string.
			var asString = !arguments[last];
			if (asString) {
				res.push();
				// this seems to execute faster than the creation
				// of a new array, and at least in Rhino, it works!
				arguments[last] = res;
				arguments.length = length;
			}
			that.apply(this, arguments);
			// return the string if required
			if (asString)
				return res.pop();
		}
	},

	statics: {
		compile: function(params, body) {
			return Packages.org.mozilla.javascript.Context.getCurrentContext().compileFunction(
				{}, "function (" + params + ") {" + body + "}", 'Function', 0, null);
		}
	}
});
