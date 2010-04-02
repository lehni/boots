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

function renderLink(param, out) {
	var asString = !out;
	if (asString)
		(out = res).push();

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

	if (url && Url.isRemote(url)) { // Not a local page -> target = '_blank'
		// Make sure the non-local url has a protocol, http is default:
		url = Url.addProtocol(url);
		// TODO: make handling of this an app wide switch?
		if (!param.attributes)
			param.attributes = {};
		if (!param.attributes.target)
			param.attributes.target = '_blank';
	}

	var confirm = param.confirm && 'confirm(' + Json.encode(param.confirm) + ')';

	// Handle onClick
	var onClick = param.onClick;
	if (onClick) {
		// Make sure it ends with ;
		if (!/;$/.test(onClick))
			onClick += ';';
		if (!url)
			url = '#';
	} else if (url) {
		if (param.update) {
			onClick = "$('#" + param.update + "').load('" + url + "');";
			url = '#';
		} else if (param.popup) {
			onClick = 'new Window(' 
					+ Json.encode(Hash.merge({ url: url }, param.popup)) + ');';
			url = '#';
		}
	}

	var attributes = param.attributes;
	// Notice: param.text is not the same as param.content:
	// content is supposed to be encoded already, text is encoded automatically!
	var content = param.content;
	if (!content && param.text)
		content = encode(param.text);

	if (!url) {
		// Simply render the content without a link.
		res.write(content);
	} else {
		if (onClick || confirm) {
			if (confirm)
				onClick = onClick 
					? 'if (' + confirm + ') ' + onClick + ' return false;'
					: 'return ' + confirm + ';';
			if (!attributes)
				attributes = {};
			attributes.onclick = onClick + (confirm ? '' : ' return false;');
		}
		res.write('<a href="' + url + '"' 
			+ (attributes ? Html.attributes(attributes) : '') + '>' 
			+ content + '</a>');
	}

	if (asString)
		return out.pop();
}

// Simple helper for debugging

function print() {
	var str = Array.join(arguments, ' ');
	app.log(str);
	res.writeln(str + Html.lineBreak());
}

function sleep(milliseconds) {
	java.lang.Thread.sleep(milliseconds);
}
