CodeTag = MarkupTag.extend({
	_tags: 'code',

	render: function(content, param, encoder, before, after) {
		var code = content || this.arguments[0];
		if (code) {
			code = code.replace(/<br\s*\/?>/g, '');
			// Nesting things in <code> seems to cause conflicts with Helma's
			// encodeParagraphs that is somehow too smart about it, so use <pre>
			// for blocks of code and <tt> for inlined code.
			if ((typeof before != 'string' || /[\n\r]$|^$/.test(before))
					&& (typeof after != 'string' || /^[\r\n]|^$/.test(after))) {
				// Offer a way to pass on starting of line numbering
				var start = this.attributes.start;
				return '<pre' + (start ? ' start="' + start + '"' : '') + '>'
					+ code + '</pre>';
			} else {
				return '<tt>' + code + '</tt>';
			}
		}
	}
});
