CodeTag = MarkupTag.extend({
	_tags: 'code',

	render: function(content, param, encoder, before, after) {
		var code = content.replace(/<br\s*\/?>/g, '');
		// Nesting things in <code> seems to cause conflicts with Helma's
		// encodeParagraphs that is somehow too smart about it, so use <pre>
		// for blocks of code and <tt> for inlined code.
		if ((typeof before != 'string' || /[\n\r]$|^$/.test(before))
				&& (typeof after != 'string' || /^[\r\n]|^$/.test(after))) {
			return '<pre>' + code + '</pre>';
		} else {
			return '<tt>' + code + '</tt>';
		}
	}
});
