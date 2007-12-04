Root.inject({
	getEditForm: function() {
		var form = this.base();
		form.addToGroup("node",
			{ label: "Title Page", name: "titlePage", type: "reference" },
			{ label: "Reference Page", name: "referencePage", type: "reference" },
			{ label: "Test", name: "color", type: "color" }
		);
		return form;
	}
});