HopObject.inject({
	// edit_action is only used in the non-dhtml editor.
	edit_action: function() {
		EditForm.handle(this);
		/*
		if (!EditForm.handle(this) && this.login_action)
			this.login_action();
		*/
	}	
});
