User.inject({
	getEditForm: function(param) {
		var form = this.base(param);
		form.insertAfter('password', {
			label: 'Full Name', name: 'fullName', type: 'string', length: 16
		}, {
			label: 'Website', name: 'website', type: 'string', length: 255
		}, {
			label: 'Text', name: 'text', type: 'text', cols: 45, rows: 5,
			buttons: {
				links: true
			}
		});
		return form;
	}
});