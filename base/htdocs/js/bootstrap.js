new function() { 
	function inject(dest, src, base, generics) {
		function field(name, generics) {
			var val = src[name], res = val, prev = dest[name];
			if (val !== Object.prototype[name]) {
				if (typeof val == 'function') {
					if (generics) generics[name] = function(bind) {
						return bind && dest[name].apply(bind,
							Array.prototype.slice.call(arguments, 1));
					}
					if (prev && /\bthis\.base\b/.test(val)) {
						var fromBase = base && base[name] == prev;
						res = (function() {
							var tmp = this.base;
							this.base = fromBase ? base[name] : prev;
							try { return val.apply(this, arguments); }
							finally { this.base = tmp; }
						}).pretend(val);
					}
				}
				dest[name] = res;
			}
		}
		if (src) {
			for (var name in src)
				if (visible(src, name) && !/^(prototype|constructor|toString|valueOf|statics|_generics)$/.test(name))
					field(name, generics);
			field('toString');
			field('valueOf');
		}
	}

	function extend(obj) {
		function ctor(dont) {
			if (this.initialize && dont !== ctor.dont)
				return this.initialize.apply(this, arguments);
		}
		ctor.prototype = obj;
		return ctor;
	}

	function visible(obj, name) {
		return obj[name] !== obj.__proto__[name]&& name.indexOf('__') != 0;
	}

	inject(Function.prototype, {
		inject: function(src) {
			var proto = this.prototype, base = proto.__proto__ && proto.__proto__.constructor;
			inject(proto, src, base && base.prototype, src && src._generics && this);
			inject(this, src && src.statics, base);
			for (var i = 1, j = arguments.length; i < j; i++)
				this.inject(arguments[i]);
			return this;
		},

		extend: function(src) {
			var proto = new this(this.dont), ctor = proto.constructor = extend(proto);
			ctor.dont = {};
			inject(ctor, this);
			return this.inject.apply(ctor, arguments);
		},

		pretend: function(fn) {
			this.toString = function() {
				return fn.toString();
			}
			this.valueOf = function() {
				return fn.valueOf();
			}
			return this;
		}
	});

	Base = Object.extend({
		has: function(name) {
			return visible(this, name);
		},

		inject: function() {
			for (var i = 0, j = arguments.length; i < j; i++)
				inject(this, arguments[i]);
			return this;
		},

		extend: function() {
			var res = new (extend(this));
			return res.inject.apply(res, arguments);
		}
	});
}

Function.inject(new function() {
	function timer(that, type, args, ms) {
		var fn = that.bind.apply(that, Array.slice(args, 1));
		var timer = window['set' + type](fn, ms);
		fn.clear = function() {
			clearTimeout(timer);
			clearInterval(timer);
		};
		return fn;
	}

	return {
		_generics: true,

		name: function() {
			var match = this.toString().match(/^\s*function\s*(\w*)/);
			return match && match[1];
		},

		parameters: function() {
			var str = this.toString().match(/^\s*function[^\(]*\(([^\)]*)/)[1];
			return str ? str.split(/\s*,\s*/) : [];
		},

		body: function() {
			return this.toString().match(/^\s*function[^\{]*\{([\s\S]*)\}\s*$/)[1];
		},

		delay: function(ms) {
			return timer(this, 'Timeout', arguments, ms);
		},

		periodic: function(ms) {
			return timer(this, 'Interval', arguments, ms);
		},

		bind: function(obj) {
			var that = this, args = Array.slice(arguments, 1);
			return function() {
				return that.apply(obj, args.concat(Array.create(arguments)));
			}
		},

		attempt: function(obj) {
			var that = this, args = Array.slice(arguments, 1);
			return function() {
				try {
					return that.apply(obj, args.concat(Array.create(arguments)));
				} catch(e) {
					return e;
				}
			}
		}
	}
});

Enumerable = new function() {
	Base.iterate = function(fn, name) {
		return function(iter, bind) {
			if (!iter) iter = function(val) { return val };
			else if (typeof iter != 'function') iter = function(val) { return val == iter };
			if (!bind) bind = this;
			var prev = bind[name];
			bind[name] = iter;
			try { return fn.call(this, iter, bind, this); }
			finally { prev ? bind[name] = prev : delete bind[name] }
		};
	};

	Base.stop = {};

	var each_Array = Array.prototype.forEach || function(iter, bind) {
		for (var i = 0, j = this.length; i < j; ++i)
			bind.__each(this[i], i, this);
	};

	var each_Object = function(iter, bind) {
		for (var i in this) {
			var val = this[i];
			if (val !== this.__proto__[i]&& i.indexOf('__') != 0)
				bind.__each(val, i, this);
		}
	};

	return {
		_generics: true,

		each: Base.iterate(function(iter, bind) {
			try { (this.length != null ? each_Array : each_Object).call(this, iter, bind); }
			catch (e) { if (e !== Base.stop) throw e; }
			return bind;
		}, '__each'),

		findEntry: Base.iterate(function(iter, bind, that) {
			return this.each(function(val, key) {
				this.result = bind.__findEntry(val, key, that);
				if (this.result) {
					this.key = key;
					this.value = val;
					throw Base.stop;
				}
			}, {});
		}, '__findEntry'),

		find: function(iter, bind) {
			return this.findEntry(iter, bind).result;
		},

		remove: function(iter, bind) {
			var entry = this.findEntry(iter, bind);
			delete this[entry.key];
			return entry.value;
		},

		some: function(iter, bind) {
			return this.find(iter, bind) != null;
		},

		every: Base.iterate(function(iter, bind, that) {
			return this.find(function(val, i) {
				return !this.__every(val, i, that);
			}, bind) == null;
		}, '__every'),

		map: Base.iterate(function(iter, bind, that) {
			return this.each(function(val, i) {
				this[this.length] = bind.__map(val, i, that);
			}, []);
		}, '__map'),

		filter: Base.iterate(function(iter, bind, that) {
			return this.each(function(val, i) {
				if (bind.__filter(val, i, that))
					this[this.length] = val;
			}, []);
		}, '__filter'),

		max: Base.iterate(function(iter, bind, that) {
			return this.each(function(val, i) {
				val = bind.__max(val, i, that);
				if (val >= (this.max || val)) this.max = val;
			}, {}).max;
		}, '__max'),

		min: Base.iterate(function(iter, bind, that) {
			return this.each(function(val, i) {
				val = bind.__min(val, i, that);
				if (val <= (this.min || val)) this.min = val;
			}, {}).min;
		}, '__min'),

		pluck: function(prop) {
			return this.map(function(val) {
				return val[prop];
			});
		},

		sortBy: Base.iterate(function(iter, bind, that) {
			return this.map(function(val, i) {
				return { value: val, compare: bind.__sortBy(val, i, that) };
			}, bind).sort(function(left, right) {
				var a = left.compare, b = right.compare;
				return a < b ? -1 : a > b ? 1 : 0;
			}).pluck('value');
		}, '__sortBy'),

		toArray: function() {
			return this.map();
		}
	};
}

Base.inject({
	_generics: true,

	each: Enumerable.each,

	debug: function() {
		return /^(string|number|function|regexp)$/.test(Base.type(this)) ? this
			: this.each(function(val, key) { this.push(key + ': ' + val); }, []).join(', ');
	},

	clone: function() {
		return Base.each(this, function(val, i) {
			this[i] = val;
		}, new this.constructor());
	},

	statics: {
		inject: function() {
			var args = arguments;
			Base.each([Array, Number, RegExp, String], function(ctor) {
				ctor.inject.apply(ctor, args);
			});
			return this.base.apply(this, args);
		},

		extend: function() {
			var ret = this.base();
			ret.extend = Function.extend;
			ret.inject = Function.inject;
			ret.inject.apply(ret, arguments);
			return ret;
		},

		check: function(obj) {
			return !!(obj || obj === 0);
		},

		type: function(obj) {
			return (obj || obj === 0) && ((obj._type || obj.nodeName && obj.nodeType == 1 && 'element') || typeof obj) || null;
		}
	}

}, Base.prototype);

$each = Base.each;
$stop = $break = Base.stop;
$check = Base.check;
$type = Base.type;

Hash = Base.extend(Enumerable, {
	_generics: true,

	initialize: function() {
		return this.merge.apply(this, arguments);
	},

	merge: function() {
		return Base.each(arguments, function(obj) {
			Base.each(obj, function(val, key) {
				this[key] = Base.type(this[key]) == 'object'
					? Hash.prototype.merge.call(this[key], val) : val;
			}, this);
		}, this);
	},

	keys: function() {
		return this.map(function(val, key) {
			return key;
		});
	},

	values: Enumerable.toArray,

	statics: {
		create: function(obj) {
			return arguments.length == 1 && obj.constructor == Hash
				? obj : Hash.prototype.initialize.apply(new Hash(), arguments);
		}
	}
});

$H = Hash.create;

Array.inject(new function() {
	var proto = Array.prototype;
	var fields = Hash.merge({}, Enumerable, {
		_generics: true,
		_type: 'array',

		indexOf: proto.indexOf || function(obj, i) {
			i = i || 0;
			if (i < 0) i = Math.max(0, this.length + i);
			for (var j = this.length; i < j; ++i)
				if (this[i] == obj) return i;
			return -1;
		},

		lastIndexOf: proto.lastIndexOf || function(obj, i) {
			i = i != null ? i : this.length - 1;
			if (i < 0) i = Math.max(0, this.length + i);
			for (; i >= 0; i--)
				if (this[i] == obj) return i;
			return -1;
		},

		filter: Base.iterate(proto.filter || function(iter, bind, that) {
			var res = [];
			for (var i = 0, j = this.length; i < j; ++i)
				if (bind.__filter(this[i], i, that))
					res[res.length] = this[i];
			return res;
		}, '__filter'),

		map: Base.iterate(proto.map || function(iter, bind, that) {
			var res = new Array(this.length);
			for (var i = 0, j = this.length; i < j; ++i)
				res[i] = bind.__map(this[i], i, that);
			return res;
		}, '__map'),

		every: Base.iterate(proto.every || function(iter, bind, that) {
			for (var i = 0, j = this.length; i < j; ++i)
				if (!bind.__every(this[i], i, that))
					return false;
			return true;
		}, '__every'),

		some: Base.iterate(proto.some || function(iter, bind, that) {
			for (var i = 0, j = this.length; i < j; ++i)
				if (bind.__some(this[i], i, that))
					return true;
			return false;
		}, '__some'),

		reduce: proto.reduce || function(fn, value) {
			var i = 0;
			if (arguments.length < 2 && this.length) value = this[i++];
			for (var l = this.length; i < l; i++)
				value = fn.call(null, value, this[i], i, this);
			return value;
		},

		findEntry: function(iter, bind) {
			if (iter && !/^(function|regexp)$/.test(Base.type(iter))) {
				var i = this.indexOf(iter);
				return { key: i != -1 ? i : null, value: this[i], result: i != -1 };
			}
			return Enumerable.findEntry.call(this, iter, bind);
		},

		remove: function(iter, bind) {
			var entry = this.findEntry(iter, bind);
			if (entry.key != null)
				this.splice(entry.key, 1);
			return entry.value;
		},

		toArray: function() {
			var res = this.concat([]);
			return res[0] == this ? Enumerable.toArray.call(this) : res;
		},

		clone: function() {
			return this.toArray();
		},

		clear: function() {
			this.length = 0;
		},

		first: function() {
			return this[0];
		},

		last: function() {
			return this[this.length - 1];
		},

		compact: function() {
			return this.filter(function(value) {
				return value != null;
			});
		},

		append: function(items) {
			for (var i = 0, j = items.length; i < j; ++i)
				this.push(items[i]);
			return this;
		},

		subtract: function(items) {
			for (var i = 0, j = items.length; i < j; ++i)
				Array.remove(this, items[i]);
			return this;
		},

		associate: function(obj) {
			if (obj.length != null) {
				var that = this;
				return Base.each(obj, function(name, index) {
					this[name] = that[index];
					if (index == that.length) throw Base.stop;
				}, {});
			} else {
				obj = Hash.create(obj);
				return Base.each(this, function(val) {
					var type = Base.type(val);
					obj.each(function(hint, name) {
						if (hint == 'any' || type == hint) {
							this[name] = val;
							delete obj[name];
							throw Base.stop;
						}
					}, this);
				}, {});
			}
		},

		flatten: function() {
			return this.each(function(val) {
				if (val != null && val.flatten) this.append(val.flatten());
				else this.push(val);
			}, []);
		},

		swap: function(i, j) {
			var tmp = this[j];
			this[j] = this[i];
			this[i] = tmp;
			return tmp;
		},

		shuffle: function() {
			var res = this.clone();
			var i = this.length;
			while (i--) res.swap(i, Math.rand(0, i));
			return res;
		},

		statics: {
			create: function(list) {
				if (!Base.check(list)) return [];
				if (Base.type(list) == 'array') return list;
				if (list.toArray)
					return list.toArray();
				if (list.length != null) {
					var res = [];
					for (var i = 0, j = list.length; i < j; ++i)
						res[i] = list[i];
				} else {
					res = [list];
				}
				return res;
			},

			extend: function(src) {
				var ret = Base.extend(extend, src);
				ret.extend = Function.extend;
				return ret;
			}
		}
	});
	['push','pop','shift','unshift','sort','reverse','join','slice','splice','concat'].each(function(name) {
		fields[name] = proto[name];
	});
	var extend = Base.clone(fields);
	extend.length = 0;
	extend.toString = proto.join;
	return fields;
});

$A = Array.create;

String.inject({
	_type: 'string',

	test: function(exp, param) {
		return new RegExp(exp, param || '').test(this);
	},

	toArray: function() {
		return this ? this.split(/\s+/) : [];
	},

	toInt: function(base) {
		return parseInt(this, base || 10);
	},

	toFloat: function() {
		return parseFloat(this);
	},

	camelize: function(separator) {
		return this.replace(new RegExp(separator || '-', 'g'), function(match) {
			return match.charAt(1).toUpperCase();
		});
	},

	uncamelize: function(separator) {
		separator = separator || '-';
		return this.replace(/[a-zA-Z][A-Z0-9]|[0-9][a-zA-Z]/g, function(match) {
			return match.charAt(0) + separator + match.charAt(1);
		});
	},

	hyphenate: function(separator) {
		return this.uncamelize(separator).toLowerCase();
	},

	capitalize: function() {
		return this.replace(/\b[a-z]/g, function(match) {
			return match.toUpperCase();
		});
	},

	trim: function() {
		return this.replace(/^\s+|\s+$/g, '');
	},

	clean: function() {
		return this.replace(/\s{2,}/g, ' ').trim();
	},

	contains: function(string, s) {
		return (s ? (s + this + s).indexOf(s + string + s) : this.indexOf(string)) != -1;
	}
});

Number.inject({
	_type: 'number',

	toInt: String.prototype.toInt,

	toFloat: String.prototype.toFloat,

	times: function(func, bind) {
		for (var i = 0; i < this; ++i) func.call(bind, i);
		return bind || this;
	}
});

RegExp.inject({
	_type: 'regexp'
});

Math.rand = function(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

Array.inject({

	hexToRgb: function(toArray) {
		if (this.length >= 3) {
			var rgb = [];
			for (var i = 0; i < 3; i++)
				rgb.push((this[i].length == 1 ? this[i] + this[i] : this[i]).toInt(16));
			return toArray ? rgb : 'rgb(' + rgb.join(',') + ')';
		}
	},

	rgbToHex: function(toArray) {
		if (this.length >= 3) {
			if (this.length == 4 && this[3] == 0 && !toArray) return 'transparent';
			var hex = [];
			for (var i = 0; i < 3; i++) {
				var bit = (this[i] - 0).toString(16);
				hex.push(bit.length == 1 ? '0' + bit : bit);
			}
			return toArray ? hex : '#' + hex.join('');
		}
	},

	rgbToHsb: function() {
		var r = this[0], g = this[1], b = this[2];
		var hue, saturation, brightness;
		var max = Math.max(r, g, b), min = Math.min(r, g, b);
		var delta = max - min;
		brightness = max / 255;
		saturation = (max != 0) ? delta / max : 0;
		if (saturation == 0) {
			hue = 0;
		} else {
			var rr = (max - r) / delta;
			var gr = (max - g) / delta;
			var br = (max - b) / delta;
			if (r == max) hue = br - gr;
			else if (g == max) hue = 2 + rr - br;
			else hue = 4 + gr - rr;
			hue /= 6;
			if (hue < 0) hue++;
		}
		return [Math.round(hue * 360), Math.round(saturation * 100), Math.round(brightness * 100)];
	},

	hsbToRgb: function() {
		var br = Math.round(this[2] / 100 * 255);
		if (this[1] == 0) {
			return [br, br, br];
		} else {
			var hue = this[0] % 360;
			var f = hue % 60;
			var p = Math.round((this[2] * (100 - this[1])) / 10000 * 255);
			var q = Math.round((this[2] * (6000 - this[1] * f)) / 600000 * 255);
			var t = Math.round((this[2] * (6000 - this[1] * (60 - f))) / 600000 * 255);
			switch (Math.floor(hue / 60)) {
				case 0: return [br, t, p];
				case 1: return [q, br, p];
				case 2: return [p, br, t];
				case 3: return [p, q, br];
				case 4: return [t, p, br];
				case 5: return [br, p, q];
			}
		}
	}
});

String.inject({
	hexToRgb: function(toArray) {
		var hex = this.match(/^#?(\w{1,2})(\w{1,2})(\w{1,2})$/);
		return hex && hex.slice(1).hexToRgb(toArray);
	},

	rgbToHex: function(toArray) {
		var rgb = this.match(/\d{1,3}/g);
		return rgb && rgb.rgbToHex(toArray);
	}
});

Json = new function() {
	var special = { '\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"' : '\\"', '\\': '\\\\' };

	function replace(chr) {
		return special[chr] || '\\u00' + Math.floor(chr.charCodeAt() / 16).toString(16) + (chr.charCodeAt() % 16).toString(16);
	}

	return {
		encode: function(obj) {
			switch (Base.type(obj)) {
				case 'string':
					return '"' + obj.replace(/[\x00-\x1f\\"]/g, replace) + '"';
				case 'array':
					return '[' + obj.map(this.encode).compact().join(',') + ']';
				case 'object':
					return '{' + Base.each(obj, function(val, key) {
						if (val != undefined)
							this.push(Json.encode(key) + ':' + Json.encode(val));
					}, []) + '}';
				default:
					return obj + "";
			}
			return null;
		},

		decode: function(string, secure) {
			try {
				return (Base.type(string) != 'string' || !string.length) ||
					(secure && !/^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/.test(
						string.replace(/\\./g, '@').replace(/"[^"\\\n\r]*"/g, '')))
					? null : eval('(' + string + ')');
			} catch(e) {
				return null;
			}
		}
	};
};

Browser = new function() {
	var name = (navigator.platform.match(/(MAC)|(WIN)|(LINUX)|(NIX)/i) || ['OTHER'])[0].toUpperCase();
	var js/*@cc_on=@_jscript_version@*/, xpath = !!document.evaluate;
	var webkit = document.childNodes && !document.all && !navigator.taintEnabled;
	var ret = {
		PLATFORM: name,
		WEBKIT: webkit,
		WEBKIT2: webkit && !xpath,
		WEBKIT3: webkit && xpath,
		OPERA: !!window.opera,
		GECKO: !!document.getBoxObjectFor,
		IE: !!js,
		IE5: js >= 5 && js < 5.5,
		IE55: js == 5.5,
		IE6: js == 5.6,
		IE7: js == 5.7,
		MACIE: js && name == 'MAC',
		XPATH: xpath
	};
	ret[name] = true;
	return ret;
};

DomElements = Array.extend(new function() {
	var unique = 0;
	return {
		initialize: function(els) {
			this._unique = unique++;
			this.append(els && els.length != null && !els.nodeType ? els : arguments);
		},

		push: function() {
			this.append(arguments);
			return this.length;
		},

		append: function(items) {
			for (var i = 0, j = items.length; i < j; ++i) {
				var el = items[i];
				if ((el = el && (el._wrapper || DomElement.get(el))) && el._unique != this._unique) {
					el._unique = this._unique;
					this[this.length++] = el;
				}
			}
			return this;
		},

		statics: {
			inject: function(src) {
				return this.base(Base.each(src || {}, function(val, key) {
					this[key] = typeof val != 'function' ? val : function() {
						var args = arguments, values;
						this.each(function(obj) {
							var ret = (obj[key] || val).apply(obj, args);
							if (ret !== undefined && ret != obj) {
								values = values || (Base.type(ret) == 'element'
									? new obj._elements() : []);
								values.push(ret);
							}
						});
						return values || this;
					}
				}, {}));
			}
		}
	};
});

DomElement = Base.extend(new function() {
	var elements = [];
	var tags = {}, classes = {}, classCheck;

	function dispose(force) {
		for (var i = elements.length - 1; i >= 0; i--) {
			var el = elements[i];
	        if (force || (!el || el != window && el != document &&
				(!el.parentNode || !el.offsetParent))) {
	            if (el) {
					var obj = el._wrapper;
					if (obj && obj.dispose) obj.dispose();
					el._wrapper = el._children = null;
				}
				if (!force) elements.splice(i, 1);
	        }
		}
	}
	dispose.periodic(30000);

	function inject(src) {
		src = src || {};
		(src._methods || []).each(function(name) {
			src[name] = function(arg) {
				var ret = this.$[name] && this.$[name](arg);
				return ret === undefined ? this : ret;
			}
		});
		(src._properties || []).each(function(name) {
			var part = name.capitalize();
			src['get' + part] = function() {
				return this.$[name];
			}
			src['set' + part] = function(value) {
				this.$[name] = value;
				return this;
			}
		});
		delete src._methods;
		delete src._properties;
		return Function.inject.call(this, src);
	}

	function getConstructor(el) {
		var match;
		return classCheck && el.className && (match = el.className.match(classCheck)) && match[2] && classes[match[2]] ||
			el.tagName && tags[el.tagName] ||
			(el.className === undefined ? DomElement : HtmlElement)
	}

	var dont = {};

	return {
		_type: 'element',
		_elements: DomElements,

		initialize: function(el, props) {
			if (this._tag && Base.type(el) == 'object') {
				props = el;
				el = this._tag;
			}
			if (typeof(el) == 'string') {
				if (Browser.IE && props && (props.name || props.type))
					el = '<' + el
						+ (props.name ? ' name="' + props.name + '"' : '')
						+ (props.type ? ' type="' + props.type + '"' : '') + '>';
				el = document.createElement(el);
			} else {
				if (el._wrapper) return el._wrapper;
			}
			if (props == dont) props = null;
			else {
				var ctor = getConstructor(el);
				if (ctor != this.constructor)
					return new ctor(el, props);
			}
			this.$ = el;
			el._wrapper = this;
			elements[elements.length] = el;
			if (props) this.set(props);
		},

		statics: {
			inject: function(src) {
				if (src) {
					var proto = this.prototype, that = this;
					src.statics = Base.each(src, function(val, name) {
						if (typeof val == 'function' && !this[name] && !that[name]) {
							this[name] = function(el, param1, param2) {
								if (el) try {
									proto.$ = el.$ || el;
									return proto[name](param1, param2);
								} finally {
									delete proto.$;
								}
							}
						}
					}, src.statics || {});
					inject.call(this, src);
					delete src.toString;
					proto._elements.inject(src);
				}
				return this;
			},

			extend: function(src) {
				var ret = this.base();
				var init = src.initialize;
				if (init) src.initialize = function(el, props) {
					var ret = this.base(el, props);
					if (ret) return ret;
					init.call(this);
				}
				inject.call(ret, src);
				ret.inject = inject;
				if (src) {
					if (src._tag) tags[src._tag.toLowerCase()] = tags[src._tag.toUpperCase()] = ret;
					if (src._class) {
						classes[src._class] = ret;
						classCheck = new RegExp('(^|\\s)(' + Base.each(classes, function(val, name) {
							this.push(name);
						}, []).join('|') + ')(\\s|$)');
						if (src.initialize) Window.addEvent('domready', function() {
							Document.getElements('.' + src._class);
						});
					}
				}
				return ret;
			},

			get: function(el) {
				return el ? typeof el == 'string'
					? Document.getElement(el)
					: el._wrapper || el._elements && el || new (getConstructor(el))(el, dont)
						: null;
			},

			unwrap: function(el) {
				return el && el.$ || el;
			},

			collect: function(el) {
				elements.push(el);
			},

			isAncestor: function(el, parent) {
				if (parent != document)
					for (el = el && el.parentNode; el != parent; el = el.parentNode)
						if (!el) return false;
				return true;
			},

			dispose: function() {
				dispose(true);
			}
		}
	}
});

DomElement.inject(new function() {
	var properties = {
		'class': 'className', className: 'className', 'for': 'htmlFor',
		colspan: 'colSpan', rowspan: 'rowSpan', accesskey: 'accessKey',
		tabindex: 'tabIndex', maxlength: 'maxLength', readonly: 'readOnly',
		value: 'value', disabled: 'disabled', checked: 'checked',
		multiple: 'multiple', selected: 'selected'
	};

	var flags = {
		href: 2, src: 2
	};

	var handlers = { get: {}, set: {} };

	function handle(that, prefix, name, val) {
		var list = handlers[prefix];
		var fn = name == 'events' && prefix == 'set' ? that.addEvents : list[name];
		if (fn === undefined)
			fn = list[name] = that[prefix +
				name.charAt(0).toUpperCase() + name.substring(1)] || null;
		if (fn) return fn[val && val.push ? 'apply' : 'call'](that, val);
		else return that[prefix + 'Property'](name, val);
	}

	function walk(el, name, start) {
		el = el[start ? start : name];
		while (el && Base.type(el) != 'element') el = el[name];
		return DomElement.get(el);
	}

	function create(where) {
		return function() {
			return this.create(arguments)['insert' + where](this);
		}
	}

	return {
		set: function(name, value) {
			switch (Base.type(name)) {
				case 'string':
					return handle(this, 'set', name, value);
				case 'object':
					return Base.each(name, function(val, key) {
						handle(this, 'set', key, val);
					}, this);
			}
			return this;
		},

		get: function(name) {
			return handle(this, 'get', name);
		},

		getTag: function() {
			return this.$.tagName.toLowerCase();
		},

		getId: function() {
			return this.$.id;
		},

		getPrevious: function() {
			return walk(this.$, 'previousSibling');
		},

		getNext: function() {
			return walk(this.$, 'nextSibling');
		},

		getFirst: function() {
			return walk(this.$, 'nextSibling', 'firstChild');
		},

		getLast: function() {
			return walk(this.$, 'previousSibling', 'lastChild');
		},

		getParent: function() {
			return DomElement.get(this.$.parentNode);
		},

		getChildren: function() {
		 	return new this._elements(this.$.childNodes);
		},

		hasChildren: function() {
			return this.$.hasChildNodes();
		},

		hasParent: function(el) {
			return DomElement.isAncestor(this.$, DomElement.unwrap(el));
		},

		hasChild: function(el) {
			return DomElement.isAncestor(DomElement.unwrap(el), this.$);
		},

		appendChild: function(el) {
			el = DomElement.get(el).$;
			var text = Browser.IE && el.text;
			this.$.appendChild(el);
			if (text) el.text = text;
			return this;
		},

		insertBefore: function(el) {
			el = DomElement.get(el);
			var text = Browser.IE && el.text;
			el.$.parentNode.insertBefore(this.$, el.$);
			if (text) this.$.text = text;
			return this;
		},

		insertAfter: function(el) {
			el = DomElement.get(el);
			var next = el.getNext();
			if (next) this.insertBefore(next);
			else el.getParent().appendChild(this);
			return this;
		},

		insertFirst: function(el) {
			el = DomElement.get(el);
			var first = el.getFirst();
			if (first) this.insertBefore(first);
			else el.appendChild(this);
			return this;
		},

		insertInside: function(el) {
			DomElement.get(el).appendChild(this);
			return this;
		},

		appendText: function(text) {
			this.$.appendChild(document.createTextNode(text));
			return this;
		},

		create: function(arg) {
			var items = Base.type(arg) == 'array' ? arg : arguments;
			var elements = new this._elements();
			for (var i = 0, j = items.length; i < j; i ++) {
				var item = items[i];
				var props = item[1], content = item[2];
				if (!content && Base.type(props) != 'object') {
					content = props;
					props = null;
				}
				var el = new DomElement(item[0], props);
				if (content) {
					if (content.push) this.create(Base.type(content[0]) == 'string'
						? [content] : content).insertInside(el);
					else el.appendText(content);
				}
				elements.push(el);
			}
			return elements.length > 1 ? elements : elements[0];
		},

		createBefore: create('Before'),

		createAfter: create('After'),

		createFirst: create('First'),

		createInside: create('Inside'),

		remove: function() {
			if (this.$.parentNode)
				this.$.parentNode.removeChild(this.$);
			return this;
		},

		removeChild: function(el) {
			el = DomElement.get(el);
			this.$.removeChild(el.$);
			return el;
		},

		removeChildren: function() {
			this.getChildren().remove();
		},

		replaceWith: function(el) {
			el = DomElement.get(el);
			if (this.$.parentNode)
				this.$.parentNode.replaceChild(el.$, this.$);
			return el;
		},

		clone: function(contents) {
			return DomElement.get(this.$.cloneNode(!!contents));
		},

		getProperty: function(name) {
			var key = properties[name];
			if (key) return this.$[key];
			var flag = flags[name];
			if (!Browser.IE || flag) return this.$.getAttribute(name, flag);
			var node = this.$.attributes[name];
			return node && node.nodeValue;
		},

		setProperty: function(name, value) {
			var key = properties[name];
			if (key) this.$[key] = value;
			else this.$.setAttribute(name, value);
			return this;
		},

		removeProperty: function(name) {
			var key = properties[name];
			if (key) this.$[key] = '';
			else this.$.removeAttribute(name);
			return this;
		},

		setProperties: function(src) {
			return Base.each(src, function(val, name) {
				this.setProperty(name, val);
			}, this);
		},

		toString: function() {
			return this.getTag() + (this.$.id ? '#' + this.$.id : '');
		}
	}
});

new function() {
	function hasTag(el, tag) {
		return tag == '*' || el.tagName && el.tagName.toLowerCase() == tag;
	}

	function getPseudo(pseudo, method) {
		var match = pseudo.match(/^([\w-]+)(?:\((.*)\))?$/);
		if (!match) throw 'Bad pseudo selector: ' + pseudo;
		var name = match[1];
		var argument = match[2] || false;
		var handler = DomElement.pseudos[name];
		return {
			name: name,
			argument: handler && handler.parser
				? (handler.parser.apply ? handler.parser(argument) : handler.parser)
				: argument,
			handler: (handler.handler || handler)[method]
		};
	}

	function getAttribute(attribute) {
		var match = attribute.match(/^(\w+)(?:([!*^$~|]?=)["']?([^"'\]]*)["']?)?$/);
		if (!match) throw 'Bad attribute selector: ' + attribute;
		return match;
	}

	function resolver(prefix) {
		return prefix == 'xhtml' ? 'http://www.w3.org/1999/xhtml' : false;
	}

	var XPATH= 0, FILTER = 1;

	var methods = [{ 
		getParam: function(items, separator, context, tag, id, classNames, attributes, pseudos) {
			var temp = context.namespaceURI ? 'xhtml:' : '';
			seperator = separator && (separator = DomElement.separators[separator]);
			temp += seperator ? separator[XPATH](tag) : tag;
			for (var i = pseudos.length; i;) {
				var pseudo = getPseudo(pseudos[--i], XPATH);
				var handler = pseudo.handler;
				if (handler) temp += handler(pseudo.argument);
				else temp += pseudo.argument != undefined
					? '[@' + pseudo.name + '="' + pseudo.argument + '"]'
					: '[@' + pseudo.name + ']';
			}
			if (id) temp += '[@id="' + id + '"]';
			for (i = classNames.length; i;)
				temp += '[contains(concat(" ", @class, " "), " ' + classNames[--i] + ' ")]';
			for (i = attributes.length; i;) {
				var attribute = getAttribute(attributes[--i]);
				if (attribute[2] && attribute[3]) {
					var operator = DomElement.operators[attribute[2]];
					if (operator) temp += operator[XPATH](attribute[1], attribute[3]);
				} else {
					temp += '[@' + attribute[1] + ']';
				}
			}
			items.push(temp);
			return items;
		},

		getElements: function(items, elements, context) {
			var res = document.evaluate('.//' + items.join(''), context,
				resolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
			for (var i = 0, j = res.snapshotLength; i < j; ++i)
				elements.push(res.snapshotItem(i));
		}
	}, { 
		getParam: function(items, separator, context, tag, id, classNames, attributes, pseudos) {
			if (separator && (separator = DomElement.separators[separator])) {
				if (separator) items = separator[FILTER](items, tag);
				tag = null; 
			} else if (!items.length) {
				if (id) {
					var el = document.getElementById(id);
					if (el && (!context || DomElement.isAncestor(el, context)) && hasTag(el, tag))
						items = [el];
				}
				if (items.length) id = null; 
				else items = Array.create(context.getElementsByTagName(tag));
				tag = null; 
			}
			var filter = [];
			if (id) filter.push("el.id == id");
			if (tag) filter.push("hasTag(el, tag)");
			for (var i = classNames.length; i;)
				filter.push("el.className && (' ' + el.className + ' ').indexOf(' ' + classNames[" + (--i) + "] + ' ') != -1");
			if (filter.length) 
				items = items.filter(eval('(function(el) { return ' + filter.join(' && ') + ' })'));
			for (i = pseudos.length; i;) {
				var pseudo = getPseudo(pseudos[--i], FILTER), handler = pseudo.handler;
				if (handler) {
					items = items.filter(function(el) {
						return handler(el, pseudo.argument);
					});
				} else {
					attributes.push([null, pseudo.name, pseudo.argument != undefined ? '=' : null, pseudo.argument]);
				}
			}
			for (i = attributes.length; i;) {
				var attribute = getAttribute(attributes[--i]);
				var name = attribute[1], operator = DomElement.operators[attribute[2]], value = attribute[3];
				operator = operator && operator[FILTER];
				items = items.filter(function(el) {
					this.$ = el; 
					var att = this.getProperty(name);
					return att && (!operator || operator(att, value));
				}, DomElement.prototype);
				delete DomElement.prototype.$;
			}
			return items;
		},

		getElements: function(items, elements, context) {
			elements.append(items);
		}
	}];

	var version = 0;

	function evaluate(items, selector, context, elements) {
		var method = methods[typeof selector == 'string' &&
			selector.contains('option[') || items.length || !Browser.XPATH
			? FILTER : XPATH];
		var separators = [];
		selector = selector.trim().replace(/\s*([+>~\s])[a-zA-Z#.*\s]/g, function(match) {
			if (match.charAt(2)) match = match.trim();
			separators.push(match.charAt(0));
			return '%' + match.charAt(1);
		}).split('%');
		for (var i = 0, j = selector.length; i < j; ++i) {
			var tag = '*', id = null, classes = [], attributes = [], pseudos = [];
			if (selector[i].replace(/:[^:]+|\[[^\]]+\]|\.[\w-]+|#[\w-]+|\w+|\*/g, function(str) {
				switch (str.charAt(0)) {
					case ':': pseudos.push(str.slice(1)); break;
					case '[': attributes.push(str.slice(1, str.length - 1)); break;
					case '.': classes.push(str.slice(1)); break;
					case '#': id = str.slice(1); break;
					default: tag = str;
				}
				return '';
			})) break;
			var temp = method.getParam(items, separators[i - 1], context, tag, id, classes, attributes, pseudos);
			if (!temp) break;
			items = temp;
		}
		method.getElements(items, elements, context);
		return elements;
	}

	function following(one) {
		return [
			function(tag) {
				return '/following-sibling::' + tag + (one ? '[1]' : '');
			},

			function(items, tag) {
				var found = [];
				for (var i = 0, j = items.length; i < j; ++i) {
					var next = items[i].nextSibling;
					while (next) {
						if (hasTag(next, tag)) {
							found[found.length] = next;
							if (one) break;
						}
						next = next.nextSibling;
					}
				}
				return found;
			}
		];
	}

	DomElement.separators = {
		'~': following(false),

		'+': following(true),

		'>': [
		 	function(tag) {
				return '/' + tag;
			},
			function(items, tag) {
				var found = [];
				for (var i = 0, j = items.length; i < j; ++i) {
					var children = items[i].childNodes;
					for (var k = 0, l = children.length; k < l; k++) {
						var child = children[k]
						if (hasTag(child, tag)) found[found.length] = child;
					}
				}
				return found;
			}
		],

		' ': [
			function(tag) {
				return '//' + tag;
			},
			function(items, tag) {
				var found = [];
				for (var i = 0, j = items.length; i < j; ++i)
					found.append(items[i].getElementsByTagName(tag));
				return found;
			}
		]
	};

	function contains(sep) {
		return [
			function(a, v) {
				return '[contains(' + (sep ? 'concat("' + sep + '", @' + a + ', "' + sep + '")' : '@' + a) + ', "' + sep + v + sep + '")]';
			},
			function(a, v) {
				return a.contains(v, sep);
			}
		]
	}

	DomElement.operators = {
		'=': [
			function(a, v) {
				return '[@' + a + '="' + v + '"]';
			},
			function(a, v) {
				return a == v;
			}
		],

		'^=': [
	 		function(a, v) {
				return '[starts-with(@' + a + ', "' + v + '")]';
			},
			function(a, v) {
				return a.substr(0, v.length) == v;
			}
		],

		'$=': [
			function(a, v) {
				return '[substring(@' + a + ', string-length(@' + a + ') - ' + v.length + ' + 1) = "' + v + '"]';
			},
			function(a, v) {
				return a.substr(a.length - v.length) == v;
			}
		],

		'!=': [
			function(a, v) {
				return '[@' + a + '!="' + v + '"]';
			},
			function(a, v) {
				return a != v;
			}
		],

		'*=': contains(''),

		'|=': contains('-'),

		'~=': contains(' ')
	};

	var nthChild = [
		function(argument) {
			switch (argument.special) {
				case 'n': return '[count(preceding-sibling::*) mod ' + argument.a + ' = ' + argument.b + ']';
				case 'last': return '[count(following-sibling::*) = 0]';
				case 'only': return '[not(preceding-sibling::* or following-sibling::*)]';
				default: return '[count(preceding-sibling::*) = ' + argument.a + ']';
			}
		},

		function(el, argument) {
			var parent = el.parentNode, children = parent._children;
			if (!children || children.version != version) {
				if (!children) DomElement.collect(parent);
				children = parent._children = Array.filter(parent.childNodes, function(child) {
					return child.nodeName && child.nodeType == 1;
				});
				children.version = version;
			}
			switch (argument.special) {
				case 'n': if (children.indexOf(el) % argument.a == argument.b) return true; break;
				case 'last': if (children.last() == el) return true; break;
				case 'only': if (children.length == 1) return true; break;
				case 'index': if (children[argument.a] == el) return true;
			}
			return false;
		}
	];

	function contains(caseless) {
		var abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		return [
			function(argument) {
				return '[contains(' + (caseless ? 'translate(text(), "' + abc
					+ '", "' + abc.toLowerCase() + '")' : 'text()') + ', "'
					+ (caseless && argument ? argument.toLowerCase() : argument) + '")]';
			},
			function(el, argument) {
				if (caseless && argument) argument = argument.toLowerCase();
				var nodes = el.childNodes;
				for (var i = 0; i < nodes.length; ++i) {
					var child = nodes[i];
					if (child.nodeName && child.nodeType == 3 &&
						(caseless ? child.nodeValue.toLowerCase() : child.nodeValue).contains(argument))
							return true;
				}
				return false;
			}
		];
	}

	DomElement.pseudos = {
		'nth-child': {
			parser: function(argument) {
				var match = argument ? argument.match(/^([+-]?\d*)?([nodev]+)?([+-]?\d*)?$/) : [null, 1, 'n', 0];
				if (!match) throw 'Bad nth pseudo selector arguments: ' + argument;
				var i = parseInt(match[1]);
				var a = isNaN(i) ? 1 : i;
				var special = match[2];
				var b = parseInt(match[3]) || 0;
				b = b - 1;
				while (b < 1) b += a;
				while (b >= a) b -= a;
				switch (special) {
					case 'n': return { a: a, b: b, special: 'n' };
					case 'odd': return { a: 2, b: 0, special: 'n' };
					case 'even': return { a: 2, b: 1, special: 'n' };
					case 'first': return { a: 0, special: 'index' };
					case 'last': return { special: 'last' };
					case 'only': return { special: 'only' };
					default: return { a: (a - 1), special: 'index' };
				}
			},
			handler: nthChild
		},

		'even': {
			parser: { a: 2, b: 1, special: 'n' },
			handler: nthChild
		},

		'odd': {
			parser: { a: 2, b: 0, special: 'n' },
			handler: nthChild
		},

		'first-child': {
			parser: { a: 0, special: 'index' },
			handler: nthChild
		},

		'last-child': {
			parser: { special: 'last' },
			handler: nthChild
		},

		'only-child': {
			parser: { special: 'only' },
			handler: nthChild
		},

		'enabled': [
			function() {
				return '[not(@disabled)]';
			},
			function(el) {
				return !el.disabled;
			}
		],

		'empty': [
		 	function() {
				return '[not(node())]';
			},
			function(el) {
				return el.nodeName && el.nodeType == 3 && el.nodeValue.length == 0;
			}
		],

		'contains': contains(false),

		'contains-caseless': contains(true)
	};

	DomElement.inject({
		getElements: function(selectors, nowrap) {
			version++;
			var elements = nowrap ? [] : new this._elements();
			selectors = !selectors ? ['*'] : typeof selectors == 'string'
				? selectors.split(',')
				: selectors.length != null ? selectors : [selectors];
			for (var i = 0; i < selectors.length; ++i) {
				var selector = selectors[i];
				if (Base.type(selector) == 'element') elements.push(selector);
				else evaluate([], selector, this.$, elements);
			}
			return elements;
		},

		getElement: function(selector) {
			var el, type = Base.type(selector), match;
			if (type == 'string' && (match = selector.match(/^#?([\w-]+)$/)))
				el = document.getElementById(match[1]);
			else if (type == 'element')
				el = DomElement.unwrap(selector);
			if (el && !DomElement.isAncestor(el, this.$)) el = null;
			if (!el) el = this.getElements(selector, true)[0];
			return DomElement.get(el);
		},

		hasElement: function(selector) {
			return !!this.getElement(selector);
		},

		getParents: function(selector) {
			var parents = [];
			for (var el = this.$.parentNode; el; el = el.parentNode)
				parents.push(el);
			version++;
			return evaluate(parents, selector, this.$, new this._elements());
		},

		getParent: function(selector) {
			return !selector ? this.base() : this.getParents(selector)[0];
		},

		hasParent: function(selector) {
			return typeof selector == 'string' ? !!this.getParent(selector) : this.base(selector);
		}
	});
}

DomEvent = Base.extend(new function() {
	var keys = {
		 '8': 'backspace',
		'13': 'enter',
		'27': 'esc',
		'32': 'space',
		'37': 'left',
		'38': 'up',
		'39': 'right',
		'40': 'down',
		'46': 'delete'
	};

	function hover(name, type) {
		return {
			type: type,
			listener: function(event) {
				if (event.relatedTarget != this && !this.hasChild(event.relatedTarget))
					this.fireEvent(name, event);
			}
		}
	}

	return {
		initialize: function(event) {
			this.event = event = event || window.event;
			this.type = event.type;
			this.target = DomElement.get(event.target || event.srcElement);
			if (this.target.nodeType == 3)
				this.target = this.target.getParent(); 
			this.shift = event.shiftKey;
			this.control = event.ctrlKey;
			this.alt = event.altKey;
			this.meta = event.metaKey;
			if (/^(mousewheel|DOMMouseScroll)$/.test(this.type)) {
				this.wheel = event.wheelDelta ?
					event.wheelDelta / (window.opera ? -120 : 120) : 
					- (event.detail || 0) / 3;
			} else if (/^key/.test(this.type)) {
				this.code = event.which || event.keyCode;
				this.key = keys[this.code] || String.fromCharCode(this.code).toLowerCase();
			} else if (/^mouse|^click$/.test(this.type)) {
				this.page = {
					x: event.pageX || event.clientX + document.documentElement.scrollLeft,
					y: event.pageY || event.clientY + document.documentElement.scrollTop
				};
				this.client = {
					x: event.pageX ? event.pageX - window.pageXOffset : event.clientX,
					y: event.pageY ? event.pageY - window.pageYOffset : event.clientY
				};
				var offset = this.target.getOffset();
				this.offset = {
					x: this.page.x - offset.x,
					y: this.page.y - offset.y
				}
				this.rightClick = event.which == 3 || event.button == 2;
				if (/^mouse(over|out)$/.test(this.type))
					this.relatedTarget = DomElement.get(event.relatedTarget ||
						this.type == 'mouseout' ? event.toElement : event.fromElement);
			}
		},

		stop: function() {
			this.stopPropagation();
			this.preventDefault();
			return this;
		},

		stopPropagation: function() {
			if (this.event.stopPropagation) this.event.stopPropagation();
			else this.event.cancelBubble = true;
			this.stopped = true;
			return this;
		},

		preventDefault: function() {
			if (this.event.preventDefault) this.event.preventDefault();
			else this.event.returnValue = false;
			return this;
		},

		statics: {
			events: new Hash({
				mouseenter: hover('mouseenter', 'mouseover'),

				mouseleave: hover('mouseleave', 'mouseout'),

				mousewheel: { type: Browser.GECKO ? 'DOMMouseScroll' : 'mousewheel' },

				domready: function(func) { 
					if (window.loaded) func.call(this);
					else if (!this.domReady) {
						this.domReady = true;
						var domReady = function() {
							if (this.loaded) return;
							this.loaded = true;
							if (this.timer) this.timer = this.timer.clear();
							this.fireEvent('domready');
						}.bind(this);
						if (document.readyState && (Browser.WEBKIT || Browser.MACIE)) { 
							this.timer = (function() {
								if (/^(loaded|complete)$/.test(document.readyState)) domReady();
							}).periodic(50);
						} else if (document.readyState && Browser.IE) { 
							document.write('<script id=ie_ready defer src="'
								+ (window.location.protocol == 'https:' ? '://0' : 'javascript:void(0)')
								+ '"><\/script>');
							document.getElementById('ie_ready').onreadystatechange = function() {
								if (window.readyState == 'complete') domReady();
							};
						} else { 
							Window.addEvent('load', domReady);
							Document.addEvent('DOMContentLoaded', domReady);
						}
					}
				}
			}),

			add: function(events) {
				this.events.merge(events);
			}
		}
	};
});

DomElement.inject({
	addEvent: function(type, func) {
		this.events = this.events || {};
		var entries = this.events[type] = this.events[type] || [];
		if (func && !entries.find(function(entry) { return entry.func == func })) {
			var listener = func, name = type, pseudo = DomEvent.events[type];
			if (pseudo) {
				if (typeof pseudo == 'function') pseudo = pseudo.call(this, func);
				listener = pseudo && pseudo.listener || listener;
				name = pseudo && pseudo.type;
			}
			var that = this, bound = listener.parameters().length == 0
				? listener.bind(this)
				: function(event) { 
					event = new DomEvent(event);
					if (listener.call(that, event) === false)
						event.stop();
				};
			if (name) {
				if (this.$.addEventListener) {
					this.$.addEventListener(name, bound, false);
				} else if (this.$.attachEvent) {
					this.$.attachEvent('on' + name, bound);
				}
			}
			entries.push({ func: func, name: name, bound: bound });
		}
		return this;
	},

	removeEvent: function(type, func) {
		var entries = (this.events || {})[type], entry;
		if (func && entries) {
			if (entry = entries.remove(function(entry) { return entry.func == func })) {
				var name = entry.name, pseudo = DomEvent.events[type];
				if (pseudo && pseudo.remove) pseudo.remove.call(this, func);
				if (name) {
					if (this.$.removeEventListener) {
						this.$.removeEventListener(name, entry.bound, false);
					} else if (this.$.detachEvent) {
						this.$.detachEvent('on' + name, entry.bound);
					}
				}
			}
		}
		return this;
	},

	addEvents: function(events) {
		return Base.each(events || [], function(fn, type) {
			this.addEvent(type, fn);
		}, this);
	},

	removeEvents: function(type) {
		if (this.events) {
			if (type) {
				(this.events[type] || []).each(function(fn) {
					this.removeEvent(type, fn);
				}, this);
				delete this.events[type];
			} else {
				Base.each(this.events, function(ev, type) {
					this.removeEvents(type);
				}, this);
				this.events = null;
			}
		}
		return this;
	},

	fireEvent: function(type, event) {
		var entries = (this.events || {})[type];
		if (entries) {
			if (event) event = event.event ? event : new DomEvent(event);
			entries.each(function(entry) {
				entry.func.call(this, event);
			}, this);
		}
		return !!entries;
	},

	dispose: function() {
		this.removeEvents();
	}
});

Document = DomElement.get(document).inject({
	getTag: function() {
		return 'document';
	}
});

function $(selector, root) {
	return DomElement.get(root || Document).getElement(selector);
}

function $$(selector, root) {
	return DomElement.get(root || Document).getElements(selector);
}

/*@cc_on
try { document.execCommand('BackgroundImageCache', false, true); }
catch (e) {}
@*/

Window = DomElement.get(window).inject({
	getTag: function() {
		return 'window';
	},

	open: function(url, title, params) {
		var focus;
		if (params && typeof params != 'string') {
			if (params.confirm && !confirm(params.confirm))
				return null;
			(['toolbar','menubar','location','status','resizable','scrollbars']).each(function(d) {
				if (!params[d]) params[d] = 0;
			});
			if (params.width && params.height) {
				if (params.left == null) params.left = Math.round(
					Math.max(0, (screen.width - params.width) / 2));
				if (params.top == null) params.top = Math.round(
					Math.max(0, (screen.height - params.height) / 2 - 40));
			}
			focus = params.focus;
			params = Base.each(params, function(p, n) {
				if (!/^(focus|confirm)$/.test(n))
					this.push(n + '=' + p);
			}, []).join(',');
		}
		var win = window.open(url, title.replace(/\s+|\.+|-+/gi, ''), params);
		if (win && focus) win.focus();
		return win;
	}
});

Window.addEvent('unload', DomElement.dispose);

DomEvent.add(new function() {
	var object, last;

	function dragStart(event) {
		if (object != this) {
			event.type = 'dragstart';
			last = event.page;
			this.fireEvent('dragstart', event);
			if (!event.stopped) {
				event.stop();
				Document.addEvent('mousemove', drag);
				Document.addEvent('mouseup', dragEnd);
				object = this;
			}
		}
	}

	function drag(event) {
		event.type = 'drag';
		event.delta = {
			x: event.page.x - last.x,
			y: event.page.y - last.y
		}
		last = event.page;
		object.fireEvent('drag', event);
		event.preventDefault();
	}

	function dragEnd(event) {
		if (object) {
			event.type = 'dragend';
			object.fireEvent('dragend', event);
			event.preventDefault();
			Document.removeEvent('mousemove', drag);
			Document.removeEvent('mouseup', dragEnd);
			object = null;
		}
	}

	return {
		dragstart: {
			type: 'mousedown',
			listener: dragStart
		},

		drag: {
			type: 'mousedown',
			listener: dragStart
		},

		dragend: {}
	};
});

HtmlElements = Document._elements = DomElements.extend();

HtmlElement = DomElement.extend({
	_elements: HtmlElements,

	initialize: function() {
		this.style = this.$.style;
	}
});

HtmlElement.inject = DomElement.inject;

HtmlElement.inject({
	getClass: function() {
		return this.$.className;
	},

	modifyClass: function(name, add) {
		if (!this.hasClass(name) ^ !add) 
			this.$.className = (add ? this.$.className + ' ' + name : 
				this.$.className.replace(name, '')).clean();
		return this;
	},

	addClass: function(name) {
		return this.modifyClass(name, true);
	},

	removeClass: function(name) {
		return this.modifyClass(name, false);
	},

	toggleClass: function(name) {
		return this.modifyClass(name, !this.hasClass(name));
	},

	hasClass: function(name) {
		return this.$.className.contains(name, ' ');
	},

	getHtml: function() {
		return this.$.innerHTML;
	},

	setHtml: function(html) {
		this.$.innerHTML = html;
		return this;
	},

	getText: function() {
		var tag = this.getTag();
		return /^(style|script)$/.test(tag)
			? Browser.IE
				? tag == 'style' ? this.$.styleSheet.cssText : this.getProperty('text')
				: this.$.innerHTML
			: this.$.innerText || this.$.textContent;
	},

	setText: function(text) {
		var tag = this.getTag();
		if (/^(style|script)$/.test(tag)) {
			if (Browser.IE) {
				if (tag == 'style') this.$.styleSheet.cssText = text;
				else this.setProperty('text', text);
			} else
				this.$.innerHTML = text;
		} else
			this[this.innerText !== undefined ? 'innerText' : 'textContent'] = text;
		return this;
	}
});

HtmlElement.inject(new function() {
	var styles = {
		all: {
			width: '@px', height: '@px', left: '@px', top: '@px', right: '@px', bottom: '@px',
			color: 'rgb(@, @, @)', backgroundColor: 'rgb(@, @, @)', backgroundPosition: '@px @px',
			fontSize: '@px', letterSpacing: '@px', lineHeight: '@px', textIndent: '@px',
			margin: '@px @px @px @px', padding: '@px @px @px @px', border: '@px @ rgb(@, @, @) @px @ rgb(@, @, @) @px @ rgb(@, @, @) @px @ rgb(@, @, @)',
			borderWidth: '@px @px @px @px', borderStyle: '@ @ @ @', borderColor: 'rgb(@, @, @) rgb(@, @, @) rgb(@, @, @) rgb(@, @, @)',
			clip: 'rect(@px, @px, @px, @px)', opacity: '@'
		},
		part: {
			'margin': {}, 'padding': {}, 'border': {}, 'borderWidth': {}, 'borderStyle': {}, 'borderColor': {}
		}
	};

	['Top', 'Right', 'Bottom', 'Left'].each(function(dir) {
		['margin', 'padding'].each(function(style) {
			var sd = style + dir;
			styles.part[style][sd] = styles.all[sd] = '@px';
		});
		var bd = 'border' + dir;
		styles.part.border[bd] = styles.all[bd] = '@px @ rgb(@, @, @)';
		var bdw = bd + 'Width', bds = bd + 'Style', bdc = bd + 'Color';
		styles.part[bd] = {};
		styles.part.borderWidth[bdw] = styles.part[bd][bdw] = '@px';
		styles.part.borderStyle[bds] = styles.part[bd][bds] = '@';
		styles.part.borderColor[bdc] = styles.part[bd][bdc] = 'rgb(@, @, @)';
	});

	Base.each(styles.all, function(val, name) {
		this[name] = val.split(' ');
	});

	var fields = {
		getStyle: function(name) {
			if (name == undefined) return this.getStyles();
			if (name == 'opacity') {
				var op = this.opacity;
				return op || op == 0 ? op : this.getVisibility() ? 1 : 0;
			}
			var el = this.$;
			name = name.camelize();
			var style = el.style[name];
			if (!Base.check(style)) {

				if (styles.part[name]) {
					style = Hash.map(styles.part[name], function(val, key) {
						return this.getStyle(key);
					}, this);
					return style.every(function(val) {
						return val == style[0];
					}) ? style[0] : style.join(' ');
				}
				style = document.defaultView && document.defaultView.getComputedStyle(el, null).getPropertyValue(name.hyphenate())
					|| el.currentStyle && el.currentStyle[name];
			}
			if (name == 'visibility')
				return /^(visible|inherit(|ed))$/.test(style);
			var color = style && style.match(/rgb[a]?\([\d\s,]+\)/);
			if (color) return style.replace(color[0], color[0].rgbToHex());
			if (Browser.IE && isNaN(parseInt(style))) {
				if (/^(width|height)$/.test(name)) {
					var size = 0;
					(name == 'width' ? ['left', 'right'] : ['top', 'bottom']).each(function(val) {
						size += this.getStyle('border-' + val + '-width').toInt() + this.getStyle('padding-' + val).toInt();
					}, this);
					return (this.$['offset' + name.capitalize()] - size) + 'px';
				} else if (name.test(/border(.+)Width|margin|padding/)) {
					return '0px';
				}
			}
			return style;
		},

		setStyle: function(name, value) {
			if (value == undefined) return this.setStyles(name);
			var el = this.$;
			switch (name) {
				case 'float':
					name = Browser.IE ? 'styleFloat' : 'cssFloat';
					break;
				case 'clip':
					if (value == true)
						value = [0, el.offsetWidth, el.offsetHeight, 0];
					break;
				default:
					name = name.camelize();
			}
			var type = Base.type(value);
			if (value != undefined && type != 'string') {
				var parts = styles.all[name] || ['@'], index = 0;
				value = (type == 'array' ? value.flatten() : [value]).map(function(val) {
					var part = parts[index++];
					if (!part) throw Base.stop;
					return Base.type(val) == 'number' ? part.replace('@', name == 'opacity' ? val : Math.round(val)) : val;
				}).join(' ');
			}
			switch (name) {
				case 'visibility':
				 	value = value == 'true' && 'visible' || value == 'false' && 'hidden' || value;
					break;
				case 'opacity':
					this.opacity = value = parseFloat(value);
					this.setStyle('visibility', !!value);
					if (!value) value = 1;
					if (!el.currentStyle || !el.currentStyle.hasLayout) el.style.zoom = 1;
					if (Browser.IE) el.style.filter = value > 0 && value < 1 ? 'alpha(opacity=' + value * 100 + ')' : '';
					el.style.opacity = value;
					return this;
			}
			el.style[name] = value;
			return this;
		},

		getStyles: function() {
			return arguments.length ? Base.each(arguments, function(name) {
				this[name] = that.getStyle(name);
			}, {}) : this.$.style.cssText;
		},

		setStyles: function(styles) {
			switch (Base.type(styles)) {
				case 'object':
					Base.each(styles, function(style, name) {
						if (style !== undefined)
							this.setStyle(name, style);
					}, this);
					break;
				case 'string':
					this.$.style.cssText = styles;
			}
			return this;
		}
	};

	['opacity', 'color', 'background', 'visibility', 'clip', 'zIndex'].each(function(name) {
		var part = name.capitalize();
		fields['get' + part] = function() {
			return this.getStyle(name);
		};
		fields['set' + part] = function(value) {
			return this.setStyle(name, arguments.length > 1
				? Array.create(arguments) : value);
		};
	});

	return fields;
});

HtmlElement.inject(new function() {
	function cumulate(name, parent, iter) {
		var left = name + 'Left', top = name + 'Top';
		return function() {
			var cur, next = this, x = 0, y = 0;
			do {
				cur = next;
				x += cur.$[left] || 0;
				y += cur.$[top] || 0;
			} while((next = HtmlElement.get(cur.$[parent])) && (!iter || iter(cur, next)))
			return { x: x, y: y };
		}
	}

	function bounds(fields, offset) {
		return function(values) {
			var vals = /^(object|array)$/.test(Base.type(values)) ? values : arguments;
			if (offset) {
				if (vals.x) vals.left = vals.x;
				if (vals.y) vals.top = vals.y;
			}
			var i = 0;
			return fields.each(function(name) {
				var val = vals.length ? vals[i++] : vals[name];
				if (val != null) this.setStyle(name, val);
			}, this);
		}
	}

	var getCumulative = cumulate('offset', 'offsetParent', Browser.WEBKIT ? function(cur, next) {
		return next.$ != document.body || cur.getStyle('position') != 'absolute';
	} : null, true);

	var getPositioned = cumulate('offset', 'offsetParent', function(cur, next) {
		return next.$ != document.body && !/^(relative|absolute)$/.test(next.getStyle('position'));
	});

	var fields = {
		getSize: function() {
			return { width: this.$.offsetWidth, height: this.$.offsetHeight };
		},

		getOffset: function(positioned) {
			return (positioned ? getPositioned : getCumulative).apply(this);
		},

		getScrollOffset: cumulate('scroll', 'parentNode'),

		getScrollSize: function() {
			return { width: this.$.scrollWidth, height: this.$.scrollHeight };
		},

		getBounds: function() {
			var off = this.getOffset(), el = this.$;
			return {
				width: el.offsetWidth,
				height: el.offsetHeight,
				left: off.x,
				top: off.y,
				right: off.x + el.offsetWidth,
				bottom: off.y + el.offsetHeight
			};
		},

		setBounds: bounds(['left', 'top', 'width', 'height', 'clip'], true),

		setOffset: bounds(['left', 'top'], true),

		setSize: bounds(['width', 'height', 'clip']),

		contains: function(pos) {
			var bounds = this.getBounds();
			return pos.x >= bounds.left && pos.x < bounds.right &&
				pos.y >= bounds.top && pos.y < bounds.bottom;
		},

		scrollTo: function(x, y) {
			this.scrollLeft = x;
			this.scrollTop = y;
		},
		statics: {
			getAt: function(pos, exclude) {
				var el = Document.getElement('body');
				while (true) {
					var max = -1;
					var ch = el.getFirst();
					while (ch) {
						if (ch.contains(pos) && ch != exclude) {
							var z = ch.style.zIndex.toInt() || 0;
							if (z >= max) {
								el = ch;
								max = z;
							}
						}
						ch = ch.getNext();
					}
					if (max < 0) break;
				}
				return el;
			}
		}
	};

	['left', 'top', 'right', 'bottom', 'width', 'height'].each(function(name) {
		var part = name.capitalize();
		fields['get' + part] = function() {
			return this.$['offset' + part];
		};
		fields['set' + part] = function(value) {
			this.$.style[name] = value + 'px';
		};
	});

	return fields;
});

HtmlElement.inject({
	getFormElements: function() {
		return this.getElements(['input', 'select', 'textarea']);
	},

	getValue: function(name) {
		var el = this.getElement(name);
		return el && el.getValue && el.getValue();
	},

	setValue: function(name, val) {
		var el = this.getElement(name);
		if (!el) el = this.createInside('input', { type: 'hidden', id: name, name: name });
		return el.setValue(val);
	},

	getValues: function() {
		return this.getFormElements().each(function(el) {
			var name = el.getName();
			if (name && !el.getDisabled()) this[name] = el.getValue(); 
		}, new Hash());
	},

	setValues: function(values) {
		return Base.each(values, function(val, name) {
			this.setValue(name, val);
		}, this);
	}
});

Form = HtmlElement.extend({
	_tag: 'form',
	_properties: ['action', 'method', 'target'],
	_methods: ['submit'],

	blur: function() {
		return this.getFormElements().each(function(el) {
			el.blur();
		}, this);
	},

	enable: function(enable) {
		return this.getFormElements().each(function(el) {
			el.enable(enable);
		}, this);
	}
});

FormElement = HtmlElement.extend({
	_properties: ['name', 'disabled'],
	_methods: ['focus', 'blur'],

	enable: function(enable) {
		var disabled = !enable && enable !== undefined;
		if (disabled) this.$.blur();
		this.$.disabled = disabled;
		return this;
	}
});

Input = FormElement.extend({
	_tag: 'input',
	_properties: ['type', 'checked', 'defaultChecked', 'readOnly', 'maxLength'],
	_methods: ['click'],

	getValue: function() {
		if (this.$.checked && /^(checkbox|radio)$/.test(this.$.type) ||
			/^(hidden|text|password|button|search)$/.test(this.$.type))
			return this.$.value;
	},

	setValue: function(val) {
		if (/^(checkbox|radio)$/.test(this.$.type)) this.$.checked = this.$.value == val;
		else this.$.value = val;
		return this;
	}
});

TextArea = FormElement.extend({
	_tag: 'textarea',
	_properties: ['value']
});

Select = FormElement.extend({
	_tag: 'select',
	_properties: ['type', 'selectedIndex'],

	getOptions: function() {
		return this.getElements('option');
	},

	getSelected: function() {
		return this.getElements('option[selected]');
	},

	getValue: function() {
		return this.getSelected().getProperty('value');
	},

	setValue: function(values) {
		this.$.selectedIndex = -1;
		return Base.each(values.length != null ? values : [values], function(val) {
			val = DomElement.unwrap(val);
			this.getElements('option[value="' + (val.value || val) + '"]').setProperty('selected', true);
		}, this);
	}
});

SelectOption = FormElement.extend({
	_tag: 'option',
	_properties: ['text', 'value', 'selected', 'defaultSelected', 'index']
});

FormElement.inject({
	setSelection: function(start, end) {
		var sel = end == undefined ? start : { start: start, end: end };
		this.focus();
		if(Browser.IE) {
			var range = this.$.createTextRange();
			range.collapse(true);
			range.moveStart('character', sel.start);
			range.moveEnd('character', sel.end - sel.start);
			range.select();
		} else this.$.setSelectionRange(sel.start, sel.end);
		return this;
	},
	getSelection: function() {
		if(Browser.IE) {
			this.focus();
			var range = document.selection.createRange();
			var tmp = range.duplicate();
			tmp.moveToElementText(this.$);
			tmp.setEndPoint('EndToEnd', range);
			return { start: tmp.text.length - range.text.length, end: tmp.text.length };
		}
		return { start: this.$.selectionStart, end: this.$.selectionEnd };
	},
	getSelectedText: function() {

 		var range = this.getSelection();
		return this.getValue().substring(range.start, range.end);
	},

	replaceSelectedText: function(value, select) {
		var range = this.getSelection(), curr = this.getValue();
		this.setValue(curr.substring(0, range.start) + value + curr.substring(range.end, curr.length));
		return select || select == undefined
			? this.setSelection(range.start, range.start + value.length)
			: this.setCaretPosition(range.start + value.length);
	},

	getCaretPosition: function() {
		return this.getSelection().start;
	},
	setCaretPosition: function(pos) {
		if(pos == -1)
			pos = this.getValue().length;
		return this.setSelection(pos, pos);
	}
});

Chain = {
	chain: function(fn) {
		(this.chains = this.chains || []).push(fn);
		return this;
	},

	callChain: function() {
		if (this.chains && this.chains.length)
			this.chains.shift().delay(1, this);
	},

	clearChain: function() {
		this.chains = [];
	}
};

Callback = {
	addEvent: function(type, fn) {
		var ref = this.events = this.events || {};
		ref = ref[type] = ref[type] || [];
		if (!ref.find(function(val) { return val == fn })) ref.push(fn);
		return this;
	},

	addEvents: function(events) {
		return Base.each((events || []), function(fn, type) {
			this.addEvent(type, fn);
		}, this);
	},

	fireEvent: function(type) {
		var args = Array.slice(arguments, 1);
		return (this.events && this.events[type] || []).each(function(fn) {
			fn.apply(this, args);
		}, this);
	},

	removeEvent: function(type, fn) {
		if (this.events && this.events[type])
			this.events[type].remove(function(val) { return fn == val; });
		return this;
	},

	setOptions: function(opts) {
		return (this.options = Hash.create(this.options, opts)).each(function(val, i) {
			if (typeof val == 'function' && (i = i.match(/^on([A-Z]\w*)/)))
				this.addEvent(i[1].toLowerCase(), val);
		}, this);
	}
};

HttpRequest = Base.extend(Chain, Callback, new function() {
	var unique = 0;

	function createRequest(that) {
		if (!that.transport)
			that.transport = window.XMLHttpRequest && new XMLHttpRequest()
				|| Browser.IE && new ActiveXObject('Microsoft.XMLHTTP');
	}

	function createFrame(that, form) {
		var id = 'request_' + unique++, onLoad = that.onFrameLoad.bind(that);
		var div = Document.getElement('body').createInside(
			'div', { styles: { position: 'absolute', top: '0', marginLeft: '-10000px' }}, [
				'iframe', { name: id, id: id, events: { load: onLoad }, onreadystatechange: onLoad }
			]
		);
		that.frame = {
			id: id, div: div, form: form,
			iframe: window.frames[id] || document.getElementById(id),
			element: Document.getElement(id)
		};
		div.offsetWidth;
	}

	return {
		options: {
			method: 'post',
			async: true,
			urlEncoded: true,
			encoding: 'utf-8'
		},

		initialize: function() {
			var params = Array.associate(arguments, { url: 'string', options: 'object', handler: 'function' });
			this.url = params.url;
			this.setOptions(params.options);
			if (params.handler)
				this.addEvents({ success: params.handler, failure: params.handler });
			this.options.isSuccess = this.options.isSuccess || this.isSuccess;
			this.headers = new Hash();
			if (this.options.urlEncoded && this.options.method == 'post') {
				this.setHeader('Content-Type', 'application/x-www-form-urlencoded' +
					(this.options.encoding ? '; charset=' + this.options.encoding : ''));
			}
			this.setHeader('X-Requested-With', 'XMLHttpRequest');
			this.setHeader('Accept', 'text/javascript, text/html, application/xml, text/xml, */*');
		},

		onStateChange: function() {
			if (this.transport.readyState == 4 && this.running) {
				this.running = false;
				this.status = 0;
				try {
					this.status = this.transport.status;
					delete this.transport.onreadystatechange;
				} catch(e) {}
				if (this.options.isSuccess.call(this, this.status)) {
					this.response = {
						text: this.transport.responseText,
						xml: this.transport.responseXML
					};
					this.fireEvent('success', this.response.text, this.response.xml);
					this.callChain();
				} else {
					this.fireEvent('failure');
				}
			}
		},

		isSuccess: function() {
			return !this.status || this.status >= 200 && this.status < 300;
		},

		setHeader: function(name, value) {
			this.headers[name] = value;
			return this;
		},

		getHeader: function(name) {
			try {
				if (this.transport) return this.transport.getResponseHeader(name);
			} catch(e) {}
			return null;
		},

		onFrameLoad: function() {
			var frame = this.frame && this.frame.iframe;
			if (frame && frame.location != 'about:blank' && this.running) {
				this.running = false;
				var doc = (frame.contentDocument || frame.contentWindow || frame).document;
				var text = doc && doc.body && (doc.body.textContent || doc.body.innerText || doc.body.innerHTML) || '';
				var head = Browser.IE && doc.getElementsByTagName('head')[0];
				text = (head && head.innerHTML || '') + text;
				this.response = { text: text };
				this.fireEvent('success', text);
				this.callChain();
				this.frame.div.remove.bind(this.frame.div).delay(1000);
				this.frame = null;
			}
		},

		send: function(url, data) {
			if (this.options.autoCancel) this.cancel();
			else if (this.running) return this;
			if (data === undefined) {
				data = url || '';
				url = this.url;
			}
			data = data || this.options.data;
			this.running = true;
			var method = this.options.method;
			if (Base.type(data) == 'element') { 
		 		createFrame(this, DomElement.get(data));
			} else {
				createRequest(this);
				if (!this.transport) {
					createFrame(that);
					method = 'get';
				}
				if (data && method == 'get') {
					url = url + (url.contains('?') ? '&' : '?') + data;
					data = null;
				}
			}
			if (this.frame) {
				if (this.frame.form)
					this.frame.form.set({
						target: this.frame.id, action: url, method: method,
						enctype: method == 'get' ? 'application/x-www-form-urlencoded' : 'multipart/form-data',
						'accept-charset': this.options.encoding || ''
					}).submit();
				else
					this.frame.element.setProperty('src', url);
			} else if (this.transport) {
				try {
					this.transport.open(method.toUpperCase(), url, this.options.async);
					this.transport.onreadystatechange = this.onStateChange.bind(this);
					if (method == 'post' && this.transport.overrideMimeType)
						this.setHeader('Connection', 'close');
					this.headers.merge(this.options.headers).each(function(header, name) {
						try{
							this.transport.setRequestHeader(name, header);
						} catch(e) {
							this.fireEvent('exception', [e, name, header]);
						}
					}, this);
					this.fireEvent('request');
					this.transport.send(data);
					if (!this.options.async)
						this.onStateChange();
				} catch(e) {
					this.fireEvent('failure', e);
				}
			}
			return this;
		},

		cancel: function() {
			if (this.running) {
				this.running = false;
				if (this.transport) {
					this.transport.abort();
					this.transport.onreadystatechange = null;
					this.transport = null;
				} else if (this.frame) {
					this.frame.div.remove();
					this.frame = null;
				}
				this.fireEvent('cancel');
			}
			return this;
		}
	};
});

Ajax = HttpRequest.extend({
	initialize: function() {
		var params = Array.associate(arguments, { url: 'string', options: 'object', handler: 'function' });
		this.addEvent('success', this.onSuccess);
		if (!/^(post|get)$/.test(this.options.method)) {
			this._method = this.options.method;
			this.options.method = 'post';
		}
		this.base(params.url, params.options, params.handler);
	},

	onSuccess: function() {
		if (this.options.update) Document.getElements(this.options.update).setHtml(this.response.text);
		if (this.options.evalScripts || this.options.evalResponse) this.evalScripts();
	},

	send: function(url, data) {
		if (data === undefined) {
			data = url || '';
			url = this.url;
		}
		data = data || this.options.data || '';
		switch (Base.type(data)) {
			case 'element':
				var el = DomElement.get(data);
				if (el.getTag() != 'form' || !el.hasElement('input[type=file]'))
					data = el.toQueryString();
				break;
			case 'object': data = Base.toQueryString(data);
			default:
				data = data.toString();
		}
		if (this._method) {
			if (typeof data == 'string') data += '&_method=' + this._method;
			else data.setValue('_method', this._method); 
		}
		return this.base(url, data);
	},

	evalScripts: function() {
		var script, scripts;
		if (this.options.evalResponse || (/(ecma|java)script/).test(this.getHeader('Content-Type'))) {
			scripts = this.response.text;
		} else {
			scripts = [];
			var exp = /<script[^>]*>([\s\S]*?)<\/script>/gi;
			while ((script = exp.exec(this.response.text)))
				scripts.push(script[1]);
			scripts = scripts.join('\n');
		}
		if (scripts) window.execScript ? window.execScript(scripts) : window.setTimeout(scripts, 0);
	}
});

Base.inject({
	_generics: true,

	toQueryString: function() {
		return Base.each(this, function(val, key) {
			this.push(encodeURIComponent(key) + '=' + encodeURIComponent(val));
		}, []).join('&');
	}
});

HtmlElement.inject({
	toQueryString: function() {
		return Base.toQueryString(this.getValues());
	},

	send: function(options) {
		return new Ajax(this.getProperty('action'), Hash.create({ method: 'post' }, options)).send(this);
	},

	update: function() {
		var params = Array.associate(arguments, { url: 'string', options: 'object', handler: 'function', data: 'any' });
		return new Ajax(params.url, Hash.create({ update: this }, params.options), params.handler).send(params.data);
	}
});

Asset = new function() {
	function getProperties(props) {
		return props ? Hash.create(props).each(function(val, key) {
			if (/^on/.test(key)) delete this[key];
		}) : {};
	}

	function createMultiple(type, sources, options) {
		var props = getProperties(options), count = 0;
		options = options || {};
		return sources.each(function(src) {
			props.onLoad = function() {
				if (options.onProgress)
					options.onProgress(src);
				if (++count == sources.length && options.onComplete)
					options.onComplete();
			}
			this.push(Asset[type](src, props));
		}, new HtmlElements());
	}

	return {
		script: function(src, props) {
			var script = new HtmlElement('script')
				.addEvent('load', props.onLoad)
				.setProperty('src', src)
				.setProperties(getProperties(props))
				.addEvent('readystatechange', function() {
					if (/loaded|complete/.test(this.$.readyState))
						this.fireEvent('load');
				})
				.insertInside(Document.getElement('head'));
			if (Browser.WEBKIT2)
				new HttpRequest(src, { method: 'get' }).addEvent('success', function() {
					script.fireEvent.bind(script, 'load').delay(1);
				}).send();
			return script;
		},

		stylesheet: function(src, props) {
			return new HtmlElement('link', Hash.create({
				rel: 'stylesheet', media: 'screen', type: 'text/css', href: src
			}, props)).insertInside(Document.getElement('head'));
		},

		image: function(src, props) {
			props = props || {};
			var image = new Image();
			image.src = src;
			var element = new HtmlElement('img', { src: src });
			['load', 'abort', 'error'].each(function(type) {
				var name = 'on' + type.capitalize();
				if (props[name]) element.addEvent(type, function() {
					this.removeEvent(type, arguments.callee);
					props[name].call(this);
				});
			});
			if (image.width && image.height)
				element.fireEvent.bind(element, 'load').delay(1);
			return element.setProperties(getProperties(props));
		},

	 	scripts: function(sources, options) {
			return createMultiple('script', sources, options);
		},

	 	stylesheets: function(sources, options) {
			return createMultiple('stylesheet', sources, options);
		},

	 	images: function(sources, options) {
			return createMultiple('image', sources, options);
		}
	}
};

Cookie = {
	set: function(name, value, expires, path) {
		document.cookie = name + '=' + encodeURIComponent(value) + (expires ? ';expires=' +
			expires.toGMTString() : '') + ';path=' + (path || '/');
	},
	get: function(name) {
		var res = document.cookie.match('(^|;)\\s*' + name + "=([^;]*)");
		if (res) return decodeURIComponent(res[1]);
	},

	remove: function(name) {
		this.set(name, '', -1);
	}
};

Fx = Base.extend(Chain, Callback, {
	options: {
		transition: function(p) {
			return -(Math.cos(Math.PI * p) - 1) / 2;
		},
		duration: 500,
		unit: false,
		wait: true,
		fps: 50
	},

	initialize: function(element, options) {
		this.element = HtmlElement.get(element);
		this.setOptions(options);
	},

	step: function() {
		var time = new Date().getTime();
		if (time < this.time + this.options.duration) {
			this.delta = this.options.transition((time - this.time) / this.options.duration);
			this.update(this.get());
		} else {
			this.stop(true);
			this.update(this.to);
			this.fireEvent('complete', this.element);
			this.callChain();
		}
	},

	set: function(to) {
		this.update(to);
		this.fireEvent('set', this.element);
		return this;
	},

	get: function() {
		return this.compute(this.from, this.to);
	},

	compute: function(from, to) {
		return (to - from) * this.delta + from;
	},

	start: function(from, to) {
		if (!this.options.wait) this.stop();
		else if (this.timer) return this;
		this.from = from;
		this.to = to;
		this.time = new Date().getTime();
		if (!this.slave) {
			this.timer = this.step.periodic(Math.round(1000 / this.options.fps), this);
			this.fireEvent('start', this.element);
		}
		this.step();
		return this;
	},

	stop: function(end) {
		if (this.timer) {
			this.timer = this.timer.clear();
			if (!end) this.fireEvent('cancel', this.element);
		}
		return this;
	}
});

Fx.CSS = new function() {

	var parsers = new Hash({
		color: {
			match: function(value) {
				if (value.match(/^#[0-9a-f]{3,6}$/i)) return value.hexToRgb(true);
				return ((value = value.match(/(\d+),\s*(\d+),\s*(\d+)/))) ? [value[1], value[2], value[3]] : false;
			},

			compute: function(from, to, fx) {
				return from.map(function(value, i) {
					return Math.round(fx.compute(value, to[i]));
				});
			},

			get: function(value) {
				return value.map(Number);
			}
		},

		number: {
			match: function(value) {
				return parseFloat(value);
			},

			compute: function(from, to, fx) {
				return fx.compute(from, to);
			},

			get: function(value, unit) {
				return (unit) ? value + unit : value;
			}
		}
	});

	return {
		start: function(element, property, values) {
			values = Array.create(values);
			if (!Base.check(values[1]))
				values = [ element.getStyle(property), values[0] ];
			var parsed = values.map(Fx.CSS.set);
			return { from: parsed[0], to: parsed[1] };
		},

		set: function(value) {
			return Array.create(value).map(function(val) {
				val = val + '';
				var res = parsers.find(function(parser, key) {
					var value = parser.match(val);
					if (Base.check(value)) return { value: value, parser: parser };
				}) || {
					value: val,
					parser: {
						compute: function(from, to) {
							return to;
						}
					}
				};
				return res;
			});
		},

		compute: function(from, to, fx) {
			return from.map(function(obj, i) {
				return {
					value: obj.parser.compute(obj.value, to[i].value, fx),
					parser: obj.parser
				};
			});
		},

		get: function(now, unit) {
			return now.reduce(function(prev, cur) {
				var get = cur.parser.get;
				return prev.concat(get ? get(cur.value, unit) : cur.value);
			}, []);
		}
	}
};

Fx.Style = Fx.extend({
	initialize: function(element, property, options) {
		this.base(element, options);
		this.property = property;
	},

	hide: function() {
		return this.set(0);
	},

	get: function() {
		return Fx.CSS.compute(this.from, this.to, this);
	},

	set: function(to) {
		return this.base(Fx.CSS.set(to));
	},

	start: function(from, to) {
		if (this.timer && this.options.wait) return this;
		var parsed = Fx.CSS.start(this.element, this.property, [from, to]);
		return this.base(parsed.from, parsed.to);
	},

	update: function(val) {
		this.element.setStyle(this.property, Fx.CSS.get(val, this.options.unit));
	}
});

HtmlElement.inject({
	effect: function(prop, opts) {
		return new Fx.Style(this, prop, opts);
	}
});

Fx.Styles = Fx.extend({
	get: function() {
		var that = this;
		return Base.each(this.from, function(from, key) {
			this[key] = Fx.CSS.compute(from, that.to[key], that);
		}, {});
	},

	set: function(to) {
		return this.base(Base.each(to, function(val, key) {
			this[key] = Fx.CSS.set(val);
		}, {}));
	},

	start: function(obj) {
		if (this.timer && this.options.wait) return this;
		var from = {}, to = {};
		Base.each(obj, function(val, key) {
			var parsed = Fx.CSS.start(this.element, key, val);
			from[key] = parsed.from;
			to[key] = parsed.to;
		}, this);
		return this.base(from, to);
	},

	update: function(val) {
		Base.each(val, function(val, key) {
			this.element.setStyle(key, Fx.CSS.get(val, this.options.unit));
		}, this);
	}

});

HtmlElement.inject({
	effects: function(opts) {
		return new Fx.Styles(this, opts);
	}
});

Fx.Elements = Fx.extend({
	initialize: function(elements, options) {
		this.base(null, options);
		this.elements = Document.getElements(elements);
	},

	start: function(obj) {
		if (this.timer && this.options.wait) return this;
		this.effects = {};

		function start(that, key, val) {
			var fx = that.effects[key] = new Fx.Styles(that.elements[key], that.options);
			fx.slave = true;
			fx.start(val);
		}

		Base.each(obj, function(val, key) {
			if (key == '*') {
				this.elements.each(function(el, key) {
					start(this, key, val);
				}, this);
			} else if (isNaN(parseInt(key))) {
				var els = Document.getElements(key);
				this.elements.append(els);
				els.each(function(el) {
					start(this, this.elements.indexOf(el), val);
				}, this);
			} else {
				start(this, key, val);
			}
		}, this);
		return this.base();
	},

	set: function(to) {
	},

	update: function(to) {
		Base.each(this.effects, function(fx) {
			fx.step();
		});
	}
});

Fx.Transitions = new Base().inject({
	inject: function(src) {
		return this.base(Base.each(src, function(func, name) {
			func.In = func;

			func.Out = function(pos) {
				return 1 - func(1 - pos);
			}

			func.InOut = function(pos) {
				return pos <= 0.5 ? func(2 * pos) / 2 : (2 - func(2 * (1 - pos))) / 2;
			}
		}));
	},

	Linear: function(p) {
		return p;
	}
});

Fx.Transitions.inject({
	Pow: function(p, x) {
		return Math.pow(p, x[0] || 6);
	},

	Expo: function(p) {
		return Math.pow(2, 8 * (p - 1));
	},

	Circ: function(p) {
		return 1 - Math.sin(Math.acos(p));
	},

	Sine: function(p) {
		return 1 - Math.sin((1 - p) * Math.PI / 2);
	},

	Back: function(p, x) {
		x = x[0] || 1.618;
		return Math.pow(p, 2) * ((x + 1) * p - x);
	},

	Bounce: function(p) {
		var value;
		for (var a = 0, b = 1; 1; a += b, b /= 2) {
			if (p >= (7 - 4 * a) / 11) {
				value = - Math.pow((11 - 6 * a - 11 * p) / 4, 2) + b * b;
				break;
			}
		}
		return value;
	},

	Elastic: function(p, x) {
		return Math.pow(2, 10 * --p) * Math.cos(20 * p * Math.PI * (x[0] || 1) / 3);
	}

});

Fx.Transitions.inject(['Quad', 'Cubic', 'Quart', 'Quint'].each(function(name, i) {
	this[name] = function(p) {
		return Math.pow(p, i + 2);
	}
}, {}));

