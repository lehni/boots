StringItem = EditItem.extend(new function() {
	// display something that looks like a password
	var pseudoPassword = '\xa0\xa0\xa0\xa0\xa0\xa0';

	return {
		_types: 'string,password',
		_scale: true,

		render: function(baseForm, name, value, param, out) {
			if (this.type == 'password')
				value = pseudoPassword;
			Html.input({
				type: this.type == 'password' ? 'password' : 'text',
				name: name, value: value, size: this.size || '20',
				maxlength: this.length, className: this.className 
			}, out);
			if (this.hasLinks && this.type == 'string')
				this.renderLinkButtons(baseForm, name, out);
		},

		convert: function(value) {
			if (this.type == 'password') {
				// in case it's still PSEUDO_PASSWORD, don't apply:
				return value == pseudoPassword ? EditForm.DONT_APPLY : value;
			} else {
				return this.convertBreaks(value);
			}
		},

		renderLinkButtons: function(baseForm, name, out) {
			return baseForm.renderTemplate('button#buttons', {
				buttons: baseForm.renderButtons([{
					name: name + '_link',
					value: 'Internal Link',
					onClick: baseForm.renderHandle('choose_link', name, {
						root: this.root ? this.root.getFullId() : '',
						multiple: false
					})
				}, {
					name: name + '_url',
					value: 'External Link',
					onClick: baseForm.renderHandle('choose_url', name)
				}])
			}, out);
		}
	};
});
