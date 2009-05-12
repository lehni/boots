Post.inject({
	isEditableBy: function(user) {
		// remain editable from the same session for 15 minutes
		return user != null && this.creator == user ||
			this.cache.sessionId == session._id &&
			new Date().getTime() - this.modificationDate.getTime() < 1000 * 60 * 15;
	},

	getEditName: function() {
		if (this.title)
			return this.title.truncate(28, '...') + ' [' + this._id + ']';
	},

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

	getEditForm: function() {
		var node = this.getNode();
		var form = new EditForm(this, {
			previewable: false, removable: true, showTitle: false, titles: { create: 'Post' }
		});
		var notifyItem = {
			type: 'boolean', name: 'notify', value: !!this.getNotification(),
			suffix: 'Notify on subsequent posts',
			onAfterApply: function(value) {
				node.setNotification(value, this.creator, this.getUserEmail(), this.getUserName());
			}
		};
		// TODO: add POSTER, and cosider renaming from name to role (EDITOR -> EDIT...)
		if (User.hasRole(User.EDITOR)) {
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
					label: 'Name', type: 'string', name: 'username', trim: true,
					requirements: {
						notNull: true, maxLength: 32,
						uniqueIn: { 
							value: root.users, message:
							'\nThis user already exists.\nChoose a different name.'
						}
					}
				}, 	{
					label: 'Website', type: 'string', name: 'website',
					requirements: {
						uri: true
					}
				}
			], [			
				{
					label: 'Email', type: 'string', name: 'email',  trim: true,
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
			label: node.POST_TITLE, type: 'string', name: 'title', trim: true,
			requirements: {
				notNull: { value: true, message: 'Please specify a title.' },
				maxLength: 64
			}
		});
		form.add({
			label: 'Text', type: 'text', name: 'text', cols: '40', rows: '20',
			trim: true, hasLinks: true,
			requirements: {
				notNull: { value: true, message: 'Please write a text.' }
			}
		}, {
			label: 'Resources', type: 'multiselect', name: 'resources',
			showOptions: true, collection: this.allResources, value: this.resources,
			prototypes: 'Resource,Medium,Picture', movable: true,
			size: 6, autoRemove: true, sortable: true
		});
		if (User.hasRole(User.ADMINISTRATOR) && !this.isCreating()) {
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
		if (this.isFirst && this.node.populateFirstPostEditForm(form))
			this.node.populateFirstPostEditForm(form);

		form.add({
			type: 'help', text: this.renderTemplate('help')
		});
		return form;
	},

	onAfterApply: function(changedItems) {
		var node = this.getNode();
		if (changedItems && this.isFirst) {
			if (node.onUpdateFirstPost)
				node.onUpdateFirstPost(this, changedItems);
			// store remote host
			this.host = Net.getHost();
		}
	},

	onAfterInitialize: function() {
		var node = this.getNode();
		var count = node.posts.count();
		if (node.AUTO_POST_TITLE && count > 0 || !node.AUTO_POST_TITLE && count > 1) {
			var lastTitle = node.posts.get(count - 1).title;
			if (lastTitle)
				this.title = /^Re: /.test(lastTitle) ? lastTitle : 'Re: ' + lastTitle;
		}
	},

	onCreate: function() {
		var node = this.getNode();
		this.isFirst = node.posts.count() == 0;
		if (node.onAddPost)
			node.onAddPost(this);
	},

	onBeforeRemove: function() {
		// Check if this is a first post, and if so only allow removal
		// if there are no others
		var node = this.getNode();
		if (this.isFirst && node.posts.count() > 1) {
			throw 'There are other posts reacting to this one.\nTherefore it cannot be removed any longer.'
		}
	},

	onRemove: function() {
		var node = this.getNode();
		// If it's the last post, let the node know.
		if (node.onRemoveLastPost && !node.isRemoving() && node.posts.count() == 1)
			node.onRemoveLastPost();
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
		var node = this.getNode();
		if (node.POST_USERS && !this.username && this.creator) {
			return this.creator.renderLink(null, out);
		} else if (node.POST_ANONYMOUS) {
			var name = encode(this.username);
			out.write(this.website ? '<a href="' + this.website 
				+ '" target="_blank">' + name + '</a>' : name);
		}
	}.toRender(),

	render: function(withLink, asFirst, out) {
		var resources = this.resources.list();
		var title = encode(this.title);
		var param = {
			id: this.getEditId(),
		/* This happens from template now
			text: Markup.render(this.text, {
				resources: resources, removeUsedResources: true,
				inline: true, encoding: 'all'
			}),
		*/
			title: withLink ? this.node.renderLink(title) : title,
			isEditable: User.canEdit(this),
			resources: resources,
			postClass: this.node.POST_CLASS,
			styleClass: asFirst ? this.node.POST_CLASS_FIRST : this.node.POST_CLASS_OTHERS
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
		// Let the temporary post display notification state correctly for logged in users:
		var node = this.getNode();
		if (this.isTransient()) {
			var email;
			if (node.POST_USERS && session.user) {
				email = session.user.email;
			} else if (node.POST_ANONYMOUS) {
				email = req.data.post_email;
			}
			return node.getNotification(email);		
		} else {
			return node.getNotification(this.getUserEmail());
		}
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
			query += '#post-' + this.getEditId();
		}
		res.redirect(this.node.href(this.node.POST_REDIRECT_ACTION) + query);
	}
});
