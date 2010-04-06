UploadStatusHandler = EditHandler.extend({
	mode: 'upload_status',

	handle: function(base, object, node, form) {
		var status = session.getUploadStatus(req.data.upload_id);
		if (app.properties.debugEdit)
			User.log('Upload Status for', req.data.upload_id, '=', status);
		res.write(status || '{}');
	}
});
