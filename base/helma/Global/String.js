String.inject({
	endsWith: function(end) {
		return end != null && this.length >= end.length
				&& this.substring(this.length - end.length) == end;
	},

	startsWith: function(start) {
		return start != null && this.length >= start.length
				&& this.substring(0, start.length) == start;
	},

	indexOfPattern: function(pattern, start) {
		start = start || 0;
		var res = this.substring(start).search(pattern);
		return res == -1 ? -1 : res + start;
	},

	lastIndexOfPattern: function(pattern, start) {
		start = start === undefined ? this.length : start;
		var res = this.substring(0, start).reverse().indexOfPattern(pattern);
		return res == -1 ? -1 : this.length - res + 1;
	},

	reverse: function() {
		return new java.lang.StringBuffer(this).reverse().toString();
//		Pure JS: return this.split('').reverse().join('');
	},

	unaccent: function() {
		// Use encodeEntities instead of encode, so no <br /> are produced
		str = encodeEntities(this);
		// Convert to html entities, replace them by the normal unnaccented chars and convert back
		str = str.replace(/&(.)(?:uml);/gi, '$1e'); // replace ö with oe, ä with ae, etc.
		str = str.replace(/&(.)(?:acute|grave|cedil|circ|ring|tilde);/gi, '$1'); // replace é with e, à with a, etc.
		return Packages.org.htmlparser.util.Translate.decode(str);
	},

	urlize: function() {
		return this.unaccent().replace(/([^a-z0-9]+)/gi, '-').trim('-').toLowerCase();
	},

	truncate: function(length, suffix, preserveWords) {
		if (this.length < length)
			return this;
		suffix = suffix || '';
		length -= suffix.length;
		var part = this.substring(0, length);
		if (preserveWords && !/\s/.test(this[length])) {
			var i = part.lastIndexOfPattern(/\s/);
			if (i > 0)
				part = part.substring(0, i - 1);
		}
		return part.trim() + suffix;
	},

	stripTags: function() {
		return stripTags(this);
	},

	/**
	 * The name wordwrap is not quite right, since all it does is forcing too long
	 * words appart with a space. The wrapping is then done by the HTML engine...
	 */
	wordwrap: function(width) {
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

	/*
	 * Title Caps
	 * 
	 * Ported to JavaScript By John Resig - http://ejohn.org/ - 21 May 2008
	 * Original by John Gruber - http://daringfireball.net/ - 10 May 2008
	 * License: http://www.opensource.org/licenses/mit-license.php
	 */
	toTitleCase: function() {
		var small = '(s|a|an|and|as|at|but|by|en|for|if|in|of|on|or|the|to|v[.]?|via|vs[.]?)';
		var punct = '([!"#$%&\'()*+,./:;<=>?@[\\\\\\]^_`{|}~-]*)';

		function lower(word) {
			return word.toLowerCase();
		}

		function upper(word) {
			return word.substr(0,1).toUpperCase() + word.substr(1);
		}

		// “ = \u201c, ’ = \u2019
		var parts = [], split = /[:.;?!] |(?: |^)["\u201c]/g, index = 0;

		while (true) {
			var m = split.exec(this);
			parts.push(this.substring(index, m ? m.index : this.length)
				.replace(/\b([A-Za-z][a-z.'\u2019]*)\b/g, function(all) {
					return /[A-Za-z]\.[A-Za-z]/.test(all) ? all : upper(all);
				})
				.replace(new RegExp('\\b' + small + '\\b', 'ig'), lower)
				.replace(new RegExp('^' + punct + small + '\\b', 'ig'), function(all, punct, word) {
					return punct + upper(word);
				})
				.replace(new RegExp('\\b' + small + punct + '$', 'ig'), upper));
			index = split.lastIndex;
			if (m) parts.push(m[0]);
			else break;
		}

		return parts.join('').replace(/ V(s?)\. /ig, ' v$1. ')
			.replace(/(['\u2019])S\b/ig, '$1s')
			.replace(/\b(AT&T|Q&A)\b/ig, function(all) {
				return all.toUpperCase();
			});
	},

	statics: {
		replaceAll: Packages.org.mortbay.util.StringUtil.replace
	}
});
