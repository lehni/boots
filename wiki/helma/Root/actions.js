function hash_action() {
	this.assurePrivileges(Privileges.ADMINISTRATE);
	res.write(encryptPassword(req.data.password));
}

function notfound_action() {
	this.renderPage("I'm sorry, but there is no resource named \"" + req.path + "\" on this server.");
}

function search_action() {
	res.push();
	if (req.data.query) {
		res.data.query = req.data.query;
		var con = getDBConnection("main"); 

		var query = "SELECT id FROM nodes WHERE (name LIKE '%" + req.data.query + "%' OR text LIKE '%" + req.data.query + "%')";
	
		if (!Privileges.check(Privileges.EDIT))
			query += " AND position >= 0";

		var rows = con.executeRetrieval(query); 
		var i = 0;
		while (rows.next()) {
			var node = root.allNodes.getById(rows.getColumnItem("id"));
			if (node != null) {
				if (i == 0) res.write("Pages containing \"" + req.data.query + "\":<br><br>");
				else res.write("<br/>");
				node.renderLink();
				i++;
			}
		}
		rows.release();
		con.release();
		if (i == 0) res.write("nothing was found.");
	} else {
		this.renderSkin("search");
	}
	this.renderPage(res.pop());

}

function importImages_action() {
	this.assurePrivileges(Privileges.ADMINISTRATE);
	var dir = new java.io.File(getProperty("importDir"));

	function importImages(dir) {
		var list = dir.listFiles();
		var obj = root.findNode("Import");
		var count = 0;
		if (obj != null) {
			for (var i in list) {
				var file = list[i];
				if (file.isDirectory()) { 
					importFiles(file);
				} else {
					var name = file.getName();
					if (name.endsWith(".jpg") || name.endsWith(".jpeg")) {
						res.write(name + "<br/>");
						var img = obj.createAttachment(file.getName(), "", false, new File(file.getPath()));
						if (img != null) {
							img.position = count++;
							file["delete"]();
						}
					}
				}
			}
		}
	}
	importImages(dir);
}

function recompress_action() {
	this.assurePrivileges(Privileges.ADMINISTRATE);

	function recompress(obj) {
		var attachments = obj.attachments.list();
		if (attachments.length > 0) {
			res.write(obj.name);
			res.write("<br/><br/>");
		}
		for (var i in attachments) {
			var a = attachments[i];
			var file = a.getFile();
			res.write(a.name);
			res.write(": ");
			res.write(file.sizeAsString());
			a.recompress();
			res.write(" => ");
			res.write(file.sizeAsString());
			res.write("<br/>");
		}
	
		var subPages = obj.allPages.list();
		for (var i in subPages) {
				recompress(subPages[i]);
		}
		res.write("<br/><br/>");
	}

	recompress(this);
}
