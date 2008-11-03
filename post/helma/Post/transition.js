Post.inject({
	// TODO: transition
	submit: function() {
		var isGuest = !this.POST_USERS || session.user == null || this.username != null;

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
				if (name.startsWith('file_')) {
					var file = group.file;
					if (file && file.name) {
						var resource = Resource.create(file);
						if (resource) {
							resources.push(resource);
						} else {
							errors.push(file.name + ' is not of a supported file type.');
						}
					}
				} else if (name.startsWith('resource_')) {
					var resource = Resource.getById(name.substring(9));
					if (resource) {
						if (group.remove) {
							for (var i in resources) {
								if (resources[i] == resource)
									resources.splice(i, 1);
							}
							resource.remove();
						} else if (group.file && group.file.name) {
							resource.setFile(group.file);
						}
					}
				}
			}
		} 

		if (this.isFirst && this.node.submitFields)
			this.node.submitFields(isGuest, errors);

		if (errors.length > 0) {
			return errors.join('<br />');
		}

		if (isGuest) {
			if (req.data.username)
				req.data.username = req.data.username.trim();
			if (req.data.email)
				req.data.email = req.data.email.trim();
			if (!req.data.username) {
				return 'Please specify a name:';
			} else if (req.data.username.length > 32) {
				return 'The name cannot be longer than 32 characters:';
			} else if (root.users.get(req.data.username) != null) {
				return 'A user with this name already exists. Please choose a different name.';
			} else if (!req.data.email) {
				return 'Please specify an email address. Your address will not be published.';
			} else if (!app.data.emailPattern.test(req.data.email)) {
				return 'Your email address seems not to be valid.';
			} else if (root.usersByEmail.get(req.data.email) != null) {
				return 'A user with this email address already exists.<br />Please use a different email address.';
			} else {
				res.setCookie('post_username', req.data.username, 90);
				res.setCookie('post_email', req.data.email, 90);
				res.setCookie('post_website', req.data.website, 90);
			}
		}
		if (req.data.title != null) {
			req.data.title = req.data.title.trim();
			if (req.data.title == '') {
				return 'Please specify a title:';
			} else if (req.data.title.length > 64) {
				return 'The title cannot be longer than 64 characters:';
			}
		}
		req.data.text = req.data.text.trim();
		if (req.data.text == '') {
			return 'The text field is empty';
		}

		// now change the values:

		if (isGuest) {
			this.username = req.data.username;
			this.email = req.data.email;
			var website = req.data.website;
			if (website && !website.startsWith('http://'))
				website = 'http://' + website;
			this.website = website;
		}
		this.title = req.data.title;
		this.text = req.data.text;

		if (this.isFirst)
			this.node.setTitle(this.title);

		if (this.POST_USERS)
			this.modifier = session.user;
		this.modificationDate = new Date();
		if (this.isTransient()) {
			if (this.POST_USERS)
				this.creator = this.modifier;
			// this.creationDate = this.modificationDate;
		}
		// store remote host
		this.host = Net.getHost();
		// handle notification
		this.node.setNotification(req.data.notify, this.creator, this.getUserEmail(), this.getUserName());
		// store resources for good:
		// if the node is the temporary transient node, we're creating both a new node and a new post
		// set node to null here, as we're adding persisted resources to the post, which would automatically
		// persists the post and then the node too! to prevent this, we need to set it to null now.
		// it will be set to the persisted node in Node.addPost

		if (this.node.isTransient())
			this.node = null;

		if (resources) {
			for (var i in resources)
				this.resources.add(resources[i]);
			delete this.cache.resources;
		}
	}
});
