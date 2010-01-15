UploadStatusHandler = EditHandler.extend({
	mode: 'upload_status',

	handle: function(base, object, node, form) {
		res.write(session.getUploadStatus(req.data.upload_id) || '{}');
	}
});
