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
	initialize: function(image) {
		// Is image a ImageWrapper or a file?
		var isImage = image instanceof Image;
		var file = isImage ? null : image;
		var modified = false;
		var saved = file != null;
		var quality = (app.properties.imageQuality || 0.9).toFloat();
		if (isImage) {
			this.width = image.width;
			this.height = image.height;
		} else {
			// Before fully loading the image, use Image.getInfo to see if
			// we need to.
			var info = Image.getInfo(image);
			if (info == null)
				throw new Error('The provided object is not an image file: '
						+ image);
			this.width = info.width;
			this.height = info.height;
		}
		// There are two reasons why we use inject here:
		// 1. This allows us to define getters and setters that use different
		//    local private variables for each object (e.g. isImage)
		// 2. These fields are not enumerable, so ImageObjects can be passed
		//    directly to Html.image(), without image or file appearing as
		//    attributes.
		this.inject({
			get image() {
				// Load image from file
				if (!isImage) {
					image = new Image(image);
					isImage = true;
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
					if (isImage) {
						// image is a ImageWrapper
						image.saveAs(file, quality, true);
					} else {
						// image is a File
						image.writeToFile(file);
					}
					saved = true;
				}
			}
		});
	}
});