function renderList(edit, delimiter) {
	var nodes = this.list();
	if (delimiter == null) delimiter = '<br />';
	for (var i = 0; i < nodes.length; i++) {
		var node = nodes[i];
		if (edit) {
			res.write('<a href="' + this.href('list') + '?pos=' + i + '&newPos=' + (i > 0 ? i - 1 : nodes.length - 1) + '">&uarr;</a>');
			res.write('&nbsp;');
			res.write('<a href="' + this.href('list') + '?pos=' + i + '&newPos=' + (i < nodes.length -1 ? i + 1 : 0) + '">&darr;</a>');
		}
		res.write('&nbsp;');
		node.renderLink();
		if (i < nodes.length - 1) res.write(delimiter);
	}
}

function renderListAsString(edit, delimiter) {
	res.push();
	this.renderList(edit, delimiter);
	return res.pop();
}

function rearrangeList(pos, newPos) {
	if (Privileges.check(Privileges.EDIT)) {
		var list = this.list();
		list.splice(newPos, 0, list.splice(pos, 1)[0]);
		for (var i = 0; i < list.length; i++)
			list[i].position = i;
		res.commit();
	}
}

