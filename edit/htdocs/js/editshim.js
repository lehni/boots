EditSettings = {
	objectLink: '<node @link>@text</node>',
	unnamedObjectLink: '<node @link />',
	mailLink: '<mail @link>@text</mail>',
	urlLink: '<url @link>@text</url>',
	unnamedUrlLink: '<url @link />',
	useButtons: true,
	hideButtons: true
};

EditForm = {
	open: function(url, param) {
		if (!param.confirm || confirm(param.confirm)) {
			this.cache = null;
			new Window({
				url: url, name: 'edit',
				width: param.width, height: param.height,
				left: (screen.width - param.width - 20),
				top: 40, resizable: 1, scrollbars: 1, noFocus: 1
			});
		}
		return false;
	},

	inline: function(url, param) {
		var callee = arguments.callee;
		// TODO: Remove Math.random() hack after development has settled.
		Asset.stylesheet('/static/edit/css/edit.css?' + Math.random());
		Asset.script('/static/base/js/tabs.js?' + Math.random(), { onLoad: function() {
			Asset.script('/static/edit/js/edit.js?' + Math.random(), { onLoad: function() {
				// Avoid endless recursion if something went wrong
				if (EditForm.inline != callee)
					EditForm.inline(url, param);
			}});
		}});
	}
};