StringItem = EditItem.extend(new function() {
	// display something that looks like a password
	var pseudoPassword = '\xa0\xa0\xa0\xa0\xa0\xa0';

	return {
		_types: 'string,password',
		_scale: true,

		initialize: function() {
			this.base();
			// If length is set and there is no maxLength requirement, use its
			// value to define one, just to make sure.
			if (this.length) {
				if (!this.requirements)
					this.requirements = {};
				if (!this.requirements.maxLength)
					this.requirements.maxLength = this.length;
			}
		},

		render: function(baseForm, name, value, param, out) {
			if (this.type == 'password') {
				value = pseudoPassword;
			} else if (this.length) {
				// Make sure default values are not longer than length.
				if (value && value.length > this.length)
					value = value.substring(0, this.length);
			}
			Html.input({
				type: this.type == 'password' ? 'password' : 'text',
				name: name, value: value, size: this.size || '20',
				maxlength: this.length, className: this.className 
			}, out);
			this.renderButtons(baseForm, name, true, out);
		},

		convert: function(value) {
			if (this.type == 'password') {
				// in case it's still PSEUDO_PASSWORD, don't apply:
				return value == pseudoPassword ? EditForm.DONT_APPLY : value;
			} else {
				return this.convertBreaks(value);
			}
		},

		getButtons: function(baseForm, name) {
			var buttons = [];
			// TODO: Make control over links and other edit buttons more
			// flexible
			if (this.buttons.links && this.type != 'password') {
				buttons.push({
					name: name + '_link',
					value: 'Internal Link',
					onClick: baseForm.renderHandle('choose_link', name,
							this.getEditParam())
				}, {
					name: name + '_url',
					value: 'External Link',
					onClick: baseForm.renderHandle('choose_url', name)
				});
			}
			return buttons;
		}
	};
});
