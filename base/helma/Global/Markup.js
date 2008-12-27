Markup = {
	parse: function(text, param) {
		if (text) {
			if (!param)
				param = {};
			// Determine encoder to be used, default is not encoding anything:
			var encoder = param.encoding && global['encode' + param.encoding.capitalize()]
				|| function(val) { return val };
			// Create the root tag that only contains all the others' outputs in its buffer
			var rootTag = MarkupTag.create('root');
			// Stack for nested tags, each having its own buffer for rendered output
			var tags = [rootTag];
			// Keep tag objects that need to clean up something in the end. This is
			// only used for resource rendering in Scriptographer right now. 
			var cleanUps = {};
			var start = 0, end = 0;
			// Current tag:
			var tag = rootTag;
			while (start != -1) { 
				start = text.indexOf('<', end);
				if (start > end)
					tag.buffer.push(encoder(text.substring(end, start)));
				if (start >= 0) {
					end = text.indexOf('>', start) + 1;
					if (end <= start) {
						// Non-closed tag:
						tag.buffer.push(encoder(text.substring(start)));
						break;
					}
					var open = text.charAt(start + 1) != '/';
					if (open) {
						// Opening tag
						var parts = text.substring(start + 1, end - 1).split(/\s+/);
						// Pass current tag as parent, so parse methods can know
						// about their context 
						tag = MarkupTag.create(parts.shift(), parts, tag);
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
							// Activate top tag (the one before the current one)
						 	tag = tags[tags.length - 1];
							tag.buffer.push(openTag.parse(openTag.buffer.join(''), param, encoder));
							// If the object defines the cleanUp function, 
							// collect it now:
							if (openTag && openTag.cleanUp)
								cleanUps[name] = openTag;
						}
					}
				}
			}
			if (end > start)
				rootTag.buffer.push(encoder(text.substring(end)));
			text = rootTag.buffer.join('');
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
		parse: function(content, param, encoder) {
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
					// Store a reference to this prototype in prototypes
					tags[tag] = this.prototype;
				}, this.base(src));
			},

			create: function(name, args, parent) {
				// Render any undefined tag through the UndefinedTag.
				// Any app can override its behavior simply by defining a new tag
				// that defines _tags: 'undefined'.
				var proto = tags[name] || tags['undefined'];
				// Instead of using the empty tag initializers that are a bit
				// slow through bootstrap's #initalize support, produce a pure
				// js object and then set its __proto__ field on Rhino,
				// to speed things up.
				// This hack works on Rhino but not on every browser.
				// On Browsers, you would do this instead:
				// var tag = new proto();
				var tag = {};
				tag.__proto__ = proto;
				// This part stays the same:
				tag.name = name;
				tag.arguments = args;
				tag.parent = parent;
				tag.buffer = [];
				return tag;
			}
		}
	}
});

// The root tag, to contain the main buffer for rendering. This is used
// in Markup.parse and does not need to define any parse functionality.
RootTag = MarkupTag.extend({
	_tags: 'root'
});

// Special tag to render undefined tag names unmodified.
UndefinedTag = MarkupTag.extend({
	_tags: 'undefined',

	parse: function(content, param, encoder) {
		return encoder('<' + this.name + (this.arguments ? ' ' + this.arguments.join(' ') : '') + '>')
			+ content + encoder('</' + this.name + '>');
	}
});

NodeTag = MarkupTag.extend({
	_tags: 'node',

	parse: function(content) {
		var id = this.arguments[0];
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

	parse: function(content) {
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

	parse: function(content, param) {
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

	parse: function(content, param) {
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

	parse: function(content) {
		return '<' + this.name +
			(this.arguments ? ' ' + this.arguments.join(' ') : '') +
			(content != null ? '>' + content + '</' + this.name + '>' : '>');
	}
});

BoldTag = MarkupTag.extend({
	_tags: 'bold',

	parse: function(content) {
		return '<b>' + content + '</b>';
	}
});

UrlTag = MarkupTag.extend({
	_tags: 'url',

	parse: function(content, param) {
		var url, title;
		if (this.arguments && this.arguments[0]) {
			url = this.arguments[0];
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
			str += getProperty('serverUri');
		// Make sure the non-local url has a protocol, http is default:
		if (!isLocal && !Net.parseUrl(url).protocol)
			url = 'http://' + url;
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

	parse: function(content) {
		var title;
		if (this.arguments[0]) {
			title = this.arguments[0] + ' wrote:';
		} else {
			title = 'Quote:';
		}
		return '<div class="quote-title">' + title + '</div><div class="quote">' + content + '</div>';
	}
});

ListTag = MarkupTag.extend({
	_tags: 'list',

	parse: function(content) {
		return '<ul>' + content + '</ul>';
	}
});
