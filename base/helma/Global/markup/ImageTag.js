ImageTag = ResourceTag.extend({
	_tags: 'image,img',
	_attributes: 'src',

	// Defined outside render() so it can be overridden by applications.
	renderImage: function(picture, param) {
		return picture.renderImage(param);
	},

	render: function(content, param) {
		var src = this.attributes.src || content;
		if (!Url.isRemote(src)) {
			var resource = this.getResource(src, param);
			if (resource && resource.instanceOf(Picture))
				return this.renderImage(resource, param);
		} else {
			return '<img src="' + src + '"/>';
		}
	}
});
