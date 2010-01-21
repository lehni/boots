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
			var data = OEmbedTag.getData({ url: this.url }, param);
			var html = data && data.html;
			if (html) {
				this.width = param.width;
				this.height = param.height;
			} else {
				html = renderLink({
					href: this.url,
					content: param.content || encode(this.url.match(/^(?:\w+:\/\/)?(.*)$/)[1])
				});
			}
			if (out) out.write(html);
			else return html;
		}
	}
});
