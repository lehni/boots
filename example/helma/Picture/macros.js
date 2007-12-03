function renderThumbnail_macro(param) {
	var image = this.renderImage({
		maxWidth: 420,
		maxHeight: 420,
	});
	renderLink(image, this.getHref(), { attributes: { target: "_blank" }}, res);
}
