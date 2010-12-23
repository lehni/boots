ImageTag = ResourceTag.extend({
	_tags: 'image,img',
	_attributes: 'src',

	// Defined outside render() so it can be overridden by applications.
	renderPicture: function(picture, content, param) {
		return picture.render(param);
	},

	render: function(content, param) {
		var src = this.attributes.src;
		if (!src) {
			src = content;
			content = null;
		}
		if (Url.isRemote(src)) {
			return '<img src="' + src + '"/>';
		} else {
			var resource = this.getResource(src, param);
			if (resource && resource.instanceOf(Picture))
				return this.renderPicture(resource, content, param);
		}
	}
});
