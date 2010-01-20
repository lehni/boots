function encodeUrl(str) {
	return str ? Packages.helma.util.UrlEncoded.encode(str, 'UTF-8').replace('%20', '+') : str;
}

function encodeJs(str, singleQuotes) {
	// We cannot use uneval unfortunately since we want to be able to replace ' or ", depending on singleQuotes
	return str ? (str = Json.encode(str, singleQuotes)).substring(1, str.length - 1) : str;
	// return str ? (str = uneval(str)).substring(1, str.length - 1) : str;
}

function encodeParagraphs(str) {
	// Remove empty paragraphs from formatParagraphs
	return formatParagraphs(str).replaceAll('<p></p>', '');
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

function encodeMD5(str) {
	return Packages.helma.util.MD5Encoder.encode(str);
}

function encodeDigest(str, type) {
    var algorithm = java.security.MessageDigest.getInstance(type || 'SHA-1');
    var digest = algorithm.digest(new java.lang.String(str).getBytes());
    var hex = '';
    for (var i = 0; i < digest.length; i++)
        hex += (digest[i] & 0xff).toPaddedString(2, 16);
    return hex;
}

function encodeSHA1(str) {
	return encodeDigest(str, 'SHA-1');
}

function encodeBase64(str) {
	return new java.lang.String(Packages.helma.util.Base64.encode(
			new java.lang.String(str).getBytes('UTF-8')));
}

function decodeBase64(str) {
	var bytes = Packages.helma.util.Base64.decode(
			new java.lang.String(str).toCharArray());
	return new java.lang.String(bytes, "UTF-8");
}

/**
 * Encodes strings for html attributes, replacing quotes with their hex values
 * TODO: This appears to not be for attributes but scripts within attributes?
 * Find out more... Wouldn't a normal encode work for this? It does hor input values...
 */
function encodeAttribute(str, singles) {
	return str.replace(singles ? /'/gm : /"/gm, function(match) { // '
		return encodeHex(match);
	});
}

// encodeSql does the same as encodeJs:
var encodeSql = encodeJs;

function decodeUrl(str) {
	return str ? Packages.helma.util.UrlEncoded.decode(str, 'UTF-8') : str;
}

// The opposite of helma's encode, using org.htmlparser:
function decode(str) {
	return Packages.org.htmlparser.util.Translate.decode(str || '').replace(
		/<br\s*\/?>/g, '\n');
}
