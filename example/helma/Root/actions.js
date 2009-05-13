function notfound_action() {
	this.renderHtml({
		title: "Resource not found (404)",
		content: "The resource you requested could not be found on this server.<br />Maybe you copied or entered the URL wrongly:<br />" + getProperty("serverUri") + "/" + req.path + "<br /><br />If you are looking for something particular, you may have more luck with the search function."
	}, res);
}
