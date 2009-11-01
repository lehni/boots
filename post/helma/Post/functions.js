Post.inject({
	getDisplayName: function() {
		return this.getTitle();
	},

	getTitle: function() {
		// for the recent code in root, that deals with both nodes and posts
		return this.title;
	},

	getNode: function() {
		return this.getEditParent(this.node);
	},

	getEditForm: function(param) {
		var node = this.getNode();
		var form = new EditForm(this, {
			previewable: false, removable: true, showTitle: false,
			titles: { create: 'Post' }, width: param.width
		});
		var notifyItem = {
			type: 'boolean', name: 'notify', value: !!this.getNotification(),
			text: 'Notify on subsequent posts',
			onAfterApply: function(value) {
				node.setNotification(value, this.creator, this.getUserEmail(), this.getUserName());
			}
		};
		// If this post was anomyous and now edited by the same user who logged in, 
		// do still show anomyous editor.
		if (!this.username && User.hasRole(UserRole.POST)) {
			form.add([
				{
					suffix: '<b>Posting as: </b>' +
						session.user.renderLink({ attributes: { target: '_top' }})
				},
				notifyItem
			]);
		} else {
			form.add([
				{
					label: 'Name', type: 'string', name: 'username', length: 32, trim: true,
					requirements: {
						notNull: true,
						uniqueIn: { 
							value: root.users, message:
							'\nThis user already exists.\nChoose a different name.'
						}
					}
				}, {
					label: 'Website', type: 'string', name: 'website',
					requirements: {
						uri: true
					}
				}
			], [
				{
					label: 'Email', type: 'string', name: 'email', length: 255, trim: true,
					requirements: {
						notNull: {
							value: true, message: 'Needs to be specified.\nYour address will not be published.'
						},
						uniqueIn: {
							value: root.usersByEmail, message:
							'\nThis address is already in use.\nChoose a different address.'
						},
						email: true
					}
				},
				notifyItem
			]);
		}
		form.add({
			label: node.POST_TITLE, type: 'string', name: 'title', length: 64, trim: true,
			requirements: {
				notNull: { value: true, message: 'Please specify a title.' },
			}
		});
		form.add({
			label: 'Text', type: 'text', name: 'text', cols: '40', rows: '20',
			trim: true, hasLinks: true,
			requirements: {
				notNull: { value: true, message: 'Please write a text.' }
			}
		});
		if (User.hasRole(UserRole.ADMIN) && !this.isCreating()) {
			form.add({
				type: 'ruler'
			}, { 
				label: 'Date', type: 'date', name: 'creationDate', year: true,
				month: true, day: true, hours: true, minutes: true
			}, {
				label: 'Creator', type: 'select', name: 'creator',
				options: root.users, allowNull: true
			});
		}

		// Allow the parent node of the first post to add things to the post's
		// edit form, for scripts, gallery entires, etc, which are nothing more
		// than a stick first post.
		if (this.isFirst && node.populateFirstPostEditForm)
			node.populateFirstPostEditForm(form);

		form.add({
			label: 'Attachments', type: 'list', name: 'resources',
			collection: this.allResources, prototypes: 'Resource',
			addButton: 'Attach',
			autoRemove: true, sortable: true,
			onCreate: function(ctor, values) {
				// Create a resource type based on file mime type
				var resource = values.file && Resource.create(values.file);
				if (resource)
					resource.visible = true;
				return resource;
			}
		}, {
			type: 'help', text: this.renderTemplate('help')
		});
		return form;
	},

	onAfterApply: function(changedItems) {
		var node = this.getNode();
		if (changedItems) {
			if (this.isFirst && node.onUpdateFirstPost)
				node.onUpdateFirstPost(this, changedItems);
			// If we're posting anonymously, store the values for next time
			if (!User.hasRole(UserRole.POST)) {
				res.setCookie('post_username', this.username, 90);
				res.setCookie('post_email', this.email, 90);
				res.setCookie('post_website', this.website, 90);
			}
		}
	},

	initialize: function() {
		var node = this.getNode();
		if (node) {
			var count = node.posts.count();
			if (node.AUTO_POST_TITLE && count > 0 || !node.AUTO_POST_TITLE && count > 1) {
				var lastTitle = node.posts.get(count - 1).title;
				if (lastTitle)
					this.title = /^Re: /.test(lastTitle) ? lastTitle : 'Re: ' + lastTitle;
			}
		}
		if (!User.hasRole(UserRole.POST)) {
			this.username = req.data.post_username;
			this.email = req.data.post_email;
			this.website = req.data.post_website;
		}
	},

	onCreate: function() {
		var node = this.getNode();
		this.isFirst = node.posts.count() == 0;
		// Store remote host
		this.host = Net.getHost();
		if (node.onAddPost)
			node.onAddPost(this);
	},

	onBeforeRemove: function() {
		// Check if this is a first post, and if so only allow removal
		// if there are no others
		var node = this.getNode();
		if (!User.hasRole(UserRole.EDIT) && this.isFirst && node.posts.count() > 1) {
			var other = node.posts.get(1);
			throw other.getUserName() + (node.posts.count() > 2 ? ' and others have' : ' has')
					+ ' already answered this post, therefore it cannot be removed.';
		}
	},

	onRemove: function() {
		var node = this.getNode();
		// If we're removing the first post, remove all.
		if (this.isFirst)
			node.remove();
		// If it's the last post, let the node know.
		if (node.onRemoveLastPost && !node.isRemoving() && node.posts.count() == 1)
			node.onRemoveLastPost();
	},

	isEditableBy: function(user, item) {
		return user && this.creator == user;
	},

	// Used by feed lib:
	renderSimple: function(out) {
		var resources = this.resources.list();
		return this.renderTemplate('simple', {
			text: Markup.render(this.text, {
				resources: resources, removeUsedResources: true,
				simple: true, inline: true, encoding: 'all'
			}),
			resources: resources,
		}, out);
	},

	renderUser: function(out) {
		if (this.username) {
			var name = encode(this.username);
			out.write(this.website ? '<a href="' + this.website 
				+ '" target="_blank">' + name + '</a>' : name);
		} else if (this.creator) {
			this.creator.renderLink(null, out);
		}
	}.toRender(),

	render: function(withLink, asFirst, out) {
		var resources = this.resources.list();
		var title = encode(this.title);
		var param = {
			id: this.getEditId(),
			title: withLink ? this.node.renderLink(title) : title,
			resources: resources,
			postClass: this.node.POST_CLASS,
			styleClass: asFirst ? this.node.POST_CLASS_FIRST : this.node.POST_CLASS_OTHERS,
			// We need to process this before all the renderFields / Footer / Outer
			// methods since Markup modified param.resources already.
			// Therefore it canneot be moved to main.jstl until these render*
			// methods are converted to macros that can be called from there too.
			text: Markup.render(this.text, {
				resources: resources,
				removeUsedResources: true,
				encoding: 'all'
			})
		};
		// first posts in nodes also can show fields of the node (e.g. for scripts, gallery)
		if (this.isFirst) {
			if (this.node.renderFields)
				param.nodeFields = this.node.renderFields(param, resources);
			if (this.node.renderFooter)
				param.nodeFooter = this.node.renderFooter(param, resources);
			if (this.node.renderOuter)
				param.outer = this.node.renderOuter(param, resources);
		}
		return this.renderTemplate('main', param, out);
	},

	getNotification: function() {
		return this.getNode().getNotification(this.getUserEmail());
	},

	setNotification: function(notify, user, email, username) {
		this.getNode().setNotification(notify, user, email, username);
	},

	getUserEmail: function() {
		return this.creator != null ? this.creator.email : this.email;
	},

	getUserName: function() {
		return this.creator != null ? this.creator.name : this.username;
	},

	redirect: function() {
		// Calculate the pagination position from the index of the post within the node, to be used 
		// in the redirect url bellow:
		var query = '';
		if (!this.isFirst || !this.node.POST_FIRST_STICKY) {
			var pos = this.node.indexOf(this);
			if (this.node.POST_FIRST_STICKY)
				pos--;
			pos = Math.floor(pos / this.node.POST_PER_PAGE);
			if (pos >= 0)
				query = '?pos=' + pos;
			query += '#' + this.getEditId();
		}
		res.redirect(this.node.href(this.node.POST_REDIRECT_ACTION) + query);
	}
});
