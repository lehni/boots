UploadStatusHandler = EditHandler.extend({
	_types: 'upload_status',

	handle: function(base, object, node, form) {
		res.write(session.getUploadStatus(req.data.upload_id) || '{}');
	}
});
