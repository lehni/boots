HopObject.inject({
	getOrCreate: function(name, prototype) {
		var obj = this.get(name);
		if (!obj) {
			obj = new prototype();
			obj.name = name;
			if (obj.position !== undefined)
				obj.position = this.count();
			this.add(obj);
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
		var content, href;
		if (param) {
			if (typeof param == "string") {
				content = param;
				param = null;
			} else {
				content = param.content;
				href = param.href;
			}
		}
		return renderLink(
			content || encode(this.getDisplayName()),
			href || this.href(), param, out);
	},

	/**
	 * getDisplayName can be used to define the way a object's name should be
	 * on the page displayed.
	 */
	getDisplayName: function() {
		return this.name;
	},

	getChildElement: function(name, secondTry) {
		var obj = this.get(name);
		if (!obj && !secondTry) {
			// If the object is not found, it could be because of Umlauts in the URL:
			// Try with converted names: Either UTF-8 or MacRoman
			var bytes = new java.lang.String(name).getBytes('ISO-8859-1');
			obj = this.getChildElement(new java.lang.String(bytes, 'UTF-8').toString(), true) ||
				this.getChildElement(new java.lang.String(bytes, 'MacRoman').toString(), true);
		}
		return obj;
	}
});
