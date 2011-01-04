Markup = {
	// Parses the passed markup text to a DOM tree contained in a RootTag
	// object, which can be rendered through RootTag#render. This object can be
	// used for caching. But that is not a necessity since parsing is very fast.
	parse: function(text, param) {
		if (!text)
			return null;
		// Create the root tag as a container for all the other bits
		var rootTag = MarkupTag.create('root');
		var start = 0, end = 0, offset = 0;
		// Current tag:
		var tag = rootTag;
		while (start != -1) { 
			start = text.indexOf('<', end + offset);
			offset = 0;
			if (start > end)
				tag.parts.push(text.substring(end, start));
			if (start >= 0) {
				end = text.indexOf('>', start) + 1;
				if (end <= start) {
					// Non-closed tag:
					tag.parts.push(text.substring(start));
					break;
				}
				var closing = text.charAt(start + 1) == '/';
				// empty = contentless tag: <tag/>
				var empty = !closing && text.charAt(end - 2) == '/';
				var definition = text.substring(start + (closing ? 2 : 1),
						end - (empty ? 2 : 1));
				// This could be something else than a tag, e.g. some code.
				// For now, the convention simply is to allow tag definitions to
				// be only one line long.
				if (/[\n\r]/.test(definition)) {
					end = start;
					// Skip the < when searching for the next tag
					offset = 1;
					continue;
				}
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
				if (!closing || empty)
					// Opening tag, pass current tag as parent
					tag = MarkupTag.create(definition, tag, param);
				if (closing || empty) {
					// Closing tag
					var openTag = tag;
					// Walk up hierarchy until we find opening tag:
					if (!empty)
						while(openTag && openTag.name != definition)
							openTag = openTag.parent;
					if (openTag && openTag != rootTag) {
						// Activate parent tag
					 	tag = openTag.parent;
						// Add the closed tag to its parent's parts
						tag.parts.push(openTag);
					}
				}
			}
		}
		if (end > start)
			rootTag.parts.push(text.substring(end));
		return rootTag;
	},

	// Parses the passed text into a DOM tree and renders it directly.
	render: function(text, param) {
		var markup = Markup.parse(text, param);
		return markup && markup.render(param) || '';
	}
};
