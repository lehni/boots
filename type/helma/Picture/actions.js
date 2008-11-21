function main_action() {
	if (/\/$/.test(req.path)) { // Path ends with / -> we're in a popup
		this.renderPopup({
			content: '<a href="javascript:window.close()"><img src="' +
				this.href() + '" width="' + this.width + ' height="' +
				this.height + '" border="0" alt="0"></a>'
		});
	} else { // Just the file
		// Make sure it's a valid thumbnail id:
		if (/[a-z0-9]{32}/.test(req.data.thumb)) {
			var file = this.getThumbnailFile(req.data.thumb);
			if (file.exists())
				this.forwardFile(file);
		}
		this.forwardFile();
	}
}
