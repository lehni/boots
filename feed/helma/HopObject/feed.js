HopObject.inject({
	HAS_FEED: false,

	rss_action: function() {
		if (this.HAS_FEED) {
			res.contentType = "text/xml";
			this.renderFeed("rss", 10);
		}
	},

	getFeedList: function(maxCount) {
		return this.list(0, maxCount);
	},

	renderFeed: function(type, maxCount) {
		if (!maxCount)
			maxCount = 10;

		var items = this.getFeedList(maxCount);
		if (items.length > 0) {
			res.push();
			this.renderTemplate(type, {
				title: getProperty("feedTitle") + " - " + this.getPathName(),
				description: getProperty("feedDescription"),
				language: getProperty("feedLanguage"),
				generator: getProperty("feedGenerator"),
				link: this.absoluteHref(),
				date: items[0].modificationDate,
				items: items
			}, res);
		}
	}
});
