BoldTag = MarkupTag.extend({
	_tags: 'bold',

	render: function(content) {
		return '<b>' + content + '</b>';
	}
});
