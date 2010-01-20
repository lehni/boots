Picture.inject({
	getEditForm: function(param) {
		return this.base(Hash.merge({ name: false, hasDimensions: false }, param));
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
		if (!param.href && !param.object) {
			// Only set the popup if this is actually linking to the image.
			// if href or object is set, the image is probably taking us to 
			// another page, so don't popup!
			param.popup = {
				name: this.name,
				width: this.width,
				height: this.height
			};
		}
	 	return this.base(param, out);
	},

	getUniqueValues: function(param) {
		// Generate an array of unique values to identify the characteristics of this image.
		// The list is is then converted to an id in processImage.
		var crop = param.crop;
		return [
			param.maxWidth, param.maxHeight, param.quality, param.tint,
//			param.rotation, param.bgColor,
			crop && [crop.x, crop.y, crop.width, crop.height, crop.halign, crop.valign, crop.imageWidth, crop.imageHeight],
			param.transparentPixel && [param.transparentPixel.x, param.transparentPixel.y]
		];
		return encodeMD5(res.pop());
	},

	processImage: function(param) {
		// Generate a unique id for the characteristics of this image:
		var id = encodeMD5(this.getUniqueValues(param).join(''));
		var version = this.getVersionFile(id);
		var width, height;
		// We use on the fly generation of image versions (e.g. thumbnails).
		// The file's existance is checked each time it's requested, and generated if needed
		if (!version.exists()) {
			var file = this.getFile();
			if (file.exists()) {
				var crop = param.crop;
				var maxWidth = crop && crop.imageWidth || param.maxWidth;
				var maxHeight = crop && crop.imageHeight || param.maxHeight;
				// Before fully loading the image, use Image.getInfo to see
				// if we need to.
				var info = Image.getInfo(file);
				width = info.width;
				height = info.height;
				var image = null;

				// Resize?
				if (width > maxWidth || height > maxHeight) {
					image = new Image(file);
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

				// Check if we need to crop the image
				if (crop) {
					// Image is only set if it was resized before
					if (!image)
						image = new Image(file);
					var cropWidth = crop.width || width;
					var cropHeight = crop.height || height;
					var x = (crop.x || 0).toInt();
					var y = (crop.y || 0).toInt();
					if (crop.halign)
						x += (width - cropWidth) *
							(crop.halign == 'center' ? 0.5 : crop.halign == 'right' ? 1 : 0);
					if (crop.valign) {
						y += (height - cropHeight) *
							(crop.valign == 'middle' ? 0.5 : crop.valign == 'bottom' ? 1 : 0);
					}
					image.crop(x, y, cropWidth, cropHeight);
					width = image.width;
					height = image.height;
				}

				// Check if we need to tint the image with a color
				if (param.tint) {
					// Image is only set if it was resized before
					if (!image)
						image = new Image(file);
					image = this.processTint(image, param.tint);
				}

				if (image) {
					// A new image version was produced, save it to a file now:
					var quality = (param.quality || app.properties.imageQuality || 0.8).toFloat();

					var numColors = info.getNumColors();
					if (numColors > 0) {
						// use the same amount of colors as the initial file:
						image.reduceColors(numColors);
					}

					// Set the transparant pixel
					if (param.transparentPixel) {
						image.setTransparentPixel(image.getPixel(
							param.transparentPixel.x || 0,
							param.transparentPixel.y || 0
						));
					}

					if (param.returnImage)
						return image;
					else
						image.saveAs(version, quality);
				} else {
					// No modifications were needed:
					if (param.returnImage)
						return new Image(file);
					else
						file.writeToFile(version);
				}
			}
		} 
		if (param.returnImage) {
			return new Image(version);
		} else {
			if (!width || !height) {
				var info = Image.getInfo(version);
				width = info.width;
				height = info.height;
			}
			var image = {
				src: this.getUri() + '?version=' + id,
				width: width,
				height: height
			};
			// Merge attributes into it before rendering
			if (param.attributes)
				image = Hash.merge(image, param.attributes);
			return image;
		}
	},

	renderImage: function(param, out) {
		return Html.image(this.processImage(param), out);
	},

	processTint: function(image, tint) {
		var tintColor = java.awt.Color.decode(tint);
		if (!tintColor) {
			User.logError('Picture#processTint()', 'Unsupported Tint: ' + tint);
			return image;
		}
		// convert to grayscale first:
		/*
		var cs = new java.awt.color.ColorSpace.getInstance(java.awt.color.ColorSpace.CS_GRAY);
		var bits = java.lang.reflect.Array.newInstance(java.lang.Integer.TYPE, 2);
		bits[0] = bits[1] = 8;
		var cm = new java.awt.image.ComponentColorModel(cs, bits, true, false, java.awt.Transparency.TRANSLUCENT, java.awt.image.DataBuffer.TYPE_BYTE);
		var gray = new java.awt.image.BufferedImage(cm, cm.createCompatibleWritableRaster(width, height), false, null); 
		*/
		var gray = new java.awt.image.BufferedImage(image.width, image.height, java.awt.image.BufferedImage.TYPE_BYTE_GRAY);
		var g2d = gray.createGraphics();
		g2d.setColor(java.awt.Color.WHITE);
		g2d.fillRect(0, 0, image.width, image.height);
		g2d['drawImage(java.awt.Image,int,int,java.awt.image.ImageObserver)'](image.getImage(), 0, 0, null);

		var r = tintColor.getRed();
		var g = tintColor.getGreen();
		var b = tintColor.getBlue();

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
			r += dr;
			g += dg;
			b += db;
		}
		var cm = new java.awt.image.IndexColorModel(8, 256, cmap, 0, false);
		var col = new java.awt.image.BufferedImage(cm, gray.getRaster(), false, null); 
		gray.flush();
		// and then tint with color:
		return new Image(col);
	},

	statics: {
		renderCrop: function(crop, param, out) {
			// Similar to CropTag
			var picture = crop && HopObject.get(crop.id);
			if (picture) {
				param.crop = crop;
				return picture.renderImage(param, out);
			}
		},

		getScaledCrop: function(crop, scale) {
			return scale == 1 ? crop : crop.each(function(value, key) {
				this[key] = typeof value == 'number' ? Math.round(value * scale) : value;
			}, {});
		}
	}
});