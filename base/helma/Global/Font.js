Font = Base.extend({
	initialize: function(fontFile, antialias, fractionalMetrics) {
		if (fontFile) {
			this.antialias = antialias;
			this.renderInfo = Font.getRenderInfos(antialias, fractionalMetrics);
	
			var file = new File(fontFile);
			if (file.exists()) {
				this.fontFile = fontFile;
			
				// Use BaseFont from itext to read kerning tables
				var BaseFont = Packages.com.lowagie.text.pdf.BaseFont;
				this.kernedFont = BaseFont.createFont(fontFile, BaseFont.WINANSI, false, false, null, null); // don't use the internal font cache!

				var input = new java.io.FileInputStream(file);
				this.font = java.awt.Font.createFont(java.awt.Font.TRUETYPE_FONT, input);
				this.size = this.font.getSize();
				this.setCharSpacing(0);
				input.close();
			}
		}
	},
	
	getRenderingHints: function() {
		return this.renderInfo.hints;
	},
	
	finalize: function() {
		if (this.font != null)
			delete this.font;
	},
	
	getKerning: function(c1, c2) {
		return this.kernedFont != null ? this.kernedFont.getKerning(c1, c2) : 0;
	},
	
	setSize: function(size) {
		if (this.size != size) {
			this.size = parseFloat(size);
			this.uniqueString = null;
			if (this.font != null)
				this.font = this.font.deriveFont(this.size);
		}
	},
	
	getFont: function() {
		return this.font;
	},
	
	getSize: function() {
		return this.size;
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
	
	setCharSpacing: function(spacing) {
		if (this.charSpacing != spacing) {
			this.charSpacing = spacing;
			this.uniqueString = null;
		}
	},
	
	getCharSpacing: function() {
		return this.charSpacing;
	},

	/**
	 * This cuts a string at maxWidth and appends "..." so the string fits into the widht
	 * This can be used to cut client sided strings, if a web TTF file is used for calculation
	 * of the width of the string.
	 */
	cutStringAt: function(text, maxWidth) {
		if (!this.cutCache || this.cutCacheLength > 256) {
			this.cutCache = {};
			this.cutCacheLength = 0;
		}
		// cache the results of this process for speed improvements
		var key = encodeMD5(text + ":" + maxWidth);
		var str = this.cutCache[key];
		if (!str) {
			var glyphs = this.layoutGlyphs(text, maxWidth);
			if (glyphs && glyphs.text.length < text.length) {
				str = glyphs.text.trim() + "...";
			} else {
				str = text;
			}
			this.cutCache[key] = str;
		}
		return str;
	},
	
	layoutGlyphs: function(text, maxWidth) {
		if (this.font) {
			var glyphs = this.font.createGlyphVector(this.renderInfo.context, text);
			var bounds = glyphs.getLogicalBounds();
			// call getCharSpacing with a the text, so subclasses of Font
			// can alter spacing depending on the case of the chars (used in Lineto)
			var charSpacing = this.getCharSpacing(text);
			// use the font's size, not this.size, as the font may be scaled (used in Lineto)
			var size = this.font.getSize();
	
			var x = 0;
			var num = glyphs.getNumGlyphs();
			for (var i = 0; i < num; i++) {
				var pos = glyphs.getGlyphPosition(i);
				var gm = glyphs.getGlyphMetrics(i);
				pos.x = x;
				glyphs.setGlyphPosition(i, pos);
				x += gm.getAdvance();
				if (i < num - 1) x += (charSpacing + this.getKerning(text.charAt(i), text.charAt(i + 1))) * 0.001 * size;
				// this is only used by cutStringAt right now:
				if (maxWidth && x >= maxWidth) {
					text = text.substring(0, i);
					break;
				}
			}
			// instead of using the internal baseLine and height settings, use general ones, depending on the height of font only:
			// this makes code like correctBaseLines in FontRenderer.js obsolete and solves many problems with very differently mastered fonts:
			// the values 0.3 and 1.3 are trial & error values which look quite nice...
			return {
				glyphs: glyphs, text: text, font: this, size: this.size,
				baseLine: /* bounds.getMaxY() */ this.size * 0.3,
				width: x, height: /* bounds.getHeight() */ this.size * 1.3
			}
		} else return null;
	},
	
	getOutline: function(desc, x, y) {
		return desc.glyphs.getOutline(x, y + desc.height - desc.baseLine);
	},
	
	drawGlyphs: function(g2d, desc, x, y) {
		if (!this.antialias) g2d.drawGlyphVector(desc.glyphs, x, y + desc.height - desc.baseLine);
		else g2d.fill(this.getOutline(desc, x, y));
	},

	// getUniqueString returns a string that represents this font identically. this is used for the image rendering
	getUniqueString: function() {
		if (!this.uniqueString) {
			res.push();
			res.write(this.kernedFont.getPostscriptFontName());
			res.write(this.antialias ? '_1_' : '_0_');
			res.write(Font.numberFormat.format(this.size));
			res.write('_');
			res.write(this.charSpacing);
			this.uniqueString = res.pop();
		}
		return this.uniqueString;
	},
	
	renderText: function(text, param, out) {
		this.setSize(param.size ? parseFloat(param.size) : 16);
		this.setCharSpacing(param.charSpacing ? parseFloat(param.charSpacing) : 0);
		// var t = java.lang.System.nanoTime();
		// app.log("RT " + (java.lang.System.nanoTime() - t));
		var color = param.color ? param.color : "#000000";
		var bgColor = param.bgColor ? param.bgColor : "#ffffff";
		res.push();
		res.write(text);
		res.write(color);
		res.write(bgColor);
		res.write(this.getUniqueString());
		var filename = encodeMD5(res.pop()) + ".gif";
		var file = new File(getProperty('fontRenderDir'), filename);
		if (!file.exists()) {
			var desc = this.layoutGlyphs(text);
			var width = Math.round(desc.width), height = Math.round(desc.height);
			var image = new Image(width, height);
			var g2d = image.getGraphics();
			g2d.setColor(java.awt.Color.decode(bgColor));
			g2d.fillRect(0, 0, width, height);
			g2d.setColor(java.awt.Color.decode(color));
			g2d.setRenderingHints(this.getRenderingHints());
			this.drawGlyphs(g2d, desc, 0, 0);
			image.reduceColors(16, false, true);
			image.setTransparentPixel(image.getPixel(0, 0));
			image.saveAs(file.getPath(), 1, true);
			image.dispose();
		} else {
			var info = Image.getInfo(file);
			if (info) {
				var width = info.getWidth();
				var height = info.getHeight();
			}
		}

		out.write('<img src="');
		out.write(getProperty('fontRenderUri'));
		out.write(filename);
		out.write('" width="');
		out.write(width);
		out.write('" height="');
		out.write(height);
		out.write('" alt="');
		out.write(text);
		out.write('">');
	}.toRender(),
	
	statics: {
		numberFormat: (function() {
			var f = java.text.NumberFormat.getInstance();
			f.setMaximumFractionDigits(2);
			return f;
		})(),
		
		renderInfos: {},
		
		getInstance: function(fontName) {
			if (!app.data.fonts)
				app.data.fonts = {};

			if (!app.data.fonts[fontName])
				app.data.fonts[fontName] = new Font(getProperty(fontName), true);
	
			return app.data.fonts[fontName];
		},

		getRenderInfos: function(antialias, fractionalMetrics) {
			// set defaults if undefined:
			if (antialias == undefined)
				antialias = true;

			if (fractionalMetrics == undefined)
				fractionalMetrics = true;
	
			// create a infoId an cash the renderingInfos
			var id = (antialias ? '1' : '0') + (fractionalMetrics ? '1' : '0');
	
			var infos = Font.renderInfos[id];
			// only create if it's not cached already
			if (!infos) {
				var RenderingHints = java.awt.RenderingHints;
				var map = new java.util.HashMap();
				map.put(RenderingHints.KEY_DITHERING, RenderingHints.VALUE_DITHER_DISABLE);
				map.put(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
				map.put(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
				map.put(RenderingHints.KEY_TEXT_ANTIALIASING, antialias ? RenderingHints.VALUE_TEXT_ANTIALIAS_ON : RenderingHints.VALUE_TEXT_ANTIALIAS_OFF);
				map.put(RenderingHints.KEY_FRACTIONALMETRICS, fractionalMetrics ? RenderingHints.VALUE_FRACTIONALMETRICS_ON : RenderingHints.VALUE_FRACTIONALMETRICS_OFF);
				map.put(RenderingHints.KEY_COLOR_RENDERING, RenderingHints.VALUE_COLOR_RENDER_QUALITY);
				infos = Font.renderInfos[id] = {
					context: new java.awt.font.FontRenderContext(null, !!antialias, !!fractionalMetrics),
					hints: new RenderingHints(map)
				};
			}
			return infos;
		}
	}
});