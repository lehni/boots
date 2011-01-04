PaperEffect = ImageEffect.extend({

	process: function(image, param) {
		if (!param.paper)
			return;
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
	},

	addUniqueValues: function(values, param) {
		values.push(param.paper, param.paperFactor, param.bgColor);
	}
});
