Resource.inject({
	statics: {
		/**
		 * Returns any of these, based on the content type:
		 * image, audio, video, code, director, flash, pdf, text
		 */
		getBasicType: function(mimeType) {
			if (/^image/.test(mimeType))
				return 'image';
			else if (/^video/.test(mimeType))
			 	return 'video';
			else if (/^audio/.test(mimeType))
				return 'audio';
			else if (mimeType == 'application/x-shockwave-flash')
				return 'flash';
			else if (mimeType == 'application/x-director')
				return 'director';
			else if (mimeType == 'application/x-javascript')
				return 'code';
			else if (mimeType == 'application/pdf')
				return 'pdf';
			else if (/^application\/(zip|x-(stuffit|gtar|tar|gzip))$/.test(mimeType))
				return 'archive';
			else
				return 'text';
		},

		create: function(mimeObj) {
			if (mimeObj && mimeObj.name) {
				var type = Resource.getBasicType(File.getContentType(mimeObj.name));
				if (type) {
					switch (type) {
						case 'image':
							var picture = new Picture(mimeObj);
							if (picture.isValid()) return picture;
							else picture.remove();
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
	},

	initialize: function(mimeObj) {
		if (mimeObj && mimeObj.name) {
			// in order to apply the file, the _id needs to be known, so let's
			// persist the object first:
			this.persist();
			this.setFile(mimeObj);
		}
		this.counter = 0;
	},

	getEditForm: function(param) {
		var form = new EditForm(this, { removable: true });
		// Allow sub-prototypes to display a name field easily through param
		if (param.hasName)
			form.add({ label: 'Name', name: 'name', type: 'string', length: 64 });
		var file = { label: 'File', name: 'file', type: 'file', onApply: this.setFile };
		if (this.name)
			file.value = this.renderIcon({ small: true, details: true });
		form.add(file);
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
		var ext = mimeObj && File.getExtension(mimeObj.name);
		if (ext) {
			ext = ext.toLowerCase();
			// remove old file:
			this.removeResource();
			this.name = mimeObj.name;
			this.extension = ext;
			var file = this.getFile();
			mimeObj.writeToFile(file.getParent(), file.getName());
			// Every time the file is changed, it can increase a verion field in the database.
			// This can be used to force refresh of caches. 
			// But only do this if the field is actually defined.
			if (this.version !== undefined) {
				if (this.version == null) this.version = 0;
				else this.version++;
			}
			return true;
		}
		return false;
	},

	getFilename: function(id) {
		return  (id != null ? id : this._id) + '.' + this.extension;
	},

	getFile: function(id) {
		return new File(getProperty('resourceDir'), this.getFilename(id));
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
		// override default href (this.href())
		if (!param.href) {
			param.href = this.getUri();
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
		return new File(getProperty('resourceDir'), 'versions/' + this._id +
			(versionId ? '_' + versionId : '') + '.' + (extension || this.extension));
	},

	removeVersionFiles: function() {
		if (this.extension) {
			// Remove all thumbnails of this image through java.io.File filtering
			var versions = new File(getProperty('resourceDir'), 'versions').list(new RegExp('^' + this._id + '[_.]'));
			for each (file in versions) {
				User.log('Erasing ' + file);
				file.remove();
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
	 * By default, anything that is not image, video or audio needs to be downloaded
	 * This can be overridden by any application
	 */
	forceDownload: function() {
		return !/^(image|movie|audio)/.test(this.getContentType());
	},

	forwardFile: function(file) {
		if (!file)
			file = this.getFile();
		res.contentType = file.getContentType();
		if (req.data.download || this.forceDownload()) {
			this.counter++;	
			res.getServletResponse().setHeader('Content-Disposition', 'attachment; filename="' + this.name + '"');
		}
		// res.forward takes the filename relative to the protectedStatic, so resolve here.
		res.forward(file.getRelativePath(getProperty('protectedDir')));
	},

	getContentType: function() {
		return File.getContentType(this.extension);
	},

	renderIcon: function(param, out) {
		if (!param.name)
			param.name = encode(this.name);
		param.src = getProperty('iconUri') + this.getIcon(param.small);
		if (param.details)
			param.details = ' (' +
				// Display image / video size for media
				(this instanceof Medium ? this.width + ' x ' + this.height + ' Pixels, ' : '') +
				// File size
				this.getFile().getSizeAsString() + 
				')';
		param.width = param.height = param.small ? 16 : 32;
		return this.renderTemplate('icon', param, out);
	},

	/**
	 * Returns any of these, based on the content type:
	 * image, audio, video, code, director, flash, text
	 */
	getBasicType: function() {
		return Resource.getBasicType(this.getContentType());
	},

	getIcon: function(small) {
		var icon = this.getBasicType();
		if (small) icon += '_small';
		return icon + '.gif';
	}
});
