ResourceTag = MarkupTag.extend({
	_tags: 'resource',

	getResource: function(name, param) {
		if (!param.resourceLookup) {
			param.resourceLookup = {};
			if (param.resources) {
				for (var i = 0; i < param.resources.length; i++) {
					var resource = param.resources[i];
					param.resourceLookup[resource.name] = {
						resource: resource,
						index: i
					};
				}
			}
		}
		var entry = param.resourceLookup[name];
		if (entry) {
			// Mark as used. Apps can use ResourceTag.isUsed to filter out
			// already rendered ones.
			entry.used = true;
			return entry.resource;
		}
	},

	// Defined outside render() so it can be overridden by applications.
	renderResource: function(resource, param) {
		return resource.render(param);
	},

	render: function(content, param) {
		var resource = this.getResource(content, param);
		if (resource)
			return this.renderResource(resource, param);
	},

	statics: {
		/**
		 * Offers simple access from the outside to the internal resourceLookup
		 * data-structure, so apps can know if a given resource was already 
		 * rendered in the processing of markup.
		 */
		isUsed: function(resource, param) {
			var entry = resource && param.resourceLookup
					&& param.resourceLookup[resource.name];
			return entry && entry.used;
		},

		/**
		 * Filters out all used resources from an array, using ResourceTag.isUsed
		 */
		getUnused: function(resources, param) {
			return resources.collect(function(resource) {
				if (!ResourceTag.isUsed(resource, param))
					return resource;
			});
		}
	}
});
