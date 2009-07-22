Html = new function() {

	// Translate JavaScript names to HTML names
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
					out.write(' ');
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
			out.write('<');
			out.write(name);
			if (attributes != null)
				this.attributes(attributes, out);

			if (content != null) {
				out.write('>');
				out.write(content);
				out.write('</');
				out.write(name);
				out.write('>');
			} else {
				// use /> only for empty XHTML tags:
				out.write(this.XHTML ? ' />' : '>');
			}
		}.toRender(),

		script: function(attributes, out) {
			return this.element('script', attributes, null, out);
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
			return this.element('img', attributes, null, out);
		},

		textarea: function(attributes, out) {
			var value = attributes.value;
			delete attributes.value;
			// Form elements should have both id and name
			if (!attributes.id)
				attributes.id = attributes.name;
			return this.element('textarea', attributes, value ? encodeForm(value) : '', out);
		},

		select: function(attributes, out) {
			var options = attributes.options;
			delete attributes.options;
			// Form elements should have both id and name
			if (!attributes.id)
				attributes.id = attributes.name;
			out.write('<select');
			this.attributes(attributes, out);
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
					option.selected = this.XHTML ? 'selected' : null; // null causes an non-xhtml attribute without a value in this.attributes() (<... selected ...>)
				} else {
					delete option.selected;
				}
				option.name = option.name ? encodeForm(option.name) : '';
				this.element('option', option, option.name, out);
			}
			out.write('</select>');
		}.toRender(),

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
						attributes.checked = this.XHTML ? 'checked' : null; // null causes an non-xhtml attribute without a value in this.attributes() (<... checked ...>)
					break;

			}
			// Form elements should have both id and name
			if (!attributes.id)
				attributes.id = attributes.name;
			delete attributes.current;
			return this.element('input', attributes, null, out);
		}
	}
};

// Macros

function input_macro(param) {
	if (param.name) {
		var value = req.data[param.name];
		if (value) {
			value = value.toString();
			if (param.type == 'radio' || param.type == 'checkbox')
				param.current = value;
			else param.value = value;
		}
	}
	Html.input(param, res);
}

function textarea_macro(param) {
	Html.textarea(param, res);
}

function select_macro(param) {
	Html.select(param, res);
}

function script_macro(param) {
	// TODO: Find a way to find file locally and add lastModified header?
	// or use request and etag?
	if (param.src)
		param.src += '?' + Math.random();
	Html.script(param, res);
}

// dummy macro named __ in order to create comments in skins like this: <%__ comment %>
function ___macro(param) {
}
