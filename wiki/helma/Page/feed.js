Page.DATE_FORMAT = new java.text.SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss ZZZZ", java.util.Locale.US);

function renderFeed(type, maxCount) {
	if (!maxCount)
		maxCount = 10;

	var pages = this.pages.list();
	var count = Math.min(pages.length, maxCount);
	if (count > 0) {
		res.data.title = getProperty("feedTitle");
		res.data.link = this.absoluteHref();
		res.data.description = getProperty("feedDescription"),
		res.data.language = getProperty("feedLanguage");
		res.data.date = Page.DATE_FORMAT.format(pages[0].modificationDate);
		res.push();
		for (var i = 0; i < count; i++) {
			var page = pages[i];
			page.renderRSSItem(type);
		}
		res.data.items = res.pop();
		this.renderSkin(type);
	}
}

function renderRSSItem(type) {
	var param = {
		title: encodeXml(this.name),
		link: this.absoluteHref(),
		date: Page.DATE_FORMAT.format(this.modificationDate),
		description: encodeXml("<p>" + this.renderTextAsString() + "<p/>")
	};
	this.renderSkin(type + "-item", param);
}
