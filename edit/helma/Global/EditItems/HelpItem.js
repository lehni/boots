HelpItem = EditItem.extend({
	_types: 'help',
	itemClassName: 'edit-help hidden',

	render: function(baseForm, name, value, param, out) {
		if (!this.initialized) {
			// Add the button only once to the form!
			baseForm.addButtons({
				value: 'Help', className: 'edit-help-button',
				onClick: baseForm.renderHandle('help_toggle')
			});
			this.initialized = true;
		}
		baseForm.renderTemplate('helpItem', {
			text: this.text
		}, out);
	}
});
