Topic.inject({
	POST_FIRST_STICKY: true,

	initialize: function() {
		// A topic cannot be created without a first post.
		var post = new Post();
		// tell it that it's the first post in a node
		post.isFirst = true;
		// Add it
		this.posts.add(post);
		// make it visible
		this.visible = true;
	},

	getFirstPost: function() {
		return this.posts.get(0);
	},

	getEditForm: function(param) {
		// Redirect to the first post if we're creating a new post and not removing
		// it. In those cases we need the node form for meta data.
		if (!param.removing && this.isCreating()) { 
			return this.getFirstPost().getEditForm(param); 
		} else {
			param.children = false;
			param.resources = false;
			// Call this.base for param.posts
			param.posts = true;
			var form = this.base(param);
			form.removeTab('node');
			return form;
		}
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
		this.remove();
	},

	isEditableBy: function(user, item) {
		// Allow anonymous users to edit posts if POST_ANONYMOUS is set to true
		// for this node.
		return item == 'posts' && (user && user.hasRole(UserRole.POST)
				|| !user && this.POST_ANONYMOUS)
				// Otherwise delegate to the first post as this is just a container for it
				|| this.getFirstPost().isEditableBy(user, item);
	},

	getTitle: function() {
		var post = this.getFirstPost();
		return post ? post.title : null;
	},

	setTitle: function(title) {
		// If the title of the first post was changed, update the unique name of the node
		this.name  = this.getParentNode().getUniqueChildName(this,
				title, (app.properties.maxNameLength || 64).toInt());
	},

	getDisplayName: function() {
		return this.getTitle();
	},

	renderUser: function(out) {
		var post = this.getFirstPost();
		return post ? post.renderUser(out) : '';
	},

	render: function(param, out) {
		var first = this.getFirstPost();
		return first ? first.render(param, out) : '';
	}
});