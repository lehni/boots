function getEditForm() {
	var form = this.createEditForm();
	form.addTab("Content", { label: "Text", name: "text", type: "text", cols: 45, rows: 20, hasLinks: true });
	return form;
}
