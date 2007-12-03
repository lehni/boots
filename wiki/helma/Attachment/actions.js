function main_action() {
	this.renderMain();
}

function file_action() {
	res.contentType = this.getContentType();
	res.forward(this.getFilename());
}
