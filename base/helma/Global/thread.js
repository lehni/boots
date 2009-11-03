var thread = new Object().inject(new function() {
	var data = new JavaAdapter(java.lang.ThreadLocal, {
		initialValue: function() {
			return {};
		}
	});

	return {
		data: {
			_get: function() {
				return data.get();
			}
		}
	}
});
