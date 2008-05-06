HopObject.inject({
	absoluteHref: function(action) {
		return getProperty("serverUri") + this.href(action);
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
	renderHtml: function(param) {
		param.title = param.title || this.getDisplayName && this.getDisplayName() || this.name;
		this.renderTemplate('html', param, res);
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
				var href = param.href ? param.href : param.container ? this.href('posts') : this.href();
				var htmlOptions = param.container ? { update: param.container } : null;
				var pages = pos > 0 ? [ renderLink('&lt;', { href: href, query: 'pos=' + (pos - 1) }, htmlOptions) ] : [];
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
						pages.push(renderLink(name, { href: href, query: 'pos=' + i }, htmlOptions));
				}
				if (pos < last)
					pages.push(renderLink('&gt;', { href: href, query: 'pos=' + (pos + 1) }, htmlOptions));
				else
					pages.push('<span>&gt;</span>');
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
		// Use this.cache.id instead of real _if if set, so transient
		// nodes can pretend to be another node. Used when transient nodes
		// are lost in the cache. See EditNode#initialize
		return this._prototype + '-' + (this.cache.id || this._id);
	},

	/**
	 * Radomly returns one entry from the list.
	 */
	getRandom: function() {
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
		}
	}
});
