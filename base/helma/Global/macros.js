function json_macro(param, object) {
	// If param.include is defined, only include the keys defined in that
	// coma seperated string:
	if (param.include) {
		var include = param.include.split(',').each(function(val) {
			this[val] = true;
		}, {});
		object = object.each(function(val, key) {
			if (include[key])
				this[key] = val;
		}, {});
	}
	if (param.singleQuotes == 'true') {
		// This is a bit of a hack:  Json.encode uses uneval internally, and this
		// produces code like { key: 'value', 'class': 'content' }, using single quote
		// for reserved keywords. This means we cannot simply replace like bellow
		// if an object is passed, since the single quote then gets replaced by \'
		// The workaround is to allways use .each even when the include filter is
		// not defined
		if (Base.type(object) == 'object') {
		 	return '{' + object.each(function(val, key) {
				if (val != undefined)
					this.push("'" + key + "':" + Json.encode(val).replaceAll("'", "\\'").replaceAll('"', "'"));
			}, []).join(',') + '}';
		} else {
			return Json.encode(object).replaceAll("'", "\\'").replaceAll('"', "'");
		}
	} else {
		return Json.encode(object);
	}
}

function link_macro(param) {	
	function createHexString(str) {
		res.push();
		if (str != null) {
			for (var i = 0; i < str.length; i++) {
				// two \\ needed because it's javascript encoded (for the client side)
				res.write('\\x');
				res.write(str.charCodeAt(i).toString(16));
			}
		}
		return res.pop();
	}
	if (param.id) {
		var node = HopObject.get(param.id);
		if (node)
			node.renderLink(param.text, res);
	} else {
		if (param.mail) {
			var parts = param.mail.split('@');
			if (parts.length == 2)
				return renderLink(param.text, "javascript:mailTo('" + createHexString(parts[0]) + "','" + createMailHexString(parts[1]) + "')", null, res);
		} else if (param.url) {
			var options = null;
			if (!/^\//.test(param.url)) // not a local page
				options = { attributes: { target: '_blank' }};
			return renderLink(param.text, param.url, options, res);
		}
	}
}

function renderText_macro(param) {
	if (param.text) {
		var font = Font.getInstance(param.font);
		if (font) {
			font.renderText(param.text, param, res);
		}
	}
}
