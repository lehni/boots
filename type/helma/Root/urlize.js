function urlize_action() {
	if (User.hasRole(User.SUPERUSER)) {
		this.allNodes.list().each(function(node) {
			if (node.title && node instanceof Page)
				node.name = node.title.urlize();
		});
	} else {
		res.write('Not allowed.');
	}
}