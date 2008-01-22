Topic.inject({
	initialize: function() {
		// A node cannot be created without a first post.
		var post = new Post();
		// mark the post as creating, as we'll be returning it from getEditForm...
		post.setCreating(true);
		// tell it that it's the first post in a node
		post.isFirst = true;
		// add it
		this.posts.add(post);
		// make it visible
		this.visible = true;
	},

	getFirstPost: function() {
		return this.posts.get(0);
	},

	getEditForm: function(param) {
		param.children = false;
		param.resources = false;
		param.posts = true;
		var form = this.base(param);
		form.removeTab('node');
		return form;
	},

	/**
	 * This is called from Post#onApply
	 */
	onUpdateFirstPost: function(post, changedItems) {
		if (changedItems.title)
			this.setTitle(post.title);
		if (changedItems.creationDate)
			this.creationDate = post.creationDate;
	},

	/**
	 * This is called from Post#onRemove, if there's only one post left.
	 * For Topics, this means remove the topic node as well.
	 */
	onRemoveLastPost: function() {
		this.removeObject();
	},

	/**
	 * This is called from Post#onCreate
	 */
	onAddPost: function(post) {
		// Update the modification date of the topic when a post is added
		this.modificationDate = post.modificationDate;
	},

	isEditableBy: function(user) {
		// delegate to the first post as this is just a container for it
		return this.getFirstPost().isEditableBy(user);
	},

	getTitle: function() {
		var post = this.getFirstPost();
		return post ? post.title : null;
	},

	setTitle: function(title) {
		// If the title of the first post was changed, update the unique name of the node
		this.name  = this.getEditParent().getUniqueChildName(this, title, 32);
	},

	getDisplayName: function() {
		return this.getTitle();
	},

	renderSimple: function(out) {
		var post = this.getFirstPost();
		return post ? post.renderSimple(out) : '';
	},

	renderUser: function(out) {
		var post = this.getFirstPost();
		return post ? post.renderUser(out) : '';
	},

	render: function(withLink, isFirst, out) {
		var first = this.getFirstPost();
		return first ? first.render(withLink, isFirst, out) : '';
	}
});