Request = Base.extend(new function() {
	var dateFormat = new java.text.SimpleDateFormat('EEE, dd-MMM-yy HH:mm:ss z');

	function parseCookie(cookieStr) {
		if (cookieStr != null) {
			var pattern = /([^=;]+)=?([^;]*)(?:;\s*|$)/g;
			var cookie = {};
			var m = pattern.exec(cookieStr);
			if (m) {
				cookie.name = m[1].trim();
				cookie.value = m[2] ? m[2].trim() : '';
			}
			while ((m = pattern.exec(cookieStr)) != null) {
				var key = m[1].trim();
				var value = m[2] ? m[2].trim() : '';
				switch (key.toLowerCase()) {
					case 'expires':
						// try to parse the expires date string into a date object
						try {
							cookie.expires = dateFormat.parse(value);
						} catch (e) {
							// ignore
						}
						break;
					default:
						cookie[key.toLowerCase()] = value;
						break;
				}
			}
			return cookie;
		}
		return null;
	}

	return {
		initialize: function(param) {
			// TODO: Add support for date / etag
			// TODO: Convert to using options / setOptions
			this.method = Base.pick(param.method, 'get');
			this.headers = Base.pick(param.headers, {});
			// TODO: Add support for app.properties.httpUserAgent
			this.userAgent = Base.pick(param.userAgent, 'Helma Http Client');
			this.binaryMode = Base.pick(param.binaryMode, false);
			this.followRedirects = Base.pick(param.followRedirects, true);
			var timeout = Base.pick(param.timeout, 0);
			this.connectTimeout = Base.pick(param.connectTimeout, timeout);
			this.readTimeout = Base.pick(param.readTimeout, timeout);
			this.cookies = Base.pick(param.cookies, {});
			this.maxResponseSize = param.maxResponseSize;
			this.json = param.json;
			if (this.json) {
				this.setHeader('Accept', 'application/json');
				this.setHeader('X-Request', 'JSON');
			}
			this.url = param.url;
			if (param.proxy)
				this.setProxy(param.proxy);
			if (param.credentials)
				this.setCredentials(param.credentials[0], param.credentials[1]);
			if (param.data)
				this.setData(param.data);
			if (param.responseHandler)
				this.responseHandler = param.responseHandler;
		},
	
		responseHandler: function(connection, result) {
			var input;
			try {
				input = new java.io.BufferedInputStream(connection.getInputStream());
			} catch (e) {
				input = new java.io.BufferedInputStream(connection.getErrorStream());
			}
			if (input) {
				var body = new java.io.ByteArrayOutputStream();
				var buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 1024);
				var len;
				var currentSize = 0;
				while ((len = input.read(buf)) > -1) {
					body.write(buf, 0, len);
					currentSize += len;
					if (this.maxResponseSize && currentSize > this.maxResponseSize)
					throw new Error('Maximum allowed response size is exceeded');
				}
				try {
					input.close();
				} catch (error) {
					// safe to ignore 
				}
				if (this.binaryMode && (result.code >= 200 && result.code < 300)) {
					// only honor binaryMode if the request succeeded
					result.data = body.toByteArray();
				} else {
					result.data = result.charset
						? body.toString(result.charset)
						: body.toString();
				}
				// adjust content length
				if (result.data)
					result.length = result.data.length;
				if (this.json && result.data)
					result.data = Json.decode(result.data);
			}
		},
	
		/**
			* Sets the proxy host and port for later use. The argument must
			* be in <code>host:port</code> format (eg. 'proxy.example.com:3128').
			* @param {String} proxyString The proxy to use for this request
			* @see #getProxy
			*/
		setProxy: function(proxyString) {
			var idx = proxyString.indexOf(':');
			var host = proxyString.substring(0, idx);
			var port = proxyString.substring(idx + 1);
			// construct a proxy instance
			var socket = new java.net.InetSocketAddress(host, port);
			this.proxy = new java.net.Proxy(java.net.Proxy.Type.HTTP, socket);
			return;
		},

		/**
			* Returns the proxy in <code>host:port</code> format
			* @return The proxy defined for this request
			* @type String
			* @see #setProxy
			*/
		getProxy: function() {
			var proxy;
			if (this.proxy) {
				return this.proxy.address().getHostName() + ':' + this.proxy.address().getPort();
			} else {
				var sys = java.lang.System.getProperties();
				if (sys.get('http.proxySet') == 'true')
					return sys.get('http.proxyHost') + ':' + sys.get('http.proxyPort');
			}
		},

		setHeader: function(headers, value) {
			this.headers[headers] = value;
		},

		/**
			* Sets the credentials for basic http authentication
			* @param {String} username The username
			* @param {String} password The password
			*/
		setCredentials: function(username, password) {
			this.credentials = encodeBase64(username + ':' + password);
		},

		/**
			* Sets the data to send to the remote server within this request.
			* @param {String|Object} stringOrObject The data of the request, which
			* can be either a string or an object. In the latter case all properties
			* and their values are concatenated into a single string.
			* If a property is an array, then for each value the propertyname and value pair is added.
			* If the name of an array property ends with '_array' then the _array part is removed.
			*/
		setData: function(stringOrObject) {
			if (stringOrObject != null) {
				if (stringOrObject instanceof Object) {
					var value;
					var string = '';
					for (var key in stringOrObject) {
						value = stringOrObject[key];
						// TODO: Use array / flatten / join('&') instead?
						if (value instanceof Array) {
							for (var i = 0; i < value.length; i++) {
								string += encodeURIComponent(key) + '=' + encodeURIComponent(value[i]) + '&';
							}		
						} else {
							string += encodeURIComponent(key) + '=' + encodeURIComponent(stringOrObject[key]) + '&';
						}
					}				
					this.data = string.substring(0, string.length - 1);
				} else {
					this.data = stringOrObject;
				}
			} else {
				this.data = null;
			}
		},

		/**
		 * Executes a http request
		 * @param url The url to request
		 * @return A result object containing the following properties:
		 * 
		 * url The Url of the request
		 * location The value of the location header field
		 * code The HTTP response code
		 * message An optional HTTP response message
		 * length The content length of the response
		 * type The mimetype of the response
		 * charset The character set of the response
		 * encoding An optional encoding to use with the response
		 * lastModified The value of the lastModified response header field
		 * eTag The eTag as received from the remote server
		 * cookie An object containing the cookie parameters, if the remote
		 *        server has set the 'Set-Cookie' header field
		 * headers A map object containing the headers
		 * data The response received from the server. Can be either
		 *       a string or a byte array (see #setBinaryMode)
		 */
		send: function(param) {
			try {
				if (!param)
					param = {};
				if (param.url)
					this.url = param.url;
				if (param.method)
					this.method = param.method;
				var url = this.url;
				if (this.method == 'get' && this.data)
					url += (url.indexOf('?') == -1 ? '?' : '&') + this.data;
				if (typeof url == 'string')
					url = new java.net.URL(url);
	
				var con = this.proxy ? url.openConnection(this.proxy) : url.openConnection();
				// Note: we must call setInstanceFollowRedirects() instead of
				// static method setFollowRedirects(), as the latter will
				// set the default value for all url connections, and will not work for
				// url connections that have already been created.
				if (this.method == 'put')
					con.setRequestProperty('Content-Type', 'application/x-www-form-urlencoded');
				con.setInstanceFollowRedirects(this.followRedirects);
				con.setAllowUserInteraction(false);
				con.setRequestMethod(this.method.toUpperCase());
				con.setRequestProperty('User-Agent', this.userAgent);

				// if (opt) {
				// 	if (opt instanceof Date)
				// 		con.setIfModifiedSince(opt.getTime());
				// 	else if ((typeof opt == 'string') && (opt.length > 0))
				// 		con.setRequestProperty('If-None-Match', opt);
				// }

				var userinfo;
				if (userinfo = url.getUserInfo()) {
					userinfo = userinfo.split(':', 2);
					this.setCredentials(userinfo[0], userinfo[1]);
				}
				if (this.credentials != null)
					con.setRequestProperty('Authorization', 'Basic ' + this.credentials);
				if (this.connectTimeout)
					con.setConnectTimeout(this.connectTimeout);
				if (this.readTimeout)
					con.setReadTimeout(this.readTimeout);
				// set header fields
				for (var i in this.headers) {
					con.setRequestProperty(i, this.headers[i]);
				}
				// set cookies
				var arr = [];
				for (var i in this.cookies) {
					arr[arr.length] = i + '=' + this.cookies[i];
				}
				if (arr.length)
					con.setRequestProperty('Cookie', arr.join(';'));
				// set content
				if (this.data && this.method != 'get') {
					con.setRequestProperty('Content-Length', this.data.length);
					con.setDoOutput(true);
					var out = new java.io.OutputStreamWriter(con.getOutputStream());
					out.write(this.data);
					out.flush();
					out.close();
				}

				var response = {
					url: con.getURL(),
					location: con.getHeaderField('location'),
					status: con.getResponseCode(),
					message: con.getResponseMessage(),
					length: con.getContentLength(),
					type: con.getContentType(),
					encoding: con.getContentEncoding(),
					lastModified: null,
					eTag: con.getHeaderField('ETag'),
					cookies: null,
					headers: con.getHeaderFields(),
					data: null
				};
			
				// set error to true when the response code starts with a 4 or 5
				// http://en.wikipedia.org/wiki/List_of_HTTP_status_codes#4xx_Client_Error
				// http://en.wikipedia.org/wiki/List_of_HTTP_status_codes#5xx_Server_Error
				response.error = /^[45]/.test(response.status);
			
				// parse all 'Set-Cookie' header fields into an array of objects
				var setCookies = con.getHeaderFields().get('Set-Cookie');
				if (setCookies != null) {
					var cookies = {};
					for (var i = 0; i < setCookies.size(); i++) {
						var cookie = parseCookie(setCookies.get(i));
						if (cookie)
							cookies[cookie.name] = cookie;
					}
					response.cookies = cookies;
				}

				var lastMod = con.getLastModified();
				if (lastMod)
					response.lastModified = new Date(lastMod);

				if (this.maxResponseSize && response.length > this.maxResponseSize)
						throw new Error('Maximum allowed response size is exceeded');

				var pos = response.type && response.type.indexOf('charset=');
				if (pos > 0) {
					var charset = response.type.substring(pos + 8);
					charset = charset.replace(/[;']/g, '').trim();
					response.charset = charset;
				}

				// invoke response handler
				this.responseHandler(con, response);

				con.disconnect();
				return response;
			} catch (e) {
				return {
					error: true,
					// TODO: An exception is not a response message. Find a way
					// to distinguish them.
					message: e
				}
			}
		}
	}
});
