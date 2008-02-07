HopObject.inject({
	link_macro: function(param, content) {
		if (content != null)
			param.content = content;
		this.renderLink(param, res);
	}
});