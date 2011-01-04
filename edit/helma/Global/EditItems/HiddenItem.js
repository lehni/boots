HiddenItem = EditItem.extend({
	_types: 'hidden',

	render: function(baseForm, name, value, param, out) {
		Html.input({type: 'hidden', name: name, value: value }, out);
	}
});
