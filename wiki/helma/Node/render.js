function parseWiki(text, createLinks) {
	var that = this;
	
	if (createLinks && !this.ignoreLinks()) {
		// keepss track of old links that are still there, in order to not remove them 
		var keepLinks = {};
		// stores the newly created links
		var newLinks = [];
		// keeps track of nodes that have already been linked this time (in case there's more than one link to them)
		var linkedNodes = {};
	} else {
		createLinks = false;
	}
	
	text = Markup.encodeWiki(text, function(protocol, name, title) {
		if (!protocol) {
			if (!title)
				title = name;
			var node = that.findNode(name);
			if (node) {
				if (createLinks && !linkedNodes[node._id] && !node.ignoreLinks() && that != node) {
					linkedNodes[node._id] = true;
					// see wether the object was already linked:
					var oldLink = that.links.get(node._id.toString());
					if (oldLink != null) { 
						keepLinks[oldLink._id] = true;
					} else {
						var link = new Link();
						link.from = that;
						link.to = node;
						newLinks.push(link);
					}
				}
				if (node.getProperty("popup") == "true") {
				 	return node.renderPopupLinkAsString(title);
				} else {
					return node.renderLinkAsString(title);
				}
			} else {
				return that.renderCreateLinkAsString(name);
			}
		} else if (protocol == 'mailto:') {
			var parts = name.split('@');
			if (parts.length == 2) {
				res.push();
				res.write('<a href="javascript:writeTo(\'');
				res.write(encodeHex(parts[0]));
				res.write("','");
				res.write(encodeHex(parts[1]));
				res.write('\')">');
				res.write(title);
				res.write('</a>');
				return res.pop();
			}
		} else {
			if (!title) title = name;
			res.push();
			res.write('<a href="');
			res.write(protocol);
			res.write(name);
			res.write('" target="_blank">');
			res.write(title);
			res.write('</a>');
			return res.pop().replaceAll('$', '\\$');
		}
	});
	
	if (createLinks) {
		var oldLinks = this.links.list();
		// now remove unused links:
		for (var i in oldLinks) {
			var link = oldLinks[i];
			if (!keepLinks[link._id]) {
				if (link.to) link.to.clearRenderCache();
				link.remove();
			}
		}
		// and add the new ones:
		for (var i in newLinks) {
			var link = newLinks[i];
			this.links.add(link);
			if (link.to) link.to.clearRenderCache();
		}
	}
	
	return text;
}

function renderText(renderObj, encoded) {
	if (encoded == null) encoded = true;
	// first get the template in order to set target settings before rendering:
	var template = this.getTemplatePage();
	if (!template) return;
	var target = template.getProperty('target');
	if (target) res.data.target = target;

	if (this.cache.skin == null || !this.cache.encoded != !encoded) { // xor
		var text = this.text;
		if (text) {
			text = this.parseWiki(text, false).trim();
			if (encoded) text = format(text);
		}
		else text = '';
		this.cache.skin = createSkin(text);
		this.cache.encoded = encoded;
	}
	(renderObj ? renderObj : this).renderSkin(this.cache.skin);
}

function renderTextAsString(renderObj, encoded) {
	res.push();
	this.renderText(renderObj, encoded);
	return res.pop();
}

function renderLink(content, action, dontEncode) {
	res.write('<a href="');
	res.write(this.href(action));
	if (req.data.back) {
		if (action.indexOf('?') != -1) res.write('&back=');
		else res.write('?back=');
		res.write(req.data.back);
	}
	res.write('"');
	if (res.data.target) {
		res.write(' target="');
		res.write(res.data.target);
		res.write('"');
	}
	res.write('>');
	content = content ? content : (action ? action : this.name);
	if (dontEncode) res.write(content);
	else res.encode(content);
	res.write('</a>');
}

function renderLinkAsString(content, action, dontEncode) {
	res.push();
	this.renderLink(content, action);
	return res.pop();
}

function clearRenderCache() {
	delete this.cache.skin;
	delete this.cache.encoded;
	delete this.cache.dimensions;
}

function clearTemplateCache() {
	delete this.cache.template;
}

function clearLinkedCaches() {
	// clear all the linked pages:
	var links = this.links.list();
	for (var i in links) {
		var node = links[i].to;
		if (node) node.clearRenderCache();
	}
	
	var backlinks = this.backlinks.list();
	for (var i in backlinks) {
		var node = backlinks[i].from;
		if (node) node.clearRenderCache();
	}
	
	this.clearRenderCache();
}

function getDimensions() {
	if (this.cache.dimensions == null) {
		var width = this.getProperty("width");
		var height = this.getProperty("height");
		if (width && height) {
			this.cache.dimensions = {
				width: width,
				height: height
			};
		} else {
			this.cache.dimensions = false;
		}
	}
	return this.cache.dimensions;
}

function getTemplatePage() {
	// walk up to root and check the children for a template:
	if (this.cache.template == null) {
		// cache the result, see root.clearCachedTemplates()
		var node = this;
		var template = null;
		do {
			if (node == this) {
				// see wether there's an overriden tempalte name here, through <% this.setTemplate="alternative_template" %>:
				// template set like that only work on the level of the object, they don't traverse hierarchies
				var name = this.getProperty("template");
				if (name) {
					var parent = this.getParent();
					template = (parent ? parent : this).findNode(name);
					if (template) break;
				}
			}
			template = node.get("template");
			if (template) break;
			node = node.getParent();
		} while (node != null);
		
		this.cache.template = template;
	}
	return this.cache.template;
}

function checkDelimiter(param) {
	if (!param.delimiter) param.delimiter = getProperty("delimiter");
}

function renderPage(text) {
	res.data.content = text;
	var template = this.getTemplatePage();
	if (template != null) template.renderText(this, false);
	else res.write(text);
}

function renderChildLink(child) {
	child = this.get(child);
	if (child != null)
		child.renderLink();
}

function renderCreateLink(name) {
	res.write('<a href="');
	res.write(this.href("create"));
	res.write("?name=");
	res.write(name);
	res.write('"');
	if (res.data.target) {
		res.write(' target="');
		res.write(res.data.target);
		res.write('"');
	}
	res.write('>[create ');
	res.encode(name);
	res.write(']</a>');
}

function renderCreateLinkAsString(name) {
	res.push();
	this.renderCreateLink(name);
	return res.pop();
}

function renderPopupLink(content, dontEncode) {
	var size = this.getDimensions();
	res.write('<a href="');
	if (size) {
		res.write("javascript:openWin('");
		res.write(this.href());
		res.write("','");
		res.write(this.name);
		res.write("',");
		res.write(size.width);
		res.write(',');
		res.write(size.height);
		res.write(',false, false, false); return false;');
	} else {
		res.write(this.href());
		res.write('" target="_blank');
	}
	res.write('">');
	content = content ? content : (action ? action : this.name);
	if (dontEncode) res.write(content);
	else res.encode(content);
	res.write('</a>');
}

function renderPopupLinkAsString(content, dontEncode) {
	res.push();
	this.renderPopupLink(content, dontEncode);
	return res.pop();
}

