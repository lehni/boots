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
			if (info) {
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
					if (image && modified) {
						// image is a ImageWrapper
						image.saveAs(file, this.quality, true);
					} else if (file.path != original.path) {
						// TODO: make this work: file != original
						// (through File#valueOf() ?)
						// There were no modifications, so if we keep the same
						// content type, simply copy to the destination file.
						if (original.contentType == file.contentType) {
							if (!file.parent.exists())
								file.parent.makeDirectory();
							original.writeToFile(file);
						} else {
							// In any other case, we retrieve the image first,
							// mark it as modified and then store it again
							// through save().
							image = this.image;
							modified = true;
							this.save();
						}
					}
					saved = true;
				}
				return this;
			}
		});
	},

	statics: {
		/**
		 * @param image either be a file pointing to an image, a native Helma
		 *        ImageWrapper object or a ImageObject wrapper of either.
		 * @return the same ImageObject object containing the modified image
		 */
		process: function(image, param, out) {
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
			if (scale != 1) {
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

			// Apply other image processors
			ImageEffect.process(image, param);

			// Set the transparant pixel only if the image was modified so far
			if (param.transparentPixel && image.modified) {
				image.image.setTransparentPixel(image.image.getPixel(
					param.transparentPixel.x || 0,
					param.transparentPixel.y || 0
				));
				image.modified = true;
			}

			// Set the out file. The next time image.save() is called or
			// image.file gets accessed, it will automatically be persisted to
			// this file. If only the image object is used, no files will be
			// created on the harddrive.
			if (out)
				image.file = out;

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
				crop && [crop.x, crop.y, crop.width, crop.height,
						crop.halign, crop.valign, crop.imageScale,
						crop.imageWidth, crop.imageHeight],
				param.transparentPixel && [param.transparentPixel.x,
						param.transparentPixel.y]
			];
			// Add values required by other image processors
			ImageEffect.addUniqueValues(values, param);
			return encodeMd5(values.join(''));
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

ImageObject.inject(new function() {
	var processors = [];

	return {
		handle: function(action, element) {
			var handler = handlers[action];
			if (handler) {
				var args = Array.slice(arguments, 1);
				// Pass the wrapped element instead of the native one
				args[0] = $(element);
				return handler.apply(this, args);
			} else {
				alert('Handler missing: ' + action);
			}
			return true;
		},

		statics: {
			register: function(items) {
				items.each(function(processor) {
					
				});
			},

			handle: function(formOrId, action, element) {
				var form = formOrId instanceof EditForm ? formOrId
						: EditForm.get(formOrId);
				if (form)
					return form.handle.apply(form, Array.slice(arguments, 1));
				else
					alert('Cannot find form: ' + formOrId + ' '
							+ Json.encode(EditForm.data));
			}
		}
	};
});
