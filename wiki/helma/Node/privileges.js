function assurePrivileges(privilege, user) {
	var res = Privileges.check(privilege, user);
	if (!res) this.loginRedirect();
	return res;
}

function loginRedirect() {
	var str = req.path;
	var action = str.substring(str.lastIndexOf('/') + 1);
	res.redirect(this.href('login') + "?action=" + action);
}
