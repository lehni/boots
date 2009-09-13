function lowercase_filter(input) {
	return input != null && input.toString().toLowerCase();
}

function uppercase_filter(input) {
	return input != null && input.toString().toUpperCase();
}

function capitalize_filter(input) {
	return input != null && input.toString().capitalize();
}

function camelize_filter(input, param, separator) {
	return input != null && input.toString().camelize(
			param.separator || separator
	);
}

function uncamelize_filter(input, param, separator) {
	return input != null && input.toString().uncamelize(
			param.separator || separator
	);
}

function hyphenate_filter(input, param, separator) {
	return input != null && input.toString().hyphenate(
			param.separator || separator
	);
}

function trim_filter(input) {
	return input != null && input.toString().trim();
}

function unaccent_filter(input) {
	return input != null && input.toString().unaccent();
}

function urlize_filter(input) {
	return input != null && input.toString().urlize();
}

function truncate_filter(input, param, limit, suffix) {
	return input != null && input.toString().truncate(
			Base.pick(param.limit, limit),
			param.suffix || suffix
	);
}

function wordwrap_filter(input, param, width) {
	return input != null && input.toString().wordwrap(
			Base.pick(param.width, width)
	);
}

function stripTags_filter(input) {
	return input != null && stripTags(input.toString());
}

function breaksToHtml_filter(input) {
	return input != null && input.replaceAll('\n', '<br />');
}

function replace_filter(input, param, search, replace) {
	return input != null && input.replaceAll(
			Base.pick(param.search, search),
			Base.pick(param.replace, replace)
	);
}

function substring_filter(input, param, from, to) {
	return input != null && input.substring(
			Base.pick(param.from, from),
			Base.pick(param.to, to)
	);
}

/**
 * input can be a Number or a Date object. For Dates, the locale parameter is
 * supported too.
 */
function format_filter(input, param, format, locale) {
	return input != null && input.format(
			param.format || format,
			param.locale || locale
	);
}

function markup_filter(input, param) {
	return Markup.render(input, param);
}

function versioned_filter(input, param) {
	var lastModified = Net.getLastModified(input);
	if (lastModified)
		input += '?' + lastModified;
	return input;
}