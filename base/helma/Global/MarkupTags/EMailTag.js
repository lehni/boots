EMailTag = MarkupTag.extend({
	_tags: 'email,mail',
	_attributes: 'email',

	render: function(content, param, encoder) {
		var email = this.attributes.email;
		if (!email) {
			email = content;
			content = null;
		}
		return renderLink({ email: email, content: content });
	}
});
