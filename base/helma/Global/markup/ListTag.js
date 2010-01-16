ListTag = MarkupTag.extend({
	_tags: 'list',

	render: function(content) {
		return '<ul><li>' + content.replace(/<br\s*\/?>/g, '').trim().split(/\r\n|\n|\r/mg).join('</li>\n<li>') + '</li></ul>';
	}
});
