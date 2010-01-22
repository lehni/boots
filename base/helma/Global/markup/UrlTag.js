UrlTag = MarkupTag.extend({
	_tags: 'url',
	_attributes: 'url',

	render: function(content, param) {
		var url = this.attributes.url || content;
		var title = content || url;
		var str = '<a href="';
		// Allways write domain part of url for feed rendering
		var isLocal = Url.isLocal(url);
		if (param.feed && isLocal)
			str += app.properties.serverUri;
		// Make sure the non-local url has a protocol, http is default:
		if (!isLocal && !Url.isRemote(url))
			url = 'http://' + url;
		str += url;
		// Links to local pages do not need to open blank
		if (!isLocal)
			str += '" target="_blank';
		str += '">' + title + '</a>';
		return str;
	}
});
