Resource.inject({
	initialize: function(mimeObj) {
		if (mimeObj && mimeObj.name)
			this.setFile(mimeObj);
		this.counter = 0;
	},

	getEditForm: function(param) {
		var form = new EditForm(this, {
			removable: true, width: param.width
		});

		form.add(
			// Allow sub-prototypes to easily display name, file and caption
			// fields through param:
			form.createItem(param.name, {
				name: 'name', type: 'string', label: 'Name',
				length: 64
			}, false),
			form.createItem(param.file, {
				name: 'file', type: 'file', label: 'File',
				onApply: this.setFile,
				preview: this.name && this.renderIcon({
					iconSmall: true, iconDetails: true
				})
			}, true),
			form.createItem(param.caption, {
				name: 'caption', type: 'text', label: 'Caption',
				cols: 40, rows: 2
			}, false)
		);
		return form;
	},

	onCreate: function() {
		this.visible = 1;
	},

	onRemove: function() {
		this.removeResource();
	},

	onStore: function(transId) {
		// When the resources is stored, rename the file
		// from transient to persistend id
		if (transId) {
			var file = this.getFile(transId);
			if (file.exists())
				file.renameTo(this.getFile())
		}
	},

	setFile: function(mimeObj) {
		if (app.properties.debugEdit) {
			User.log('Resource#setFile() ' + mimeObj + ' ' 
					+ (mimeObj ? mimeObj.name + ' ' 
					+ File.getSizeAsString(mimeObj.contentLength) : ''));
		}
		var ext = mimeObj && File.getExtension(mimeObj.name);
		if (ext) {
			ext = ext.toLowerCase();
			// Remove old file:
			this.removeResource();
			this.name = mimeObj.name;
			this.extension = ext;
			var file = this.getFile();
			if (app.properties.debugEdit) {
				User.log('Resource#setFile() writing to' + file);
			}
			mimeObj.writeToFile(file.getParent(), file.getName());
			// Every time the file is changed, it can increase a verion field in
			// the database. This can be used to force refresh of caches.
			// But only do this if the field is actually defined.
			if (this.version !== undefined) {
				if (this.version == null) {
					this.version = 0;
				} else {
					this.version++;
				}
			}
			return true;
		}
		return false;
	},

	getFilename: function(id) {
		return  (id != null ? id : this._id) + '.' + this.extension;
	},

	getFile: function(id) {
		return new File(app.properties.resourceDir, this.getFilename(id));
	},

	hasFile: function() {
		return !!this.extension;
	},

	/**
	 * Returns the href without the trailing /, so a differenciation can be
	 * made between requestion the resource (without /) and the html code to
	 * display it (with /).
	 */
	getUri: function() {
		var href = this.href();
		if (href)
			return href.substring(0, href.length - 1);
	},

	/**
	 * Renders the link for a link to the resource.
	 */
	renderLink: function(param, out) {
		// Convert to object param first:
		if (!param || typeof param == 'string')
			param = { content: param };
		// Override default href (this.href())
		if (!param.href && !param.object) {
			// Open in blank window if it's not forcing a download
			if (!this.forceDownload()) {
				if (!param.attributes)
					param.attributes = {};
				param.attributes.target = '_blank';
			}
		}
		return this.base(param, out);
	},

	getVersionFile: function(versionId, extension) {
		return new File(app.properties.resourceDir, 'versions/' + this._id + '/'
				+ versionId + '.' + (extension || this.extension));
	},

	removeVersionFiles: function() {
		if (this.extension) {
			// Remove all thumbnails of this image through java.io.File
			// filtering
			var versions = new File(app.properties.resourceDir,
					'versions/' + this._id);
			if (versions.exists()) {
				User.log('Removing ' + versions);
				versions.remove(true);
			}
		}
	},

	removeResource: function() {
		if (this.extension) {
			this.getFile().remove();
			this.removeVersionFiles();
			this.extension = null;
		}
	},

	/**
	 * By default, anything that is not image, video or audio needs to be
	 * downloaded This can be overridden by any application
	 */
	forceDownload: function() {
		return !/^(image|movie|audio)/.test(this.getContentType());
	},

	forwardFile: function(file) {
		if (!file)
			file = this.getFile();
		if (file.exists()) {
			res.contentType = file.getContentType();
			if (req.data.download || this.forceDownload()) {
				this.counter++;	
				res.servletResponse.setHeader('Content-Disposition',
						'attachment; filename="' + this.name + '"');
			}
			// res.forward takes the filename relative to the protectedStatic,
			// so resolve here.
			res.forward(file.getRelativePath(app.properties.protectedDir));
		} else {
			app.log('ERROR: Requesting inexisting file: ' + file);
		}
	},

	getContentType: function() {
		return File.getContentType(this.extension);
	},

	/**
	 * Returns any of these, based on the content type:
	 * image, audio, video, code, director, flash, text
	 */
	getBasicType: function() {
		return Resource.getBasicType(this.getContentType());
	},

	getIcon: function(small) {
		var type = this.getBasicType();
		return (small ? type + '_small' : type) + '.gif';
	},

	renderIcon: function(param, out) {
		// Use Bootstrap's param.extend to create a new param object that
		// inherits from param and can be modified without changing the
		// passed param object.
		param = param.extend();
		if (!param.name)
			param.name = encode(this.name);
		param.src = app.properties.iconUri + this.getIcon(param.iconSmall);
		// TODO: Put rendering of details in its own function and macro
		if (param.iconDetails)
			param.details = ' ('
				// Display image / video size for media
				+ (this.instanceOf(Medium) ? this.width + ' \xd7 ' + this.height
				+ ' Pixels, ' : '')
				// File size
				+ this.getFile().getSizeAsString()
				+ ')';
		param.width = param.height = param.iconSmall ? 16 : 32;
		return this.renderTemplate('icon', param, out);
	},

	/**
	 * The default render function that renders the resource in its appropriate
	 * way. Each resource defines its own, usually refering to a one that is
	 * more explicitely named. This can be used to overrided per prototype
	 * behavior for resource rendering.
	 */
	render: function(param, out) {
		return this.renderIcon(param, out);
	},

	processThumbnail: function(param) {
		var cacheId = ImageObject.getUniqueId(param);
		var file = this.getVersionFile(cacheId, 'png');
		if (!file.exists()) {
			var image = ImageObject.process(this.getFile(), param, file);
			// Call save straight away, as we always want the processed image
			// persisted
			image.save();
			return image;
		}
		return new ImageObject(file);
	},

	statics: {
		/**
		 * Returns any of these, based on the content type:
		 * image, audio, video, code, director, flash, pdf, text
		 */
		getBasicType: function(mimeType) {
			// Simple comparisson
			switch (mimeType) {
			case 'application/pdf':
				return 'pdf';
			case 'application/x-javascript':
				// TODO: Support other code types!
				return 'code';
			case 'application/x-shockwave-flash':
				return 'flash';
			case 'application/x-director':
				return 'director';
			}
			// Expression Matching
			if (/^image/.test(mimeType)) {
				return 'image';
			} else if (/^video/.test(mimeType)) {
			 	return 'video';
			} else if (/^audio/.test(mimeType)) {
				return 'audio';
			} else if (/^application\/(zip|x-(stuffit|gtar|tar|gzip))$/.test(
					mimeType)) {
				return 'archive';
			}
			// TODO: Use mime for text, binary as fallback
			return 'text';
		},

		create: function(mimeObj) {
			if (app.properties.debugEdit) {
				User.log('Resouce.create()', mimeObj);
			}
			if (mimeObj && mimeObj.name) {
				var type = Resource.getBasicType(
						File.getContentType(mimeObj.name));
				if (app.properties.debugEdit) {
					User.log(type);
				}
				if (type) {
					switch (type) {
					case 'image':
						var picture = new Picture(mimeObj);
						if (picture.isValid()) {
							return picture;
						} else {
							picture.remove();
						}
						break;
					case 'video':
					case 'audio':
					case 'flash':
					case 'director':
						return new Medium(mimeObj);
					default:
						return new Resource(mimeObj);
					}
				}
			}
			return null;
		}
	}
});
