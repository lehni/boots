function getEditForm() {
	var mask = this.createEditForm(Node.HAS_CONTENT);
	var file = { label: 'File', name: 'file', type: "file", onApply: this.onApplyFile };
	if (this.name)
		file.value = this.name + ' (' + this.getFile().getLengthAsString() + ')';
	var tab = mask.getTabMask("content");
	tab.insertAfter("name", file);
	tab.removeItem("name");
	return mask;
}

function getEditName() {
	if (this.name) {
		var name = this.name.substring(0, this.name.lastIndexOf('.'));
		if (name && name.length > 20) name = name.substr(0, 20) + '...';
		return name + '.' + this.extension;
	}
}

function onCreate(transId) {
	Node.prototype.onCreate.call(this);
	// when the attachments are created, rename the files
	// from transient to persistend id
	if (transId) {
		var file = this.getFile(true, transId);
		if (file.exists())
			file.renameTo(this.getFile(true))
		var file = this.getFile(false, transId);
		if (file.exists())
			file.renameTo(this.getFile(false))
	}
}

function onApplyFile(file) {
	if (file) {
		this.removeFiles();
		var filename = file.getName();
		this.extension = File.getExtension(filename).toLowerCase();
		this.name = filename;
		var imageFile = this.getFile();
		file.writeToFile(imageFile.getParent(), imageFile.getName());
		var info = Image.getInfo(imageFile);
		if (info) {
			var numColors = info.getNumColors();
			// if it's an image, do some resizing:
			var maxWidth = this.getProperty('maxWidth');
			if (!maxWidth) maxWidth = getProperty("maxWidth");
			var maxHeight = this.getProperty('maxHeight');
			if (!maxHeight) maxHeight = getProperty("maxHeight");
			maxWidth = parseInt(maxWidth);
			maxHeight = parseInt(maxHeight);
		
			if (maxWidth && maxHeight && this.getContentType().indexOf('image') != -1) {
				var info = Image.getInfo(imageFile);
				if (info) {
					var width = info.getWidth();
					var height = info.getHeight();
					if (width > maxWidth || height > maxHeight) { // resize the image:
						var factor = width / height;
						if (width > maxWidth) {
							width = maxWidth;
							height = Math.round(maxWidth / factor);
						}
						if (height > maxHeight) {
							width = Math.round(maxHeight * factor);
							height = maxHeight;
						}
						var image = new Image(imageFile.getPath());
						image.resize(width, height);
						var quality = parseFloat(getProperty("resizeQuality"));
						if (!quality) quality = 0.75;
						// rename the original file and keep it too! (for pdf generation and such)
						var path = imageFile.getPath();
						imageFile.renameTo(new File(imageFile.getParent() + '/orig_' + imageFile.getName()));
						// and save the new file
						if (numColors > 0) {
							// use the same amount of colors as the initial file:
							image.reduceColors(numColors);
						}
						image.saveAs(path, quality);
						return true;
					}
				}
			}
		}
	}
	return false;
}

function recompress() {
	var file = this.getFile();
	var info = Image.getInfo(file);
	// check if it's an image and only recompress if its more than 80 kb
	if (info != null && file.getLength() > 50 * 1024) {
		var image = new Image(file);
		var quality = parseFloat(getProperty("resizeQuality"));
		if (!quality)
			quality = 0.75;
		var path = getProperty("attachmentDir") + "tmp_" + this._id + '.' + this.extension;
		var newFile = new File(path);
		image.saveAs(newFile, quality);
		if (newFile.getLength() < file.getLength()) {
			newFile.writeToFile(file);
		}
		newFile.remove();
	}
}

function getChildElement(name) {
	if (name == this.name) {
		// create an object that writes out this file:
		if (this.cache.writer == null) this.cache.writer = new ImageWriter(this);
		return this.cache.writer;
	}
	return null;
}

function removeFiles() {
	Node.prototype.removeFiles.apply(this);
	var file = this.getFile();
	if (file.exists()) file.remove();
}

function getFile(original, id) {
	var path = getProperty("attachmentDir");
	if (original) path += "orig_";
	path += (id != null ? id : this._id) + '.' + this.extension;
	var file = new File(path);
	if (original && !file.exists())
		return this.getFile(false);
	else
		return file;
}

function requiresNewWindow() {
	switch(this.extension) {
		case "pdf":
		case "txt":
		case "asc":
		case "java":
		case 'js':
		case 'cpp':
		case 'c':
		case 'h':
		case "z":
		case "zip":
		case "gz":
		case "tgz":
		case "sit":
		case "bin":
		case "sea":
		case "hqx": 
			return true;
	}
	return false;
}

function getContentType() {
	return File.getContentType(this.extension);
}

function render(param) {
	res.data.src = this.parent.href(this.name); // without trailing '/' !
	if (param.width) res.data.width = parseInt(param.width);
	if (param.height) res.data.height = parseInt(param.height);
	if (!res.data.width || !res.data.height) {
		var size = this.getDimensions();
		if (size) {
			if (!res.data.width) res.data.width = size.width;
			if (!res.data.height) res.data.height = size.height;
		}
	}
	switch (this.extension) {
		case 'gif':
		case 'png':
		case 'jpg':
		case 'jpeg':
			this.renderSkin("image");
			break;
		default:
			switch(this.extension) {
				case 'swf':
					this.renderSkin("swf");
					break;
				case 'dcr':
					this.renderSkin("dcr");
					break;
				case 'mp3':
					this.renderSkin("mov");
					break;
				default:
					this.renderSkin("mov");
					break;
			}
	}
}

function renderAsString(param) {
	res.push();
	this.render(param);
	return res.pop();
}

function getDimensions() {
	if (!Node.prototype.getDimensions.apply(this)) {
		var info = Image.getInfo(this.getFile());
		if (info) {
			this.cache.dimensions = {
				width: info.getWidth(),
				height: info.getHeight()
			}
		}
	}
	return this.cache.dimensions;
}

function renderMain() {
	this.assurePrivileges(Privileges.READ);
	// see wether the file itself or the view mode should be showed
	// view mode with a trailing /, the file itself without
	var ext = File.getExtension(req.path);
	if ((ext != null && ext.toLowerCase() == this.extension) || this.requiresNewWindow()) {
		res.contentType = this.getContentType();
		var original = req.path.endsWith(this.name + '/' + this.name);
		if (original)
			this.assurePrivileges(Privileges.EDIT, this.getEditor());
		var file = this.getFile(original);
		res.forward(file.getName());
	} else if (this.getProperty("popup")) {
		res.data.title = this.name;
		res.data.body = this.renderAsString({});
		this.renderSkin("popup");
	} else {
		// this renders the page with all the contained extras like thumbnails settings, but doesn't write out the text output part of it!
		// TODO: still needed?? solve with setPropery?
		this.parent.renderTextAsString();
		// create content first, as cache variables may be set that are used in the rendering afterwards!
		var text = this.renderTextAsString();
		// now store the image stuff in the attachment variable, that will be fetched from the template
		if (!res.data.attachment)
			res.data.attachment = this.renderAsString({});
		this.renderPage(text);
	}
}
