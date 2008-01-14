function urlize_action() {
	this.allNodes.list().each(function(node) {
		if (node.title && node instanceof Page)
			node.name = node.title.urlize();
	});
}