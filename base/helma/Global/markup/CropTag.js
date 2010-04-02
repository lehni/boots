CropTag = ResourceTag.extend({
	_tags: 'crop,cropimage',
	_attributes: 'resource imageWidth imageHeight x y width height halign valign',

	render: function(content, param) {
		var attributes = this.attributes;
		// Similar to Picture.renderCrop
		var resource = this.getResource(this.attributes.resource, param);
		if (resource && resource.instanceOf(Picture)) {
			return resource.renderImage({
				maxWidth: this.attributes.imagewidth,
				maxHeight: this.attributes.imageheight,
				crop: this.attributes
			});
		}
	}
});
