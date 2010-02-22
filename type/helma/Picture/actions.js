function main_action() {
	if (/\/$/.test(req.path)) { // Path ends with / -> we're in a popup
		this.renderPopup({
			content: this.renderTemplate('picture', {
				picture: this.renderImage(this.MAX_POPUP_SIZE)
			})
		}, res);
	} else { // Just the file
		// Make sure it's a valid thumbnail id:
		if (/[a-z0-9]{32}/.test(req.data.version)) {
			var file = this.getVersionFile(req.data.version);
			if (file.exists())
				this.forwardFile(file);
		}
		this.forwardFile();
	}
}
