Node.HAS_CONTENT = 1;
Node.HAS_ATTACHMENTS = 2;
Node.HAS_PAGES = 4;

function createEditForm(flags) {
	var mask = new EditForm(this, { removable: true });
	if (flags & Node.HAS_CONTENT) {
		var parent = this.getEditParent();
		mask.addTab('Content',
			{
				label: "Title", type: "string", name: "name", scaleToFit: true,
				requirements: {
					notNull: true,
					maxLength: 64,
					match: {
						value: /^[^\?^\/]*$/,
						message: "'?' and '/' are not allowed."
					},
					uniqueIn: parent ? parent.children : null
				}
			},
			{ 
				label: "Text", type: "text", name: "text",
				rows: "20", scaleToFit: true
			},
			this != root ? {
				type: "boolean", name: "hidden", suffix: "hide",
				value: this.isCreating() ? false : this.isHidden(), onApply: this.setHidden
			} : null
		);
	}
	if (flags & Node.HAS_ATTACHMENTS) {
		mask.addTab('Attachments', {
			label: "Attachments", name: "attachments", showOptions: true, size: 8,
			type: "multiselect", prototypes: "Attachment", moveable: true,
			collection: this.allAttachments, value: this.attachments,
			autoRemove: true, scaleToFit: true
		});
	}
	var pages = {
		label: "Sub Pages", name: "pages", showOptions: true, size: 8,
		type: "multiselect", prototypes: "Page", moveable: true,
		collection: this.allPages, value: this.pages, autoRemove: true,
		scaleToFit: true
	};
	if ((flags & Node.HAS_PAGES) && (User.getRole() & User.FLAG_ADMINISTRATOR)) {
		mask.addTab('Pages', pages);
	} else {
		pages.hidden = true;
		mask.add('Pages', pages);
	}
	return mask;
}
 
function getEditForm() {
	return this.createEditForm(Node.HAS_ATTACHMENTS);
}

function getEditName() {
	if (this.name) {
		var name = this.name;
		if (name.length > 20) name = name.substr(0, 20) + '...';
		return name;
	}
}

function checkName(name) {
	var parent = this.getEditParent();
	if (parent) {
		var obj = parent.children.get(name);
		if (obj != null && obj != this) {
			return "is already in use.";
		}
	}
	return null;
}

function onCreate() {
	var parent = this.parent;
	if (parent && parent.getProperty("insertOnTop") == "true") {
		this.position = 0;
		var nodes = parent.list();
		for (var i = 0; i < nodes.length; i++)
			nodes[i].position = i + 1;
	}
	var con = getDBConnection("main"); 
	var rows = con.executeRetrieval("SELECT name FROM nodes WHERE text LIKE '%*" +  this.name + "*%'"); 
	if (rows) {
		while (rows.next()) {
			var name = rows.getColumnItem("name");				
			var obj = root.findNode(name);
			res.write("linking " + name + " " + obj + "<br />");
			if (obj != null) {
				obj.clearRenderCache(); //render all pages containg links to the new page new
				obj.createLinks(); //create this page's backlink
			}
		}
		rows.release();
	}
	con.release();
	if (!this.isHidden() && parent) {
		parent.clearRenderCache();
		parent.clearCacheFiles();
		// parent.updateProperties();
	}
	this.createLinks();
	if (parent)
		parent.createLinks();
}

function onApply(changedItems) {
	if (changedItems) {
		if (changedItems.pages || changedItems.text)
			this.clearLinkedCaches();
		if (changedItems.text && this.name == "template")
			root.clearTemplateCaches();
	}
}

function onRemove() {
	this.clearLinkedCaches();
	if (this.name == "template")
		root.clearTemplateCaches();
	// remove links:
	var links = this.links.list();
 	for (var i in links) {
		var link = links[i];
		if (link.to) link.to.clearRenderCache();
		link.remove();
	}
	var backlinks = this.backlinks.list();
 	for (var i in backlinks) {
		var link = backlinks[i];
		if (link.from) link.from.clearRenderCache();
		link.remove();
	}
	this.removeFiles();
}

function getChildElement(name) {
    var obj = this.children.get(name);
	if (obj == null) {
		if (this == root && name == "users")
			return this.users;
		// if the object is not found, it could be because of umlaute in the url:
		// try with converted names:
		// either to UTF-8 or MacRoman
		var bytes = new java.lang.String(name).getBytes("ISO-8859-1");
		obj = this.get(new java.lang.String(bytes, "UTF-8").toString());
		if (obj == null)
			obj = this.get(new java.lang.String(bytes, "MacRoman").toString());
		if (obj == null && this._id.charAt(0) != 't') {
			// still not found. walk through the children, replace '+' with empty spaces and match again, as these
			// are not passed through apache proberly (argh...)
			var con = getDBConnection("main");
			var rows = con.executeRetrieval("SELECT id FROM nodes WHERE parent_id = " + this._id +
				" AND REPLACE(name, '+', ' ') = '" + encodeSql(name) + "'");
			if (rows.next())
				obj = Node.getById(rows.getProperty(1));
		}
		if (obj == null) {
			// try findNode:
			obj = this.findNode(name);
			if (obj != null) {
				// if found, redirect to the new url of that object:
				return {
					main_action: function() {
						res.redirect(obj.href());
					}
				}
			}
		}
	}
	return obj;
}

function getParent() {
	return this.parent;
}

function isHidden() {
	return this.position == null;
}

function setHidden(value) {
	if (this != root && !this.isHidden() != !value) {
		this.position = value ? null : this.getEditParent().children.count();
	}
}

function findNode(identifier) {
	// root.groupedNodes contains all nodes, grouped by names
	// so there can be several nodes with the same name, in which case the name of the parent should be included in the identifier
	// to find the correct node (this can go on over several parents, until the identifier is unique). that's how node links are determined
	// if the identifier is not unique, the first node is taken from the list of available ones.
	
	// identifier looks like this: "name" "parentName/name", ...
	if (!identifier) return null;
	identifier = identifier.split('/');
	var name = identifier.pop();
	var nodes = root.groupedNodes.get(name);
//	res.write(nodes + " " + name + "| ");
	if (nodes == null) return null;
	nodes = nodes.list();
	// if there's only one or the identifier is not specified closer, take it, otherwise we need to filter:
	if (nodes.length > 1) {
		if (identifier.length > 0) {
			// now filter out the nodes that don't apply to the specifier
			// walk through all the nodes and identifier steps:
			for (var i = nodes.length - 1 ; i >= 0; i--) {
				var node = nodes[i].getParent();
				for (var j = identifier.length - 1; j >= 0; j--) {
					if (node == null || node.name != identifier[j])
						break;
					node = node.getParent();
				}
				if (i >= 0) // no match
					nodes.splice(i, 1);
			}
		} else {
			// see wether this is the parent of one of the nodes:
			for (var i in nodes) {
				if (nodes[i].getParent() == this)
					return nodes[i];
			}
		}
	}
	// now just take the first of the still available nodes...
	return nodes[0];
}

function clearFiles(thumbsOnly) {
	this.clearFilteredFiles('thumb', 'imagesDir');
	if (!thumbsOnly) this.clearFilteredFiles('cache', 'cacheDir');
}

function getFileId() {
	return this._id;
}

function clearFilteredFiles(prefix, dirName) {
	var dir = getProperty(dirName);
	if (dir != null) {
		// remove all versions of this image through java.io.File filtering
		var id = this.getFileId();
		var filter = new java.io.FilenameFilter() {
			accept: function(dir, name) {
				return name.startsWith(prefix + "_" + id + "_");
			}
		};
		var thumbs = new java.io.File(dir).listFiles(filter);
		for (var i in thumbs) thumbs[i]['delete'](); // File.delete
	}
}

function clearCacheFiles() {
	if (getProperty("paperDir")) {
		this.clearFiles();
		var node = this.getParent();
		// walk up the hierarchy an clear thumbs:
		while (node != null) {
			node.clearFiles(true);
			node = node.getParent();
		}
	}
}

function clearLinks() {
	// clear all links to and from:
	var links = this.links.list();
	var backlinks = this.backlinks.list();
	for (var i in links) links[i].remove();
	for (var i in backlinks) backlinks[i].remove();
}


function createLinks() {
	this.parseWiki(this.text, true);
}

function getEditor() {
	return this.modifier ? this.modifier : this.creator;
}

function getEditDate() {
	return this.modificationDate ? this.modificationDate : this.creationDate;
}

function isParentOf(node) {
	var parent = node;
	do {
		parent = parent.getParent();
	} while (parent != null && parent != this);
	return parent == this;
}

// for overriding:
function removeFiles() {
	this.clearFiles();
}

function absoluteHref() {
	res.push();
	res.write("http://");
	res.write(req.data.http_host);
	res.write(getProperty("baseUri"));
	res.write(this.href().substring(1));
	return res.pop();
}

