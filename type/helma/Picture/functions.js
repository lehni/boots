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

	getUniqueValues: function(param) {
		// Generate an array of unique values to identify the characteristics of
		// this image. The list is is then converted to an id in processImage.
		var crop = param.crop;
		return [
			param.maxWidth, param.maxHeight, param.quality, param.scale,
			param.bgColor,
			param.tint, param.paper, param.paperFactor, param.rotation,
			crop && [crop.x, crop.y, crop.width, crop.height,
					crop.halign, crop.valign, crop.imageScale,
					crop.imageWidth, crop.imageHeight],
			param.transparentPixel && [param.transparentPixel.x,
					param.transparentPixel.y]
		];
	},

	processImage: function(param) {
		// Generate a unique id for the characteristics of this image:
		var versionId = this.VERSIONED || param.versioned
				? encodeMd5(this.getUniqueValues(param).join(''))
				: '';
		var version = this.getVersionFile(versionId);
		var width, height;
		// We use on the fly generation of image versions (e.g. thumbnails).
		// The file's existance is checked each time it's requested, and
		// generated if needed
		if (!version.exists()) {
			var file = this.getFile();
			if (!file.exists()) {
				User.logError('Picture#processImage()', 'Picture resource '
					+ this._id + '.' + this.extension + ' missing.');
				return null;
			}
			// Before fully loading the image, use Image.getInfo to see if we
			// need to.
			var info = Image.getInfo(file);
			width = info.width;
			height = info.height;
			var image = null;

			// Scale and maximum Size
			var maxWidth = param.maxWidth;
			var maxHeight = param.maxHeight;
			var crop = param.crop;
			var scale = param.scale || 1;

			if (crop) {
				// Calculate imageScale if it was not set directly, but
				// indirectly through imageWidth / Height.
				if (!crop.imageScale) {
					crop.imageScale =
					crop.imageWidth && crop.imageWidth / width
							|| crop.imageHeight && crop.imageHeight / height
							|| 1;
				}
				// Scale crop according to param.scale and to fit
				// maxWidth / Height.
				if (crop.width * scale > maxWidth
						|| crop.height * scale > maxHeight) {
					crop = Picture.getScaledCrop(crop, Math.min(
							maxWidth / crop.width * scale,
							maxHeight / crop.height * scale
					) * scale);
				}
				scale = crop.imageScale;
			} else if (width * scale > maxWidth
					|| height * scale > maxHeight) {
				scale *= Math.min(
						maxWidth / (width * scale),
						maxHeight / (height * scale)
				);
			}

			// Resize before crop
			if (scale != 1.0) {
				width = Math.round(width * scale);
				height = Math.round(height * scale);
				image = new Image(file);
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
				if (crop.halign) {
					x += (width - cropWidth) *
							(crop.halign == 'center'
									? 0.5 : crop.halign == 'right' ? 1 : 0);
				}
				if (crop.valign) {
					y += (height - cropHeight) *
							(crop.valign == 'middle'
									? 0.5 : crop.valign == 'bottom' ? 1 : 0);
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

			// Check if we need to paper the image with a color
			if (param.paper) {
				// Image is only set if it was resized before
				if (!image)
					image = new Image(file);
				image = this.processPaper(image, param);
			}

			if (image) {
				// A new image version was produced, save it to a file now:
				var quality = (param.quality || app.properties.imageQuality
						|| 0.9).toFloat();

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

				if (param.returnImage) {
					return image;
				} else {
					image.saveAs(version, quality, true);
				}
			} else {
				// No modifications were needed:
				if (param.returnImage) {
					return new Image(file);
				} else {
					file.writeToFile(version);
				}
			}
		}
		if (param.returnImage)
			return new Image(version);

		if (!width || !height) {
			var info = Image.getInfo(version);
			width = info.width;
			height = info.height;
		}
		var src = this.getUri();
		if (versionId)
			src += '?v=' + versionId;
		var image = {
			src: src,
			width: width,
			height: height
		};
		// Append attributes before rendering
		if (param.attributes)
			image = Hash.append(image, param.attributes);
		return image;
	},

	renderImage: function(param, out) {
		var image = this.processImage(param);
		return image && Html.image(image, out);
	},

	render: function(param, out) {
		return this.renderImage(param, out);
	},

	processPaper: function(image, param) {
		var paperDir = app.properties.assetDir + '/type/paper/';
		// Load images:
		var topLeft = new Image(paperDir + "topLeft.png");
		var topRight = new Image(paperDir + "topRight.png");
		var bottomLeft = new Image(paperDir + "bottomLeft.png");
		var bottomRight = new Image(paperDir + "bottomRight.png");
		var left = new Image(paperDir + "left.png");
		var top = new Image(paperDir + "top.png");
		var right = new Image(paperDir + "right.png");
		var bottom = new Image(paperDir + "bottom.png");
		var shade = new Image(paperDir + "shade.png");
		var corner = new Image(paperDir + "corner.png");

		var overlay = null;
		var scaleFactor = 1;

		var scale = (param.paperFactor || 1).toFloat();
		scale *= scaleFactor;

		// Fill background white:
		var tmp = image.clone();
		tmp.setColor(java.awt.Color.WHITE);
		tmp.fillRect(0, 0, image.width, image.height);
		tmp.drawImage(image, 0, 0);
		image.dispose();
		image = tmp;

		function drawImage(img, dest, x, y, scaleX, scaleY) {
			var at = java.awt.geom.AffineTransform.getTranslateInstance(x, y);
			at.scale(scaleX || scale, scaleY || scale);
			dest.drawImage(img, at);
		}

		// 'Cut' away transparent corner from image, by using DstIn rule to
		// apply the coner.png alpha channel.
		var g2d = image.getGraphics();
		var oldComp = g2d.getComposite();
		g2d.setComposite(java.awt.AlphaComposite.DstIn);
		drawImage(corner, image, image.width - corner.width * scale, 0);
		g2d.setComposite(oldComp);
		g2d.dispose();

		// Create new image for destination

		var thumb = new Image(
				image.width + (left.width + right.width) * scale,
				image.height + (top.height + bottom.height) * scale);

		// Fill with bg color

		var bgColor = param.bgColor && java.awt.Color.decode(param.bgColor);
		if (bgColor) {
			thumb.setColor(bgColor);
			thumb.fillRect(0, 0, thumb.width, thumb.height);
		}

		// Draw image on top first
		thumb.drawImage(image, left.width * scale, top.height * scale);

		// Draw shade
		drawImage(shade, thumb, thumb.width
				- (shade.width + right.width) * scale, top.height * scale);

		// Draw corners
		drawImage(topLeft, thumb, 0, 0);
		drawImage(topRight, thumb, thumb.width - topRight.width * scale, 0);
		drawImage(bottomLeft, thumb, 0,
				thumb.height - bottomLeft.height * scale);
		drawImage(bottomRight, thumb, thumb.width - bottomRight.width * scale,
				thumb.height - bottomRight.height * scale);

		// Stretch sides into place
		var length = thumb.height - (topLeft.height + bottomLeft.height) * scale;
		if (length > 0) {
			drawImage(left, thumb, 0, topLeft.height * scale, scale,
					length / left.height);
		}

		length = thumb.height - (topRight.height + bottomRight.height) * scale;
		if (length > 0) {
			drawImage(right, thumb, thumb.width - right.width * scale,
					topRight.height * scale, scale, length / right.height);
		}

		length = thumb.width - (topLeft.width + topRight.width) * scale;
		if (length > 0) {
			drawImage(top, thumb, topLeft.width * scale, 0, length / top.width,
					scale);
		}

		length = thumb.width - (bottomLeft.width + bottomRight.width) * scale;
		if (length > 0) {
			drawImage(bottom, thumb, bottomLeft.width * scale, thumb.height
					- bottom.height * scale, length / bottom.width, scale);
		}

		if (overlay) {
			try {
				overlay = new Image(paperDir + "overlay/" + overlay + ".png");
			} catch (e) {
				overlay = null;
			}
			if (overlay) {
				if (scaleFactor != 1.0) {
					overlay.resize(overlay.width * scaleFactor,
							overlay.height * scaleFactor);
				}
				thumb.drawImage(overlay,
					thumb.width - overlay.width - right.width - 1,
					thumb.height - overlay.height - bottom.height - 1);
			}
		}
		g2d.dispose();
		return thumb;
	},

	processTint: function(image, tint) {
		var tintColor = java.awt.Color.decode(tint);
		if (!tintColor) {
			User.logError('Picture#processTint()', 'Unsupported Tint: ' + tint);
			return image;
		}
		// Convert to grayscale first:
		var gray = new java.awt.image.BufferedImage(image.width, image.height,
				java.awt.image.BufferedImage.TYPE_BYTE_GRAY);
		var g2d = gray.createGraphics();
		g2d.setColor(java.awt.Color.WHITE);
		g2d.fillRect(0, 0, image.width, image.height);
		g2d['drawImage(java.awt.Image,int,int,java.awt.image.ImageObserver)'](
				image.getImage(), 0, 0, null);
		g2d.dispose();

		var r = tintColor.getRed();
		var g = tintColor.getGreen();
		var b = tintColor.getBlue();

		// Create IndexColorModel with new tinted palette
		// Boring: there seems to be no other way to create a byte value for the
		// JavaScript bridge:
		function toByte(val) {
			return val > 127 ? val - 256 : val;
		}

		var cmap = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE,
				256 * 3);
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
		// And then tint with color:
		var cm = new java.awt.image.IndexColorModel(8, 256, cmap, 0, false);
		var col = new java.awt.image.BufferedImage(cm, gray.getRaster(), false,
				null);
		gray.flush();
		return new Image(col);
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
		},

		getScaledCrop: function(crop, scale) {
			return scale == 1 ? crop : crop.each(function(value, key) {
				this[key] = typeof value == 'number'
					? key == 'imageScale'
						? value * scale : Math.round(value * scale)
					: value;
			}, {});
		}
	}
});