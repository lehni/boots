UrlTag = MarkupTag.extend({
	_tags: 'url',
	_attributes: 'url',

	render: function(content, param) {
		var url = this.attributes.url || content;
		var title = content || url;
		var str = '<a href="';
		// Allways write domain part of url for feed rendering
		var isRemote = Url.isRemote(url);
		if (param.feed && !isRemote)
			str += app.properties.serverUri;
		// Make sure the non-local url has a protocol, http is default:
		if (isRemote)
			url = Url.addProtocol(url);
		str += url;
		// Links to remote pages need to open blank
		if (isRemote)
			str += '" target="_blank';
		str += '">' + title + '</a>';
		return str;
	}
});
