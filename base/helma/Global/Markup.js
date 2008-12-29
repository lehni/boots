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
						// Pass current tag as parent, so parse methods can know
						// about their context 
						tag = MarkupTag.create(text.substring(start + 1, end - 1), tag);
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
							// Concat buffered parts into content string
							openTag.content = openTag.buffer.join('');
							tag.buffer.push(openTag.render(param, encoder));
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
				cleanUps[name].cleanUp(param);
		}
		return text;
	}
};

MarkupTag = Base.extend(new function() {
	// Private function to parse tag definitions (everything wihtout the trailing '<' & '>')
	// This is used both when creating a tag object from a tag string and when parsing
	// _attributes definitions, in which case collectAttributes is set to true
	// and the method collects different information, see bellow.
	function parseDefinition(str, collectAttributes) {
		var name = null, list = [], attribute = null, attributes = {};
		for (var match; match = /(\w+)=|("(?:[^"\\]*(?:\\"|\\)?)*")|(\S+)/g.exec(str);) {
			if (match[1]) { // attribute name
				attribute = match[1];
			} else { // string or value
				// Eval strings (match[2]) here is safe, due to regex above it is always a string
				var value = match[2] ? eval(match[2]) : match[3];
				if (collectAttributes) {
					// When collecting _attributes, use list array to store them
					if (!attribute) // attribute with no default value
						list.push({ name: value });
					else
						list.push({ name: attribute, defaultValue: value });
				} else {
					// Normal tag parsing:
					// Find tag name, and store attributes (named) and arguments (unnamed)
					if (!name) { // The first value is the tag name
						name = value;
					} else if (attribute) { // named attribute
						attributes[attribute] = value;
					} else { // unnamed argument
						list.push(value);
					}
				}
				// Reset attribute name again
				attribute = null;
			}
		}
		if (collectAttributes) {
			// Scan backwards to see wether further attributes define defaults.
			// This is needed to stop looping through attributes early once
			// no more defaults are available and unnamed arguments are used up.
			// See MarkupTag#create
			var defaultsFollow = false;
			for (var i = list.length - 1; i >= 0; i--) {
				list[i].defaultsFollow = defaultsFollow;
				defaultsFollow = defaultsFollow || list[i].defaultValue !== undefined;
			}
			return list;
		} else {
			// Normal tag parsing.
			// Return name, unnamed arguments and named attributes for further
			// scanning in MarkupTag.create, if the tag defines _attributes.
			return {
				name: name,
				arguments: list,
				attributes: attributes
			};
		}
	}

	var tags = {};

	return {
		render: function(param, encoder) {
			// Define in subclasses
		},

		/*
		cleanUp: function(param) {
			// Define only if tag needs to clean up something in param
		}
		*/

		statics: {
			extend: function(src) {
				// Parse _attributes definition through the same tag parsing mechanism
				// parseDefinition contains special logic to produce an info object
				// for attribute / argument parsing further down in MarkupTag.create
				var attributes = src._attributes && parseDefinition(src._attributes, true);
				return src._tags.split(',').each(function(tag) {
					// Store attributes information and a reference to prototype in tags
					tags[tag] = {
						attributes: attributes,
						proto: this.prototype
					};
				}, this.base(src));
			},

			create: function(definition, parent) {
				// Parse tag definition for attributes (named) and arguments (unnamed).
				var def = parseDefinition(definition);
				// Render any undefined tag through the UndefinedTag.
				var obj = tags[def.name] || tags['undefined'];
				if (obj.attributes) {
					// If _attributes were defined, use the info object produced
					// by parseDefinition in MarkupTag.extend now to scan through
					// defined named attributes and unnamed arguments,
					// and use default values if available.
					var index = 0;
					for (var i = 0, l = obj.attributes.length; i < l; i++) {
						var attrib = obj.attributes[i];
						// If the tag does not define this predefined attribute,
						// either take its value from the unnamed arguments,
						// and increase index, or use its default value.
						if (def.attributes[attrib.name] === undefined) {
							def.attributes[attrib.name] = index < def.arguments.length
								? def.arguments[index++]
								: attrib.defaultValue; // Use default value if running out of unnamed args
						}
						// If the _attributes definition does not contain any more defaults
						// and we are running out of unnamed arguments, we might as well
						// drop out of the loop since there won't be anything to be done.
						if (!attrib.defaultsFollow && index >= def.arguments.length)
							break;
					}
					// Cut away consumed unnamed arguments
					if (index > 0)
						def.arguments.splice(0, index);
				}
				// Instead of using the empty tag initializers that are a bit
				// slow through bootstrap's #initalize support, produce a pure
				// js object and then set its __proto__ field on Rhino,
				// to speed things up.
				// This hack works on Rhino but not on every browser.
				// On Browsers, you would do this instead:
				// var tag = new obj.proto();
				var tag = {};
				tag.__proto__ = obj.proto;
				// This part stays the same:
				tag.name = def.name;
				tag.attributes = def.attributes;
				tag.arguments = def.arguments;
				tag.parent = parent;
				tag.definition = definition;
				tag.buffer = [];
				return tag;
			}
		}
	}
});

// The root tag, to contain the main buffer for rendering. This is used
// in Markup.parse and does not need to define any render functionality.
RootTag = MarkupTag.extend({
	_tags: 'root'
});

// Special tag to render undefined tag names unmodified.
// UndefinedTag#render can be overridden and is handling the rendering of all the undefined tags.
UndefinedTag = MarkupTag.extend({
	_tags: 'undefined',

	render: function(param, encoder) {
		return encoder('<' + this.definition + '>')	+ this.content + encoder('</' + this.name + '>');
	}
});

NodeTag = MarkupTag.extend({
	_tags: 'node',
	_attributes: 'id',

	render: function() {
		var id = this.attributes.id;
		var content = this.content;
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

	render: function() {
		return '<pre><code>' + this.content.replaceAll('<br />', '') + '</code></pre>';
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

	cleanUp: function(param) {
		if (param.removeUsedResources && param.resources) {
			// Remove the resources that have been flaged 'used'
			for (var i = param.resources.length - 1; i >= 0; i--)
				if (param.resourceLookup[param.resources[i].name].used)
					param.resources.splice(i, 1);
		}
		delete param.resourceLookup;
	},

	// Defined outside render() so it can be overridden by applications.
	renderIcon: function(resource, param) {
		// TODO: pass param, and define small as smallIcon or iconSmall ?
		return resource.renderIcon({ small: true });
	},

	render: function(param) {
		var resource = this.getResource(this.content, param);
		if (resource)
			return this.renderIcon(resource, param);
	}
});

ImageTag = ResourceTag.extend({
	_tags: 'img',

	// Defined outside render() so it can be overridden by applications.
	renderImage: function(picture, param) {
		return picture.renderImage(param);
	},

	render: function(param) {
		if (!/^http/.test(this.content)) {
			var resource = this.getResource(this.content, param);
			if (resource && resource instanceof Picture)
				return this.renderImage(resource, param);
		} else {
			return '<img src="' + this.content + '"/>';
		}
	}
});

HtmlTag = MarkupTag.extend({
	_tags: 'i,b,strong,s,strike',

	render: function() {
		return '<' + this.definition + (this.content != null 
				? '>' + this.content + '</' + this.name + '>' 
				: '>');
	}
});

BoldTag = MarkupTag.extend({
	_tags: 'bold',

	render: function() {
		return '<b>' + this.content + '</b>';
	}
});

UrlTag = MarkupTag.extend({
	_tags: 'url',
	_attributes: 'url',

	render: function(param) {
		var url = this.attributes.url || this.content;
		var title = this.content || url;
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
	_attributes: 'name',

	render: function() {
		return '<div class="quote-title">' + (this.attributes.name
			? this.attributes.name + ' wrote:'
			: 'Quote:')
			+ '</div><div class="quote">' + this.content + '</div>';
	}
});

ListTag = MarkupTag.extend({
	_tags: 'list',

	render: function() {
		return '<ul>' + this.content + '</ul>';
	}
});
