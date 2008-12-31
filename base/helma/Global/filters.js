function lowercase_filter(input) {
	return input && input.toString().toLowerCase();
}

function uppercase_filter(input) {
	return input && input.toString().toUpperCase();
}

function capitalize_filter(input) {
	return input && input.toString().capitalize();
}

function camelize_filter(input, param, separator) {
	return input && input.toString().camelize(param.separator || separator);
}

function uncamelize_filter(input, param, separator) {
	return input && input.toString().uncamelize(param.separator || separator);
}

function hyphenate_filter(input, param, separator) {
	return input && input.toString().hyphenate(param.separator || separator);
}

function trim_filter(input) {
	return input && input.toString().trim();
}

function unaccent_filter(input) {
	return input && input.toString().unaccent();
}

function urlize_filter(input) {
	return input && input.toString().urlize();
}

function truncate_filter(input, param, limit, suffix) {
	return input && input.toString().truncate(
		param.limit != null ? param.limit : limit,
		param.suffix || suffix
	);
}

function wordwrap_filter(input, param, width) {
	return input && input.toString().wordwrap(
		param.width != null ? param.width : width
	);
}

function stripTags_filter(input) {
	return input && stripTags(input.toString());
}

function breaksToHtml_filter(input) {
	return input && input.replaceAll('\n', '<br />');
}

function replace_filter(input, param, search, replace) {
	return input && input.replaceAll(
		param.search != null ? param.search : search,
		param.replace != null ? param.replace : replace
	);
}

function substring_filter(input, param, from, to) {
	return input && input.substring(
		param.from != null ? param.from : from,
		param.to != null ? param.to : to
	);
}

/**
 * input can be a number or a date object. For date, the locale parameter is
 * supported too.
 */
function format_filter(input, param, format, locale) {
	locale = param.locale || locale;
	if (typeof locale == 'string') {
		try {
			locale = java.util.Locale[locale.toUpperCase()];
		} catch (e) {
			app.log('Unsupported Locale: ' + locale);
		}
	}
	return input != null && input.format(param.format || format, locale);
}

function markup_filter(input, param) {
	return Markup.render(input, param);
}