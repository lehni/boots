Browser = new function() {
	var crawlerPattern = /bot|spider|crawler|google|bing|teoma|jeeves|hatena|scooter|slurp/i;

	return {
		isCrawler: function(agent) {
			return crawlerPattern.test(agent || req.data.http_browser);
		}
	};
};
