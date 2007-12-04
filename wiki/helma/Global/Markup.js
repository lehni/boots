// TODO: clean up

Markup.parseWiki = new function() {
	var Pattern = java.util.regex.Pattern;
	var flags =  Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL;
/*
	patterns.externalLink = Pattern.compile("(?:\\*)(http[s]?\\://)([^\\:\\*]*)(?:[:]?)(.*?)(?:\\*)", flags);
	patterns.internalLink = Pattern.compile("(?:\\*)([^\\:\\*]*)(?:[:]?)(.*?)(?:\\*)", flags);
*/
	var patterns = {
		LINK: Pattern.compile("(?:\\*)((?:http[s]?\\://)|(?:ftp\\://)|(?:mailto\\:)|(?:))([^\\:\\*]*)(?:[:]?)(.*?)(?:\\*)", flags),
		TABLE: Pattern.compile("\\|\\|(.*?)\\|\\|", flags),
		AFTER: [
			[ // ruler
				Pattern.compile("---", flags),
				getProperty("ruler") || '<hr>'
			],
			[ // underline
				Pattern.compile("__(.*?)__", flags),
				"<u>$1</u>"
			],
			[ // bold
				Pattern.compile("==(.*?)==", flags),
				"<b>$1</b>"
			],
			[ // strike
				Pattern.compile("--(.*?)--", flags),
				"<strike>$1</strike>"
			],
			[ // escape "_"
				Pattern.compile("\\\\_", flags),
				"_"
			],
			[ // escape "=", for javascript == comparator. TODO: detect JS code instead?
				Pattern.compile("\\\\=", flags),
				"="
			],
			[ // escape "-", so <!-- --> is possible by writing <!\-\- \-\->. TODO: it would be better to filter this case out above, but how?...
				Pattern.compile("\\\\-", flags),
				"-"
			],
			[ // inline attachments
				Pattern.compile("[\\{](?:\\s*)([\\w\\.]+)(?:\\s*)(\\d*)(?:\\s*)(\\d*)(?:\\s*)[\\}]", flags),
				'<% this.attachment name="$1" width="$2" height="$3" %>'
			],
		]
	};

	return function(text, renderLinkCallback) {
		if (!text)
			return text;

		// Parse links
		var matcher = this.WIKI_PATTERNS.LINK.matcher(text);
		var buffer = new java.lang.StringBuffer(text.length);
		while (matcher.find()) {
			var protocol = matcher.group(1);
			var name = matcher.group(2).replaceAll("\\*", "*");
			var title = matcher.group(3);
			matcher.appendReplacement(buffer, renderLinkCallback(protocol, name, title));
		}
		matcher.appendTail(buffer);

		// Now parse tables
		var matcher = this.WIKI_PATTERNS.TABLE.matcher(buffer);
		var buffer = new java.lang.StringBuffer(buffer.length());
		while (matcher.find()) {
			var table = matcher.group(1);
			var lines = table.split('\n');
			res.push();
			res.write('<table>');
			for (var i = 0, j = lines.length; i < j; ++i) {
				res.write('<tr>');
				var line = lines[i].trim();
				while (!line.endsWith('|') && ++i < lines.length) {
					line += '<br />' + lines[i].trim();
				}
				if (line) {
					line = line.split('|');
					for (var k = 0, l = line.length; k < l; ++k) {
						res.write('<td>');
						res.write(line[k]); // the replace is there for allowing line breaks within table cells.
						res.write('</td>');
					}
				} else {
					res.write('<td></td>');
				}
				res.write('</tr>');
			}
			res.write('</table>');
			matcher.appendReplacement(buffer, res.pop().replaceAll('\\', '\\\\').replaceAll('$', '\\$'));
		}
		matcher.appendTail(buffer);

		text = buffer; // matcher takes stringbuffers as well as strings!

		// Now everything else
		for (var i = 0, l = this.WIKI_PATTERNS.AFTER.length; i < l; ++i) {
			var pattern = this.WIKI_PATTERNS.AFTER[i];
			text = pattern[0].matcher(text).replaceAll(pattern[1]);
		}

		return text;
	}
}