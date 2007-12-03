function menu_macro() {
	var list = this.list();
	for (var i = 0; i < list.length; i++) {
		list[i].renderLink(null, res);
		res.write("<br />");
	}
}
