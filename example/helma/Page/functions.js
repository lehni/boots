Page.inject({
	getEditForm: function(param) {
		var form = this.base(param);
		form.addTab("Content", { label: "Text", name: "text", type: "text", cols: 45, rows: 20, hasLinks: true });
		return form;
	}
});