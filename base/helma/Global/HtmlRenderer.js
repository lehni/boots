HtmlRenderer = Base.extend({
	initialize: function() {
		// Create a HTMLEditorKit that turns of asynchronous loading:
		this.kit = new JavaAdapter(javax.swing.text.html.HTMLEditorKit, {
			createDefaultDocument: function() {
				var doc = this.super$createDefaultDocument();
				doc.setAsynchronousLoadPriority(-1);
				doc.setTokenThreshold(java.lang.Integer.MAX_VALUE);
				return doc;
			}
		});
	},

	render: function(param) {
		var img = null;
		try {
			var pane = new Packages.javax.swing.JEditorPane();
			pane.setEditable(false);
			// Needed?
			pane.setMargin(new java.awt.Insets(0, 0, 0, 0));
			pane.setEditorKit(this.kit);

			if (param.stylesheet) {
				var ss = new javax.swing.text.html.StyleSheet();
				var reader = new java.io.BufferedReader(
						new java.io.FileReader(param.stylesheet));
				ss.loadRules(reader, null);
				reader.close();
				this.kit.setStyleSheet(ss);
			}

			if (param.url) {
				pane.setPage(new java.net.URL(param.url));
			} else if (param.html) {
				pane.setContentType('text/html');
				// <br/> and so on is not supported:
				pane.setText(param.html.replaceAll('/>', '>'));
			}

			var width = param.width, height = param.height;
			// Determine width
			if (!width) {
				var size = pane.getPreferredSize();
				width = size.width;
			}
			// Determine height
			if (!height) {
				// Height depends on width
				pane.setSize(width, 1);
				var size = pane.getPreferredSize();
				height = size.height;
			}
			if (param.minHeight && height < param.minHeight) {
				height = param.minHeight;
			} else if (param.maxHeight && height > param.maxHeight) {
				height = param.maxHeight;
			}
			var margin = param.margin || 0;
			img = new Image(width + 2 * margin, height + 2 * margin);
			img.setColor(java.awt.Color.WHITE);
			img.fillRect(0, 0, img.width, img.height);
			var g2d = img.getGraphics();
			Packages.javax.swing.SwingUtilities.paintComponent(g2d, pane,
					new java.awt.Container(), margin, margin, width, height);
			g2d.dispose();
		} catch (e) {
			User.logError('HtmlRenderer#render()', e);
		}
		return img; 
	}
});

