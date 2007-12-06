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

	statics: {
		get: function(prototype, id) {
			// support prototype-id notation for string parameters
			if (id == undefined) {
				var parts = prototype.split('-');
				prototype = parts[0];
				id = parts[1];
			}
			return HopObject.getById(id, prototype);
			/*
			prototype = global[prototype];
			return prototype && prototype.getById(id);
			*/
		}
	}
});
