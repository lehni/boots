ButtonItem = EditItem.extend({
	_types: 'button',

	render: function(baseForm, name, value, param, out) {
		var onClick = null;
		if (this.onClick) {
			var params = this.getEditParam({ post: true });
			if (this.confirm)
				params.confirm = this.confirm;
			// if onClick is a string, it's js code to be executed
			// on the client side.
			// otherwise it's a callback handler on the server
			if (typeof this.onClick == 'string') {
				onClick = this.onClick;
			} else {
				onClick = baseForm.renderHandle('execute', 'click', Json.encode(params));
			}
		}
		baseForm.renderButton({
			value: this.value,
			name: this.name,
			onClick: onClick,
			className: this.className
		}, out);
	}
})
