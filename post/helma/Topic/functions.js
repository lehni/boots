Topic.inject({
	initialize: function() {
		// A node cannot be created without a first post.
		// Use EditForm.createObject instead of new Post, to make sure that 
		// all editing related fields are properly set up on it.
		// TODO: Could there not be a way that any HopObject that defines initialize
		// is doing this automatically behind the scene, through some bootstrap
		// magic?
		var post = EditForm.createObject(Post);
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
		return item == 'posts' && (user && user.hasRole(User.POSTER) || !user && this.POST_ANONYMOUS)
				// Otherwise delegate to the first post as this is just a container for it
				|| this.getFirstPost().isEditableBy(user, item);
	},

	getTitle: function() {
		var post = this.getFirstPost();
		return post ? post.title : null;
	},

	setTitle: function(title) {
		// If the title of the first post was changed, update the unique name of the node
		this.name  = this.getEditParent().getUniqueChildName(this,
				title, getProperty('maxNameLength', 64).toInt());
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