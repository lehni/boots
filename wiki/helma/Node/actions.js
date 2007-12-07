function login_action() {
	this.handleLogin();
	this.renderPage(this.renderTemplate("editLogin"));
}

function logout_action() {
	this.handleLogout();
}
