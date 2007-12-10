HopObject.inject({
	link_macro: function(param, content) {
		this.renderLink(param.content || content, res);
	}
});