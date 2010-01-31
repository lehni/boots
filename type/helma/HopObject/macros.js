HopObject.inject({
	link_macro: function(param, content) {
		if (content != null)
			param.content = content;
		if (param.ifNotVisiting && path[path.length - 1] == this) {
			res.encode(param.content || this.getDisplayName());
		} else {
			this.renderLink(param, res);
		}
	}
});