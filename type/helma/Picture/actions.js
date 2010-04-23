function main_action() {
	if (/\/$/.test(req.path)) { // Path ends with / -> we're in a popup
		this.renderPopup({
			content: this.renderTemplate('picture', {
				// Make sure we're rendering the popup image versioned even if
				// the site is not using versioning, as it will show in a
				// different size.
				picture: this.renderImage(Hash.append({ versioned: true },
					this.MAX_POPUP_SIZE))
			})
		}, res);
	} else { // Just the file
		// If we're using versioning, make sure it's a valid thumbnail id:
		// If not, we're still allowing one version of the file, which is
		// just however the site is rendering it. The side needs to make
		// sure it is not rendering it in two different sizes then.
		if (!this.VERSIONED || /[a-z0-9]{32}/.test(req.data.v)) {
			var file = this.getVersionFile(req.data.v);
			if (file.exists())
				this.forwardFile(file);
		}
		this.forwardFile();
	}
}
