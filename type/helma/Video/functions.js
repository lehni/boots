Video.inject({
	getEditForm: function(param) {
		if (param.file === undefined)
			param.file = false;
		if (param.hasDimensions === undefined)
			param.hasDimensions = false;
		var form = this.base(param);
		form.insertAt(0, form.createItem(param.url, {
			name: 'url', type: 'string', label: 'Video URL',
			requirements: {
				notNull: true,
				url: true
			},
			onApply: function(url) {
				if (this.url != url) {
					this.url = url;
					var data = OEmbedTag.getData({ url: this.url }, { timeout: 1000 });
					if (data) {
						this.width = data.width;
						this.height = data.height;
					}
					return true;
				}
				return false;
			}
		}, true));
		return form;
	},

	render: function(param, out) {
		if (this.url) {
			var data = OEmbedTag.getData({ url: this.url }, param);
			var html = data && data.html;
			if (!html) {
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
