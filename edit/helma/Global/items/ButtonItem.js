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
				// TODO: is Json.encode needed here? Doesn't renderHandle do this
				// for us?
				onClick = baseForm.renderHandle('execute', 'click', Json.encode(params));
			}
		}
		baseForm.renderButton({
			name: this.name, // TODO: Shouldn't this be name instead of this.name??
			value: this.value,
			onClick: onClick,
			className: this.className
		}, out);
	}
})
