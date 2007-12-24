String.inject({
	endsWith: function(end) {
		return this.length >= end.length && this.substring(this.length - end.length) == end;
	},

	startsWith: function(start) {
		return this.length >= start.length && this.substring(0, start.length) == start;
	},

	unaccent: function() {
		str = encode(this);
		// convert to html entities, replace them by the normal unnaccented chars and convert back
		str = str.replace(/&(.)(?:uml);/gi, '$1e'); // replace ö with oe, ä with ae, etc.
		str = str.replace(/&(.)(?:acute|grave|cedil|circ|ring|tilde|uml);/gi, '$1'); // replace é with e, à with a, etc.
		return Packages.org.htmlparser.util.Translate.decode(str);
	},

	urlize: function() {
		return this.unaccent().replace(/([^a-z0-9\.]+)/gi, '-').trim('-');
	},

	truncate: function(length, suffix) {
		if (this.length > length) {
			if (suffix == null)
				suffix = '';
			return this.substring(0, length - suffix.length).trim() + suffix;
		}
		return this;
	},

	stripTags: function() {
		return stripTags(this);
	},

	wordwrap: function(width) {
		// TODO: wordwrap is not quite right, since all it does is forcing too long
		// words appart with a space. The wrapping is then done by the HTML engine...
		if (this.length > width) {
			// See if we can break at special chars. If not, force a break: 
			var st = new java.util.StringTokenizer(this, ' \t\n\r\f!#$%&()*+,-./:;<=>?@[\]^_`{|}~', true);
			res.push();
			var length = 0;
			while (st.hasMoreTokens()) {
				var token = st.nextToken();
				if (length + token.length > width) {
					if (!length) { // we haven't had a word yet, so force break the current token
						res.write(token.substring(0, width));
						// the second part will be written bellow
						token = token.substring(width);
					}
					res.write(' ');
					length = 0;
				}
				res.write(token);
				length += token.length;
			}
			return res.pop();
		}
		return this;
	},

	replaceAll: function(search, replace) {
		return String.replaceAll(this, search, replace);
	},

	shuffle: function() {
		var buf = new java.lang.StringBuffer(this);
		for (var i = 0; i < this.length; i++) {
			var dest = Math.floor(Math.random() * this.length);
			var tmp = buf.charAt(i);
			buf.setCharAt(i, buf.charAt(dest));
			buf.setCharAt(dest, tmp);
		}
		return buf.toString();
	},

	statics: {
		replaceAll: Packages.org.mortbay.util.StringUtil.replace
	}
});
