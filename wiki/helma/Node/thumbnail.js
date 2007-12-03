function getThumbnailFile(identifier) {
	// if osx icons are used, allways render gif thumbnails, otherwise use the image's type:
	return new File(getProperty("imagesDir") + 'thumb_' + this.getFileId()  + '_' + identifier + '.' + (getProperty("paperDir") ? 'gif' : this.extension));
}

function getCacheFile(identifier, extension) {
	return new File(getProperty("cacheDir") + 'cache_' + this.getFileId() + '_' + identifier + '.' + extension);
}

function getImageIdentifier(param) {
	return encodeMD5(param.scaleFactor + param.sizeDivider + param.bgColor + param.maxWidth + param.maxHeight);
}

// if param.asHtml is set, this renders the image file + html code
// and returns true if success, otherwise it just returns the rendered image, or null
function renderThumbnailImage(image, overlay, param) {
	try {
		var id = this.getImageIdentifier(param);
		var thumbFile = param.asHtml ? this.getThumbnailFile(id) : this.getCacheFile(id, 'png');
		if (!thumbFile.exists() && image.exists()) {
			if (image instanceof File) {
				image = new Image(image.getPath());
			}
		
			var width = image.getWidth();
			var height = image.getHeight();

			var factor = width / height;
		
			var scaleFactor = param.scaleFactor ? parseFloat(param.scaleFactor) : 1;
		
			var maxWidth = parseFloat(param.maxWidth) * scaleFactor;
			var maxHeight = parseFloat(param.maxHeight) * scaleFactor;
		
			if (maxWidth && width > maxWidth) {
				width = maxWidth;
				height = Math.round(width / factor);
			}
			if (maxHeight && height > maxHeight) {
				height = maxHeight;
				width = Math.round(height * factor);
			}

			image = this.processThumbnail(image, thumbFile.getPath(), overlay, width, height, scaleFactor, param);
		
			if (!param.asHtml) {
				// save the image as a cache for the next time:
				image.saveAs(thumbFile.getPath(), -1, true);
				return image;
			}
		}
		if (param.asHtml) {
			res.data.src = getProperty("imagesUri") + thumbFile.getName();
			var info = Image.getInfo(thumbFile);
			if (info) {
				res.data.width = info.getWidth();
				res.data.height = info.getHeight();
				this.renderSkin("image");
				return true;
			}
		} else {
			// returned cached file:
			return new Image(thumbFile.getPath());
		}
		return null;
	} catch(e) {
		User.logError("renderThumbnailImage: " + this.getFile(), e);
	}
}

function processThumbnail(image, path, overlay, width, height, scaleFactor, param) {
	if (param.asHtml) {
		image.resize(width, height);
		var quality = parseFloat(getProperty("resizeQuality"));
		if (!quality) quality = 0.75;
		image.saveAs(path, quality);
	}
	return image;
}
