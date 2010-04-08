EditSettings = new Hash({
	cssFiles: [
		'/static/edit/css/edit.css'
	],
	scriptFiles: [
		'/static/base/js/tabs.js',
		'/static/edit/js/edit.js'
	],

	objectLink: '<node "@link">@text</node>',
	unnamedObjectLink: '<node @link />',
	emailLink: '<email "@link">@text</email>',
	urlLink: '<url "@link">@text</url>',
	unnamedUrlLink: '<url "@link" />',
	image: '<image "@name" />',

	useButtons: true,
	hideButtons: true
});

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
		if (!param.confirm || confirm(param.confirm)) {
			// This code is identical with the one found in full version of
			// edit.js's Editform.inline(). Make sure it stays synced.
			var elements = $('#edit-elements-' + param.target + '-' + param.id + '.edit-elements');
			var progress = $('.edit-progress', elements);
			var buttons = $('.edit-buttons', elements);
			if (progress) {
				var height = elements.getStyle('height');
				if (EditSettings.hideButtons)
					buttons.addClass('hidden');
				progress.removeClass('hidden');
				elements.setStyle('height', height);
			}
			// Now load the needed files.
			var callee = arguments.callee, index = 0;
			function loadScript() {
				var src = EditSettings.scriptFiles[index++];
				if (src) {
					Asset.script(src, { onLoad: loadScript });
				} else {
					// Avoid endless recursion if something went wrong
					if (EditForm.inline != callee)
						EditForm.inline(url, param);
				}
			}
			EditSettings.cssFiles.each(function(src) {
				Asset.stylesheet(src);
			});
			loadScript();
		}
	}
};
