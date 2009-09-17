/**
 * A Font prototype that wraps both a native java.awt.Font and a 
 * com.lowagie.text.pdf.BaseFont pointing to the same TrueType file.
 *
 * BaseFont is then used to apply kerning corrections by reading the tables.
 *
 * Carefull: One Font object is not thread safe, so make sure to retrieve
 * new instances for each rendering session (e.g. when changin size).
 * Font.getInstance and Font#initialize handle this properly. 
 */

Font = Base.extend({
	initialize: function(filename, antialias, fractionalMetrics) {
		// Cache the native objects for each font, so creation of new
		// instances of font objects can be very fust.
		// This is better than caching the  font objects itself, since they
		// s are not thread safe.
		var fontObj = Font.fontObjects[filename];
		if (!fontObj) {
			var file = new File(filename);
			if (file.exists()) {
				// Use BaseFont from itext to read kerning tables
				var BaseFont = Packages.com.lowagie.text.pdf.BaseFont;
				var input = new java.io.FileInputStream(file);
				var nativeFont = java.awt.Font.createFont(
						java.awt.Font.TRUETYPE_FONT, input);
				input.close();
				// Don't use the internal font cache!
				var kernedFont = BaseFont.createFont(filename, BaseFont.WINANSI,
						false, false, null, null);
				fontObj = Font.fontObjects[filename] = {
					nativeFont: nativeFont,
					kernedFont: kernedFont,
					size: nativeFont.size
				};
			}
		}
		if (fontObj) {
			this.nativeFont = fontObj.nativeFont;
			this.kernedFont = fontObj.kernedFont;
			this.size = fontObj.size;
			this.antialias = antialias;
			this.charSpacing = 0;
			this.filename = filename;
			this.renderInfo = Font.getRenderInfos(antialias, fractionalMetrics);
		}
	},
	
	getRenderingHints: function() {
		return this.renderInfo.hints;
	},
	
	finalize: function() {
		if (this.nativeFont != null)
			delete this.nativeFont;
	},
	
	getKerning: function(c1, c2) {
		return this.kernedFont != null ? this.kernedFont.getKerning(c1, c2) : 0;
	},
	
	getFont: function() {
		return this.nativeFont;
	},
	
	getSize: function() {
		return this.size;
	},
	
	setSize: function(size) {
		if (this.size != size) {
			this.size = parseFloat(size);
			this.uniqueString = null;
			if (this.nativeFont)
				this.nativeFont = this.nativeFont.deriveFont(this.size);
		}
	},
	
	getAntialias: function() {
		return this.antialias;
	},
	
	setAntialias: function(antialias) {
		if (this.antialias != antialias) {
			this.antialias = antialias;
			this.uniqueString = null;
		}
	},
	
	getCharSpacing: function() {
		return this.charSpacing;
	},
	
	setCharSpacing: function(spacing) {
		if (this.charSpacing != spacing) {
			this.charSpacing = spacing;
			this.uniqueString = null;
		}
	},

	processGlyphLine: function(text, maxWidth, layout) {
		if (this.nativeFont) {
			var glyphs = this.nativeFont.createGlyphVector(
					this.renderInfo.context, text);
			// Call getCharSpacing with a the text, so subclasses of Font
			// can alter spacing depending on the case of the chars (used in Lineto)
			var charSpacing = this.getCharSpacing(text);
			// Use the font's size, not this.size, as the font may be scaled (used in Lineto)
			var size = this.nativeFont.getSize();
			var x = 0;
			var num = glyphs.getNumGlyphs();
			for (var i = 0; i < num; i++) {
				if (layout) {
					var pos = glyphs.getGlyphPosition(i);
					pos.x = x;
					glyphs.setGlyphPosition(i, pos);
				}
				x += glyphs.getGlyphMetrics(i).getAdvance();
				if (i < num - 1)
					x += (charSpacing + this.getKerning(text.charAt(i),
							text.charAt(i + 1))) * size / 1000;
				if (maxWidth && x >= maxWidth) {
					text = text.substring(0, i);
					if (layout) {
						// Reproduce glyph vector
						var newGlyphs = this.nativeFont.createGlyphVector(
									this.renderInfo.context, text);
						for (var j = 0; j < i; j++)
							newGlyphs.setGlyphPosition(j,
									glyphs.getGlyphPosition(j));
						glyphs = newGlyphs;
					}
					break;
				}
			}
			return { text: text, glyphs: glyphs, width: x };
		}
	},

	layoutGlyphLine: function(text, maxWidth) {
		var desc = this.processGlyphLine(text, maxWidth, true);
		if (desc) {
			desc.font = this;
			desc.size = this.size;
			// Instead of using the internal baseLine and height settings, use
			// general ones, depending on the height of font only:
			// this makes code like correctBaseLines in FontRenderer.js obsolete
			// and solves many problems with very differently mastered fonts:
			// the values 0.3 and 1.3 are trial & error values which look quite nice...
			// var bounds = glyphs.getLogicalBounds();
			desc.baseLine = this.size * 0.3; // bounds.getMaxY()
			desc.height = this.size * 1.3; // bounds.getHeight()
		}
		return desc;
	},
	
	getOutline: function(desc, x, y) {
		return desc.glyphs.getOutline(x, y + desc.height - desc.baseLine);
	},
	
	drawGlyphs: function(g2d, desc, x, y) {
		if (!this.antialias) g2d.drawGlyphVector(desc.glyphs,
				x, y + desc.height - desc.baseLine);
		else g2d.fill(this.getOutline(desc, x, y));
	},

	// getUniqueString returns a string that represents this font identically.
	// This is used for the image rendering
	getUniqueString: function() {
		return this.uniqueString || (this.uniqueString =
				this.kernedFont.getPostscriptFontName() +
				(this.antialias ? '_1_' : '_0_') +
				this.size.format('#0.00') + '_' + this.charSpacing);
	},

	/**
	 * This breaks text into lines based on the maxWidth
	 * Breaking happens on newlines and spaces.
	 * if a single word is wider then maxWidth, it will break on a character.
	 */
	breakIntoLines: function(text, maxWidth) {
		var lines =[];
		// Split at linebreaks first
		text.split(/\r\n|\n|\r/mg).each(function(line) {
			var more = true;
			while (more) {
				var desc = this.processGlyphLine(line, maxWidth);
				if (desc && desc.text.length < line.length) {
					var part = desc.text;
					var lastSpace = part.lastIndexOf(' ') + 1;
					if(lastSpace)
						part = part.substring(0, lastSpace - 1);
					lines.push(part);
					line = line.substring(part.length + 1);
				} else {
					lines.push(desc.text);
					more = false;
				}
			}
		}, this);
		return lines;
	},

	/**
	 * This cuts a string at maxWidth and appends '...' so the string fits into
	 * the width. This can be used to cut client sided strings, if a web TTF
	 * file is used for calculation of the width of the string.
	 */
	truncate: function(text, maxWidth, suffix) {
		// Cache the results of this process for speed improvements
		var key = encodeMD5(text + '_' + maxWidth + '_' + this.getUniqueString());
		var cache = Font.truncateCache;
		var value = cache.lookup[key];
		if (!value) {
			var glyphs = this.layoutGlyphLine(text, maxWidth);
			var truncate = glyphs && glyphs.text.length < text.length;
			if (truncate)
				text = glyphs.text.trim();
			value = cache.lookup[key] = {
				text: text,
				truncated: truncate
			};
			cache.keys.push(key);
			// Clean cache if growing too much
			var del = cache.keys.length - 1024;
			if (del > 0) {
				// Remove lookup objects first
				for (var i = 0; i < del; i++)
					delete cache.lookup[cache.keys[i]];
				// Now remove the keys
				cache.keys.splice(0, del);
			}
		}
		return suffix && value.truncated ? value.text + suffix : value.text;
	},

	renderText: function(text, param, out) {
		this.setSize(param.size ? parseFloat(param.size) : 16);
		this.setCharSpacing(param.charSpacing ? parseFloat(param.charSpacing) : 0);
		var color = param.color || '#000000';
		var bgColor = param.bgColor || '#ffffff';
		var filename = encodeMD5(text + color + bgColor + param.maxWidth
				+ param.lineHeight + param.justification
				+ this.getUniqueString()) + '.gif';
		var file = new File(app.properties.fontRenderDir, filename);

		if (!file.exists()) {
			var lines = this.breakIntoLines(text, param.maxWidth);
			if (lines.length > 0) {
				var width = 0;
				for (var i = 0, l = lines.length; i < l; i++) {
					var desc = lines[i] = this.layoutGlyphLine(lines[i]);
					width = Math.max(width, desc.width);
				}
				var desc = lines[0];
				var calcHeight = Math.ceil(desc.height);
				var lineHeight = param.lineHeight ? param.lineHeight : calcHeight;
				var height = lineHeight * (lines.length - 1) + calcHeight;
				var image = new Image(width, height);
				var g2d = image.getGraphics();
				g2d.setColor(java.awt.Color.decode(bgColor));
				g2d.fillRect(0, 0, width, height);
				g2d.setColor(java.awt.Color.decode(color));
				g2d.setRenderingHints(this.getRenderingHints());

				var multiplier = param.justification == 'right' ? 1 :
						param.justification == 'centered' ? 0.5 : 0; // 0 == 'left' / default
				for (var i = 0, l = lines.length; i < l; i++) {
					var desc = lines[i];
					this.drawGlyphs(g2d, desc,
							(width - desc.width) * multiplier,
							i * lineHeight);
				}

				image.reduceColors(16, false, true);
				image.setTransparentPixel(image.getPixel(0, 0));
				image.saveAs(file.getPath(), 1, true);
				image.dispose();
			}
		} else {
			var info = Image.getInfo(file);
			if (info) {
				var width = info.getWidth();
				var height = info.getHeight();
			}
		}
		var image = param.attributes || {};
		image.src = app.properties.fontRenderUri + filename;
		image.width = width;
		image.height = height;
		if (!image.alt)
			image.alt = text.replace('\n', ' ');
		return Html.image(image, out);
	},
	
	statics: {
		renderInfos: {},

		fontObjects: {},

		truncateCache: {
			keys: [],
			lookup: {}
		},

		getInstance: function(filename, antialias, fractionalMetrics) {
			return filename ? new Font(
				app.properties.fontDir + filename,
				antialias != null
						? antialias
						: (app.properties.fontAntialias || 'true') == 'true',
				fractionalMetrics != null
						? fractionalMetrics
						: (app.properties.fontFractionalMetrics || 'true') == 'true'
			) : null;
		},

		getRenderInfos: function(antialias, fractionalMetrics) {
			// set defaults if undefined:
			if (antialias == undefined)
				antialias = true;

			if (fractionalMetrics == undefined)
				fractionalMetrics = true;
	
			// create a infoId an cash the renderingInfos
			var id = (antialias ? '1' : '0') + (fractionalMetrics ? '1' : '0');
	
			var infos = this.renderInfos[id];
			// only create if it's not cached already
			if (!infos) {
				var RenderingHints = java.awt.RenderingHints;
				var map = new java.util.HashMap();
				map.put(RenderingHints.KEY_DITHERING,
						RenderingHints.VALUE_DITHER_DISABLE);
				map.put(RenderingHints.KEY_ANTIALIASING,
						RenderingHints.VALUE_ANTIALIAS_ON);
				map.put(RenderingHints.KEY_RENDERING,
						RenderingHints.VALUE_RENDER_QUALITY);
				map.put(RenderingHints.KEY_TEXT_ANTIALIASING, antialias
						? RenderingHints.VALUE_TEXT_ANTIALIAS_ON
						: RenderingHints.VALUE_TEXT_ANTIALIAS_OFF);
				map.put(RenderingHints.KEY_FRACTIONALMETRICS, fractionalMetrics
						? RenderingHints.VALUE_FRACTIONALMETRICS_ON
						: RenderingHints.VALUE_FRACTIONALMETRICS_OFF);
				map.put(RenderingHints.KEY_COLOR_RENDERING,
						RenderingHints.VALUE_COLOR_RENDER_QUALITY);
				infos = this.renderInfos[id] = {
					context: new java.awt.font.FontRenderContext(null,
							!!antialias, !!fractionalMetrics),
					hints: new RenderingHints(map)
				};
			}
			return infos;
		}
	}
});