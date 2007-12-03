// A helper class for laoding messages from a properties file inside a prototype folder, parsing them as skins and storing them in memory:

Messages = Base.extend({
	initialize: function(prototype) {
		// this is hackish: get prototype name from javascript prototype object (scope):
		var protoName = prototype.toString();
		var match = protoName.match(/\[object (\w*)\]/);
		if (match) protoName = match[1];
		// walk through all the resources of the prototype and find the resource named messages.properites
		var proto = app.__app__.getPrototypeByName(protoName);
		var name = "messages.properties";
		if (proto) {
			var resources = proto.getResources();
		    for (var i = 0; i < resources.length; i++) {
		        var resource = resources[i];
		        if (resource.exists() && resource.getShortName().equals(name)) {
					app.log("Loading messages for prototype " + protoName + " from " + resource);
					if (!this.messages)
						this.messages = new Packages.helma.util.ResourceProperties(app.__app__);
					this.messages.addResource(resource);
		        }
		    }
		}

		if (!this.messages)
			throw "cannot find messages resource named " + name + " in " + protoName;

		// use a skin cache that is linked to a hash of the message.
		// in case the message changes while the app is running the skin gets
		// recreated too.
		this.skins = {};
	},

	/**
	 * fetches a message and renders it as a skin
	 */
	render: function(key, value) {
		var message = this.messages.getProperty(key);
		if (message) {
			// Find skin:
			var entry = this.skins[key];
			// Update if necessary. Use a md5 hash to compare content, and
			// parse skins again if content changed.
			var hash = Packages.helma.util.MD5Encoder.encode(message);
			if (!entry || entry.hash != hash) {
				entry = {
					skin: createSkin(message),
					hash: hash
				};
				this.skins[key] = entry;
			}
			// Create param-object needed to render Skin
			var param = {};
			// Check if value passed is actually an array
			if (value) {
				if (typeof value == "string") param.value1 = value;
				else if (value.length) {
					for (var i = 0; i < value.length; i++) {
						param["value" + (i + 1)] = value[i];
					}
				}
			}
			return renderSkinAsString(entry.skin, param);
		}
		return '';
	}
});

new function() {
	function renderMessage(proto, key, value) {
		// Throw an error if renderMessage / setMessage is called on any normal function
		if (!(proto instanceof HopObject))
			throw "Calling renderMessage / setMessage is only supported on HopObject constructors.";
		if (!proto.messages)
			proto.messages = new Messages(proto);
		return proto.messages.render(key, value);
	}

	// Add renderMessage & setMessage to HopObject instances
	HopObject.inject({
		renderMessage: function(key, value) {
			return renderMessage(this.__proto__, key, value);
		},

		setMessage: function(key, value) {
			res.message = this.renderMessage(key, value);
		}
	});

	// Add renderMessage & setMessage to HopObject constructors. 
	// The only place to put this and make it available to all HopObject
	// constructors at once is Function.prototype...
	Function.inject({
		renderMessage: function(key, value) {
			return renderMessage(this.prototype, key, value);
		},

		setMessage: function(key, value) {
			res.message = this.renderMessage(key, value);
		}
	});
};

