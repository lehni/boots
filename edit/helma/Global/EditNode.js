EditNode = Base.extend({
	initialize: function(editId, object) {
		// editId: prototype-id-group
		var parts = editId.split('-');
		if (!object) {
			var proto = parts[0], id = parts[1];
			// If we're asked to produce a transient object that has gone in 
			// the meantime as the editData cache was lost, just reproduce a new
			// object that will be stored in the nodes cache under the
			// transient id of the old one.
			if (id[0] == 't') {
				User.log('WARNING: Lost transient object, producing new one (' + proto + ', ' + id + ')');
				object = new global[proto]();
				// Store previously associated id in cache._id, so this object's node can
				// still be found in EditNode.get. See HopObject#getEditId
				object.cache.id = id;
				object.setCreating(true);
			} else {
				object = HopObject.get(proto, id);
			}
		}
		this.object = object;
		this.id = editId;
		this.group = parts[2];
		// Nodes are by default invisible, and get visible only when they are rendered.
		this.visible = false;
	},

	update: function(parentItem) {
		// Use versioning so even when dontCache is true, the form is only created
		// once every request.
		var data = EditNode.getEditData();
		// Update parent first, since it might be requried in getEditForm(),
		// e.g. getEditParent()
		if (parentItem) {
			this.parentItem = parentItem;
			// Allways access the root form to get the node,
			// as parenItem.form might be a group
			this.parent = parentItem.form.root.node;
		}
		if (!this.form || this.form.dontCache && this.form.version != data.request) {
			try {
				if (!this.object.getEditForm)
					throw "The '" + this.object._prototype + "' prototype does not define 'getEditForm' (" + this.object + ")";
				// Pass empty param object, default mode
				this.form = this.object.getEditForm({});
				this.form.id = this.id;
				this.form.node = this;
				// update version
				this.form.version = data.request;
				// support groups:
				if (this.group)
					this.form = this.form.getGroupForm(this.group);
			} catch (e) {
				EditForm.reportError(e);
			}
		}
	},

	render: function(base, mode) {
		var form = null;
		if (this.object.getEditForm && User.canEdit(this.object)) {
			// TODO: Does groupForm still work?
			if (this.parentItem && this.parentItem.type == 'group') {
				form = this.parentItem.groupForm;
			} else {
				form = this.form;
			}
		}
		if (!form)
			form = new EditForm(EditForm.NOT_ALLOWED);
		this.visible = true;
		form.render(base, mode, this, this.parentItem);
	},

	getTitle: function() {
		// use node as a cache for title. This is also used
		// in StackEntry.renderPath
		var title = this.title || this.form.title;
		if (!title) {
			// generate a default title if it's not set.
			var obj = this.object;
			if (obj.isCreating()) {
				title = 'Create ' + obj._prototype.uncamelize(' ', false);
			} else {
				title = EditForm.getEditName(obj);
			}
			title = this.title = encode(title);
		}
		return title;
	},

	log: function(mode) {
		var str = mode.capitalize() + ': ' + this.id + ' (' + this.object;
		if (this.form && this.form.object != this.object)
			str += ', ' + this.form.object;
		str += '); Parameters: ';
		for (var name in req.data) {
			var val = req.data[name];
			if (name != 'edit_data' && val && /^edit_/.test(name))
				str += name + '=' + decodeUrl(val) + '; ';
		}
		User.log(str);
	},

	statics: {
		get: function(id, parentItem, fetchForm, cached) {
			var data = EditNode.getEditData(cached);
			var node = null;
			if (data) {
				var object = null;
				if (id._id != null) {
					object = id;
					id = object.getEditId();
				}
				node = data.nodes[id];
				if (!cached) {
					if (!node)
						node = data.nodes[id] = new EditNode(id, object);
					// Remove any old forms if the fetching of a new form is required.
					if (fetchForm)
						delete node.form;
					node.update(parentItem);
				}
			}
			return node;
		},

		/**
		 * Same as get(), but does not create nodes if they do not exist.
		 */
		getCached: function(id, parentItem) {
			return this.get(id, parentItem, false, true);
		},

		getEditData: function(cached) {
			// Returns all the edit data cached per session on the server.
			// As the session cache might get purged, or the session might
			// expire, do not rely on these things to be there all the time.
			// Instead, the client sends the value edit_data with each request,
			// containing all the information to rebuild the nodes again.
			// This data is sent by the server to the client when the forms
			// are rendered the first time.
			// onRequest() checks the client data and synchronizes
			// with the server if needed.
			// - nodes contains all the EditNode objects, which themselves
			// store the hierarchical information that the client sends in
			// nodes.
			// - version is the version of the parents data sent by the client
			// synchronized with nodes on the server.
			// - request is an increasing request id, used to cache forms 
			// per request, even when they set the dontCache flag
			var data = session.data.editData;
			if (!data && !cached) {
				User.log('Starting with new EditData');
				data = session.data.editData = {
					nodes: {},
					request: 0,
					version: 0
				};
			}
			return data;
		},

		onRequest: function() {
			var clientData = Json.decode(req.data.edit_data);
			var editData = EditNode.getEditData();
			if (clientData && editData.version != clientData.version) {
				User.log('Edit Nodes: ' + req.data.edit_data);
				// Synchronize the local node cache with the client sided
				// version.
				// Filter out nodes that do not have a listing in nodes
				editData.nodes = editData.nodes.each(function(val, id) {
					if (clientData.nodes[id])
						this[id] = val;
				}, {});
				// Now make sure all client nodes exist, and create if necessary
				clientData.nodes.each(function(clientNode, id) {
					var parent = clientNode.parent;
					var node = EditNode.get(id, parent && EditNode.get(parent.id).form.getItem(parent.item, parent.group));
					node.visible = clientNode.visible;
				});
				editData.version = clientData.version;
				editData.request = clientData.request;
			}
		},
	}
});