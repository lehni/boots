Medium.inject({
	getEditForm: function(param) {
		if (param.name === undefined)
			param.name = false;
		if (param.hasDimensions === undefined)
			param.hasDimensions = true;
		var form = this.base(param);
		if (param.hasDimensions) {
			form.insertAfter('file', [
				{ label: 'Width', name: 'width', type: 'integer', min: 0, max: 1024 },
				{ label: 'Height', name: 'height', type: 'integer', min: 0, max: 768 }
			]);
		}
		return form;
	},

	setFile: function(mimeObj) {
		if (this.base(mimeObj)) {
			// Determine type based on the basic type of the resource.
			// See Resource#getBasicType
			var type = this.getBasicType();
			if (/^(image|audio|video|flash|director)$/.test(type))
				this.type = type;
			if (this.type) {
				return true;
			} else {
				// Remove again if the file is not recognized as a movie
				this.removeResource();
			}
		}
		return false;
	},

	render: function(param, out) {
		if (this.type) {
			// Use Bootstrap's param.extend to create a new param object that
			// inherits from param and can be modified without changing the
			// passed param object.
			param = param.extend();
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
			var match = this.type.match(/^(\w*):(.*)$/), type;
			if (match) {
				type = match[1];
				param.id = match[2];
			} else {
				param.src = this.getUri();
				type = this.type;
			}
			return this.renderTemplate(type, param, out);
		}
	}
});
