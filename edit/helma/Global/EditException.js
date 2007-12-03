EditException = Base.extend({
	initialize: function(item, message) {
		this.item = item;
		this.message = message;
	}
});
