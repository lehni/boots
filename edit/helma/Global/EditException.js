EditException = Base.extend({
	initialize: function(item, message, value) {
		this.item = item;
		this.message = message;
		this.value = value;
	}
});
