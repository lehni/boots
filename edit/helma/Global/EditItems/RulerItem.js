RulerItem = EditItem.extend({
	_types: 'ruler',

	render: function(baseForm, name, value, param, out) {
		baseForm.renderTemplate('rulerItem', null, out);
	}
});
