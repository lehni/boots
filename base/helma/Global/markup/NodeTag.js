// TODO: Find a better standard name, e.g. href?, and rename global renderLink
// to renderHref, so the link_macro can be finally used (for stylesheets).

NodeTag = MarkupTag.extend({
	_tags: 'node',
	_attributes: 'id',

	render: function(content, param, encoder) {
		var id = this.attributes.id;
		if (!id) {
			id = content;
			content = null;
		}
		var node = HopObject.get(id);
		if (node)
			return node.renderLink(content);
		else
			return (content || '') + encoder(' [missing: ' + id + ']'); 
	}
});
