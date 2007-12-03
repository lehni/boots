function login_action() {
	this.handleLogin();
	this.renderPage(this.renderTemplate("edit_login"));
}

function logout_action() {
	this.handleLogout();
}
