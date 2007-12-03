function createdPages_macro(param) {
	this.checkDelimiter(param);
	var pages = this.createdPages.list();
	if (pages.length > 0) {
		var excludeNames = param.exclude ? param.exclude.split(',') : [];
		var exclude = {};
		for (var i in excludeNames) exclude[excludeNames[i]] = true;
		var first = true;
		for(var i in pages) {
			var page = pages[i];
			if (page != null && !exclude[page.name]) {
				if (first) first = false;
				else res.write(param.delimiter);
				page.renderLink();
			}
		}
	}
}
