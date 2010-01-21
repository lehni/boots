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
			// Mark as used. Scriptographer extends ResourceTag to remove
			// these in cleanUp
			entry.used = true;
			return entry.resource;
		}
	},

	cleanUp: function(param) {
		if (param.removeUsedResources && param.resources) {
			// Remove the resources that have been flaged 'used'
			for (var i = param.resources.length - 1; i >= 0; i--)
				if (param.resourceLookup[param.resources[i].name].used)
					param.resources.splice(i, 1);
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
	}
});
