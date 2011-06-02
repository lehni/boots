MarkupTag = Base.extend(new function() {

	var tags = {};

	// Private function to parse tag definitions (everything wihtout the
	// trailing '<' & '>'). This is used both when creating a tag object from
	// a tag string and when parsing _attributes definitions, in which case
	// collectAttributes  is set to true and the method collects different
	// information, see bellow.
	function parseDefinition(str, param, collectAttributes) {
		// When collectAttributes is true, list holds the array of attribute
		// definitions and lookup the lowercase attribute name lookup table.
		var name = null, list = [], attribute = null, attributes = {},
			lookup = {}, proto;
		// Match either name= parts, string parts (supporting both ' and ", and 
		// escaped quotes inside), and pure value parts (in collectAttributes 
		// mode these can also be attribute names without default values):
		var parse =
		 		/(\w+)=|(["'](?:[^"'\\]*(?:\\["']|\\|(?=["']))+)*["'])|(\S+)/gm;
		// TODO: See which version is faster, replace or repeated calls to exec?
		// str.replace(parse, function() {
		// 	var match = arguments;
		for (var match; match = parse.exec(str);) {
			if (match[1]) { // attribute name
				attribute = match[1];
			} else { // string or value
				// Do not eval match[2] as it might contain line breaks which
				// will throw errors.
				var value = match[2];
				value = value 
						&& value.substring(1, value.length - 1).replace(
								/\\/g, '')
						|| match[3];
				if (collectAttributes) {
					// When collecting _attributes, use list array to store them
					if (!attribute) {
						// attribute with no default value
						attribute = value;
						value = undefined;
					}
					list.push({ name: attribute, defaultValue: value });
					// See if there's a lowercase version, and if so, put it
					// into the list of attributes name translation lookup:
					var lower = attribute.toLowerCase();
					if (lower != attribute)
						lookup[lower] = attribute;
				} else {
					// Normal tag parsing:
					// Find tag name, and store attributes (named) and arguments
					// (unnamed)
					if (!name) {
						// The first value is the tag name. Once we know it, we
						// can determine the prototype to be used and from there 
						// the attribs definition and name translation lookup.
						name = value;
						// Render any undefined tag through the UndefinedTag.
						var store = param && tags[param.context]
							|| tags['default'];
						proto = store[name] || tags['default'][name]
							|| store['undefined']
							|| tags['default']['undefined'];
						// Now get the attribute name translation lookup:
						lookup = proto._attributes && proto._attributes.lookup
								|| lookup;
					} else if (attribute) {
						// named attribute. Use definition.lookup to translate
						// to mixed case name.
						attribute = lookup[attribute] || attribute;
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
				defaultsFollow = defaultsFollow
						|| list[i].defaultValue !== undefined;
			}
			// Return both the attributes definition and the name lookup
			return list.length > 0 ? {
				attributes: list,
				lookup: lookup
			} : null;
		} else {
			// Normal tag parsing.
			// Return name, unnamed arguments and named attributes for further
			// scanning in MarkupTag.create, if the tag defines _attributes.
			return {
				name: name,
				proto: proto,
				arguments: list,
				attributes: attributes
			};
		}
	}

	return {
		render: function(content, param, encoder) {
			// Define in subclasses
		},

		renderChildren: function(param, encoder) {
			var buffer = new Array(this.parts.length);
			for (var i = 0, l = this.parts.length; i < l; i++) {
				var part = this.parts[i];
				if (part.render && (!param.allowedTags
							|| param.allowedTags[part.name])) {
					// This is a tag, render its children first into one content
					// string
					var content = part.renderChildren(param, encoder);
					// Now render the tag itself and place it in the resulting
					// buffer
					buffer[i] = part.render(content, param, encoder,
								this.parts[i - 1], this.parts[i + 1]);
				} else {
					// A simple string. Just encode it
					buffer[i] = encoder(this.parts[i]);
				}
			}
			return buffer.join('');
		},

		toString: function() {
			// Since parts contains both strings and tags, join calls toString
			// on each of them, resulting in automatic toString recursion for
			// child tags.
			var content = this.parts.join('');
			return '<' + this.definition + (content 
					? '>' + content + '</' + this.name + '>' 
					: '/>');
		},

		mergeAttributes: function(definition) {
			MarkupTag.mergeAttributes(definition, this.attributes,
					this.arguments);
		},

		renderAttributes: function(attributes) {
			return Hash.map(attributes || this.attributes, function(value, key) {
				return key + '="' + value + '"';
			}).join(' ');			
		},

		statics: {
			extend: function(src) {
				// Make sure we're using the new inject, which is only around
				// after extend() was called.
				return this.base().inject(src);
			},

			inject: function(src) {
				// Parse _attributes definition through the same tag parsing
				// mechanism parseDefinition contains special logic to produce
				// an info object for attribute / argument parsing further down
				// in MarkupTag.create().
				var attributes = src && src._attributes
						&& parseDefinition(src._attributes, null, true);
				if (attributes)
					src._attributes = attributes;
				// Now call base to inject it all.
				this.base(src);
				if (src && src._tags) {
					// Create lookup per tag name for prototype to be used.
					// TODO: What happens if only _context is injected, or
					// if _tags exists already and is modified later?
					// Should _tags be turned into an array on this.prototype,
					// and new tags added and contexts of old tags changed?
					var context = src._context || 'default';
					var store = tags[context] = tags[context] || {};
					src._tags.split(',').each(function(tag) {
						// Store attributes information and a reference to
						// prototype in tags
						store[tag] = this.prototype;
					}, this);
				}
				return this;
			},

			create: function(definition, parent, param) {
				// Parse tag definition for attributes (named)
				// and arguments (unnamed).
				var def = definition == 'root'
						? { name: 'root', proto: RootTag.prototype }
						: parseDefinition(definition, param);
				// Instead of using the empty tag initializers that are a bit
				// slow through bootstrap's #initalize support, produce a pure
				// js object and then set its __proto__ field on Rhino,
				// to speed things up.
				// This hack works on Rhino but not on every browser.
				// On Browsers, you would do this instead:
				// var tag = new def.proto();
				var tag = {};
				tag.__proto__ = def.proto;
				// This part stays the same:
				tag.name = def.name;
				tag.attributes = def.attributes;
				tag.arguments = def.arguments;
				tag.parent = parent;
				tag.definition = definition;
				tag.parts = [];
				// Setup children list, and previous / next references
				tag.children = [];
				if (parent) {
					var siblings = parent.children;
					tag.previous = siblings[siblings.length - 1];
					if (tag.previous)
						tag.previous.next = tag;
					siblings.push(tag);
				}
				// Merge attribute definitions with the one from the prototype
				if (!def.proto)
					app.log('NULL: ' + definition + ' ' + Json.encode(def));
				var attributes = def.proto._attributes;
				if (attributes)
					tag.mergeAttributes(attributes);
				// Simulate calling initialize, since we're creating tags in an
				// odd way above... The difference to the normal initialize is
				// that all the fields are already set on tag, e.g. name,
				// attibutes, etc.
				if (tag.initialize)
					tag.initialize();
				return tag;
			},

			mergeAttributes: function(definition, attributes, arguments) {
				// definition is the result of parsing _attribuets definition
				// in inject. If _attributes were defined, use the attributes
				// object produced by parseDefinition in MarkupTag.inject now
				// to scan through defined named attributes and unnamed
				// arguments, and use default values if available.
				var index = 0, attribs = definition.attributes;
				for (var i = 0, l = attribs.length; i < l; i++) {
					var attrib = attribs[i];
					// If the tag does not define this predefined attribute,
					// either take its value from the unnamed arguments,
					// and increase index, or use its default value.
					if (attributes[attrib.name] === undefined) {
						// Use default value if running out of unnamed args
						attributes[attrib.name] = arguments
								&& index < arguments.length ? arguments[index++]
										: attrib.defaultValue;
					}
					// If the _attributes definition does not contain any more
					// defaults and we are running out of unnamed arguments, we
					// might as well drop out of the loop since there won't be
					// anything to be done.
					if (!attrib.defaultsFollow && (!arguments
							|| index >= arguments.length))
						break;
				}
				// Cut away consumed unnamed arguments
				if (arguments && index > 0)
					arguments.splice(0, index);
			}
		}
	};
});

// The RootTag is there to contain all other markup tags and content parts and 
// is produced internally in and returned by Markup.parse. Call render on it
// to render the parsed Markup tree.
RootTag = MarkupTag.extend({
	_tags: 'root',

	// The RootTag's render function is different as it is used to render the
	// whole tree and does not receive content or encoder as parameters.
	render: function(param) {
		if (!param)
			param = {};
		if (typeof param.allowedTags == 'string') {
			var names = param.allowedTags.split(',');
			var allowed = param.allowedTags = {};
			for (var i = 0, l = names.length; i < l; i++)
				allowed[names[i]] = true;
		}
		// Determine encoder to be used, default is not encoding anything:
		var encoder = param.encoding && global['encode'
				+ param.encoding.capitalize()]
			|| function(val) { return val; };
		var str = this.renderChildren(param, encoder);
		return str;
	}
});

// Special tag to render undefined tag names unmodified.
// UndefinedTag#render can be overridden and is handling the rendering of all
// the undefined tags.
UndefinedTag = MarkupTag.extend({
	_tags: 'undefined',

	render: function(content, param, encoder) {
		return encoder('<' + this.definition) + (content 
				? encoder('>') + content + encoder('</' + this.name + '>') 
				: encoder('/>'));
	}
});
