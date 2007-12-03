Markup = {
	encodeText: function(text, resources, param) {
		if (text) {
			if (!param)
				param = {};
			param.inline = true; // for resources
			text = encode(text);

			// format tags. they got escaped above, so replace it back:
			// indices:
			//   1: tag
			//   2: tag attribute
			//   3: tag content
			//   4: swallowed trailing break, if any
			//   5: all the chars allowed before an url
			//   6: url
			//   7: all the chars allowed after an url

			var Pattern = java.util.regex.Pattern;
			// \\1 in the closing tag references the tag name in the opening tag!
			var parser = Pattern.compile(
					"&lt;\\s*(url|node|mail|code|resource|img|quote|list|b)\\s*(.*?)\\s*(?:/&gt;|&gt;(.*?)&lt;\/\\s*\\1\\s*&gt;(<br />|))|" + // tags
					"(^|\\s|>|\\()((?:http|https)\\://\\S*?)($|\\s|<|\\))", // urls
					Pattern.MULTILINE | Pattern.DOTALL | Pattern.CASE_INSENSITIVE);
				
			var matcher = parser.matcher(text);
			res.push();

			var lastIndex = 0;
			var resourceLookup = {};
			if (resources && resources.length) {
				for (var i = 0; i < resources.length; i++) {
					var resource = resources[i]
					resourceLookup[resource.name] = { resource: resource, index: i };
				}
			}

			while (matcher.find()) {
				var index = matcher.start();
				if (index > lastIndex)
					res.write(text.substring(lastIndex, index));
				var ok = false;
				var tag = matcher.group(1);
				if (tag) {
					var attribute = matcher.group(2);
					var content = matcher.group(3);
					switch(tag) {
						case 'code':
							res.write("<pre><code>");
							res.write(content.replaceAll('<br />', ''));
							res.write("</code></pre>");
							ok = true;
							break;
						case 'resource':
							var info = resourceLookup[content];
							if (info) {
								info.resource.renderIcon({ small: true }, res);
								resources[info.index] = null;
								res.write(matcher.group(4)); // write the swallowed break, if any
								ok = true;
							}
							break;
						case 'img':
							if (!content.startsWith("http")) {
								var info = resourceLookup[content];
								if (info && info.resource instanceof Picture) {
									info.resource.renderThumbnail_macro(param);
									resources[info.index] = null;
									ok = true;
								}
							} else {
								res.write('<img src="');
								res.write(content);
								res.write('"/>');
								ok = true;
							}
							if (ok) {
								res.write(matcher.group(4)); // write the swallowed break, if any
							}
							break;
						case 'url':
							var url, title;
							if (attribute) {
								url = attribute;
								title = content;
							} else {
								url = content;
								title = content;
							}
							if (!title) title = url;
							res.write('<a href="');
							var isLocal = url.startsWith('/');
							// allways write domain part of url for simple rendering (e.g. in rss feeds)
							if (param.simple && isLocal)
								res.write(getProperty("serverUrl"));
							res.write(url);
							// links to local pages do not need to open blank
							if (!isLocal)
								res.write('" target="_blank');
							res.write('">');
							res.write(title);
							res.write('</a>');
							res.write(matcher.group(4)); // write the swallowed break, if any
							ok = true;
							break;
						case 'mail':
						break;
						case 'node':
							var node = HopObject.get(attribute);
							if (node)
								node.renderLink(content, res);
							ok = true;
							break;
						case 'quote':
							var title;
							if (attribute) {
								title = attribute + " wrote:";
							} else {
								title = "Quote:";
							}
							res.write('<div class="quote-title">');
							res.write(title);
							res.write('</div><div class="quote">');
							res.write(content);
							res.write('</div>');
							ok = true;
							break;
						case 'list':
							res.write('<ul>');
							res.write(content);
							res.write('</ul>');
							ok = true;
							break;
						case 'b':
							res.write('<b>');
							res.write(content);
							res.write('</b>');
							ok = true;
							break;
					}
				} else { // url
					res.write(matcher.group(5));
					res.write('<a href="');
					res.write(matcher.group(6));
					res.write('" target="_blank">');
					res.write(matcher.group(6));
					res.write('</a>');
					res.write(matcher.group(7));
					ok = true;
				}
				if (!ok) // write the unmodified string if nothing fitted
					res.write(matcher.group(0));
				lastIndex = matcher.end();
			}
			// Write the rest:
			if (lastIndex < text.length)
				res.write(text.substring(lastIndex, text.length));
			text = res.pop();
			
			// remove the fields set to null above:
			if (resources) {
				for (var i = resources.length - 1; i >= 0; i--) {
					if (!resources[i])
						resources.splice(i, 1);
				}
			}
		}
		return text;
	},
	
	WIKI_PATTERNS: (function() {
		var Pattern = java.util.regex.Pattern;
		var flags =  Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL;
/*
		patterns.externalLink = Pattern.compile("(?:\\*)(http[s]?\\://)([^\\:\\*]*)(?:[:]?)(.*?)(?:\\*)", flags);
		patterns.internalLink = Pattern.compile("(?:\\*)([^\\:\\*]*)(?:[:]?)(.*?)(?:\\*)", flags);
*/
		return {
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
	})(),

	encodeWiki: function(text, renderLinkCallback) {
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
};