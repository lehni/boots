HopObject.inject({
	href_macro: function(param, action) {
	    res.write(this[param.absolute ? 'absoluteHref' : 'href'](action || param.action || ''));
	},

	fullId_macro: function() {
		rew.write(this.getFullId());
	},

	random_macro: function() {
		res.write(Math.random());
	}
});
