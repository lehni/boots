OEmbedTag = MarkupTag.extend(new function() {
	var providers = {};
	var cache = {};

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
			if (!this._endpoint && this.attributes.url) {
				// When creating a video or oembed tag with a full url, we
				// automatically match the included domain name (flickr.com,
				// vimeo.com, etc) against the various _prefix settings.
				// If a sub tag is found, its settings are used for rendering by
				// overriding the tags's prefix, suffix and endpoint setting.
				var settings = providers[getHost(this.attributes.url)];
				if (settings) {
					this._provider = settings._provider;
					this._endpoint = settings._endpoint;
					this._prefix = settings._prefix;
					this._suffix = settings._suffix;
				}
			}
		},

		render: function(content, param) {
			var data = OEmbedTag.getData(this.attributes, param, this);
			if (data) {
				return data.html;
			} else {
				// We could not load the oEmbed data. Render a link instead,
				// using either content or the url minus protocol:
				var url = this.attributes.url;
				return renderLink({
					href: url,
					content: content || encode(url.match(/^(?:\w+:\/\/)?(.*)$/)[1])
				});
			}
		},

		statics: {
			extend: function(src) {
				// Store the _provider / _endpoint / _prefix / _suffix settings
				// for this provider.
				providers[getHost(src._prefix)] = src;
				return this.base(src);
			},

			getData: function(attributes, param, settings) {
				var id = [attributes.url, attributes.maxwidth || param.maxWidth, attributes.maxheight || param.maxHeight].join(' ');
				var data = cache[id];
				// Support cache control through cache_age
				if ((!data || data.cache_age && (Date.now() - data.time) / 1000 >= data.cache_age)
				 		&& attributes.url) {
					// Get the embed html through the oEmbed API
					var url = attributes.url;
					// If settings is not set yet, get it from providers
					if (!settings) {
						settings = providers[getHost(url)];
						if (!settings)
							return null;
					}
					// Support both urls and ids
					if (!Url.isRemote(url))
						url = settings._prefix + url + settings._suffix;
					var href = settings._endpoint + '?url=' + encodeUrl(url);
					// Support global setting of maxWidth and maxHeight through param
					attributes.maxwidth = attributes.maxwidth || param.maxWidth;
					attributes.maxheight = attributes.maxheight || param.maxHeight;
					for (var name in attributes)
						if (name != 'url')
							href += '&' + name + '=' + attributes[name];
					// Request json
					var json = Url.load(href + '&format=json', { timeout: param.timeout || 500 });
					var data = json && Json.decode(json);
					if (data) {
						// Youtube sometimes ignores maxWidth / height, so fix it here:
						if (param.maxWidth && data.width > param.maxWidth ||
							param.maxHeight && data.height > param.maxHeight) {
							var old = { width: data.width, height: data.height };
							var bar = data.provider_name == 'YouTube' ? 25 : 0;
							var ratio = data.width / (data.height - bar);
							if (param.maxWidth && data.width > param.maxWidth) {
								data.width = param.maxWidth;
								data.height = data.width / ratio + bar;
							}
							if (param.maxHeight && data.height > param.maxHeight) {
								data.height = param.maxHeight;
								data.width = ratio * (data.height - bar);
							}
							if (data.html)
								['width', 'height'].each(function(name) {
									data.html = data.html.replace(new RegExp(name + '=(?:["\']|)'
										+ old[name] + '(?:["\']|)', 'g'), name + '="' + data[name] + '"');
								});
						}
						if (!data.html) {
							// Compose html from the other info
							switch (data.type) {
							case 'photo':
								data.html = Html.image({
									width: data.width,
									height: data.height,
									src: data.url,
									alt: data.title
								});
								if (param.linkPhotos)
									data.html = renderLink({ content: data.html, href: url });
								break;
							default:
								User.log('ERROR: Unsupported oEmbed result: ' + json);
								return null;
							}
						}
						// Default value for cache age is 1 hour.
						if (!data.cache_age)
							data.cache_age = 3600;
						data.time = Date.now();
						// TODO: Implement a cron job that clears the cache once per hour,
						// to remove tags that are not in use anymore and free memory?
						cache[id] = data;
					}
				}
				return data;
			}
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
