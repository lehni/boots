HopObject.inject({
	link_macro: function(param, content) {
		if (content != null)
			param.content = content;
		if (param.ifNotVisiting && path[path.length - 1] == this) {
			// TODO: Template.js seems broken as we cannot return a value to
			// be rendered from macros.
			res.encode(param.content || this.getDisplayName());
		} else {
			this.renderLink(param, res);
		}
	}
});