HtmlRenderer = Base.extend({
	initialize: function(stylesheet) {
		// Create a HTMLEditorKit that turns of asynchronous loading:
		this.kit = new JavaAdapter(javax.swing.text.html.HTMLEditorKit, {
			createDefaultDocument: function() {
				var doc = this.super$createDefaultDocument();
				doc.setAsynchronousLoadPriority(-1);
				doc.setTokenThreshold(java.lang.Integer.MAX_VALUE);
				return doc;
			}
		});
		if (stylesheet) {
			var ss = new javax.swing.text.html.StyleSheet();
			var reader = new java.io.BufferedReader(
					new java.io.FileReader(stylesheet));
			ss.loadRules(reader, null);
			reader.close();
			this.kit.setStyleSheet(ss);
		}
		this.margin = new java.awt.Insets(0, 0, 0, 0);
	},

	render: function(src, width, height) {
		var img = null;
		try {
			var pane = new Packages.javax.swing.JEditorPane();
			pane.setEditorKit(this.kit);
			pane.setEditable(false);
			pane.setMargin(this.margin);

			// See if src is a URL, otherwise treat it as HTML code
			try {
				var url = new java.net.URL(src);
				pane.setPage(url);
			} catch (e) {
				pane.setContentType('text/html');
				// <br/> and so on is not supported:
				src = src.replaceAll('/>', '>');
				pane.setText(src);
			}
			// Determine width
			if (width == -1) {
				var size = pane.getPreferredSize();
				width = size.width;
			}
			// Determine height
			if (height == -1) {
				// Height depends on width
				pane.setSize(width, 1);
				var size = pane.getPreferredSize();
				height = size.height;
			}
			img = new Image(width, height);
			var g = img.getGraphics();
			Packages.javax.swing.SwingUtilities.paintComponent(g, pane,
					new java.awt.Container(), 0, 0, width, height);
			g.dispose();
		} catch (e) {
			User.logError('HtmlRenderer#renderHtmlImage()', e);
		}
		return img; 
	}
});

