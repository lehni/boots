function clearTemplateCaches() {
	var nodes = this.allNodes.list();
	for (var i in nodes)
		nodes[i].clearTemplateCache();
}
