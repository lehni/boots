HtmlRenderer = Base.extend({
	initialize: function(stylesheet) {
		var kitObj = new Object();
		// create a HTMLEditorKit that turns of asynchronous loading:
		this.kit = new JavaAdapter(Packages.javax.swing.text.html.HTMLEditorKit, kitObj);
		// save the super classes' createDefaultDocument in order to call it in the override
		kitObj.superCreateDefaultDocument = this.kit.createDefaultDocument;
		kitObj.createDefaultDocument = function() {
			var doc = this.superCreateDefaultDocument(); // call super.createDefaultDocument()
			doc.setTokenThreshold(java.lang.Integer.MAX_VALUE);
			doc.setAsynchronousLoadPriority(-1);
			return doc;
		}
		if (stylesheet != null) {
			var ss = new Packages.javax.swing.text.html.StyleSheet();
			var reader = new java.io.BufferedReader(new java.io.FileReader(stylesheet));
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

			// see if src is a URL, otherwise treat it as HTML code
			try {
				var url = new java.net.URL(src);
				pane.setPage(url);
			} catch (e) {
				pane.setContentType('text/html');
				// <br/> and so on is not supported:
				src = src.replaceAll('/>', '>');
				pane.setText(src);
			}
			// determine width?
			if (width == -1) {
				var size = pane.getPreferredSize();
				width = size.width;
			}
			// determine height?
			if (height == -1) {
				// height depends on width
				pane.setSize(width, 1);
				var size = pane.getPreferredSize();
				height = size.height;
			}
			img = new Image(width, height);
			var g = img.getGraphics();
			Packages.javax.swing.SwingUtilities.paintComponent(g, pane, new java.awt.Container(), 0, 0, width, height);
	//		img.saveAs(app.appDir + '/' + encodeMD5(src) + '.gif');
			g.dispose();
		} catch (e) {
			User.logError('renderHtmlImage()', e);
		}
		return img; 
	}
});

