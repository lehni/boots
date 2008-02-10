// Install UrlRouting in the root object, so other modules can install routes
// for Root without having to define getChildElement again.

UrlRouting.draw(this, {});

Root.inject({
	getChildElement: function(name) {
		// TODO: Fix Helma bug where mappings are returned before subnodes.
		// e.g. this.get('Users') and this.users should not return the same!
		// WORKAROUND: Fetch from pure children list first, then if not found
		// try properties too (e.g. resources, etc)
		var obj = this.children.get(name);
		if (!obj) {
			obj = this.base(name);
			if (!obj)
				obj = UrlRouting.handle(this, name);
		}
		return obj;
	}
});