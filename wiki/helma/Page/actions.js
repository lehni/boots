function main_action() {
	this.assurePrivileges(Privileges.READ);
	this.renderPage(this.renderTextAsString());
}

function feed_action() {
	this.assurePrivileges(Privileges.READ);
	var max = 10;
	//if (req.data.type == "rss2") {
//		res.contentType = "application/rss+xml";
		res.contentType = "text/xml";
		this.renderFeed("rss2", max);
	//} else {
//		res.contentType = "text/xml";
//		root.renderFeed("rss092", max);
	//}
}
