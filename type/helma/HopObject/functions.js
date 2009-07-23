HopObject.inject({
	getOrCreate: function(name, prototype) {
		var obj = this.get(name);
		if (!obj) {
			obj = new prototype();
			obj.name = name;
			// Make visible and set position if they are defined.
			if (obj.visible !== undefined)
				obj.visible = true;
			if (obj.position !== undefined)
				obj.position = this.count();
			this.add(obj);
		}
		return obj;
	},

	/**
	 * Define getChildElement for HopObject other than Nodes. This is used in
	 * collections of Nodes, such as resources, where hidden elements needs to
	 * be returned during editing too. It does so by checking wether the object
	 * has a corresponding 'all' collection and fetches from there.
	 * Node defines it's own getChildElement that does not call this one here,
	 * so all is fine.
	 * User overriding getChildElement anyhwere should make sure to use bootstrap
	 * and call this.base() within it.
	 */
	getChildElement: function(name) {
		var obj = this.get(name);
		if (!obj) {
			var parent = this.getParent();
			if (parent instanceof Node && User.canEdit(parent)) {
				// For collection HopObjects, this._id points to the collection's
				// name. 'all' + this._id.capitalize() therefore should return the
				// corresponding 'all' collection. Try to fetch from there:
				var all = parent['all' + this._id.capitalize()];
				if (all)
					obj = all.get(name);
			}
		}
		return obj;
	},

	/**
	 * Renders a link to the HopObject.
	 * Param can either be a string, or a hash containing these values:
	 * - content: the content of the link
	 * - href: the href to be overriden
	 * - popup: to be passed to renderLink as popup parameter
	 * - default: all other values are rendered as link attributes
	 * If no content is defined, getDisplayName is called.
	 */
	renderLink: function(param, out) {
		if (!param || typeof param == 'string')
			param = { content: param };
		// Default href = this object's
		if (!param.href && !param.object)
			param.object = this;
		// Default content = encoded display name
		if (!param.content) {
			param.content = encode(this.getDisplayName());
			// Do not render items with no display name, such as root.downloads
			if (!param.content)
				return null;
		}
		return renderLink(param, out);
	},

	/**
	 * getDisplayName can be used to define the way a object's name should be
	 * on the page displayed.
	 * TODO: Find a better name?
	 */
	getDisplayName: function() {
		return this.name;
	},

	/**
	 * Checks if the  object and all its parents have the visible property set.
	 * Returns true if that applies, false otherwise.
	 */
	isVisible: function() {
		var obj = this;
		while (obj && obj != root && obj.visible)
			obj = obj.getEditParent();
		return obj == root;
	}
});
