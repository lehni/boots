/**
 * ImageObject represents native ImageWrapper objects or image files and
 * information about them, such as width, height, wether they were modified
 * since object creation, and optionally persistence to files. This simplifies
 * image handling in the Picture prototype a lot, as there is no need for
 * distinction between memory based images and stored images.
 */
ImageObject = Base.extend({
	/**
	 * @param image either be a File or a String pointing to an image or a
	 *        native Helma ImageWrapper object.
	 */
	initialize: function(image, param) {
		var modified = false, saved = false;
		var file, original;
		var info, pdf;
		var quality;
		// Is image a ImageWrapper or a file?
		if (image instanceof Image) {
			this.width = image.width;
			this.height = image.height;
		} else {
			// Before fully loading the image, use Image.getInfo to see if
			// we need to.
			file = original = new File(image);
			image = null;
			saved = true;
			info = Image.getInfo(file);
			if (info != null) {
				// The file represents a basic image, get size from there.
				this.width = info.width;
				this.height = info.height;
			} else {
				var type = file.getContentType();
				if (type == 'application/pdf') {
					if (!param)
						param = {};
					// Read pdf and get page size from there:
					pdf = new Packages.org.jpedal.PdfDecoder();
			        pdf.openPdfFile(file.path);
					var pageNumber = (param.pageNumber || 1).toInt();
					if (pageNumber > pdf.getPageCount())
						pageNumber = pdf.getPageCount();
			        pdf.decodePage(pageNumber);
					// This is needed so that getPDFWidth and getPDFHeight
					// returns reasonable values
					pdf.setPageParameters(1, pageNumber);
					this.width = pdf.getPDFWidth();
					this.height = pdf.getPDFHeight();
					// Calculate scale factor to meet requirements of param
					var factor = 1;
					if (param.maxWidth) {
						factor = Math.min(factor,
								param.maxWidth / pdf.getPDFWidth());
					}
					if (param.maxHeight) {
						factor = Math.min(factor,
								param.maxHeight / pdf.getPDFHeight());
					}
			        pdf.setExtractionMode(0, 72, factor);
				} else {
					// TODO: Add support for other types, e.g. movies?
					throw new Error(
							'Cannot convert the provided file to an image: '
							+ file);
				}
			}
		}

		// There are two reasons why we use inject here:
		// 1. This allows us to define getters and setters that use different
		//    local private variables for each object (e.g. file, image, etc.)
		// 2. These fields are not enumerable, so ImageObjects can be passed
		//    directly to Html.image(), without image or file appearing as
		//    attributes.
		this.inject({
			get image() {
				// Load image from file
				if (!image) {
					if (info) {
						image = new Image(file);
					} else if (pdf) {
						image = new Image(pdf.getPageAsImage());
					}
				}
				return image;
			},

			set image(img) {
				image = img;
				// Mark as modified, and update width and height automatically
				// through modified setter.
				this.modified = true;
			},

			get modified() {
				return modified;
			},

			set modified(m) {
				modified = m;
				if (modified) {
					// Update width and height
					// Call getter to make sure it's an iamge
					var img = this.image;
					this.width = img.width;
					this.height = img.height;
					saved = false;
				}
			},

			get file() {
				// Make sure it's saved before returning the file
				this.save();
				return file ? new File(file) : null;
			},

			set file(f) {
				file = f;
				saved = false;
			},

			get quality() {
				if (!quality) {
					// Get default quality
					quality = (app.properties.imageQuality || 0.9).toFloat();
				}
				return quality;
			},

			set quality(q) {
				quality = Math.min(Math.max(q, 0.0), 1.0);
			},

			/**
			 * Call to make ensure that processed images are stored to their
			 * files. Used internally by Html.image(). save() is also called
			 * implicitely when accessing the file property.
			 */
			save: function() {
				if (!saved && file) {
					if (image) {
						// image is a ImageWrapper
						image.saveAs(file, this.quality, true);
					} else if (file.path != original.path) {
						// TODO: make this work: file != original
						// (through File#valueOf() ?)
						// There were no modifications, so if we keep the same
						// content type, simply copy to the destination file.
						if (original.contentType == file.contentType) {
							original.writeToFile(file);
						} else {
							// In any other case, we retrieve the image first
							// and then store it again through save().
							image = this.image;
							this.save();
						}
					}
					saved = true;
				}
			}
		});
	},

	statics: {
		/**
		 * @param image either be a file pointing to an image, a native Helma
		 *        ImageWrapper object or a ImageObject wrapper of either.
		 * @return the same ImageObject object containing the modified image
		 */
		process: function(image, param) {
			if (!(image instanceof ImageObject))
				image = new ImageObject(image, param);

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
					crop.imageWidth && crop.imageWidth / image.width
						|| crop.imageHeight && crop.imageHeight / image.height
						|| 1;
				}
				// Scale crop according to param.scale and to fit
				// maxWidth / Height.
				if (crop.width * scale > maxWidth
						|| crop.height * scale > maxHeight) {
					crop = ImageObject.getScaledCrop(crop, Math.min(
							maxWidth / crop.width * scale,
							maxHeight / crop.height * scale
					) * scale);
				}
				scale = crop.imageScale;
			} else if (image.width * scale > maxWidth
					|| image.height * scale > maxHeight) {
				scale *= Math.min(
						maxWidth / (image.width * scale),
						maxHeight / (image.height * scale)
				);
			}

			// Resize before crop
			if (scale != 1.0) {
				image.image.resize(Math.round(image.width * scale),
						Math.round(image.height * scale));
				image.modified = true;
			}

			// Check if we need to crop the image
			if (crop) {
				// Image is only set if it was resized before
				var cropWidth = crop.width || image.width;
				var cropHeight = crop.height || image.height;
				var x = (crop.x || 0).toInt();
				var y = (crop.y || 0).toInt();
				if (crop.halign) {
					x += (image.width - cropWidth) *
							(crop.halign == 'center'
									? 0.5 : crop.halign == 'right' ? 1 : 0);
				}
				if (crop.valign) {
					y += (image.height - cropHeight) *
							(crop.valign == 'middle'
									? 0.5 : crop.valign == 'bottom' ? 1 : 0);
				}
				image.image.crop(x, y, cropWidth, cropHeight);
				image.modified = true;
			}

			// Check if we need to tint the image with a color
			if (param.tint) {
				// Image is only set if it was resized before
				image.image = ImageObject.processTint(image.image, param);
			}

			// Check if we need to paper the image with a color
			if (param.paper) {
				// Image is only set if it was resized before
				image.image = ImageObject.processPaper(image.image, param);
			}

			// Set the transparant pixel only if the image was modified so far
			if (param.transparentPixel && image.modified) {
				image.image.setTransparentPixel(image.image.getPixel(
					param.transparentPixel.x || 0,
					param.transparentPixel.y || 0
				));
				image.modified = true;
			}

			return image;
		},

		/**
		 * Generates a unique id to identify the characteristics of this
		 * image processing request.
		 */
		getUniqueId: function(param) {
			var crop = param.crop;
			var values = [
				param.maxWidth, param.maxHeight, param.quality, param.scale,
				param.bgColor,
				// TODO: These depend on processTint / processPaper, which will
				// be modularised soon. Find a way to also modularise id
				// generation
				param.tint, param.paper, param.paperFactor, param.rotation,
				crop && [crop.x, crop.y, crop.width, crop.height,
						crop.halign, crop.valign, crop.imageScale,
						crop.imageWidth, crop.imageHeight],
				param.transparentPixel && [param.transparentPixel.x,
						param.transparentPixel.y]
			];
			return encodeMd5(values.join(''));
		},

		getScaledCrop: function(crop, scale) {
			return scale == 1 ? crop : crop.each(function(value, key) {
				this[key] = typeof value == 'number'
					? key == 'imageScale'
						? value * scale : Math.round(value * scale)
					: value;
			}, {});
		},

		processTint: function(image, param) {
			var tintColor = java.awt.Color.decode(param.tint);
			if (!tintColor) {
				User.logError('Picture#processTint()', 'Unsupported Tint: '
						+ param.tint);
				return image;
			}
			// Convert to grayscale first:
			var gray = new java.awt.image.BufferedImage(
					image.width, image.height,
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
			// Boring: there seems to be no other way to create a byte value for
			// the JavaScript bridge:
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
			var col = new java.awt.image.BufferedImage(cm, gray.getRaster(),
					false, null);
			gray.flush();
			return new Image(col);
		},

		processPaper: function(image, param) {
			var paperDir = app.properties.assetDir + '/type/paper/';
			// Load images:
			var topLeft = new Image(paperDir + 'topLeft.png');
			var topRight = new Image(paperDir + 'topRight.png');
			var bottomLeft = new Image(paperDir + 'bottomLeft.png');
			var bottomRight = new Image(paperDir + 'bottomRight.png');
			var left = new Image(paperDir + 'left.png');
			var top = new Image(paperDir + 'top.png');
			var right = new Image(paperDir + 'right.png');
			var bottom = new Image(paperDir + 'bottom.png');
			var shade = new Image(paperDir + 'shade.png');
			var corner = new Image(paperDir + 'corner.png');

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
				var at = java.awt.geom.AffineTransform.getTranslateInstance(
						x, y);
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

			var paper = new Image(
					image.width + (left.width + right.width) * scale,
					image.height + (top.height + bottom.height) * scale);

			// Fill with bg color

			var bgColor = param.bgColor && java.awt.Color.decode(param.bgColor);
			if (bgColor) {
				paper.setColor(bgColor);
				paper.fillRect(0, 0, paper.width, paper.height);
			}

			// Draw image on top first
			paper.drawImage(image, left.width * scale, top.height * scale);

			// Draw shade
			drawImage(shade, paper, paper.width
					- (shade.width + right.width) * scale, top.height * scale);

			// Draw corners
			drawImage(topLeft, paper, 0, 0);
			drawImage(topRight, paper, paper.width - topRight.width * scale, 0);
			drawImage(bottomLeft, paper, 0,
					paper.height - bottomLeft.height * scale);
			drawImage(bottomRight, paper,
					paper.width - bottomRight.width * scale,
					paper.height - bottomRight.height * scale);

			// Stretch sides into place
			var length = paper.height
					- (topLeft.height + bottomLeft.height) * scale;
			if (length > 0) {
				drawImage(left, paper, 0, topLeft.height * scale, scale,
						length / left.height);
			}

			length = paper.height
					- (topRight.height + bottomRight.height) * scale;
			if (length > 0) {
				drawImage(right, paper, paper.width - right.width * scale,
						topRight.height * scale, scale, length / right.height);
			}

			length = paper.width
					- (topLeft.width + topRight.width) * scale;
			if (length > 0) {
				drawImage(top, paper, topLeft.width * scale, 0,
						length / top.width, scale);
			}

			length = paper.width
					- (bottomLeft.width + bottomRight.width) * scale;
			if (length > 0) {
				drawImage(bottom, paper, bottomLeft.width * scale,
						paper.height - bottom.height * scale,
						length / bottom.width, scale);
			}

			if (overlay) {
				try {
					overlay = new Image(paperDir + 'overlay/' + overlay
							+ '.png');
				} catch (e) {
					overlay = null;
				}
				if (overlay) {
					if (scaleFactor != 1.0) {
						overlay.resize(overlay.width * scaleFactor,
								overlay.height * scaleFactor);
					}
					paper.drawImage(overlay,
						paper.width - overlay.width - right.width - 1,
						paper.height - overlay.height - bottom.height - 1);
				}
			}
			g2d.dispose();
			return paper;
		}
	}
});