Movie.inject({
	getEditForm: function(param) {
		if (param.file === undefined)
			param.file = false;
		if (param.hasDimensions === undefined)
			param.hasDimensions = false;
		var form = this.base(param);
		form.add({
			name: 'url', type: 'string', label: 'Movie',
		});
		return form;
	},

	render: function(param, out) {
		if (this.url) {
			// TODO: Set width & height from oembed parsing?
			var html = Markup.render('<video ' + this.url + ' />', param);
			if (!html)
				html = encode('Error ' + this.url);
			if (out) out.write(html);
			else return html;
		}
	}
});
