Html = new function() {

	// Translate JavaScript names to HTML names
	var properties = {
		'className': 'class', 'htmlFor': 'for', colSpan: 'colspan',
		rowSpan: 'rowspan', accessKey: 'accesskey', tabIndex: 'tabindex',
		maxLength: 'maxlength', readOnly: 'readonly',
	};

	// Block tags are tags that require to be rendered outside of paragraphs.
	var blockTags = 'address,dir,div,table,blockquote,center,dl,fieldset,form,h1,h2,h3,h4,h5,h6,hr,isindex,ol,p,pre,ul'
		.split(',').each(function(tag) {
			this[tag] = true;
		}, {});

	// Empty tags are tags that do not have a closing tag, so no need to search for it.
	var emptyTags = 'area,base,basefont,br,col,frame,hr,img,input,isindex,link,meta,param'
		.split(',').each(function(tag) {
			this[tag] = true;
		}, {});

	return {
		/* Global switch to control XHTML format */

		XHTML: false,
		
		/* Tag rendering functions */

		/**
		 * Renders attributes for an Html tag. The first param is prepended by
		 * a space, so the tag rendering code does not need to take care of that.
		 */
		attributes: function(attributes, out) {
			var asString = !out;
			if (asString) (out = res).push();
			for (var name in attributes) {
				var value = attributes[name];
				name = properties[name] || name;
				// Only pre XHTML allows empty attributes
				if (value != null || !Html.XHTML && value !== undefined) {
					out.write(' ');
					out.write(name);
					if (value != null) {
						out.write('="');
						out.write(encode(value));
						out.write('"');
					}
				}
			}
			if (asString) return out.pop();
		},

		element: function(name, attributes, content, out) {
			var asString = !out;
			if (asString) (out = res).push();
			out.write('<');
			out.write(name);
			if (attributes != null)
				Html.attributes(attributes, out);

			if (content != null) {
				out.write('>');
				out.write(content);
				out.write('</');
				out.write(name);
				out.write('>');
			} else {
				// use /> only for empty XHTML tags:
				out.write(Html.XHTML ? ' />' : '>');
			}
			if (asString) return out.pop();
		},

		script: function(attributes, out) {
			return Html.element('script', attributes, null, out);
		},

		link: function(attributes, out) {
			return Html.element('link', attributes, null, out);
		},

		image: function(attributes, out) {
			if (attributes.title == null) {
				attributes.title = attributes.alt || '';
			} else {
				attributes.title = attributes.title;
			}
			if (attributes.border == null)
				attributes.border = 0;
			if (attributes.alt == null)
				attributes.alt = attributes.title;
			return Html.element('img', attributes, null, out);
		},

		textarea: function(attributes, out) {
			var value = attributes.value;
			delete attributes.value;
			// Form elements should have both id and name
			if (!attributes.id)
				attributes.id = attributes.name;
			return Html.element('textarea', attributes, value ? encodeForm(value) : '', out);
		},

		select: function(attributes, out) {
			var asString = !out;
			if (asString) (out = res).push();
			var options = attributes.options;
			delete attributes.options;
			// Form elements should have both id and name
			if (!attributes.id)
				attributes.id = attributes.name;
			out.write('<select');
			Html.attributes(attributes, out);
			out.write('>');
			for (var i = 0; i < options.length; i++) {
				var option = options[i];
				if (typeof option == 'object') {
					if (option.name == null) {
						option.name = option.value;
					} else if (option.value == null) {
						option.value = option.name;
					}
				} else {
					option = {
						name: option, 
						value: option
					};
				}
				if (option.selected || option.value == attributes.current) {
					// Setting selected to null causes an non-xhtml attribute
					// without a value in Html.attributes() (<... selected ...>)
					option.selected = Html.XHTML ? 'selected' : null;
				} else {
					delete option.selected;
				}
				option.name = option.name ? encodeForm(option.name) : '';
				Html.element('option', option, option.name, out);
			}
			out.write('</select>');
			if (asString) return out.pop();
		},

		input: function(attributes, out) {
			switch(attributes.type) {
				case 'text':
				case 'password':
					attributes.value = attributes.value ? encodeForm(attributes.value) : '';
					break;
				case 'radio':
				case 'checkbox':
					if (!attributes.value) attributes.value = 1;
					// Setting checked to null causes an non-xhtml attribute
					// without a value in Html.attributes() (<... checked ...>)
					if (attributes.value == attributes.current)
						attributes.checked = Html.XHTML ? 'checked' : null;
					break;

			}
			// Form elements should have both id and name
			if (!attributes.id)
				attributes.id = attributes.name;
			delete attributes.current;
			return Html.element('input', attributes, null, out);
		},

		lineBreak: function(out) {
			var br = Html.XHTML ? '<br />' : '<br>';
			if (out) out.write(br);
			else return br;
		},

		/* Html Formating functions */

		/**
		 * Performs something similar to Helma's own formatParagraphs, but handles
		 * 'suffixes' (bits of text after tags on the same line) differently, by
		 * not wrapping them in paragraphs. This seems more logical.
		 * This is highly optimised but roughly 8 times slower than the Java version.
		 * TODO: Fix then internal formatParagraphs to do the same and fork Helma.
		 */
		formatParagraphs: function(input) {
//			var t = Date.now();
			// Determine used lineBreak sequence and use it to break input into lines.
			// This is much faster than using the regexp directly in split, which itself
			// is still faster than finding lines using indexOf. All in all this alone
			// leads to a speed increase of * 2.
			var lineBreak = (input.match(/(\r\n|\n|\r)/) || [, '\n'])[1];
			var lines = input.split(lineBreak);
			var isParagraph = false, wasParagraph = false, isSuffix = false;
			var out = [];
			var breakTag = Html.lineBreak();
			for (var i = 0, l = lines.length; i < l; i++) {
				var line = lines[i];
/*				if (report) {
					User.log('#', i, line);
					var start = out.length;
				}
*/				if (!line || /^\s*$/.test(line)) {
					// what if line |= '' but only contains \s*?
					if (isParagraph) {
						out.push(lineBreak, '</p>')
						isParagraph = false;
					} else {
						out.push(breakTag);
					}
				} else {
					var match;
					if (match = line.match(/^<(\w*)/)) {
						var tag = match[1], isBlockTag = blockTags[tag];
						if (isParagraph && isBlockTag) {
							out.push(lineBreak, '</p>');
							isParagraph = false;
							wasParagraph = false;
						} else if (!isParagraph && !isBlockTag && !isSuffix) {
//							if (report) User.log('Starting', tag);
							out.push(lineBreak, '<p>')
							isParagraph = true;
						}
						if (isBlockTag && !emptyTags[tag]) {
							// This line might be the rest of a previously processed
							// line (see bellow). If it is a block tag, turn suffix off.
							isSuffix = false;
							// Find the end of this outside tag. We need to count the
							// nesting of opening and closing tags in order to make sure
							// the whole block is detected.
							var open = '<' + tag;
							var close = '</' + tag + '>';
							// Start with nesting 1 and searchIndex after the tag
							// so the currently opening tag is already counted.
							var nesting = 1, searchIndex = open.length; 
							for (; i < l; i++) {
								line = lines[i];
//								if (report) User.log('Adding', line);
								if (i > 0)
									out.push(lineBreak);
								out.push(line);
								var closeIndex = line.indexOf(close, searchIndex);
								var openIndex = line.indexOf(open, searchIndex);
								searchIndex = 0;
								/* Simple version without nesting counting
								if (closeIndex != -1) {
									if (closeIndex < line.length - close.length)
										out.push(lineBreak);
									break;
								}
								*/
								if (closeIndex != -1) {
									if (openIndex != -1) {
										if (closeIndex < openIndex) {
											// We're closing before opening again, reduce
											// nesting and see what is to be done after.
											nesting--;
										}
										// Else we're opening a new one and closing it
										// again, so nesting stays the same.
									} else {
										nesting--;
									}
									if (nesting == 0) {
										isParagraph = false;
										var index = closeIndex + close.length;
										if (index < line.length) {
											// If there is more right after, put it back
											// into lines and reduce i by 1, so this line
											// will be iterated and processed again.
//											if (report) User.log('Suffix', line.substring(index));
											lines[i--] = line.substring(index);
											// Replace the full line with what has been
											// processed already.
											out[out.length - 1] = line.substring(0, index);
											// Mark this as a so called suffix, which is
											// a snippet of text that followed a block tag
											// on the same line. We don't want these to
											// be rendered in a new paragraph. Instead
											// it shoudl just follow the block tag and
											// be terminated with a br tag. iSuffix handles
											// that.
											isSuffix = true;
										}
										break;
									}
								} else if (openIndex != -1) {
									nesting++;
								}
							}
							continue;
						}
					} else {
						if (!isParagraph && !isSuffix) {
							out.push(lineBreak, '<p>')
							isParagraph = true;
						}
					}
					// wasParagraph is used to know that we are on lines 2nd and beyond
					// within a paragraph, so we can add break tags.
					if (wasParagraph)
						out.push(breakTag);
					if (i > 0)
						out.push(lineBreak);
					out.push(line);
					// Suffixes are outside paragraphs and therefore need a break after.
					if (isSuffix) {
						out.push(breakTag);
						isSuffix = false;
					}
				}
				wasParagraph = isParagraph;
//				if (report) User.log(' ->', out.slice(start, out.length).join(''));
			}
			var ret = out.join('');
//			User.log('Time', Date.now() - t);
//			if (report) User.log(ret);
			return ret;
		}
	},

	formatLists: function(input) {
		// Converts dashed lists to real one with the class "list" applied.
		if (!input)
			return input;
		// Lists
		// -–—• = \x2d\u2013\u2014\u2022
		var hasLists = false;
		var str = input.replace(/^(\n*)(?:\s*)[\x2d\u2013\u2014\u2022](?:\s*)(.*)$/gm, function(all, pre, line) {
			hasLists = true;
			return pre + '<li>' + line.trim() + '</li>';
		});
		if (hasLists) {
			str = str.replace(/(?:<li>(?:.*?)<\/li>\s*)+/gm, function(all) {
				var end = all.match(/<\/li>(.*)$/m)[1];
				return '<ul class="list">' + all.substring(0, all.length - end.length) + '</ul>\n' + end;
			});
		}
		return str;
	}
};
