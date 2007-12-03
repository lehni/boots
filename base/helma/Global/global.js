// getResource for the global scope:
function getResource(name) {
	// get a list of all resource in the Global prototype and scan for the
	// given resource
	var resources = app.getPrototype("Global").getResources();
	// scan backwards to get newer versions first (does this work?)
	for (var i = resources.length - 1; i >= 0; i--) {
	    var r = resources[i];
	    if (r.exists() && r.getShortName().equals(name))
			return r;
	}
	return null;
}

function encodeMD5(str) {
	return Packages.helma.util.MD5Encoder.encode(str);
}

function encodeHSA1(str) {
	var algorithm = java.security.MessageDigest.getInstance("SHA-1");
	var digest = algorithm.digest(new java.lang.String(str).getBytes());
	res.push();
	for (var i = 0; i < digest.length; i++) {
		var b = digest[i] & 0xff;
		if (b < 0x10) res.write("0");
		res.write(java.lang.Integer.toHexString(b));
	}
	return res.pop();
}

function encodeUrl(str) {
	return str ? Packages.helma.util.UrlEncoded.encode(str, "UTF-8").replace("%20", "+") : str;
}

function encodeJs(str) {
	return str ? (str = uneval(str)).substring(1, str.length - 1) : str;
}

function encodeHex(str) {
	if (!str) return str;
	res.push();
	for (var i = 0; i < str.length; i++) {
		// TODO: why escape twice???
		res.write('\\\\x');
		res.write(str.charCodeAt(i).toString(16));
	}
	return res.pop();
}

// encodeSql is the same as encodeJs:
var encodeSql = encodeJs;

function decodeUrl(str) {
	return str ? Packages.helma.util.UrlEncoded.decode(str, "UTF-8") : str;
}

// the opposite of encode:
function decode(str) {
	str = Packages.org.htmlparser.util.Translate.decode(str);
	return str.replaceAll('<br />', '\n');
}

function executeProcess() {
	if (arguments.length == 1) {
		var command = arguments[0];
	} else {
		var command = [];
		for (var i = 0; i < arguments.length; i++) {
			command.push(arguments[i]);
		}
	}
	var process = java.lang.Runtime.getRuntime().exec(command);
	var exitValue = process.waitFor();

	function readStream(stream) {
		var reader = new java.io.BufferedReader(new java.io.InputStreamReader(stream));
		res.push();
		var line, first = true;
		while ((line = reader.readLine()) != null) {
			if (first) first = false;
			else res.write('\n');
			res.write(line);
		}
		return res.pop();
	}
	
	return {
		command: command,
		result: readStream(process.getInputStream()),
		error: readStream(process.getErrorStream()),
		exitValue: exitValue
	};
}

renderLink = function(content, urlOptions, htmlOptions, out) {
	var url = '';
	if (urlOptions) {
		if (typeof urlOptions == 'string') url = urlOptions;
		else if (urlOptions instanceof HopObject) url = urlOptions.href();
		else if (urlOptions.href) url = urlOptions.href;
		else if (urlOptions.object) url = urlOptions.object.href(urlOptions.action);
		if (urlOptions.query)
			url += (urlOptions.query[0] == '?' ? '' : url.indexOf('?') != -1 ? '&' : '?') + urlOptions.query;
	}
	var attributes = '';
	if (htmlOptions) {
		var onClick;
		// TODO: make confirm work with destination, and maybe onClick
		if (htmlOptions.onClick) {
			// Convert single quotes to double quotes, as we're using single quotes
			// for the HTML attribute here (due to the use of uneval bellow)
			onClick = htmlOptions.onClick.replace(/'/mgi, '"');
		} else if (htmlOptions.destination) {
			// TODO: This is not a general solution. Use Bootstrap Ajax?
			onClick = 'loadContent("' + url + '", "' + htmlOptions.destination + '", "GET"); return false;';
			url = '#';
		} else if (htmlOptions.popup) {
			var params = htmlOptions.popup.clone();
			delete params.title;
			if (htmlOptions.confirm)
				params.confirm = htmlOptions.confirm;
			onClick = 'Window.open("' + url + '", "' + htmlOptions.popup.title + '", ' + Json.encode(params) + '); return false;';
			url = '#';
		} else if (htmlOptions.confirm) {
			onClick = 'return confirm("' + encodeJs(htmlOptions.confirm) + '")';
		}
		if (htmlOptions.attributes) {
			attributes = htmlOptions.attributes.each(function(val, key) {
				this.push(key + '="' + val + '"');
			}, ['']).join(' ');
		}
		// Use single quotes for onClick, due to uneval above.
		if (onClick)
			attributes += " onclick='" + onClick + "'";
	}
	
	out.write('<a href="');
	out.write(url);
	out.write('"');
	if (attributes)
		out.write(attributes);
	out.write('>');
	out.write(content);
	out.write('</a>');
}.toRender();