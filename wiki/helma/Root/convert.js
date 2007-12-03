function convert_action() {
	var Privileges = {
		READ: 0,
		REGISTER: 1, // allows registration to unknown users if unknown is set to this!
		COMMENT: 2,
		CREATE: 3,
		EDIT: 4,
		ADMINISTRATE: 5,
	};
	this.assurePrivileges(Privileges.ADMINISTRATE);
	res.push();
	var con = getDBConnection("main");
	var query = "SELECT * FROM nodes WHERE prototype = 'User' ORDER BY id";
	var rows = con.executeRetrieval(query);

	while (rows.next()) {
		var user = root.users.getById(rows.getColumnItem("id"));
		if (user && user.name != "Unknown") {
			res.write(user.name + "<br/>");
			if (user.role < Privileges.READ) {
				user.role = User.ROLE_NONE;
			} else if (user.role < Privileges.EDIT) {
				user.role = User.ROLE_READER;
			} else if (user.role <= Privileges.ADMINISTRATE) {
				user.role = User.ROLE_EDITOR;
			} else {
				user.role = User.ROLE_SUPERUSER;
			}
		}
	}

	/*
	var userId = 1;
	while (rows.next()) {
		var name = rows.getColumnItem("name");
		if (name != "Unknown") {
			res.write(name + "<br/>");
			var id = rows.getColumnItem("id");
			var password = rows.getColumnItem("str_value");
			var role = rows.getColumnItem("int_value");
			if (role < Privileges.READ) {
				role = User.ROLE_NONE;
			} else if (role < Privileges.EDIT) {
				role = User.ROLE_READER;
			} else if (role <= Privileges.ADMINISTRATE) {
				role = User.ROLE_EDITOR;
			} else {
				role = User.ROLE_SUPERUSER;
			}
			var query = "INSERT INTO users(id, name, full_name, password, role)\
VALUES (" + userId + ", '" + name + "', '" + name + "', '" + password + "', '" + role + "');";
			con.executeCommand(query);
	
			// now update creator_id and modfier_id links
			con.executeCommand("UPDATE nodes SET creator_id = " + userId + " WHERE creator_id = " + id);
			con.executeCommand("UPDATE nodes SET modifier_id = " + userId + " WHERE modifier_id = " + id);
			userId++;
		}
	}
	con.executeCommand("DELETE FROM nodes WHERE prototype = 'User'");
	*/
	rows.release();
	con.release();
	this.renderPage(res.pop());
}
