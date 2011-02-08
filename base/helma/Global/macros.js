function input_macro(param) {
	if (param.name) {
		var name = param.type == 'radio' || param.type == 'checkbox'
				? 'current' : 'value';
		if (param[name] === undefined) {
			var value = req.data[param.name];
			if (value != null)
				param[name] = value.toString();
		}
	}
	Html.input(param, res);
}

function script_macro(param, src) {
	if (!param.src)
		param.src = src;
	var lastModified = Url.getLastModified(param.src);
	if (lastModified)
		param.src += '?' + lastModified;
	if (!param.type)
		param.type = 'text/javascript';
	Html.script(param, res);
}

var textarea_macro = Html.textarea;

var select_macro = Html.select;

var br_macro = Html.lineBreak;

function stylesheet_macro(param, href) {
	param.rel = 'stylesheet';
	if (!param.href)
		param.href = href;
	var lastModified = Url.getLastModified(param.href);
	if (lastModified)
		param.href += '?' + lastModified;
	Html.link(param, res);
}

function json_macro(param, object) {
	return Json.encode(object, param.properties && param.properties.split(','));
}

function link_macro(param) {
	 // Backwards compatibility
	if (param.mail)
		param.email = param.mail;
	if (param.url)
		param.href = param.url;
	renderLink(param, res);
}

function renderText_macro(param) {
	if (param.text) {
		var font = Font.getInstance(param.font);
		if (font) {
			font.renderText(param.text, param, res);
		} else {
			app.log('Font Missing: ' + param.font);
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
