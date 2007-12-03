Medium.inject({
	// MANUAL: Set MAX_WIDTH, MAX_HEIGHT to your value in your app!
	// TODO: consider getProperty("maxMediumWidth");
	MAX_WIDTH: 640,
	MAX_HEIGHT: 480,

	getEditForm: function(param) {
		// Force name field through param:
		var form = this.base(Hash.merge({ hasName: true, hasDimensions: true }, param));
		if (param.hasDimensions) {
			form.add([
				{ label: "Width", name: "width", type: "integer", min: 0, max: 1024 },
				{ label: "Height", name: "height", type: "integer", min: 0, max: 768 }
			]);
		}
		return form;
	},

	setFile: function(mimeObj) {
		this.base(mimeObj);
		var done = false;
		if (this.extension == 'video') {
			// Support for video text file, that defines videos on Youtube or Google
			var text = this.getFile().readAll();
			text.split(/[\r\n]/mg).each(function(line) {
				line = line.split('=');
				if (line.length == 2) {
					var key = line[0];
					if (key == "width") this.width = parseInt(line[1]);
					else if (key == "height") this.height = parseInt(line[1]);
					else if (key == "googleId") this.type = "google:" + line[1];
					else if (key == "youTubeId") this.type = "youtube:" + line[1];
					// TODO: add more formats
				}
			}, this);
			done = !!this.type;
		} else {
			// Determine type based on the basic type of the resource.
			// See Resource#getBasicType
			var type = this.getBasicType();
			if (/^(image|audio|video|flash|director)$/.test(type))
				this.type = type;
		}
		if (this.type) {
			if (!this.width || !this.height) {
				this.width = this.MAX_WIDTH;
				this.height = this.MAX_HEIGHT;
			} else if (this.width > this.MAX_WIDTH) {
				var factor = this.height / this.width;
				this.width = this.MAX_WIDTH;
				this.height = Math.round(this.MAX_WIDTH * factor);
			}
			return true;
		} else {
			// Remove again if the file is not recognized as a movie
			this.removeResource();
			return false;
		}
	},

	render: function(param, out) {
		if (this.type) {
			param.width = this.width;
			param.height = this.height;
			if (param.width > param.maxWidth || param.height > param.maxHeight) {
				var factor = param.width / param.height;
				if (param.maxWidth && param.width > param.maxWidth) {
					param.width = param.maxWidth;
					param.height = Math.round(param.width / factor);
				}
				if (param.maxHeight && param.height > param.maxHeight) {
					param.height = param.maxHeight;
					param.width = Math.round(param.height * factor);
				}
			}
			var match = this.type.match(/^(\w*):(.*)$/);
			if (match) {
				var type = match[1];
				param.id = match[2];
				try {
					this.renderTemplate(type, param, res);
				} catch(e) {
					res.write("Unsupported Format: " + type);
				}
			} else {
				param.src = this.getHref();
				this.renderTemplate(this.type, param, res);
			}
		}
	}.toRender()
});
