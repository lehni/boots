function json_macro(param, object) {
	// If param.include is defined, only include the keys defined in that
	// coma seperated string:
	if (param.include) {
		var include = param.include.split(',').each(function(val) {
			this[val] = true;
		}, {});
		object = object.each(function(val, key) {
			if (include[key] && val !== undefined)
				this[key] = val;
		}, {});
	}
	return Json.encode(object, param.singleQuotes == 'true');
}

function link_macro(param) {	
	 // Backwards compatibility
	if (param.mail)
		param.email = param.mail;
	if (param.url)
		param.href = param.url;
	if (param.text)
		param.content = param.text;
	renderLink(param, res);
}

function renderText_macro(param) {
	if (param.text) {
		var font = Font.getInstance(param.font);
		if (font) {
			font.renderText(param.text, param, res);
		}
	}
}
