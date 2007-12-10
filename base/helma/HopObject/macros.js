HopObject.inject({
	fullId_macro: function() {
		return this.getFullId();
	},

	random_macro: function() {
		res.write(Math.random());
	}
});
