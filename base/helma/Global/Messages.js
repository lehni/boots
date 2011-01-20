// A helper class for laoding messages from a properties file inside a prototype folder, parsing them as skins and storing them in memory:

Messages = Base.extend({
	initialize: function(prototype) {
		// The prototype name can be accessed through the name field of the
		// constructor:
		var protoName = prototype.constructor.name;
		// walk through all the resources of the prototype and find the resource named messages.properites
		var proto = app.__app__.getPrototypeByName(protoName);
		var name = 'messages.properties';
		if (proto) {
			var resources = proto.getResources();
		    for (var i = 0; i < resources.length; i++) {
		        var resource = resources[i];
		        if (resource.exists() && resource.getShortName().equals(name)) {
					app.log('Loading messages for prototype ' + protoName + ' from ' + resource);
					if (!this.messages)
						this.messages = new Packages.helma.util.ResourceProperties(app.__app__);
					this.messages.addResource(resource);
		        }
		    }
		}

		if (!this.messages)
			throw 'cannot find messages resource named ' + name + ' in ' + protoName;

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
			// Update if necessary. Use a MD5 hash to compare content, and
			// parse skins again if content changed.
			var hash = encodeMd5(message);
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
				if (typeof value == 'string') param.value1 = value;
				else if (value.length) {
					for (var i = 0; i < value.length; i++) {
						param['value' + (i + 1)] = value[i];
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
			throw 'Calling renderMessage / setMessage is only supported on HopObject constructors.';
		if (!proto.messages)
			proto.messages = new Messages(proto);
		return proto.messages.render(key, value);
	}

	// Add renderMessage & setMessage to HopObject constructors. 
	// The only place to put this and make it available to all HopObject
	// constructors at once is Function.prototype...
	Function.inject({
		renderMessage: function(key, value) {
			return renderMessage(this.prototype, key, value);
		},

		setMessage: function(key, value) {
			res.message = this.renderMessage(key, value);
		},

		addMessage: function(key, value) {
			if (res.message == null)
				res.message = '';
			else
				res.message += '\n\n\n';
			res.message += this.renderMessage(key, value);
		}
	});

	// Add renderMessage & setMessage to HopObject instances.
	// Just forward to the static methods.
	HopObject.inject({
		renderMessage: function(key, value) {
			return this.constructor.renderMessage(key, value);
		},

		setMessage: function(key, value) {
			this.constructor.setMessage(key, value);
		},

		addMessage: function(key, value) {
			this.constructor.addMessage(key, value);
		}
	});
};

