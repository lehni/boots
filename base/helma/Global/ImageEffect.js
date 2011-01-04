ImageEffect = Base.extend(new function() {
	var processors = [];

	return {
		process: function(image, param) {
			// Override in subclasses
		},

		addUniqueValues: function(values, param) {
			// Override in subclasses
		},

		statics: {
			extend: function(src) {
				var res = this.base(src);
				// Add an instance of each
				processors.push(new res());
				return res;
			},

			process: function(imageObject, param) {
				for (var i = 0, l = processors.length; i < l; i++) {
					var res = processors[i].process(imageObject.image, param);
					if (res)
						imageObject.image = res;
				}
			},

			addUniqueValues: function(values, param) {
				for (var i = 0, l = processors.length; i < l; i++) {
					processors[i].addUniqueValues(values, param);
				}
			},

			/*
			 * Removes all instances of the ImageEffect class for which
			 * remove() is called. If no type is provided, we use the one
			 * remove() is called on.
			 * So these two calls perform the same action:
			 *
			 * ImageEffect.remove(TintEffect);
			 * TintEffect.remove();
			 */
			remove: function(type) {
				return !!processors.remove(function(processor) {
				 	return processor instanceof this;
				}, type || this);
			}
		}
	}
});
