Codec = new function() {

	var UrlEncoded = Packages.helma.util.UrlEncoded,
		MD5Encoder = Packages.helma.util.MD5Encoder,
		Base64 = Packages.helma.util.Base64,
		Translate = Packages.org.htmlparser.util.Translate,
		MessageDigest = java.security.MessageDigest,
		JavaString = java.lang.String;

	function encodeJs(str) {
		return str ? (str = uneval(str)).substring(1, str.length - 1) : str;
	}

	function encoder(encoder, str) {
		// TODO: This is used so much, it would make sense to fix Helma instead
		return function(str) {
			// format() ignores trailing line break characters, so add
			// periods to make them render, then remove the periods again:
			var begin = /^[\n\r]/.test(str);
			var end = /[\n\r]$/.test(str);
			if (begin)
				str = '.' + str;
			if (end)
				str = str + '.';
			str = encoder(str);
			if (begin || end)
				str = str.substring(begin ? 1 : 0, str.length - (end ? 1 : 0));
			if (str && !Html.XHTML) {
			 	// Helma falsy uses <br /> even for non XHTML, so fix this here
				str = str.replaceAll('<br />', '<br>');
			}
			return str;
		}
	}

	return {
		preserve: true,

		encode: encode,

		// The opposite of helma's encode, using org.htmlparser:
		decode: function decode(str) {
			return Translate.decode(str || '').replace(
				/<br\s*\/?>/g, '\n');
		},

		// "Rename" the already existing ones so they match the encoding=""
		// scheme of skins and templates, and also to provide the additional
		// ones to Template.js that looks them up in the global scope.

		/**
		 * Encodes all text with entities but preserves html markup. Replaces \n
		 * with <br>
		 */
		encodeHtml: encoder(format),

		/**
		 * Encodes all text and html markup with entities. Replaces \n with
		 * <br>
		 */
		encodeAll: encoder(encode),
		// encode calls HtmlEncoder.encodeAll internally.

		/**
		 * Encode all text and html markup with entities.
		 */
		encodeEntities: encodeForm, 
		// encodeForm calls HtmlEncoder.encodeAll with encodeNewline=false
		// internally.

		encodeUrl: function encodeUrl(str) {
			return str ? UrlEncoded.encode(str, 'UTF-8').replace('%20', '+')
					: str;
		},

		decodeUrl: function decodeUrl(str) {
			// TODO: Does this need to use the app charset?
			return str ? UrlEncoded.decode(str, 'UTF-8') : str;
		},

		encodeJs: encodeJs,

		// encodeSql does the same as encodeJs:
		encodeSql: encodeJs,

		/**
		 * Encodes all text with entities but preserves html markup.
		 * Wrapps paragraphs in <p></p> And adds <br> sometimes (?).
		 * TODO: Seems to cause a row issues, so should maybe be
		 * replaced with JS only solution.
		 */ 
		encodeParagraphs: function encodeParagraphs(str) {
			// Remove empty paragraphs from formatParagraphs
			return formatParagraphs(str).replaceAll('<p></p>', '');
		},

		encodeHex: function encodeHex(str) {
			var hex = '';
			for (var i = 0; i < str.length; i++) {
				var ch = str.charCodeAt(i);
				// Two \\ are needed because it's javascript encoded
				// (for the client side)
				hex += ch < 256
					? '\\x' + ch.toPaddedString(2, 16)
					: '\\u' + ch.toPaddedString(4, 16);
			}
			return hex;
		},

		encodeMd5: MD5Encoder.encode,

		encodeDigest: function encodeDigest(str, type) {
		    var algorithm = MessageDigest.getInstance(type || 'SHA-1');
		    var digest = algorithm.digest(new JavaString(str).getBytes());
		    var hex = '';
		    for (var i = 0; i < digest.length; i++)
		        hex += (digest[i] & 0xff).toPaddedString(2, 16);
		    return hex;
		},

		encodeSha1: function encodeSha1(str) {
			return encodeDigest(str, 'SHA-1');
		},

		encodeBase64: function encodeBase64(str) {
			return new JavaString(Base64.encode(
					new JavaString(str).getBytes('UTF-8')));
		},

		decodeBase64: function decodeBase64(str) {
			var bytes = Base64.decode(
					new JavaString(str).toCharArray());
			return new JavaString(bytes, "UTF-8");
		}
	}
};

// Make all of these functions global as well:
global.inject(Codec);
