function renderHtml(param) {
	param.title = param.title || this.name;
	this.renderTemplate('html', param, res);
}

function login_action() {
	this.handleLogin();
	this.renderHtml({
		content: this.renderTemplate("edit_login")
	});
}

function logout_action() {
	this.handleLogout();
}
