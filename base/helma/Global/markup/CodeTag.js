CodeTag = MarkupTag.extend({
	_tags: 'code',

	render: function(content) {
		return '<pre><code>' + content.replace(/<br\s*\/?>/g, '') + '</code></pre>';
	}
});
