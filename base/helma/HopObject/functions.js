HopObject.inject({
	// TODO: this is only used in the feed part of legacy wiki code, 
	// consider removal
	absoluteHref: function() {
		return getProperty("serverUrl") + this.href();
	},

	renderText: function(text, out) {
		if (text) {
			var skin = createSkin(format(text));
			if (out == res)	this.renderSkin(skin);
			else out.write(this.renderSkinAsString(skin));
		}
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
		get: function(id, prototype) {
			// Support fullId prototype-id notation for string parameters:
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
