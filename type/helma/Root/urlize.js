function urlize_action() {
	if (User.hasRole(UserRole.ROOT)) {
		this.allNodes.list().each(function(node) {
			if (node.title && node.instanceOf(Page))
				node.name = node.title.urlize();
		});
	} else {
		res.write('Not allowed.');
	}
}