Markup = {
	// Parses the passed markup text to a DOM tree contained in a RootTag
	// object, which can be rendered through RootTag#render. This object can be
	// used for caching. But that is not a necessity since parsing is very fast.
	parse: function(text, param) {
		if (!text)
			return null;
		// Create the root tag as a container for all the other bits
		var rootTag = MarkupTag.create('root');
		var start = 0, end = 0;
		// Current tag:
		var tag = rootTag;
		while (start != -1) { 
			start = text.indexOf('<', end);
			if (start > end)
				tag.nodes.push(text.substring(end, start));
			if (start >= 0) {
				end = text.indexOf('>', start) + 1;
				if (end <= start) {
					// Non-closed tag:
					tag.nodes.push(text.substring(start));
					break;
				}
				var closing = text.charAt(start + 1) == '/';
				// empty = contentless tag: <tag/>
				var empty = !closing && text.charAt(end - 2) == '/';
				var definition = text.substring(start + (closing ? 2 : 1),
						end - (empty ? 2 : 1));
				// There is a special convention in place for empty tags:
				// These are interpretated as empty tags:
				// <tag/>, <tag />, <tag param />
				// Thes are not an empty tags. The / is regarded as part of the
				// parameter instead:
				// <tag param/ >, <tag param/>
				// This is to make unnamed url parameters easy to handle, among
				// other things. Detect this here:
				// If the tag definition contains white space, we have
				// parameters. If such a tag ended with / and the last char is
				// not white, it's not actually an empty tag but the / is  part
				// of the parameter:
				if (empty && /\s.*[^\s]$/.test(definition)) {
					empty = false;
					definition += '/';
				}
				var closeTag = null;
				if (!closing || empty) {
					// Opening tag, pass current tag as parent
					tag = MarkupTag.create(definition, tag, param);
					// If this tag does not allow nesting, search for its end
					// immediately now, all what's inbetween to its nodes and
					// close it straight away.
					if (!empty && tag._nesting === false) {
						// Search for closing tag
						var close = '</' + tag.name + '>';
						start = text.indexOf(close, end);
						if (start >= 0) {
							// Found it, add the part
							tag.nodes.push(text.substring(end, start));
							end = start + close.length;
							// Close this tag now (see below):
							closeTag = tag;
						}
					}
				}
				if (closing || empty) {
					// Closing tag
					closeTag = tag;
					// Walk up hierarchy until we find opening tag:
					while(!empty && closeTag && closeTag.name != definition)
						closeTag = closeTag.parent;
				}
				if (closeTag && closeTag != rootTag) {
					// Activate parent tag
				 	tag = closeTag.parent;
					// Add the closed tag to its parent's nodes and set its
					// index inside the nodes array, as required by renderNode()
					closeTag.index = tag.nodes.push(closeTag) - 1;
				}
			}
		}
		if (end > start)
			rootTag.nodes.push(text.substring(end));
		return rootTag;
	},

	// Parses the passed text into a DOM tree and renders it directly.
	render: function(text, param) {
		var markup = Markup.parse(text, param);
		return markup && markup.render(param) || '';
	}
};
