Picture.inject({
	MAX_POPUP_SIZE: { maxWidth: 1000, maxHeight: 700 },
	VERSIONED: true,

	getEditForm: function(param) {
		if (param.name === undefined)
			param.name = false;
		if (param.hasDimensions === undefined)
			param.hasDimensions = false;
		return this.base(param);
	},

	setFile: function(mimeObj) {
		User.log('Picture#setFile() ' + mimeObj + ' ' 
				+ (mimeObj ? mimeObj.name + ' ' 
				+ File.getSizeAsString(mimeObj.contentLength) : ''));
		if (mimeObj) {
			var info = Image.getInfo(mimeObj);
			if (info && this.base(mimeObj)) {
				this.width = info.width;
				this.height = info.height;
				return true;
			}
			this.width = this.height = 0;
		}
		return false;
	},

	isValid: function() {
		return this.width != 0 && this.height != 0;
	},

	renderLink: function(param, out) {
		// Convert to object param first:
		if (!param || typeof param == 'string')
			param = { content: param };
		if (!param.href && !param.object) {
			// Only set the popup if this is actually linking to the image.
			// If href or object is set, the image is probably taking us to
			// another page, so don't popup!
			param.popup = this.getScaledSize(this.MAX_POPUP_SIZE);
		}
	 	return this.base(param, out);
	},

	/**
	 * Returns an ImageObject object.
	 */
	processImage: function(param) {
		// Generate a unique id for the characteristics of this image:
		var versionId = this.VERSIONED || param.versioned
				? ImageObject.getUniqueId(param)
				: '';
		var version = this.getVersionFile(versionId);
		// We use on the fly generation of image versions (e.g. thumbnails).
		// The file's existance is checked each time it's requested, and
		// generated if needed
		var image;
		if (version.exists()) {
			image = new ImageObject(version, param);
		} else {
			var file = this.getFile();
			if (!file.exists()) {
				User.logError('Picture#processImage()', 'Picture resource '
					+ this._id + '.' + this.extension + ' missing.');
				return null;
			}
			image = ImageObject.process(file, param);
			if (!image)
				image = new ImageObject(file, param);
			// Set the version file. The next time image.save() is called or
			// image.file gets accessed, it will automatically be persisted to
			// this file. If only the image object is used, no files will be
			// created on the harddrive.
			image.file = version;
		}
		// Set the src attribute for this version
		image.src = this.getUri();
		if (versionId)
			image.src += '?v=' + versionId;
		// Append attributes before rendering
		if (param.attributes)
			Hash.append(image, param.attributes);
		return image;
	},

	renderImage: function(param, out) {
		var image = this.processImage(param);
		return image && Html.image(image, out);
	},

	render: function(param, out) {
		return this.renderImage(param, out);
	},

	getScaledSize: function(param) {
		var scale = Math.min(Math.min(
				param.maxWidth / this.width,
				param.maxHeight / this.height
		), 1);
		return {
			width: Math.round(this.width * scale),
			height: Math.round(this.height * scale)
		};
	},

	statics: {
		renderCrop: function(crop, param, out) {
			// Similar to CropTag
			var picture = crop && HopObject.get(crop.id);
			if (picture) {
				// Use Bootstrap's param.extend to create a new param object
				// that inherits from param and can be modified without changing
				// the passed param object.
				param = param.extend();
				param.crop = crop;
				return picture.renderImage(param, out);
			}
		}
	}
});