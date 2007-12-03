function getEditForm() {
	return this.createEditForm(Node.HAS_CONTENT | Node.HAS_ATTACHMENTS | Node.HAS_PAGES);
}

function getPages(getAll) {
	if (getAll && Privileges.check(Privileges.EDIT)) return this.allPages.list();
	else if (this.getProperty("hideNodes") != "true") return this.pages.list();
	else return null;
}

function renderIndex(className, toggle, select) {
	var id = parseInt(this._id);
	if (isNaN(id)) id = 0;
	var isRoot = this == root;
	
	var name = null;
	if (select) {
		name = '<a href="javascript:select(\'' + this.name.replaceAll("'", "\\'") + '\',' + id + ')">' + this.name + '</a>';
	} else {
		name = this.renderLinkAsString();
	}
	
	res.write('<p class="' + className + '">');
	var pages = this.getPages(!res.data.visibleOnly);
	if (pages && pages.length > 0) {
		if (toggle) res.write('<a href="javascript:toggle(\'i' + id + '\')">+</a>&nbsp;' + name + '</p>');
		else res.write(name + '</p>');
		res.write('<ul class="' + className + '" id="i' + id + '"');
		res.write(isRoot ? ' style="display:block;">' : '>');
		for (var i in pages) {
			var page = pages[i];
			if (page != null) {
				res.write('<li>');
				page.renderIndex(className, toggle, select);
				res.write('</li>');
			}
		}
		res.write("</ul>");
	} else if (!isRoot) res.write(name + '</p>');
}

function renderIndexAsString(className, toggle, select) {
	res.push();
	this.renderIndex(className, toggle, select);
	return res.pop();
}

