HtmlTag = MarkupTag.extend({
	_tags: 'i,b,strong,s,strike',

	render: function(content) {
		return '<' + this.definition + (content != null 
				? '>' + content + '</' + this.name + '>' 
				: '/>');
	}
});
