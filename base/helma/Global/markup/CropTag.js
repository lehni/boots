CropTag = ResourceTag.extend({
	_tags: 'crop,cropimage',
	_attributes: 'resource',
	// attributes: resource imagewidth imageheight y top width height halign valign

	render: function(content, param) {
		var attributes = this.attributes;
		// Similar to Picture.renderCropped
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
