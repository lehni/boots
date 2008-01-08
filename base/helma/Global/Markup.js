Markup = {
	parse: function(text, param) {
		if (text) {
			if (!param)
				param = {};
			// Determine encoder to be used, default is not encoding anything:
			var encoder = param.encoding && global['encode' + param.encoding.capitalize()]
				|| function(val) { return val };
			// Structure for nested tags, each having its own buffer for rendered output
			var buffer = [], tag = { buffer: buffer };
			var tags = [tag];
			// Keep tag objects that need to clean up something in the end. This is
			// only used for resource rendering in Scriptographer right now. 
			var cleanUps = {};
			var start = 0, end = 0;
			while (start != -1) { 
				start = text.indexOf('<', end);
				if (start > end)
					tag.buffer.push(encoder(text.substring(end, start)));
				if (start >= 0) {
					end = text.indexOf('>', start) + 1;
					var open = text.charAt(start + 1) != '/';
					if (open) {
						// Opening tag
						var parts = text.substring(start + 1, end - 1).split(/\s+/);
						tag = { name: parts.shift(), args: parts, buffer: [] };
						tags.push(tag);
					} else {
						// Closing tag
						var name = text.substring(start + 2, end - 1), openTag;
						// Pop tags from stack until we find the fitting tag
						do {
							// Make sure we keep the last tag on the stack, since
							// it contains the root buffer
							openTag = tags.length > 1 && tags.pop();
						} while (openTag && openTag.name != name);
						if (openTag) {
							// Activate top tag
						 	tag = tags[tags.length - 1];
							var args = openTag.args, content = openTag.buffer.join('');
							var tagObj = MarkupTag.get(name);
							tag.buffer.push(tagObj
								? tagObj.parse(name, args, content, param, encoder) || ''
								: encoder('<' + name + (args ? ' ' + args.join(' ') : '') + '>' + content + '</' + name + '>'));
							// If the object defines the cleanUp function, 
							// collect it now:
							if (tagObj && tagObj.cleanUp)
								cleanUps[name] = tagObj;
						}
					}
				}
			}
			buffer.push(encoder(text.substring(end)));
			text = buffer.join('');
			// See if we need to do some clean up now:
			for (var name in cleanUps)
				cleanUps[name].cleanUp(name, param);
		}
		return text;
	}
};

MarkupTag = Base.extend(new function() {
	var tags = new Hash();

	return {
		parse: function(name, args, content, param, encoder) {
			// Define in subclasses
		},

		/*
		cleanUp: function(name, param) {
			// Define only if tag needs to clean up something in param
		}
		*/

		statics: {
			extend: function(src) {
				return src._tags.split(',').each(function(tag) {
					// create a new instance of this prototype and put it in tags
					tags[tag] = new this();
				}, this.base(src));
			},

			get: function(name) {
				return tags[name];
			}
		}
	}
});

NodeTag = MarkupTag.extend({
	_tags: 'node',

	parse: function(name, args, content) {
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

	parse: function(name, args, content) {
		return '<pre><code>' + content.replaceAll('<br />', '') + '</code></pre>';
	}
});

ResourceTag = MarkupTag.extend({
	_tags: 'resource',

	getResource: function(name, param) {
		if (!param.resourceLookup) {
			param.resourceLookup = {};
			if (param.resources) {
				for (var i = 0; i < param.resources.length; i++) {
					var resource = param.resources[i]
					param.resourceLookup[resource.name] = { resource: resource, index: i };
				}
			}
		}
		var entry = param.resourceLookup[name];
		if (entry) {
			// Mark as used. Scriptographer extends ResourceTag to remove
			// these in cleanUp
			entry.used = true;
			return entry.resource;
		}
	},

	cleanUp: function(name, param) {
		if (param.removeUsedResources && param.resources) {
			// Remove the resources that have been flaged 'used'
			for (var i = param.resources.length - 1; i >= 0; i--)
				if (param.resourceLookup[param.resources[i].name].used)
					param.resources.splice(i, 1);
		}
		delete param.resourceLookup;
	},

	// Defined outside parse() so it can be overridden by applications.
	renderIcon: function(resource, param) {
		// TODO: pass param, and define small as smallIcon or iconSmall ?
		return resource.renderIcon({ small: true });
	},

	parse: function(name, args, content, param) {
		var resource = this.getResource(content, param);
		if (resource)
			return this.renderIcon(resource, param);
	}
});

ImageTag = ResourceTag.extend({
	_tags: 'img',

	// Defined outside parse() so it can be overridden by applications.
	renderImage: function(picture, param) {
		return picture.renderImage(param);
	},

	parse: function(name, args, content, param) {
		if (!/^http/.test(content)) {
			var resource = this.getResource(content, param);
			if (resource && resource instanceof Picture)
				return this.renderImage(resource, param);
		} else {
			return '<img src="' + content + '"/>';
		}
	}
});

HtmlTag = MarkupTag.extend({
	_tags: 'i,b,strong,s,strike',

	parse: function(name, args, content) {
		return '<' + name +
			(args ? ' ' + args.join(' ') : '') +
			(content != null ? '>' + content + '</' + name + '>' : '>');
	}
});

BoldTag = MarkupTag.extend({
	_tags: 'bold',

	parse: function(name, args, content) {
		return '<b>' + content + '</b>';
	}
});

UrlTag = MarkupTag.extend({
	_tags: 'url',

	parse: function(name, args, content, param) {
		var url, title;
		if (args && args[0]) {
			url = args[0];
			title = content;
		} else {
			url = content;
			title = content;
		}
		if (!title)
			title = url;
		var str = '<a href="';
		var isLocal = /^\//.test(url);
		// allways write domain part of url for simple rendering (e.g. in rss feeds)
		if (param.simple && isLocal)
			str += getProperty('serverUrl');
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

	parse: function(name, args, content) {
		var title;
		if (args[0]) {
			title = args[0] + ' wrote:';
		} else {
			title = 'Quote:';
		}
		return '<div class="quote-title">' + title + '</div><div class="quote">' + content + '</div>';
	}
});

ListTag = MarkupTag.extend({
	_tags: 'list',

	parse: function(name, args, content) {
		return '<ul>' + content + '</ul>';
	}
});
