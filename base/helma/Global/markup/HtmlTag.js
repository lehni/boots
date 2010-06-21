HtmlTag = MarkupTag.extend({
	_tags: 'i,b,em,strong,s,strike',

	render: function(content) {
		return '<' + this.definition + (content != null 
				? '>' + content + '</' + this.name + '>' 
				: '/>');
	}
});
