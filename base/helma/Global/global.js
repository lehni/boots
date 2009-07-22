// getResource for the global scope:
function getResource(name) {
	// Get a list of all resource in the Global prototype and scan for the
	// given resource
	var resources = app.getPrototype('Global').getResources();
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
	var algorithm = java.security.MessageDigest.getInstance('SHA-1');
	var digest = algorithm.digest(new java.lang.String(str).getBytes());
	res.push();
	for (var i = 0; i < digest.length; i++) {
		var b = digest[i] & 0xff;
		if (b < 0x10) res.write('0');
		res.write(java.lang.Integer.toHexString(b));
	}
	return res.pop();
}

function encodeUrl(str) {
	return str ? Packages.helma.util.UrlEncoded.encode(str, 'UTF-8').replace('%20', '+') : str;
}

function encodeJs(str, singleQuotes) {
	// We cannot use uneval unfortunately since we want to be able to replace ' or ", depending on singleQuotes
	return str ? (str = Json.encode(str, singleQuotes)).substring(1, str.length - 1) : str;
	// return str ? (str = uneval(str)).substring(1, str.length - 1) : str;
}

function encodeHex(str) {
	var hex = '';
	// two \\ needed because it's javascript encoded (for the client side)
	for (var i = 0; i < str.length; i++) {
		var ch = str.charCodeAt(i);
		hex += ch < 256
			? '\\x' + ch.toPaddedString(2, 16)
			: '\\u' + ch.toPaddedString(4, 16);
	}
	return hex;
}

/**
 * Encodes strings for html attributes, replacing quotes with their hex values
 */
function encodeAttribute(str) {
	return str.replace(/['"]/gm, function(match) {
		return encodeHex(match);
	});
}

// encodeSql is the same as encodeJs:
var encodeSql = encodeJs;

function decodeUrl(str) {
	return str ? Packages.helma.util.UrlEncoded.decode(str, 'UTF-8') : str;
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

renderLink = function(param, out) {
	if (!param || typeof param == 'string')
		param = { content: param };
	var url = '';
	if (param.href) {
		url = param.href;
	} else if (param.email) {
		// Simple email 'encryption'. Hopefully enough for spam bots?
		var parts = param.email.split('@');
		if (parts.length == 2)
			url = "javascript:window.location='\\x6D\\x61\\x69\\x6C\\x74\\x6F\\x3A"
					+ encodeHex(parts[0]) + "' + '\\x40' + '"
					+ encodeHex(parts[1]) + "';";
	} else { // object / id ; action
		var object = param.object || param.id && HopObject.get(param.id);
		if (object)
			url = object.href(param.action);
	}
	if (param.query)
		url += (param.query[0] == '?' ? '' : url.indexOf('?') != -1 ? '&' : '?')
				+ param.query;

	// TODO: make handling of this an app wide switch?
	if (!/^\//.test(url)) { // Not a local page -> target = '_blank'
		if (!param.attributes)
			param.attributes = {}
		if (!param.attributes.target)
			param.attributes.target = '_blank';
	}

	// Start with '' for attributes list so that the joined result starts with ' '.
	var attributes = param.attributes ? param.attributes.each(function(val, key) {
		this.push(key + '="' + val + '"');
	}, ['']).join(' ') : '';

	// Use single quotes for confirm, since it will be inside double quotes
	var confirm = param.confirm && 'confirm(' + Json.encode(param.confirm, true) + ')';

	var onClick;
	if (param.onClick) {
		onClick = param.onClick;
		// Make sure it ends with ;
		if (!/;$/.test(onClick))
			onClick += ';';
	} else if (param.update) {
		onClick = "$('" + param.update + "').load('" + url + "');";
		url = '#';
	} else if (param.popup) {
		onClick = 'new Window(' 
				+ Json.encode(Hash.merge({ url: url }, param.popup), true) + ');';
		url = '#';
	}
	if (onClick || confirm) {
		if (confirm)
			onClick = onClick 
				? 'if (' + confirm + ') ' + onClick + ' return false;'
				: 'return ' + confirm + ';';
		attributes += ' onclick=' + Json.encode(onClick
				+ (confirm ? '' : ' return false;'));
	}

	res.write('<a href="' + url + '"' + attributes + '>' + param.content + '</a>');
}.toRender();

// Simple helper for debugging

function print() {
	var str = Array.create(arguments).join(' ');
	app.log(str);
	res.write(str + '<br/>');
}

function sleep(milliseconds) {
	java.lang.Thread.sleep(milliseconds);
}