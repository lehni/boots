// a helper object that writes out image files.

ImageWriter = Object.extend({
	$constructor: function(attachment) {
		this.attachment = attachment;
	},
	
	main_action: function() {
		res.contentType = this.attachment.getContentType();
		res.forward(this.attachment.getFilename());
	}
});
