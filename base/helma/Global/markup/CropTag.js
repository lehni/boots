CropTag = ResourceTag.extend({
	_tags: 'crop,cropimage',
	_attributes: 'resource',
	// attributes: resource imageWidth imageHeight left top width height align valign

	render: function(content, param) {
		var attributes = this.attributes;
		var resource = this.getResource(this.attributes.resource, param);
		if (resource && resource.instanceOf(Picture)) {
			return resource.renderImage({
				maxWidth: this.attributes.imageWidth,
				maxHeight: this.attributes.imageHeight,
				crop: this.attributes
			});
		}
	}
});
