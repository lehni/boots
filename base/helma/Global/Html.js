Html = new function() {

	// Translate JavaScript names to HTML names
	var properties = {
		'className': 'class', 'htmlFor': 'for', colSpan: 'colspan',
		rowSpan: 'rowspan', accessKey: 'accesskey', tabIndex: 'tabindex',
		maxLength: 'maxlength', readOnly: 'readonly',
	};

	return {
		XHTML: false,

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
					option.selected = Html.XHTML ? 'selected' : null; // null causes an non-xhtml attribute without a value in Html.attributes() (<... selected ...>)
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
					if (attributes.value == attributes.current)
						attributes.checked = Html.XHTML ? 'checked' : null; // null causes an non-xhtml attribute without a value in Html.attributes() (<... checked ...>)
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
		}
	}
};
