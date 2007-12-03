function index_macro(param) {
	root.renderIndex(param['class'] ? param['class'] : 'index', param.toggle == 'true', false);
}

function baseUri_macro(param) {
	res.write(getProperty("baseUri"));
}

function httpHost_macro(param) {
	res.write(req.data.http_host);
}

function recentlyChanged_macro(param) {
	this.checkDelimiter(param);
	// create exclude lookup:
	var excludeNames = param.exclude ? param.exclude.split(',') : [];
	var exclude = {};
	for (var i in excludeNames) exclude[excludeNames[i]] = true;
	
    var recentlyChanged = root.recentlyChanged.list();
	var dates = param.showDates ? new java.lang.StringBuffer() : null;
	if (dates) {
		res.writeln('<table>');
		res.writeln('<tr>');
		res.writeln('<td>');
	}
	var first = true;
	for(var i = 0; i < recentlyChanged.length; i++) {
		var node = recentlyChanged[i];
		if (node != null && !exclude[node.name]) {
			if (first) first = false;
			else {
				res.write(param.delimiter);
				if (dates) dates.append(param.delimiter);
			}
			node.renderLink();
			if (dates) dates.append(app.data.dateFormat.format(node.getEditDate()));
		}
	}
	if (dates) {
		res.writeln('</td>');
		res.writeln('<td>');
		res.write(dates.toString());
		res.writeln('</td>');
		res.writeln('</tr>');
		res.writeln('</table>');
	}
}

function numPages_macro() {
    return this.count();
}

function users_macro(param) {
	this.checkDelimiter(param);
	if (session.user != null || param.showUsersToGuests == "true") {
		if (param.title) {
			res.write(param.title);
			res.write(param.delimiter);
		}
		var users = app.getActiveUsers();
		for(var i = 0; i < users.length; i++) {
			if (i > 0) res.write(param.delimiter);
			res.write("<a href=\"");
			res.write(users[i].href());
			res.write("\">");
			res.encode(users[i].name);
			res.write("</a>");
		}
		var anonymousUsers = app.countSessions() - users.length;
		if (anonymousUsers > 0) {
			if (users.length > 0) res.write(param.delimiter);
			res.write(anonymousUsers);
			res.write(' Guest');
			if (anonymousUsers > 1) res.write('s');
		}
	}
}

function repairLinks_macro() {
    this.assurePrivileges(Privileges.ADMINISTRATE);
	if (req.data.submit) {
		for(var i = 0; i < root.count(); i++) {
			root.get(i).createLinks();
		}
		res.write("Repair Links finished");
	} else {
		res.write("Do you really want to repair all the links?");
		res.write("<form method=\"post\"><input name=\"submit\" type=\"submit\"></form>");
	}
}
