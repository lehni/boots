Date.inject(new function() {
	var formats = {};

	return {
		format: function(str, locale) {
			// Override Helma's format and add DecimalFormat object caching
			var key = str + (locale ? '|' + locale : '');
			var format = formats[key];
			if (!format)
				format = formats[key] = locale
					? new java.text.SimpleDateFormat(str, locale)
					: new java.text.SimpleDateFormat(str);
			return format.format(this);
		}
	}
});
