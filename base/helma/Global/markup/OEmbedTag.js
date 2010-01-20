OEmbedTag = MarkupTag.extend(new function() {
	var settings = {};

	function getHost(url) {
		return (url.match(/^(?:\w+:\/\/)?(?:www\.)?([^:\/]+)/) || [])[1];
	}

	return {
		_tags: 'oembed,video',
		_attributes: 'url maxwidth maxheight',
		_endpoint: '',
		_prefix: '',
		_suffix: '',

		initialize: function() {
			// When creating a video or oembed tag with a full url, we
			// automatically match the included domain name (flickr.com,
			// vimeo.com, etc) against the various _prefix settings.
			// If a sub tag is found, its settings are used for rendering by
			// overriding the tags's prefix, suffix and endpoint setting.
			var url = this.attributes.url;
			if (url && this._tags.contains(this.name, ',')) {
				var values = settings[getHost(url)];
				if (values) {
					this._provider = values._provider;
					this._endpoint = values._endpoint;
					this._prefix = values._prefix;
					this._suffix = values._suffix;
				}
			}
		},

		render: function(content, param) {
			// Check cache to see if we already have the embed html
			var id = this.definition + '_' + (param.maxWidth || '') + '_' + (param.maxHeight || '');
			var obj = OEmbedTag.cache[id];
			// Support cache control through cache_age
			if ((!obj || obj.cache_age && (Date.now() - obj.time) / 1000 >= obj.cache_age)
			 		&& this.attributes.url) {
				// Get the embed html through the oEmbed API
				var url = this.attributes.url;
				// Support both urls and ids
				if (!Url.isRemote(url))
					url = this._prefix + url + this._suffix;
				var href = this._endpoint + '?url=' + encodeUrl(url);
				// Support global setting of maxWidth and maxHeight through param
				['maxWidth', 'maxHeight'].each(function(name) {
					var lower = name.toLowerCase();
					if (!this.attributes[lower] && param[name])
						this.attributes[lower] = param[name];
				}, this);
				for (var name in this.attributes)
					if (name != 'url')
						href += '&' + name + '=' + this.attributes[name];
				// Request json
				var json = Url.load(href + '&format=json', { timeout: 250 });
				var obj = Json.decode(json);
				if (obj) {
					// Youtube sometimes ignores maxWidth / height, so fix it here:
					if (param.maxWidth && obj.width > param.maxWidth ||
						param.maxHeight && obj.height > param.maxHeight) {
						var old = { width: obj.width, height: obj.height };
						var bar = obj.provider_name == 'YouTube' ? 25 : 0;
						var ratio = obj.width / (obj.height - bar);
						if (param.maxWidth && obj.width > param.maxWidth) {
							obj.width = param.maxWidth;
							obj.height = obj.width / ratio + bar;
						}
						if (param.maxHeight && obj.height > param.maxHeight) {
							obj.height = param.maxHeight;
							obj.width = ratio * (obj.height - bar);
						}
						if (obj.html)
							['width', 'height'].each(function(name) {
								obj.html = obj.html.replace(new RegExp(name + '=(?:["\']|)'
									+ old[name] + '(?:["\']|)', 'g'), name + '="' + obj[name] + '"');
							});
					}
					if (!obj.html) {
						// Compose html from the other info
						switch (obj.type) {
						case 'photo':
							obj.html = Html.image({
								width: obj.width,
								height: obj.height,
								src: obj.url,
								alt: obj.title
							});
							if (param.linkPhotos)
								obj.html = renderLink({ content: obj.html, href: url });
							break;
						default:
							User.log('ERROR: Unsupported oEmbed result: ' + json);
							return null;
						}
					}
					// Default value for cache age is 1 hour.
					if (!obj.cache_age)
						obj.cache_age = 3600;
					obj.time = Date.now();
					// TODO: Implement a cron job that clears the cache once per hour,
					// to remove tags that are not in use anymore and free memory?
					OEmbedTag.cache[id] = obj;
				} else {
					// We could not load the oEmbed data. Render a link instead,
					// using either content or the url minus protocol:
					return renderLink({
						href: url,
						content: content || encode(url.match(/^(?:\w+:\/\/)?(.*)$/)[1])
					});
				}
			}
			return obj && obj.html;
		},

		statics: {
			extend: function(src) {
				settings[getHost(src._prefix)] = src;
				return this.base(src);
			},

			cache: {}
		}
	};
});

YouTubeTag = OEmbedTag.extend({
	_tags: 'youtube',
	_endpoint: 'http://www.youtube.com/oembed',
	_prefix: 'http://www.youtube.com/watch?v='
});

VimeoTag = OEmbedTag.extend({
	_tags: 'vimeo',
	_endpoint: 'http://vimeo.com/api/oembed.json',
	_prefix: 'http://vimeo.com/',
	_suffix: '&color=ffffff&portrait=false&byline=false'
});

FlickrTag = OEmbedTag.extend({
	_tags: 'flickr',
	_endpoint: 'http://flickr.com/services/oembed',
	_prefix: 'http://www.flickr.com/photos/'
});

BlipTag = OEmbedTag.extend({
	_tags: 'blip',
	_endpoint: 'http://blip.tv/oembed/',
	_prefix: 'http://blip.tv/file/'
});
