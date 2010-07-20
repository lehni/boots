Node.inject({
	// Node dependend configurations, can be overriden by sub prototypes.
	// POST_FIRST_STICKY and POST_PER_PAGE needs to be defined 'globaly' per
	// prototype for Post.redirect() to work

	// Text to be displayed on the post button 
	POST_BUTTON: 'Post',
	// Text to be displayed in the pagination bar
	POST_PAGINATION: 'Post',
	// Word to be used if there are more than one. Default is to auto-compose a
	// plural.
	POST_PAGINATION_PLURAL: null,
	// The collection in which the post button should create a new entry.
	POST_COLLECTION: 'posts',
	POST_CLASS: 'post',
	POST_CLASS_FIRST: 'first',
	POST_CLASS_OTHERS: '',
	// Allways keep the first post in a node on top (for pagination)
	POST_FIRST_STICKY: false,
	// Maximum posts per page
	POST_PER_PAGE: 10,
	// Action to be used when redirecting to the node page, to display the post
	POST_REDIRECT_ACTION: '',
	// Automatically create a title for subsequent posts by adding 'Re: ' to the
	// previous title
	POST_AUTO_TITLE: false,
	// Deactivate posting alltogether,
	POST_ALLOW: true,
	// Turn on to support system users
	POST_USERS: true,
	// The role required to post
	POST_ROLE: UserRole.POST,
	// Turn on for anonymous users
	POST_ANONYMOUS: true,
	// Wether adding new posts should modify the node's modification date
	POST_UPDATE_DATE: false,
	// Show RSS feeds. Used by feed lib
	HAS_FEED: true,

	getEditForm: function(param) {
		var form = this.base(param);
		if (param.posts == undefined)
			param.posts = false;
		if (param.posts) {
			form.addTab('Posts', form.createItem(param.posts, {
				type: 'select', name: 'posts', prototypes: 'Post', 
				label: 'Posts', size: 10,
				collection: this.posts, autoRemove: true
			}));
		}
		return form;
	},

	isEditableBy: function(user, item) {
		if (this.base(user, item))
			return true;
		// Allow anonymous users to edit posts if POST_ANONYMOUS is set to true
		// for this node.
		return item == this.POST_COLLECTION
				&& (user && user.hasRole(this.POST_ROLE)
						|| !user && this.POST_ANONYMOUS);
	},

	/**
	 * This is called from Post#onCreate
	 */
	onAddPost: function(post) {
		// Update the modification date of the topic when a post is added
		if (this.POST_UPDATE_DATE)
			this.modificationDate = post.modificationDate;
		// Called whenever a post is added to this node / topic.
		var notifications = this.notifications.list();
		// Count up amount of new posts for each of the waiting notifications.
		// Do not count the one for the user who posted this.
		for (var i = 0, l = notifications.length; i < l; i++) {
			var notification = notifications[i];
			if (notification.user != session.user || !session.user
						&& notification.email != req.data.post_email)
				notification.counter++;
		}
		// Get the list of standard users to notify and go through them.
		var users = root.getNotificationUsers(post);
		for (var i = 0, l = users && users.length; i < l; i++) {
			var user = users[i];
			if (!(user instanceof User))
				user = root.users.get(user);
			if (user)
				this.setNotification(true, user);
		}
	},

	getFirstPost: function() {
		return this.posts.get(0);
	},

	getLastPost: function() {
		return this.posts.get(this.posts.count() - 1);
	},

	getNotification: function(email) {
		return this.notifications.get(email);
	},

	setNotification: function(notify, user, email, username) {
		if (user) {
			email = user.email;
			username = user.name;
		}
		if (email) {
			var notification = this.notifications.get(email);
			if (notify && !notification) {
				this.notifications.add(new Notification(user, email, username));
			} else if (!notify && notification) {
				notification.remove();
			}
		}
	},

	renderPosts: function(param, out) {
		// Use Bootstrap's param.extend to create a new param object that
		// inherits from param and can be modified without changing the
		// passed param object.
		param = param.extend();
		var count = this.posts.count();
		var navigCount = count;
		param.withLink = false;
		var first = null;
		// handle POST_FIRST_STICKY:
		if (this.POST_FIRST_STICKY) {
			var post = this.posts.get(0);
			if (post) {
				param.asFirst = true;
				first = post.render(param);
				navigCount--;
			}
		}
		var posts = null;
		if (!param.hidePosts) {
			res.push();
			var pagination = {
				count: navigCount,
				maxPerPage: this.POST_PER_PAGE,
				position: -1,
				singular: this.POST_PAGINATION,
				plural: this.POST_PAGINATION_PLURAL,
				container: param.container || 'posts'
			};
			this.renderPagination(pagination, res);

			var index = pagination.position * this.POST_PER_PAGE;
			if (this.POST_FIRST_STICKY)
				index++;

			var posts = this.posts.list(index, this.POST_PER_PAGE);
			param.asFirst = false;
			for(var i = 0; i < posts.length; i++)
				posts[i].render(param, res);

			// Render post submit only at the end of the list of posts
			// Support both boolean and strings for postButton.
			// The default is the POST_BUTTON setting.
			if (param.postButton !== false && index + posts.length == count)
				this.renderPostButton({
					title: typeof param.postButton == 'string'
							? param.postButton : this.POST_BUTTON,
					click: param.postButtonExpand
				}, res);
			posts = res.pop();
		}
		return this.renderTemplate('posts', {
			first: first,
			posts: posts
		}, out);
	},

	renderPostButton: function(param, out) {
		// If the button is required to be clicked, pass the click action
		// as a third parameter to the editButtons macro
		if (this.POST_ALLOW && User.canEdit(this, this.POST_COLLECTION)) {
			return this.renderTemplate('postButton', {
				buttons: 'create:' + param.title + (param.click ? ':click' : ''),
				id: 'new'
			}, out);
		}
	}
});