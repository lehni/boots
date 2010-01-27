Resource.inject({
	render_macro: function(param) {
 		if (!param.unused || !ResourceTag.isUsed(this, param))
			this.render(param, res);
	}
});
