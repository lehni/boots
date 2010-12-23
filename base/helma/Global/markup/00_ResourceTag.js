ResourceTag = MarkupTag.extend({
	_tags: 'resource',

	getResource: function(name, param) {
		var resources = param.resources;
		if (resources) {
			var lookup = ResourceTag.getLookup(param);
			var entry = lookup[name];
			if (entry) {
				// Mark as used. Apps can use ResourceTag.isUsed to filter out
				// already rendered ones.
				entry.used = true;
				return entry.resource;
			}
		}
	},

	// Defined outside render() so it can be overridden by applications.
	renderResource: function(resource, content, param) {
		return resource.render(param);
	},

	render: function(content, param) {
		var resource = this.getResource(content, param);
		if (resource)
			return this.renderResource(resource, content, param);
	},

	statics: {
		setResources: function(resources, param) {
			// In case there were previous resources rendered, save the lookup
			// from them and add the new resources to it, so we get preserve
			// the information about used resources.
			resources.lookup = param.resources && param.resources.lookup;
			param.resources = resources;
			// Update lookup for the new resources
			ResourceTag.getLookup(param, true);
		},

		getLookup: function(param, update) {
			var resources = param.resources, lookup = resources.lookup, created = false;
			if (!lookup) {
				lookup = resources.lookup = {};
				created = true;
			}
			if (created || update) {
				for (var i = 0, l = resources.length; i < l; i++) {
					var resource = resources[i], name = resource.name;
					if (created || !lookup[name])
						lookup[name] = { resource: resource };
				}
			}
			return lookup;
		},

		/**
		 * Offers simple access from the outside to the internal resourceLookup
		 * data-structure, so apps can know if a given resource was already 
		 * rendered in the processing of markup.
		 */
		isUsed: function(resource, param) {
			if (resource) {
				var resources = param.resources;
				var entry = resources.lookup && resources.lookup[resource.name];
				return entry && entry.resource === resource && entry.used;
			}
			return false;
		},

		/**
		 * Filters out all used resources from an array, using ResourceTag.isUsed
		 */
		getUnused: function(resources, param) {
			return resources.collect(function(resource) {
				if (!ResourceTag.isUsed(resource, param))
					return resource;
			});
		},

		reset: function(param) {
			delete param.resources;
		}
	}
});
