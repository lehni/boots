function renderThumbnail(param) {
	var thumb = this.getProperty("thumbnail");
	if (thumb && (thumb = this.parent.findNode(thumb))) {
		return this.renderThumbnailImage(thumb.getFile(), this.extension, param);
	} else switch (this.extension) {
		case 'gif':
		case 'png':
		case 'jpg':
		case 'jpeg':
			return this.renderThumbnailImage(this.getFile(), null, param);
			break;
		case 'pdf':
			// render a pdf preview:
			var cacheFile = this.getCacheFile('pdf', 'png');
			if (!cacheFile.exists()) {
				var pageNumber = parseInt(this.getProperty("pageNumber"));
				/* 
				// acrobat.jar:
				var pdf = new Packages.com.adobe.acrobat.PDFDocument(new java.io.File(this.getFile()));
				var size = pdf.getPageSize(pageNumber);
				var factor = size.y / size.x;
				var width = 1024;
				var height = factor * width;
				if (height > width) {
					height = width;
					width = height / factor;
				}
				var img = new Image(width, height);
				var scale = height / size.y; 
				var af = new Packages.com.adobe.acrobat.sidecar.AffineTransform(scale, 0, 0, scale, 0, 0);
				var frm = new Packages.javax.swing.JFrame();
				frm.pack();
				pdf.drawPage(pageNumber, img.getImage(), af, null, frm); 
				frm.dispose();
				img.saveAs(cacheFile.getPath(), -1, true);
				*/
				// jpedal-full.jar:
				var pdf = new Packages.org.jpedal.PdfDecoder();
                pdf.openPdfFile(this.getFile().getPath());
				if (!pageNumber) pageNumber = 1;
				else if (pageNumber > pagepdf.getPageCount()) pageNumber = pagepdf.getPageCount();
                pdf.decodePage(pageNumber);
				pdf.setPageParameters(1, pageNumber); // this is needed so that getPDFWidth and getPDFHeight returns reasonable values
				// render the thumb as a 512 x 512 image:
				var factor = 512 / Math.max(pdf.getPDFWidth(), pdf.getPDFHeight());
                pdf.setExtractionMode(0, 72, factor);
				// now draw the image into a helma image and save it:
				var img = new Image(pdf.getPageAsImage());
				if (img) {
					try {
						img.saveAs(cacheFile.getPath(), -1, true);
					} catch(e) {
						img = null;
					}
				}
			} else {
				var img = cacheFile;
			}
			return img ? this.renderThumbnailImage(img, 'pdf', param) : null;
			break;
/*
		case 'mov':
		case 'mp4':
			// extract movie iamges:
			var ret = executeProcess("/usr/bin/mplayer -frames 1 -nosound -vo png outdir=" + dir + ":quality=75 -ss 5 " + dir + this.getFile.getName());
			var file = new File(dir, "00000002.png");
			if (file.exists()) {
				var first = new File(dir, "00000001.png");
				if (first.exists()) first.remove();
				file.renameTo(this._id + '.png');
			}
			var dir = getProperty("attachmentDir");
			if (this.renderThumbnailImage(dir + this._id + '.png', 'jpg', false, param)) {
				// only break if it's rendered, otherwise fall back to default
				break;
			}
		*/
		default:
			var type = null;
			switch (this.extension) {
				case 'mp3':
					type = 'mp3';
					break;
				case 'mp4':
				case 'mov':
					type = 'mov';
					break;
				case 'dcr':
					type = 'dcr';
					break;
				case 'swf':
					type = 'swf';
					break;
				case 'pdf':
					type = 'pdf';
					break;
				case 'java':
				case 'js':
				case 'cpp':
				case 'c':
				case 'h':
					type = 'code';
					break;
				case 'txt':
				case 'asc':
					type = 'text';
					break;
				case 'zip':
					type = 'zip';
					break;
				case 'sit':
					type = 'sit';
					break;
			}
			if (type) {
				if (param.asHtml) {
					var file = new File(getProperty('imagesDir') + 'icon_' + type + '_' + param.bgColor.substring(1) + '.gif');
					// create the icon, if necessary:
					if (!file.exists()) {
						try {
							var icon = new Image(getProperty('iconsDir') + type + '.png');
							var image = new Image(icon.getWidth(), icon.getHeight());
							image.setColor(param.bgColor);
							image.fillRect(0, 0, image.getWidth(), image.getHeight());
							image.drawImage(icon, 0, 0);
							image.reduceColors(256, true);
							image.setTransparentPixel(image.getPixel(0, 0));
							image.saveAs(file.getPath());
						} catch (e) {
							User.logError("Cannot create icon", e);
						}
					}
					var info = Image.getInfo(file);
					if (info) {
						res.data.icon = getProperty('imagesUri') + file.getName();
						res.data.width = info.getWidth();
						res.data.height = info.getHeight();
						this.renderSkin("icon");
					}
				} else {
					try {
						// use root to cache icon files:
						var cacheFile = root.getCacheFile(type + '_' + this.getImageIdentifier(param), 'png');
						if (cacheFile.exists()) {
							return new Image(cacheFile.getPath());
						} else {
							var icon = new Image(getProperty('iconsDir') + type + '.png');
							var scaleFactor = param.scaleFactor ? parseFloat(param.scaleFactor) : 1;
							icon.resize(Math.round(scaleFactor * icon.getWidth()), Math.round(scaleFactor * icon.getHeight()));
							icon.saveAs(cacheFile.getPath(), -1, true);
							return icon;
						}
					} catch (e) {
						User.logError("Cannot load icon", e);
					}
				}
			}
	}
	return null;
}

