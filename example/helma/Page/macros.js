function resources_macro() {
	var list = this.resources.list();
	for (var i = 0; i < list.length; i++) {
		list[i].renderThumbnail();
		res.write('<br />');
	}
}
