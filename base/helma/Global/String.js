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
		return this.unaccent().replace(/([^a-z0-9\.]+)/gi, "-").trim('-');
	},

	cutAt: function(length) {
		if (this.length > length)
			return this.substring(0, length - 3).trim() + "...";
		return this;
	},

	breakAt: function(max) {
		if (this.length > max) {
			// see if we can break at special chars. if not, force a break: 
			var st = new java.util.StringTokenizer(this, " \t\n\r\f!#$%&()*+,-./:;<=>?@[\]^_`{|}~", true);
			res.push();
			var length = 0;
			while (st.hasMoreTokens()) {
				var token = st.nextToken();
				if (length + token.length > max) {
					if (!length) { // we haven't had a word yet, so force break the current token
						res.write(token.substring(0, max));
						// the second part will be written bellow
						token = token.substring(max);
					}
					res.write(" ");
					length = 0;
				}
				res.write(token);
				length += token.length;
			}
			return res.pop();
		}
		return this;
	},

	convertBreaks: function() {
		// convert any possible kind of line breaks to \n
		// TODO: exchange with platform linebreak here...
		// this can be used when retrieveing values from forms
		return this.replace(/\n\r|\r\n|\r/g, '\n');
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
