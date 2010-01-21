ImageTag = ResourceTag.extend({
	_tags: 'image,img',
	_attributes: 'src',

	// Defined outside render() so it can be overridden by applications.
	renderPicture: function(picture, param) {
		return picture.render(param);
	},

	render: function(content, param) {
		var src = this.attributes.src || content;
		if (!Url.isRemote(src)) {
			var resource = this.getResource(src, param);
			if (resource && resource.instanceOf(Picture))
				return this.renderPicture(resource, param);
		} else {
			return '<img src="' + src + '"/>';
		}
	}
});
