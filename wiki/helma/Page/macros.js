function pages_macro(param) {
	this.checkDelimiter(param);
	var pages = this.pages.list();
	if (param.title && pages.length > 0 || param.none) {
		res.write(param.title);
		res.write(param.delimiter);
	}
	if (pages.length > 0) {
		var excludeNames = param.exclude ? param.exclude.split(',') : [];
		var exclude = {};
		for (var i in excludeNames) exclude[excludeNames[i]] = true;

		var recentlyChanged = root.recentlyChanged.list();
		var dates = param.showDates ? new java.lang.StringBuffer() : null;
		var dateFormat;
		if (dates) {
			if (param.dateFormat) dateFormat = new java.text.SimpleDateFormat(param.dateFormat);
			else dateFormat = app.data.dateFormat;
			res.writeln('<table>');
			res.writeln('<tr>');
			res.writeln('<td>');
		}
		var first = true;
		for(var i = 0; i < pages.length; i++) {
			var page = pages[i];
			if (page != null && !exclude[page.name]) {
				if (first) first = false;
				else {
					res.write(param.delimiter);
					if (dates) dates.append(param.delimiter);
				}
				page.renderLink();
				if (dates) dates.append(dateFormat.format(page.creationDate));
			}
		}
		if (dates) {
			res.writeln('</td>');
			res.writeln('<td>');
			res.write(dates.toString());
			res.writeln('</td>');
			res.writeln('</tr>');
			res.writeln('</table>');
		}
	} else {
		res.write(param.none);
	}
}

function thumbnails_macro(param) {
	this.checkDelimiter(param);
	/*
	var attachments = this.attachments.list();
	// remove non-image attachments:
	for (var i = attachments.length - 1; i >= 0; i--) {
		if (attachments[i].getContentType().indexOf("image") == -1)
			attachments.splice(i, 1);
	}
	*/
/*
	res.write('<table class="thumbnails">\n');
	var counter = 0;
	var numColumns = param.numColumns;
	param.thumbnail = true;
	for (var i = 0; i < attachments.length; i++) {
		if (counter == 0) res.write('<tr>\n');
		res.write('<td valign="top">\n');
		attachments[i].render(param);
		res.write('<br>');
		res.write(attachments[i].name);
		res.write('</td>\n');
		counter++;
		if (counter >= numColumns) {
			res.write('</tr>\n');
			counter = 0;
		}
	}
	res.write('</table>\n');
	*/
	/* only attachments:
	var attachments = this.attachments.list();
	param.thumbnail = true;
	for (var i = 0; i < attachments.length; i++) {
		var att = attachments[i];
		var name = att.name;
		res.write('<a href="');
		if (att.getContentType() == "application/pdf") {
			res.write(this.href(name));
			res.write('" target="_blank');
		} else {
			res.write(att.href());
		}
		res.write('">');
		res.write('<div class="thumbnail"><div>');
		att.render(param);
		res.write('</div>');
		res.write(name);
		res.write('</div></a>');
	}
	*/
	/* subnode relation code:s
	if (param.prototypes || param.exclude) {
		if (this.cache.relation == null || 
			this.cache.relation.prototypes != param.prototypes ||
			this.cache.relation.exclude != param.exclude) {

			res.push();
			res.write("WHERE parent_id = ");
			res.write(this._id);
			res.write(" AND position >= 0 AND ");
			
			if (param.prototypes) {
				var prototypes = param.prototypes.split(',');
				res.write('(');
				for (var i in prototypes) {
					if (i > 0) res.write(' OR ');
					res.write("PROTOTYPE = '");
					res.write(prototypes[i]);
					res.write("'");
				}
				res.write(')');
			}
			if (param.exclude) {
				var exclude = param.exclude.split(',');
				res.write(' AND  name NOT IN (');
				for (var i in exclude) {
					if (i > 0) res.write(',');
					res.write("'");
					res.write(exclude[i].replaceAll("'", "\\'"));
					res.write("'");
				}
				res.write(')');
			}
			res.write(' ORDER BY position');
			this.cache.relation = {
				sql: res.pop(),
				prototypes: param.prototypes,
				exclude: param.exclude
			}
		}
		this.attachments.subnodeRelation = this.cache.relation.sql;
	} else {
		this.attachments.subnodeRelation = null;
	}
	*/
	try {
		if (this.getProperty('hideNodes') != 'true') {
			param.asHtml = true;
			var nodes = this.attachments.list();
			var open = false;
			for (var i = 0; i < nodes.length; i++) {
				var node = nodes[i];
				var name = node.name;
				if (i % 2 == 0) {
					res.write('<div class="row">');
					open = true;
				}
				res.write('<div class="thumbnail">');
				res.write('<a href="');
				if (node.requiresNewWindow && node.requiresNewWindow()) {
					res.write(this.href(name));
					res.write('" target="_blank');
				} else {
					res.write(node.href());
					if (req.data.back) {
						res.write('?back=');
						res.write(req.data.back);
					}
				}
				res.write('"');
				if (param.target) {
					if (param.target) {
						res.write(' target="');
						res.write(param.target);
						res.write('"');
					}
				}
				res.write('>');
				node.renderThumbnail(param);
				res.write('</a></div>');
				if (i % 2 != 0) {
					res.write('</div>');
					open = false;
				}
			}
			if (open) {
				res.write('</div>');
			}
		}
	} catch (e) {
		User.logError("Thumbnail Error", e);
	}
}

function setThumbnails_macro(param) {
	res.push();
	this.thumbnails_macro(param);
	res.data.thumbnails = res.pop();
}

function attachment_macro(param) {
	var att = this.attachments.get(param.name);
	if (att != null) att.render(param);
}

function attachments_macro(param) {
	if (req.action == "main") {
		var attachments = this.attachments.list();
		for (var i = 0; i < attachments.length; i++) {
			var att = attachments[i];
			res.write(param.eachPrefix);
			att.render(param);
			if (param.showText)
				res.write(att.text);
			res.write(param.eachSuffix);
		}
	}
}




