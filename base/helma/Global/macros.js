function input_macro(param) {
	if (param.name) {
		var value = req.data[param.name];
		if (value) {
			value = value.toString();
			if (param.type == 'radio' || param.type == 'checkbox')
				param.current = value;
			else param.value = value;
		}
	}
	Html.input(param, res);
}

function textarea_macro(param) {
	Html.textarea(param, res);
}

function select_macro(param) {
	Html.select(param, res);
}

function script_macro(param) {
	var lastModified = Net.getLastModified(param.src);
	if (lastModified)
		param.src += '?' + lastModified;
	Html.script(param, res);
}

/* This clashes with the global link macro. TODO: Rename the link macro
 to something else, e.g.g href_macro, a, etc.?
function link_macro(param) {
	var lastModified = Net.getLastModified(param.href);
	if (lastModified)
		param.href += '?' + lastModified;
	Html.link(param, res);
}
*/

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

function random_macro(param, first, second) {
	if (param.min !== undefined || param.max !== undefined)
		res.write(Math.rand(param.min, param.max));
	else if (first !== undefined || second !== undefined)
		res.write(Math.rand(first, second));
	else
		res.write(Math.random());
}
 
// dummy macro named __ in order to create comments in skins like this: <%__ comment %>
function ___macro(param) {
}
