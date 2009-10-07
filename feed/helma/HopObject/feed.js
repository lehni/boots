HopObject.inject({
	HAS_FEED: false,

	rss_action: function() {
		if (this.HAS_FEED) {
			res.contentType = 'text/xml';
			this.renderFeed({
				type: 'rss',
				maxCount: 10
			}, res);
		}
	},

	getFeedList: function(length) {
		return this.list(0, length);
	},

	renderFeed: function(param, out) {
		if (!param)
			param = {};
		var items = this.getFeedList(param.maxCount || 10);
		if (items.length > 0) {
			return this.renderTemplate(param.type || 'rss', {
				title: app.properties.feedTitle + ' - ' + this.getDisplayName(),
				description: app.properties.feedDescription,
				language: app.properties.feedLanguage,
				generator: app.properties.feedGenerator,
				link: this.absoluteHref(),
				date: items[0].modificationDate,
				items: items
			}, out);
		}
	}
});
