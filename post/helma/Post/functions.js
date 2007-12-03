Post.inject({
	// turn off for systems without users
	HAS_USER: true,

	initialize: function(topic) {
		this.topic = topic;
	},

	isEditableBy: function(user) {
		// remain editable from the same session for 15 minutes
		return user != null && this.creator == user ||
			this.cache.sessionId == session._id &&
			new Date().getTime() - this.modificationDate.getTime() < 1000 * 60 * 15;
	},

	getEditName: function() {
		if (this.title)
			return this.title.cutAt(28) + " [" + this._id + "]";
	},

	getDisplayName: function() {
		return this.getTitle();
	},

	getTitle: function() {
		// for the recent code in root, that deals with both topics and posts
		return this.title;
	},

	getEditForm: function() {
		var form = new EditForm(this, { removable: true });
		var notifyItem = {
			type: "boolean", name: "notify",
			suffix: "Notify on subsequent posts"
		};
		// TODO: add FLAG_POSTER, and cosinder renaming from name to role (EDITOR -> EDIT...)
		if (User.getRole() & User.FLAG_EDITOR) {
			form.add([
				{
					suffix: "<b>Posting as: </b>" +
						session.user.renderLink({ attributes: { target: "_top" }})
				},
				notifyItem
			]);
		} else {
			form.add([ 
				{
					label: "Name", type: "string", name: "username", trim: true,
					requirements: {
						notNull: true, maxLength: 32,
						uniqueIn: { 
							value: root.users, message:
							"\nThis user already exists.\n" +
							"Choose a different name."
						}
					}
				}, 	{
					label: "Website", type: "string", name: "website"
				}
			], [			
				{
					label: "Email", type: "string", name: "email",  trim: true,
					requirements: {
						notNull: {
							value: true, message: "Needs to be specified." + 
							"Your address will not be published."
						},
						uniqueIn: {
							value: root.usersByEmail, message:
							"\nThis address is already in use.\n" +
							"Choose a different address."
						},
						email: true
					}
				},
				notifyItem
			]);
		}
		form.add({
			label: "Subject", type: "string", name: "title", trim: true,
			requirements: {
				notNull: { value: true, message: "Needs to be specified." },
				maxLength: 64
			}
		});
		form.add({
			label: "Text", type: "text", name: "text", cols: "40", rows: "20",
			trim: true, hasLinks: true,
			requirements: {
				notNull: true
			}
		}, {
			label: "Resources", type: "multiselect", name: "resources",
			showOptions: true, collection: this.allResources, value: this.resources,
			prototypes: "Resource,Medium,Picture", moveable: true,
			size: 6, autoRemove: true
		});
		if (true && User.getRole() & User.FLAG_ADMINISTRATOR) {
			form.add({
				type: "ruler"
			}, { 
				label: "Date", type: "date", name: "creationDate", year: true,
				month: true, day: true, hours: true, minutes: true
			}, {
				label: "Creator", type: "select", name: "creator",
				options: root.users, allowNull: true
			}, 	{
				type: "ruler"
			});
		}

		if (this.isFirst && this.topic.addEditFields)
			this.topic.addEditFields(form);

		form.add({
			type: "help", text: this.renderTemplate("help")
		});
		return form;
	},

	onApply: function(changedItems) {
		if (changedItems && this.isFirst) {
			if (changedItems.title)
				this.topic.setTitle(this.title);
			if (changedItems.creationDate)
				this.topic.creationDate = this.creationDate;
			// store remote host
			this.host = Net.getHost();
		}
	},

	onRemove: function() {
		var parent = this.getEditParent();
		if (!parent.isRemoving() && parent.count() == 1)
			parent.removeObject();
	},

	getPostKey: function() {
		if (!session.data.key)
			session.data.key = encodeMD5(session._id + new Date());
		return session.data.key;
	},

	renderEdit: function(error, newPost, out) {
		function getValue(obj, name) {
			if (error) {
				var value = req.data[name];
				if (value) return value;
				else return obj[name];
			} else {
				var value = obj[name];
				if (value) return value;
				else return req.data["post_" + name];
			}
		}

		var resources = this.resources.list();
		// concat pending resources in the cache as well, in case the objects are still transient!
		if (this.cache.resources)
			resources = resources.concat(this.cache.resources);
		var param = {
			id: this.getEditId(),
			text: encodeForm(getValue(this, 'text')),
			notify: Html.input({
				name: "notify", type: "checkbox", value: "1",
				current: this.hasNotification()
			}),
			key: this.getPostKey(),
			newPost: newPost,
			error: error,
			resources: resources,
			url: newPost ? this.topic.getHref("createPost") : this.href('savePost'),
			title: encodeForm(getValue(this, 'title')),
			titleLabel: "Subject",
			resourceLabel: "<b>Attachments:</b>"
		};

		if (this.HAS_USER && !this.username && session.user) {
			param.user = this.creator != null ? this.creator : session.user;
		} else {
			param.username = encodeForm(getValue(this, 'username'));
			param.email = encodeForm(getValue(this, 'email'));
			param.website = encodeForm(getValue(this, 'website'));
		}

		// first posts in topics also can edit the topic (e.g. for scripts, gallery)
		if (this.isFirst && this.topic.renderEditFields)
			param.topicFields = this.topic.renderEditFields(param);

		return this.renderTemplate("edit", param, out);
	},

	// used by feedLib:
	renderSimple: function(out) {
		var resources = this.resources.list();
		return this.renderTemplate("simple", {
			text: Markup.encodeText(this.text, resources, { simple: true }),
			resources: resources,
		}, out);
	},

	render: function(withLink, asFirst, out) {
		var resources = this.resources.list();
		var title = encode(this.title);
		var param = {
			id: this.getEditId(),
			date: app.data.dateLong.format(this.creationDate),
			user: this.renderUser(),
			text: Markup.encodeText(this.text, resources),
			title: withLink ? this.topic.renderLink(title) : title,
			isEditable: User.canEdit(this),
			resources: resources,
			styleClass: asFirst ? this.topic.STYLE_FIRST : this.topic.STYLE_OTHERS
		};
		// first posts in topics also can show fields of the topic (e.g. for scripts, gallery)
		if (this.isFirst) {
			if (this.topic.renderFields)
				param.topicFields = this.topic.renderFields(param);
			if (this.topic.renderFooter)
				param.topicFooter = this.topic.renderFooter(param);
			if (this.topic.renderOuter)
				param.outer = this.topic.renderOuter();
		}
		return this.renderTemplate("main", param, out);
	},

	submit: function() {
		var isGuest = !this.HAS_USER || session.user == null || this.username != null;

		// first process resources, only allow logged in users to upload files
		var resources = null;
		var errors = [];
		if (!isGuest) {
			var groups = RequestHelper.getDataGroups(req.data);
			if (!this.cache.resources)
				this.cache.resources = [];
			resources = this.cache.resources; // don't use this.resources directly, as the object may still be transient... see bug #456
			for (var name in groups) {
				var group = groups[name];
				if (name.startsWith("file_")) {
					var file = group.file;
					if (file && file.name) {
						var resource = Resource.create(file);
						if (resource) {
							resources.push(resource);
						} else {
							errors.push(file.name + " is not of a supported file type.");
						}
					}
				} else if (name.startsWith("resource_")) {
					var resource = Resource.getById(name.substring(9));
					if (resource) {
						if (group.remove) {
							for (var i in resources) {
								if (resources[i] == resource)
									resources.splice(i, 1);
							}
							resource.removeObject();
						} else if (group.file && group.file.name) {
							resource.setFile(group.file);
						}
					}
				}
			}
		} 

		if (this.isFirst && this.topic.submitFields)
			this.topic.submitFields(isGuest, errors);

		if (errors.length > 0) {
			return errors.join("<br />");
		}

		if (isGuest) {
			if (req.data.username)
				req.data.username = req.data.username.trim();
			if (req.data.email)
				req.data.email = req.data.email.trim();
			if (!req.data.username) {
				return "Please specify a name:";
			} else if (req.data.username.length > 32) {
				return "The name cannot be longer than 32 characters:";
			} else if (root.users.get(req.data.username) != null) {
				return "A user with this name already exists. Please choose a different name.";
			} else if (!req.data.email) {
				return "Please specify an email address. Your address will not be published.";
			} else if (!app.data.emailPattern.test(req.data.email)) {
				return "Your email address seems not to be valid.";
			} else if (root.usersByEmail.get(req.data.email) != null) {
				return "A user with this email address already exists.<br />Please use a different email address.";
			} else {
				res.setCookie("post_username", req.data.username, 90);
				res.setCookie("post_email", req.data.email, 90);
				res.setCookie("post_website", req.data.website, 90);
			}
		}
		if (req.data.title != null) {
			req.data.title = req.data.title.trim();
			if (req.data.title == "") {
				return "Please specify a title:";
			} else if (req.data.title.length > 64) {
				return "The title cannot be longer than 64 characters:";
			}
		}
		req.data.text = req.data.text.trim();
		if (req.data.text == "") {
			return "The text field is empty";
		}

		// now change the values:

		if (isGuest) {
			this.username = req.data.username;
			this.email = req.data.email;
			var website = req.data.website;
			if (website && !website.startsWith("http://"))
				website = "http://" + website;
			this.website = website;
		}
		this.title = req.data.title;
		this.text = req.data.text;

		if (this.isFirst)
			this.topic.setTitle(this.title);

		if (this.HAS_USER)
			this.modifier = session.user;
		this.modificationDate = new Date();
		if (this.isTransient()) {
			if (this.HAS_USER)
				this.creator = this.modifier;
			// this.creationDate = this.modificationDate;
		}
		// store remote host
		this.host = Net.getHost();
		// handle notification
		this.topic.setNotification(req.data.notify, this.creator, this.getUserEmail(), this.getUserName());
		// store resources for good:
		// if the topic is the temporary transient topic, we're creating both a new topic and a new post
		// set topic to null here, as we're adding persisted resources to the post, which would automatically
		// persists the post and then the topic too! to prevent this, we need to set it to null now.
		// it will be set to the persisted topic in Node.addPost

		if (this.topic.isTransient())
			this.topic = null;

		if (resources) {
			for (var i in resources)
				this.resources.add(resources[i]);
			delete this.cache.resources;
		}
	},

	hasNotification: function() {
		// let the temporary post display notification state correctly for logged in users:
		if (this.isTransient()) {
			var email;
			if (this.HAS_USER && session.user != null) email = session.user.email;
			else email = req.data.post_email;
			return this.topic.getNotification(email) != null;		
		} else {
			return (this.topic.getNotification(this.getUserEmail()) != null);
		}
	},

	renderUser: function() {
		if (this.HAS_USER && this.username == null && this.creator != null) {
			return this.creator.renderLink();
		} else {
			var name = encode(this.username);
			if (this.website) {
				name = '<a href="' + this.website + '" target="_blank">' + name + '</a>';
			}
			return name;
		}
	},

	getUserEmail: function() {
		return this.creator != null ? this.creator.email : this.email;
	},

	getUserName: function() {
		return this.creator != null ? this.creator.name : this.username;
	},

	redirect: function() {
		// calculate the pagination position from the index of the post within the topic, to be used 
		// in the redirect url bellow:
		var query = '';
		if (!this.isFirst || !this.topic.KEEP_FIRST) {
			var pos = this.topic.contains(this);
			if (this.topic.KEEP_FIRST)
				pos--;
			pos = Math.floor(pos / this.topic.MAX_PER_PAGE);
			if (pos >= 0)
				query = '?pos=' + pos;
			query += '#post-' + this.getEditId();
		}
		res.redirect(this.topic.getHref(this.topic.REDIRECT_ACTION) + query);
	}
});
