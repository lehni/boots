TintEffect = ImageEffect.extend({

	process: function(image, param) {
		if (!param.tint)
			return;
		var tintColor = java.awt.Color.decode(param.tint);
		if (!tintColor) {
			User.logError('TintEffect#process()', 'Unsupported Tint: '
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
		g2d.drawImage(image.getImage(), 0, 0, null);
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

	addUniqueValues: function(values, param) {
		values.push(param.tint);
	}
});
