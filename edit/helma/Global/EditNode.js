EditNode = Base.extend({
	initialize: function(fullId, object) {
		// fullId: prototype-id-group
		var parts = fullId.split('-');
		if (!object) {
			var prototype = parts[0], id = parts[1];
			// If we're asked to produce a transient object that has gone in 
			// the meantime as the editData cache was lost, just reproduce a new
			// object that will be stored in the nodes cache under the
			// transient id of the old one.
			if (id[0] == 't') {
				User.log('WARNING: Lost transient object, producing new one (' + prototype + ', ' + id + ')');
				object = new global[prototype]();
				// Pass previously associated id, so this object's node can
				// still be found in EditNode.get. See HopObject#getFullId
				object.setCreating(true, id);
			} else {
				object = HopObject.get(id, prototype);
			}
		}
		this.object = object;
		this.id = fullId;
		this.group = parts[2];
		// Nodes are by default invisible, and get visible only when they are rendered.
		this.visible = false;
	},

	/** 
	 * Instead of directly storing the form in EditNode.get, use getForms to
	 * retrieve it late. Like this, we have time to call onAfterInitialize
	 * before getEditForm is called. 
	 */
	getForm: function(force) {
		// Use versioning so even when dontCache is true, the form is only created
		// once every request.
		var data = EditNode.getEditData();
		if (!this.form || force || this.form.dontCache || this.form.version != data.version) {
			try {
				if (!this.object.getEditForm)
					throw "The '" + this.object._prototype + "' prototype does not define #getEditForm (" + this.object + ")";
				// Pass empty param object, default mode
				this.form = this.object.getEditForm({});
				this.form.id = this.id;
				this.form.node = this;
				// update version
				this.form.version = data.version;
				// support groups:
				if (this.group)
					this.form = this.form.getGroupForm(this.group);
			} catch (e) {
				EditForm.reportError(e);
			}
		}
		return this.form;
	},

	getItem: function(name, group) {
		return this.getForm().getItem(name, group);
	},

	render: function(base, mode) {
		var form = null;
		if (this.object.getEditForm && User.canEdit(this.object)) {
			// TODO: Does groupForm still work?
			if (this.parentItem && this.parentItem.type == 'group') {
				form = this.parentItem.groupForm;
			} else {
				form = this.getForm();
			}
		}
		if (!form)
			form = new EditForm(EditForm.NOT_ALLOWED);
		this.visible = true;
		form.render(base, mode, this, this.parentItem);
	},

	getTitle: function() {
		// Use node as a cache for title. This is also used
		// in EditForm.renderTitle
		var form = this.getForm();
		var title = this.title || form.title;
		if (!title) {
			// generate a default title if it's not set.
			var obj = this.object;
			if (obj.isCreating()) {
				title = 'Create ' + obj._prototype.uncamelize();
			} else {
				title = EditForm.getEditName(obj);
			}
			title = this.title = encode(title);
		}
		return title;
	},

	log: function(mode) {
		var str = mode.capitalize() + ': ' + this.id + ' (' + this.object;
		var form = this.getForm();
		if (form && form.object != this.object)
			str += ', ' + form.object;
		str += '); Parameters: ';
		for (var name in req.data) {
			var val = req.data[name];
			if (name != 'edit_data' && val && /^edit_/.test(name))
				str += name + '=' + decodeUrl(val) + '; ';
		}
		User.log(str);
	},

	statics: {
		get: function(fullIdOrObject, parentItem, cached) {
			var data = EditNode.getEditData(cached);
			var node = null;
			if (data) {
				var object = null, fullId;
				if (fullIdOrObject._id != null) {
					object = fullIdOrObject;
					fullId = object.getFullId();
				} else {
					fullId = fullIdOrObject;
				}
				node = data.nodes[fullId];
				if (!cached && !node)
					node = data.nodes[fullId] = new EditNode(fullId, object);
				// Update parent.
				// It might be requried in getEditForm(), e.g. getEditParent()
				if (node && parentItem) {
					node.parentItem = parentItem;
					// Allways access the root form to get the node,
					// as parenItem.form might be a group
					node.parent = parentItem.form.root.node;
				}
			}
			return node;
		},

		/**
		 * Same as get(), but does not create nodes if they do not exist.
		 */
		getCached: function(fullIdOrObject, parentItem) {
			return this.get(fullIdOrObject, parentItem, true);
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
				editData.nodes = editData.nodes.each(function(val, fullId) {
					if (clientData.nodes[fullId])
						this[fullId] = val;
				}, {});
				// Now make sure all client nodes exist, and create if necessary
				clientData.nodes.each(function(clientNode, fullId) {
					var parent = clientNode.parent;
					var node = EditNode.get(fullId, parent && EditNode.get(parent.id).getItem(parent.item, parent.group));
					node.visible = clientNode.visible;
				});
				editData.version = clientData.version;
			}
		},
	}
});