UrlTag = MarkupTag.extend({
	_tags: 'url',
	_attributes: 'url',

	render: function(content, param) {
		var url = this.attributes.url || content;
		var title = content || url;
		var str = '<a href="';
		// allways write domain part of url for simple rendering (e.g. in rss feeds)
		var isLocal = Net.isLocal(url);
		if (param.simple && isLocal)
			str += app.properties.serverUri;
		// Make sure the non-local url has a protocol, http is default:
		if (!isLocal && !Net.isRemote(url))
			url = 'http://' + url;
		str += url;
		// links to local pages do not need to open blank
		if (!isLocal)
			str += '" target="_blank';
		str += '">' + title + '</a>';
		return str;
	}
});
