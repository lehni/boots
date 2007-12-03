EditSettings = {
	objectLink: '<% link id="@link" text="@text" %>\n',
	unnamedObjectLink: '<% link id="@link" %>\n',
	mailLink: '<% link mail="@link" text="@text" %>\n',
	urlLink: '<% link url="@link" text="@text" %>\n',
	unnamedUrlLink: '<% link url="@link" %>\n'
};

EditSettings = {
	objectLink: '<node @link>@text</node>\n',
	unnamedObjectLink: '<node @link />\n',
	mailLink: '<mail @link>@text</mail>\n',
	urlLink: '<url @link>@text</url>\n',
	unnamedUrlLink: '<url @link />\n'
};

EditForm = {
	open: function(url, param) {
		if (!param.confirm || confirm(param.confirm)) {
			this.cache = null;
			Window.open(url, 'edit', {
				width: param.width, height: param.height,
				left: (screen.width - width - 20),
				top: 40, resizable: 1, scrollbars: 1, noFocus: 1
			});
		}
		return false;
	},

	inline: function(url, param) {
		var callee = arguments.callee;
		Asset.stylesheet('/static/edit/css/edit.css');
		Asset.script('/static/base/js/tabs.js', { onLoad: function() {
			Asset.script('/static/edit/js/edit.js', { onLoad: function() {
				// Avoid endless recursion if something went wrong
				if (EditForm.inline != callee)
					EditForm.inline(url, param);
			}});
		}});
	}
};