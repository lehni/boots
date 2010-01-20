CodeTag = MarkupTag.extend({
	_tags: 'code',

	render: function(content, param, encoder, before, after) {
		var code = '<code>' + encoder(content.replace(/<br\s*\/?>/g, '')) + '</code>';
		if ((typeof before != 'string' || /[\n\r]$/.test(before))
				&& (typeof after != 'string' || /^[\r\n]/.test(after)))
			code = '<pre>' + code + '</pre>';
		return code;
	}
});
