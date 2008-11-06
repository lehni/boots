EditSettings = {
	objectLink: '<node @link>@text</node>',
	unnamedObjectLink: '<node>@link</node>',
	mailLink: '<mail @link>@text</mail>',
	urlLink: '<url @link>@text</url>',
	unnamedUrlLink: '<url>@link</url>',
	useButtons: true,
	hideButtons: true
};

EditForm = {
	open: function(url, param) {
		if (!param.confirm || confirm(param.confirm)) {
			this.cache = null;
			Window.open(url, 'edit', {
				width: param.width, height: param.height,
				left: (screen.width - param.width - 20),
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