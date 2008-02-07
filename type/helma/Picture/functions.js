Picture.inject({
	getEditForm: function(param) {
		return this.base(Hash.merge({ hasName: false, hasDimensions: false }, param));
	},

	setFile: function(mimeObj) {
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
		if (!param.href) {
			// Only set the popup if this is actually linking to the image.
			// if href is set, the image is taking us to another page, so don't popup!
			param.popup = {
				title: this.name,
				width: this.width,
				height: this.height
			};
		}
		return this.base(param, out);
	},

	processImage: function(param) {
		// generate a unique id for the characteristics of this image:
		var id = encodeMD5(param.maxWidth +  param.maxHeight + (param.tint || '') + (param.crop || ''));
		var thumb = this.getThumbnailFile(id);
		var width, height;
		// we use on the fly generation of thumbnails. the file's existance is checked each time it's requested, and generated if needed
		if (!thumb.exists()) {
			var file = this.getFile();
			if (file.exists()) {
				var image = new Image(file);
				var maxWidth = param.maxWidth;
				var maxHeight = param.maxHeight;
				width = image.getWidth();
				height = image.getHeight();
				if (width > maxWidth || height > maxHeight) {
					if (param.crop) {
						if (param.cropScale)
							image.resize(Math.round(width * param.cropScale), Math.round(height * param.cropScale));
						if (param.cropOffset)
							image.crop(param.cropOffset.x, param.cropOffset.y, maxWidth, maxHeight);
						else
							image.crop(0, 0, maxWidth, maxHeight);
						width = maxWidth;
						height = maxHeight;
					} else {
						var factor = width / height;
						if (maxWidth && width > maxWidth) {
							width = maxWidth;
							height = Math.round(width / factor);
						}
						if (maxHeight && height > maxHeight) {
							height = maxHeight;
							width = Math.round(height * factor);
						}
						image.resize(width, height);
					}
				}
				// Check if we need to tint the image with a color
				var tint = param.tint;
				if (tint && (tint = java.awt.Color.decode(tint))) {
					// convert to grayscale first:
					/*
					var cs = new java.awt.color.ColorSpace.getInstance(java.awt.color.ColorSpace.CS_GRAY);
					var bits = java.lang.reflect.Array.newInstance(java.lang.Integer.TYPE, 2);
					bits[0] = bits[1] = 8;
					var cm = new java.awt.image.ComponentColorModel(cs, bits, true, false, java.awt.Transparency.TRANSLUCENT, java.awt.image.DataBuffer.TYPE_BYTE);
					var gray = new java.awt.image.BufferedImage(cm, cm.createCompatibleWritableRaster(width, height), false, null); 
					*/
					var gray = new java.awt.image.BufferedImage(width, height, java.awt.image.BufferedImage.TYPE_BYTE_GRAY);
					var g2d = gray.createGraphics();
					g2d.setColor(java.awt.Color.WHITE);
					g2d.fillRect(0, 0, width, height);
					g2d['drawImage(java.awt.Image,int,int,java.awt.image.ImageObserver)'](image.getImage(), 0, 0, null);

					var r = tint.getRed();
					var g = tint.getGreen();
					var b = tint.getBlue();

					// Create IndexColorModel with new tinted palette
					// Boring: there's no other way to create a byte value for the JavaScript bridge:
					function toByte(val) {
						return val > 127 ? val - 256 : val;
					}
			
					var cmap = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 256 * 3);
					var c = 0;
					var dr = (255 - r) / 255.0;
					var dg = (255 - g) / 255.0;
					var db = (255 - b) / 255.0;
					for (var i = 0; i < 256; i++) {
						cmap[c++] = toByte(Math.round(r));
						cmap[c++] = toByte(Math.round(g));
						cmap[c++] = toByte(Math.round(b));
						r += dr
						g += dg
						b += db
					}
					var cm = new java.awt.image.IndexColorModel(8, 256, cmap, 0, false);
					var col = new java.awt.image.BufferedImage(cm, gray.getRaster(), false, null); 
					gray.flush();
					// and then tint with color:
					image = new Image(col);
				}
				var quality = parseFloat(getProperty('thumbnailQuality'));
				if (!quality) quality = 0.8;
			
				var numColors = Image.getInfo(file).getNumColors();
				if (numColors > 0) {
					// use the same amount of colors as the initial file:
					image.reduceColors(numColors);
				}
				image.saveAs(thumb, quality);
			}
		} else {
			var info = Image.getInfo(thumb);
			width = info.width;
			height = info.height;
		}
		return {
			src: this.getUri() + '?thumb=' + id,
			width: width,
			height: height
		};
	},

	renderImage: function(param, out) {
		var image = this.processImage(param);
		// Merge attributes into it before rendering
		if (param.attributes)
			image = Hash.merge(image, param.attributes);
		return Html.image(image, out);
	}
});