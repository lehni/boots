ButtonItem = EditItem.extend({
	_types: 'button',

	render: function(baseForm, name, value, param, out) {
		var onClick = null;
		if (this.onClick) {
			var params = this.getEditParam({ post: true });
			if (this.confirm)
				params.confirm = this.confirm;
			// If onClick is a string, it's js code to be executed
			// on the client side.
			// otherwise it's a callback handler on the server
			if (typeof this.onClick == 'string') {
				onClick = this.onClick;
			} else {
				onClick = baseForm.renderHandle('execute', 'click' ,params);
			}
		}
		baseForm.renderButton({
			// TODO: Shouldn't this be name instead of this.name?
			name: this.name,
			value: this.value,
			onClick: onClick,
			className: this.className
		}, out);
	}
})
