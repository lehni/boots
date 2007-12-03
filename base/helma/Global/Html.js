Html = new function() {

	var properties = {
		'className': 'class', 'htmlFor': 'for', colSpan: 'colspan',
		rowSpan: 'rowspan', accessKey: 'accesskey', tabIndex: 'tabindex',
		maxLength: 'maxlength', readOnly: 'readonly',
	};

	return {
		XHTML: true,

		attributes: function(attributes, out) {
			for (var name in attributes) {
				var value = attributes[name];
				name = properties[name] || name;
				// Only pre XHTML allows empty attributes
				if (value != null || !this.XHTML && value !== undefined) {
					out.write(" ");
					out.write(name);
					if (value != null) {
						out.write('="');
						out.write(value);
						out.write('"');
					}
				}
			}
		},

		element: function(name, attributes, content, out) {
			out.write("<");
			out.write(name);
			if (attributes != null)
				this.attributes(attributes, out);

			if (content != null) {
				out.write(">");
				out.write(content);
				out.write("</");
				out.write(name);
				out.write(">");
			} else {
				// use /> only for empty XHTML tags:
				out.write(this.XHTML ? " />" : ">");
			}
		}.toRender(),

		image: function(attributes, out) {
			if (attributes.title == null) {
				attributes.title = attributes.alt ? encode(attributes.alt) : "";
			} else {
				attributes.title = encode(attributes.title);
			}
			if (attributes.border == null)
				attributes.border = 0;
			if (attributes.alt == null)
				attributes.alt = attributes.title;
			return this.element("img", attributes, null, out);
		},

		textarea: function(attributes, out) {
			var value = attributes.value;
			delete attributes.value;
			// Form elements should have both id and name
			if (!attributes.id) attributes.id = attributes.name;
			return this.element('textarea', attributes, value ? encodeForm(value) : "", out);
		},

		select: function(attributes, out) {
			var options = attributes.options;
			delete attributes.options;
			// Form elements should have both id and name
			if (!attributes.id) attributes.id = attributes.name;
			out.write("<select");
			this.attributes(attributes, out);
			out.write(">");
			// TODO: still needed? avoid eval....
			// if (typeof options == "string")
			//		eval("options=" + options);

			for (var i = 0; i < options.length; i++) {
				var option = options[i];
				if (typeof option == "object") {
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
					option.selected = this.XHTML ? 'selected' : null; // null causes an non-xhtml attribute without a value in this.attributes() (<... selected ...>)
				} else {
					delete option.selected;
				}
				option.name = option.name ? encodeForm(option.name) : "";
				this.element('option', option, option.name, out);
			}
			out.write("</select>");
		}.toRender(),

		input: function(attributes, out) {
			switch(attributes.type) {
				case 'text':
				case 'password':
					attributes.value = attributes.value ? encodeForm(attributes.value) : "";
					break;
				case 'radio':
				case 'checkbox':
					if (!attributes.value) attributes.value = 1;
					if (attributes.value == attributes.current)
						attributes.checked = this.XHTML ? 'checked' : null; // null causes an non-xhtml attribute without a value in this.attributes() (<... checked ...>)
					break;

			}
			// Form elements should have both id and name
			if (!attributes.id) attributes.id = attributes.name;
			delete attributes.current;
			return this.element('input', attributes, null, out);
		},

		// TODO: replace with global stripTags that I didn't know of back then?
		stripTags: function(str, maxLength) {
			// this is so much faster than return str.replace(/<.*?>/gi, '');
			if (!str)
				return str;
			if (!maxLength)
				maxLength = str.length;
			res.push();
			var start = 0, length = 0;
			while (true) {
				var end = str.indexOf('<', start);
				if (end == -1)
					break;
				length += end - start;
				if (length >= maxLength)
					break;
				res.write(str.substring(start, end));
				start = str.indexOf('>', end);
				if (start == -1)
					break;
				start++;
			}
			// now append the rest, unstripped
			if (start < str.length)
				res.write(str.substring(start));
			return res.pop();
		}
	}
};

// Macros

function input_macro(params) {
	if (params.name) {
		var value = req.data[params.name];
		if (value) {
			value = value.toString();
			if (params.type == 'radio' || params.type == 'checkbox')
				params.current = value;
			else params.value = value;
		}
	}
	Html.input(params, res);
}

function textarea_macro(params) {
	Html.textarea(params, res);
}

function select_macro(params) {
	Html.select(params, res);
}

// dummy macro named __ in order to create comments in skins like this: <%__ comment %>
function ___macro(params) {
}
