MarkupTag = Base.extend(new function() {
	var tags = new Hash();

	return {
		parse: function(args, content, resources, param) {
			// TODO: define in subclasses
		},

		statics: {
			extend: function(src) {
				return src._tags.split(',').each(function(tag) {
					// create a new instance of this prototype and put it in tags
					tags[tag] = new this();
				}, this.base(src));
			},

			parse: function(name, args, content, resources, param) {
				var tag = tags[name];
				if (tag) {
					return tag.parse(args, content, resources, param) || '';
				} else {
					return '&lt;' + name + ' ' + args.join(' ') + (content != null ? '&gt;' + content + '&lt;/' + name + '&gt;' : '&gt;');
				}
			}
		}
	}
});

NodeTag = MarkupTag.extend({
	_tags: 'node',

	parse: function(args, content, resources, param) {
		var id = args[0];
		if (!id) {
			id = content;
			content = null;
		}
		var node = HopObject.get(id);
		if (node)
			return node.renderLink(content);
	}
});

CodeTag = MarkupTag.extend({
	_tags: 'code',

	parse: function(args, content, resources, param) {
		return "<pre><code>" + content.replaceAll('<br />', '') + "</code></pre>";
	}
});

ResourceTag = MarkupTag.extend({
	_tags: 'resource',

	getResourceLookup: function(resources, param) {
		if (!param.resourceLookup) {
			param.resourceLookup = {};
			if (resources && resources.length) {
				for (var i = 0; i < resources.length; i++) {
					var resource = resources[i]
					param.resourceLookup[resource.name] = { resource: resource, index: i };
				}
			}
		}
		return param.resourceLookup;
	},

	removeResource: function(resources, resourceLookup, index) {
		// Adjust indices and remove item
		for (var i = index + 1; i < resources.length; i++)
			resourceLookup[resources[i].name].index--;
		resources.splice(index, 1);
	},

	parse: function(args, content, resources, param) {
		var resourceLookup = this.getResourceLookup(resources, param);
		var obj = resourceLookup[args[0] || content];
		if (obj) {
			this.removeResource(resources, resourceLookup, obj.index);
			return obj.resource.renderIcon({ small: true });
		}
	}
});

ImageTag = ResourceTag.extend({
	_tags: 'img',

	parse: function(args, content, resources, param) {
		var resourceLookup = this.getResourceLookup(resources, param);
		if (!/^http/.test(content)) {
			var obj = resourceLookup[content];
			if (obj && obj.resource instanceof Picture) {
				this.removeResource(resources, resourceLookup, obj.index);
				res.push();
				// TODO: renderThumbnail_macro is SG code...
				obj.resource.renderThumbnail_macro(param);
				return res.pop();
			}
		} else {
			return '<img src="' + content + '"/>';
		}
	}
})

BoldTag = MarkupTag.extend({
	_tags: 'bold,b',

	parse: function(args, content, resources, param) {
		return '<b>' + content + '</b>';
	}
});

UrlTag = MarkupTag.extend({
	_tags: 'url',

	parse: function(args, content, resources, param) {
		var url, title;
		if (args[0]) {
			url = args[0];
			title = content;
		} else {
			url = content;
			title = content;
		}
		if (!title) title = url;
		var str = '<a href="';
		var isLocal = /^\//.test(url);
		// allways write domain part of url for simple rendering (e.g. in rss feeds)
		if (param.simple && isLocal)
			str += getProperty("serverUrl");
		str += url;
		// links to local pages do not need to open blank
		if (!isLocal)
			str += '" target="_blank';
		str += '">' + title + '</a>';
		return str;
	}
});

QuoteTag = MarkupTag.extend({
	_tags: 'quote',

	parse: function(args, content, resources, param) {
		var title;
		if (args[0]) {
			title = args[0] + " wrote:";
		} else {
			title = "Quote:";
		}
		return '<div class="quote-title">' + title + '</div><div class="quote">' + content + '</div>';
	}
});

ListTag = MarkupTag.extend({
	_tags: 'list',

	parse: function(args, content, resources, param) {
		return '<ul>' + content + '</ul>';
	}
});

Markup = {
	encodeText: function(text, resources, param) {
		if (text) {
			if (!param)
				param = {};
			// TODO: remove inline hack?
			param.inline = true; // for resources

			var start = 0, end = 0;
			var tag = { buffer: [] };
			var tags = [tag];
			while (start != -1) { 
				start = text.indexOf('<', end);
				if (start > end) {
					tag.buffer.push(encode(text.substring(end, start)));
				}
				if (start >= 0) {
					end = text.indexOf('>', start) + 1;
					var open = false, last, name, args = null, content;
					if (text.charAt(start + 1) != '/') {
						// opening tag, might be closing at the end
						if (text.charAt(end - 2) == '/') {
							last = end - 2;
							content = null;
						} else {
							open = true;
							last = end - 1;
						}
						var parts = text.substring(start + 1, last).split(/\s+/);
						name = parts.shift();
						args = parts;
					} else {
						// closing tag
						name = text.substring(start + 2, end - 1);
						// pop tags from stack to find fitting tag
						do {
							tag = tags.pop();
						} while (tag && tag.name != name);
						if (tag) {
							content = tag.buffer.join('');
							args = tag.args;
						}
					}
					if (open) {
						tag = { name: name, args: args, buffer: [] };
						tags.push(tag);
					} else {
						tag = tags[tags.length - 1];
						if (tag)
							tag.buffer.push(MarkupTag.parse(name, args, content, resources, param));
					}
				}
			}
			if (tag) {
				tag.buffer.push(encode(text.substring(end)));
				text = tag.buffer.join('');
			}
		}
		return text;
	},
	
	WIKI_PATTERNS: (function() {
		var Pattern = java.util.regex.Pattern;
		var flags =  Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL;
/*
		patterns.externalLink = Pattern.compile("(?:\\*)(http[s]?\\://)([^\\:\\*]*)(?:[:]?)(.*?)(?:\\*)", flags);
		patterns.internalLink = Pattern.compile("(?:\\*)([^\\:\\*]*)(?:[:]?)(.*?)(?:\\*)", flags);
*/
		return {
			LINK: Pattern.compile("(?:\\*)((?:http[s]?\\://)|(?:ftp\\://)|(?:mailto\\:)|(?:))([^\\:\\*]*)(?:[:]?)(.*?)(?:\\*)", flags),
			TABLE: Pattern.compile("\\|\\|(.*?)\\|\\|", flags),
			AFTER: [
				[ // ruler
					Pattern.compile("---", flags),
					getProperty("ruler") || '<hr>'
				],
				[ // underline
					Pattern.compile("__(.*?)__", flags),
					"<u>$1</u>"
				],
				[ // bold
					Pattern.compile("==(.*?)==", flags),
					"<b>$1</b>"
				],
				[ // strike
					Pattern.compile("--(.*?)--", flags),
					"<strike>$1</strike>"
				],
				[ // escape "_"
					Pattern.compile("\\\\_", flags),
					"_"
				],
				[ // escape "=", for javascript == comparator. TODO: detect JS code instead?
					Pattern.compile("\\\\=", flags),
					"="
				],
				[ // escape "-", so <!-- --> is possible by writing <!\-\- \-\->. TODO: it would be better to filter this case out above, but how?...
					Pattern.compile("\\\\-", flags),
					"-"
				],
				[ // inline attachments
					Pattern.compile("[\\{](?:\\s*)([\\w\\.]+)(?:\\s*)(\\d*)(?:\\s*)(\\d*)(?:\\s*)[\\}]", flags),
					'<% this.attachment name="$1" width="$2" height="$3" %>'
				],
			]
		};
	})(),

	encodeWiki: function(text, renderLinkCallback) {
		if (!text)
			return text;

		// Parse links
		var matcher = this.WIKI_PATTERNS.LINK.matcher(text);
		var buffer = new java.lang.StringBuffer(text.length);
		while (matcher.find()) {
			var protocol = matcher.group(1);
			var name = matcher.group(2).replaceAll("\\*", "*");
			var title = matcher.group(3);
			matcher.appendReplacement(buffer, renderLinkCallback(protocol, name, title));
		}
		matcher.appendTail(buffer);

		// Now parse tables
		var matcher = this.WIKI_PATTERNS.TABLE.matcher(buffer);
		var buffer = new java.lang.StringBuffer(buffer.length());
		while (matcher.find()) {
			var table = matcher.group(1);
			var lines = table.split('\n');
			res.push();
			res.write('<table>');
			for (var i = 0, j = lines.length; i < j; ++i) {
				res.write('<tr>');
				var line = lines[i].trim();
				while (!line.endsWith('|') && ++i < lines.length) {
					line += '<br />' + lines[i].trim();
				}
				if (line) {
					line = line.split('|');
					for (var k = 0, l = line.length; k < l; ++k) {
						res.write('<td>');
						res.write(line[k]); // the replace is there for allowing line breaks within table cells.
						res.write('</td>');
					}
				} else {
					res.write('<td></td>');
				}
				res.write('</tr>');
			}
			res.write('</table>');
			matcher.appendReplacement(buffer, res.pop().replaceAll('\\', '\\\\').replaceAll('$', '\\$'));
		}
		matcher.appendTail(buffer);

		text = buffer; // matcher takes stringbuffers as well as strings!

		// Now everything else
		for (var i = 0, l = this.WIKI_PATTERNS.AFTER.length; i < l; ++i) {
			var pattern = this.WIKI_PATTERNS.AFTER[i];
			text = pattern[0].matcher(text).replaceAll(pattern[1]);
		}

		return text;
	}
};