HopObject.inject({
	absoluteHref: function(action) {
		return app.properties.serverUri + this.href(action);
	},

	instanceOf: function(ctor) {
		var proto = this.__proto__;
		while (proto && proto !== Object.prototype) {
			if (proto.constructor.name == ctor.name)
				return true;
			proto = proto.__proto__;
		}
		return false;
	},

	/**
	 * Parses the text into a helma skin and renders it. This will be deprecated
	 * in favour of Markup.js and Template.js
	 */
	renderText: function(text, out) {
		if (text) {
			var skin = createSkin(format(text));
			if (out == res)	this.renderSkin(skin);
			else {
				var str = this.renderSkinAsString(skin);
				if (out) out.write(str);
				else return str;
			}
		}
	},

	/**
	 * Render HTML is the method in base lib apps that's supposed to render the
	 * final result. This here is just a scafold, apps should provide their own.
	 * But since core parts rely on it to be there, here it is, along with a
	 * simple template.
	 */
	renderHtml: function(param, out) {
		param.title = param.title || this.getDisplayName && this.getDisplayName() || this.name;
		return this.renderTemplate('html', param, out);
	},

	/**
	 * Renders html for a popup window by using the popup.jstl instead of html.jst
	 * TODO: Maybe merge both templates using switches?
	 */
	renderPopup: function(param, out) {
		param.title = param.title || this.getDisplayName && this.getDisplayName() || this.name;
		return this.renderTemplate('popup', param, out);
	},

	/**
	 * Renders the navigation for a paginated ilst. param.position is read to determine the current position
	 * and set if it's undefined.
	 * param.maxPerPage specifies the amount of items per page
	 * ...
	 * TODO: Consider moving elsewhere?
	 */
	renderPagination: function(param, out) {
		var last = Math.max(0, Math.floor((param.count - 1) / param.maxPerPage));
		var pos = 0;
		if (req.data.pos != null) {
			pos = parseInt(req.data.pos);
		} else if (param.position) {
			pos = param.position;
		} 
		if (pos < 0) pos = last;
		param.position = pos;
		var index = pos * param.maxPerPage;
		// Render pagination only if needed:
		var multiPage = param.count > param.maxPerPage;
		if (multiPage || param.prefix) {
			if (multiPage) {
				// If we're loading into a container, request the action of the same name on the object.
				// This is convention, the only place this is used right now is for the loading of 'posts'.
				var href = param.href ? param.href : param.container ? this.href(param.container) : this.href();
				var pages = [ pos > 0
					? renderLink({ content: '&lt;', href: href, query: 'pos=' + (pos - 1), update: param.container })
					: '&lt;'
				];
				var step = 1;
				var num = last;
				while (num >= (step == 1 ? 15 : 7)) {
					step++;
					num = last / step; 
				}
				for (var i = 0; i <= last; i += step) {
					var name = i + 1;
					if (step > 1)
						name += '-' + (name + step - 1);
					if (pos >= i && pos < i + step)
						pages.push(name);
					else
						pages.push(renderLink({ content: name, href: href, query: 'pos=' + i, update: param.container }));
				}
				pages.push(pos < last
					? renderLink({ content: '&gt;', href: href, query: 'pos=' + (pos + 1), update: param.container })
					: '&gt;'
				);
				param.pages = pages.join('&nbsp;');
			}
			if (param.count > 0) {
				param.first = index + 1;
				param.last = Math.min(param.count, index + param.maxPerPage);
			}
			if (param.plural == null)
				param.plural = param.singular + 's';
			return this.renderTemplate('pagination', param, out);
		}
	},

	/**
	 * Returns the object's fulLId. This is the object's prototype and id
	 * seperated by a dash. This id can be used again to retrieve the object
	 * Through HopObject.get(fullId);
	 */
	getFullId: function() {
		// Use this.cache.creationId instead of real _if if set, so transient
		// nodes can pretend to be another node. Used when transient nodes
		// about to be created are lost in the cache, or when transient nodes
		// or forced to become persisted early, e.g. by adding a reference
		// to another persisted node before creation is finished.
		// See EditNode#initialize
		return this._prototype + '-' + (this.cache.creationId || this._id);
	},

	getParent: function() {
		// to be used wherever _parent is accessed, so apps can override
		// the way parents are handled (e.g. liento)
		return this._parent; // default is returning _parent
	},

	/**
	 * Radomly picks one entry from the list.
	 */
	pick: function() {
		return this.get(Math.rand(this.count()));
	},

	statics: {
		/**
		 * Takes either an id / prototype pair of a full id ("prototype-id")
		 * and returns the corresponding object, if any.
		 */
		get: function(id, prototype) {
			// Support fullId prototype-id notation for string parameters:
			if (id == null)
				return null;
			if (prototype == undefined) {
				// id is a fullId:
				var parts = id.split('-');
				prototype = parts[0];
				id = parts[1];
			}
			return HopObject.getById(id, prototype);
		},

		/**
		 * Returns object identified by a local url, or null if no object can be found.
		 */
		getByUrl: function(url) {
			var path = decodeUrl(url).split('/');
			var obj = root;
			for (var i = 0, l = path.length; i < l && obj != null; i++) {
				var name = path[i];
				if (name)
					obj = obj.getChildElement(name);
			}
			return obj;
		}
	}
});
