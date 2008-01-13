HopObject.inject({
	// TODO: this is only used in the feed part of legacy wiki code, 
	// consider removal
	absoluteHref: function() {
		return getProperty("serverUrl") + this.href();
	},

	/**
	 * Parses the text into a helma skin and renders it. This will be deprecated
	 * in favour of Markup.js and Template.js
	 */
	renderText: function(text, out) {
		if (text) {
			var skin = createSkin(format(text));
			if (out == res)	this.renderSkin(skin);
			else {
				var str = this.renderSkinAsString(skin);
				if (out) out.write(str);
				else return str;
			}
		}
	},

	/**
	 * Render HTML is the method in base lib apps that's supposed to render the
	 * final result. This here is just a scafold, apps should provide their own.
	 * But since core parts rely on it to be there, here it is, along with a
	 * simple template.
	 */
	renderHtml: function(param) {
		param.title = param.title || this.name;
		this.renderTemplate('html', param, res);
	},

	/** 
	 * Returns the object's fulLId. This is the object's prototype and id
	 * seperated by a dash. This id can be used again to retrieve the object
	 * Through HopObject.get(fullId);
	 */
	getFullId: function() {
		// Use this.cache.id instead of real _if if set, so transient
		// nodes can pretend to be another node. Used when transient nodes
		// are lost in the cache. See EditNode#initialize
		return this._prototype + '-' + (this.cache.id || this._id);
	},

	statics: {
		/**
		 * Takes either an id / prototype pair of a full id ("prototype-id")
		 * and returns the corresponding object, if any.
		 */
		get: function(id, prototype) {
			// Support fullId prototype-id notation for string parameters:
			if (id == null)
				return null;
			if (prototype == undefined) {
				// id is a fullId:
				var parts = id.split('-');
				prototype = parts[0];
				id = parts[1];
			}
			return HopObject.getById(id, prototype);
		}
	}
});
