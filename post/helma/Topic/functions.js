Topic.inject({
	// Topic dependend configurations, can be overriden by sub prototypes.
	// KEEP_FIRST and MAX_PER_PAGE needs to be defined "globaly" per prototype
	// for Post.redirect() to work
	POST_BUTTON: "Reply", // text to be displayed on the post button 
	POST_SINGULAR: "Post", // text to be displayed in the pagination bar
	STYLE_FIRST: "post-first",
	STYLE_OTHERS: "post-others",
	SHOW_HEADERS: true,
	KEEP_FIRST: true, // allways keep the first post in a topic on top (for pagination)
	MAX_PER_PAGE: 10, // maximum posts per page
	REDIRECT_ACTION: "", // action to be used when redirecting to the topic page, to display the post
	AUTO_POST_TITLE: true, // automatically create a title for subsequent posts by adding Re: to the previous title
	HAS_FEED: true, // show RSS feeds. Used by feedLib
	ALLOW_POSTS: true, // deactivate posting alltogether,

	initialize: function() {
		// A topic cannot be created without a first post.
		var post = new Post();
		// mark the post as creating, as we'll be returning it from getEditForm...
		post.setCreating(true);
		// tell it that it's the first post in a topic
		post.isFirst = true;
		// add it
		this.add(post);
		// make it visible
		this.visible = true;
	},

	getEditForm: function(param) {
		// Only edit the topic with admin rights. The default user can only
		// edit posts. Also, when creating a new post, even the admin only edits the post
		// Except when removing, we need the full information about children and all that
		if (!param.removing && (this.isCreating() || !User.hasRole(User.ADMINISTRATOR))) {
			return this.get(0).getEditForm(param);
		} else {
			var form = new EditForm(this, { removable: true });
			form.add(
				{ label: "Posts", type: "select", name: "posts", collection: this,
					prototypes: "Post", size: 10, autoRemove: true }
			);
			return form;
		}
	},

	isEditableBy: function(user) {
		// delegate to the first post as this is just a container for it
		return this.get(0).isEditableBy(user);
	},

	getTitle: function() {
		var post = this.get(0);
		return post ? post.title : null;
	},

	setTitle: function(title) {
		// if the title of the first post was changed, update the unique name of the topic
		this.name  = this.getEditParent().getUniqueNameFor(this, title, 32);
	},

	getDisplayName: function() {
		return this.getTitle();
	},

	getEditName: function() {
		return this.getDisplayName();
	},

	renderSimple: function() {
		var post = this.get(0);
		return post ? post.renderSimple() : "";
	},

	renderUser: function() {
		var post = this.get(0);
		return post ? post.renderUser() : "";
	},

	getNotification: function(email) {
		return this.notifications.get(email);
	},

	setNotification: function(notify, user, email, username) {
		if (user != null) {
			email = user.email;
			username = user.name;
		}
		if (email != null) {
			var notification = this.notifications.get(email);
			if (notify && !notification) {
				this.notifications.add(new Notification(user, email, username));
			} else if (!notify && notification) {
				notification.remove();
			}
		}
	},

	addPost: function(post) {
		post.isFirst = this.count() == 0;
		this.add(post);
	
		// update the modification date of the node / topic when a post is added
		this.modificationDate = post.modificationDate;
	
		session.data.postTime = new Date().getTime();
	
		var notifications = this.notifications.list();
		for (var i = 0; i < notifications.length; i++) {
			var notification = notifications[i];
			if (notification.user != session.user)
				notification.counter++;
		}
	
		// notify main user:
		var user = root.users.get("Lehni");
		if (user != null)
			this.setNotification(true, user);
	},

	/**
	 * Returns a cached post object for rendering the html editor for new posts
	 */
	getCachedPost: function() {
		if (!session.data.post)
			session.data.post = new Post(this);
		session.data.post.topic = this;
		session.data.post.isFirst = this.count() == 0; // mark as top post if there's none before
		return session.data.post;
	},

	/**
	 * getHref does the same as href, but can be overridden by setting
	 * topic.getHref = function() {...}, to be used by proxy topic objects
	 */
	getHref: function(name) {
		return this.href(name);
	},

	renderPosts: function(param, out) {
		var count = this.count();
		var navigCount = count;
	
		// handle KEEP_FIRST:
		var first = null;
		if (this.KEEP_FIRST) {
			var post = this.get(0);
			if (post) {
				first = post.render(false, true);
				navigCount--;
			}
		}
	
		var posts = null;
		if (!param.hidePosts) {
			res.push();
			this.renderPagination({
				count: navigCount,
				maxPerPage: this.MAX_PER_PAGE,
				defaultPos: -1,
				singular: this.POST_SINGULAR,
				loadDestination: param.loadDestination
			}, res);
	
			var index = req.data.pos * this.MAX_PER_PAGE;
			if (this.KEEP_FIRST)
				index++;

			var posts = this.list(index, this.MAX_PER_PAGE);
			for(var i = 0; i < posts.length; i++)
				posts[i].render(false, false, res);
	
			// render post submit only at the end of the list of posts
			if (index + posts.length == count && this.ALLOW_POSTS) {
				this.renderPostButton(param.buttonTitle);
			}
			posts = res.pop();
		}

		return this.renderTemplate("posts", {
			first: first,
			posts: posts
		}, out);
	},

	removePost: function(post) {
		if (this.get(0) == post) {
			// cannot remove root of a discussion that's going on already
			if (this.count() == 1) {
				var redir = this.node.href();
				if (this.removeObject())
					return redir;
			}
		} else {
			post.remove();
			return true;
		}
		return false;
	},

	renderPostButton: function(buttonTitle) {
		this.renderTemplate("postButton", {
			buttonTitle: buttonTitle,
			id: "new"
		}, res);
	},

	render: function(withLink, isFirst) {
		var first = this.get(0);
		return first && first.render(withLink, isFirst);
	}
});