var Base = new function() { 
	var hidden = /^(statics|generics|preserve|enumerable|beans|prototype)$/,
		proto = Object.prototype,
		has = proto.hasOwnProperty,
		proto = Array.prototype,
		slice = proto.slice,
		forEach = proto.forEach = proto.forEach || function(iter, bind) {
			for (var i = 0, l = this.length; i < l; i++)
				iter.call(bind, this[i], i, this);
		},
		forIn = function(iter, bind) {
			for (var i in this)
				if (this.hasOwnProperty(i))
					iter.call(bind, this[i], i, this);

		};

	function define(obj, name, desc) {
		try {
			Object.defineProperty(obj, name, desc);
		} catch (e) {
			obj[name] = desc.value;
		}
		return obj;
	}

	function describe(obj, name) {
		try {
			return Object.getOwnPropertyDescriptor(obj, name);
		} catch (e) {
			return has.call(obj, name)
				? { value: obj[name], enumerable: true, configurable: true,
						writable: true }
				: null;
		}
	}

	function inject(dest, src, enumerable, base, preserve, generics, version) {
		var beans, bean;

		function field(name, val, dontCheck, generics) {
			var val = val || (val = describe(src, name))
					&& (val.get ? val : val.value),
				func = typeof val === 'function',
				res = val,
				prev = preserve || func
					? (val && val.get ? name in dest : dest[name]) : null;
			if (generics && func && (!preserve || !generics[name])) {
				generics[name] = function(bind) {
					return bind && dest[name].apply(bind,
							slice.call(arguments, 1));
				}
			}
			if ((dontCheck || val !== undefined && has.call(src, name))
					&& (!preserve || !prev)) {
				if (func) {
					if (prev && /\bthis\.base\b/.test(val)) {
						while (prev._version && prev._version != version
								&& prev._dest == dest)
							prev = prev._previous;
						var fromBase = base && base[name] == prev;
						res = function() {
							var tmp = describe(this, 'base');
							define(this, 'base', { value: fromBase
								? base[name] : prev, configurable: true });
							try {
								return val.apply(this, arguments);
							} finally {
								tmp ? define(this, 'base', tmp)
									: delete this.base;
							}
						};
						res.toString = function() {
							return val.toString();
						}
						res.valueOf = function() {
							return val.valueOf();
						}
						if (version) {
							res._version = version;
							res._previous = prev;
							res._dest = dest;
						}
					}
					if (beans && val.length == 0
							&& (bean = name.match(/^(get|is)(([A-Z])(.*))$/)))
						beans.push([ bean[3].toLowerCase() + bean[4], bean[2] ]);
				}
				if (!res || func || res instanceof java.lang.Object
						|| !res.get && !res.set)
					res = { value: res, writable: true };
				if ((describe(dest, name)
						|| { configurable: true }).configurable) {
					res.configurable = true;
					res.enumerable = enumerable;
				}
				define(dest, name, res);
			}
		}
		if (src) {
			beans = src.beans && [];
			for (var name in src)
				if (has.call(src, name) && !hidden.test(name))
					field(name, null, true, generics);
			for (var i = 0, l = beans && beans.length; i < l; i++)
				try {
					var bean = beans[i], part = bean[1];
					field(bean[0], {
						get: dest['get' + part] || dest['is' + part],
						set: dest['set' + part]
					}, true);
				} catch (e) {}
		}
		return dest;
	}

	function extend(obj) {
		var ctor = function(dont) {
			if (this.initialize && dont !== ctor.dont)
				return this.initialize.apply(this, arguments);
		}
		ctor.prototype = obj;
		ctor.toString = function() {
			return (this.prototype.initialize || function() {}).toString();
		}
		return ctor;
	}

	function iterator(iter) {
		return !iter
			? function(val) { return val }
			: typeof iter !== 'function'
				? function(val) { return val == iter }
				: iter;
	}

	function each(obj, iter, bind, asArray) {
		try {
			if (obj)
				(asArray || asArray === undefined && Base.type(obj) == 'array'
					? forEach : forIn).call(obj, iterator(iter),
						bind = bind || obj);
		} catch (e) {
			if (e !== Base.stop) throw e;
		}
		return bind;
	}

	function clone(obj) {
		return each(obj, function(val, i) {
			this[i] = val;
		}, new obj.constructor());
	}

	inject(Function.prototype, {
		inject: function(src) {
			if (src) {
				var proto = this.prototype,
					base = proto.__proto__ && proto.__proto__.constructor,
					statics = src.statics == true ? src : src.statics;
				var version = (this == HopObject || proto instanceof HopObject)
						&& (proto.constructor._version
						|| (proto.constructor._version = 1));
				if (statics != src)
					inject(proto, src, src.enumerable, base && base.prototype,
							src.preserve, src.generics && this, version);
				inject(this, statics, true, base, src.preserve, null, version);
				if (version) {
					var update = proto.onCodeUpdate;
					if (!update || !update._wrapped) {
						var res = function(name) {
							this.constructor._version =
								(this.constructor._version || 0) + 1;
							if (update)
								update.call(this, name);
						};
						res._wrapped = true;
						proto.onCodeUpdate = res;
					}
					if (src.initialize) {
						var ctor = proto.constructor;
						ctor.dont = {};
						proto.constructor = function(dont) {
							if (proto.initialize && dont !== ctor.dont)
								return proto.initialize.apply(this, arguments);
						}
					}
				}
			}
			for (var i = 1, l = arguments.length; i < l; i++)
				this.inject(arguments[i]);
			return this;
		},

		extend: function(src) {
			var proto = new this(this.dont),
				ctor = extend(proto);
			define(proto, 'constructor',
					{ value: ctor, writable: true, configurable: true });
			ctor.dont = {};
			inject(ctor, this, true);
			return arguments.length ? this.inject.apply(ctor, arguments) : ctor;
		}
	});
	return Object.inject({
		has: has,
		each: each,

		inject: function() {
			for (var i = 0, l = arguments.length; i < l; i++)
				inject(this, arguments[i]);
			return this;
		},

		extend: function() {
			var res = new (extend(this));
			return res.inject.apply(res, arguments);
		},

		each: function(iter, bind) {
			return each(this, iter, bind);
		},

		clone: function() {
			return clone(this);
		},

		statics: {
			each: each,
			clone: clone,
			define: define,
			describe: describe,
			iterator: iterator,

			has: function(obj, name) {
				return has.call(obj, name);
			},

			type: function(obj) {
				return (obj || obj === 0) && (obj._type
					|| (obj instanceof java.lang.Object ? 'java' : typeof obj))
					|| null;
			},

			check: function(obj) {
				return !!(obj || obj === 0);
			},

			pick: function() {
				for (var i = 0, l = arguments.length; i < l; i++)
					if (arguments[i] !== undefined)
						return arguments[i];
				return null;
			},

			stop: {}
		}
	});
}

var $each = Base.each,
	$type = Base.type,
	$check = Base.check,
	$pick = Base.pick,
	$stop = Base.stop,
	$break = $stop;

var Enumerable = {
	generics: true,
	preserve: true,

	findEntry: function(iter, bind) {
		var that = this, iter = Base.iterator(iter), ret = null;
		Base.each(this, function(val, key) {
			var res = iter.call(bind, val, key, that);
			if (res) {
				ret = { key: key, value: val, result: res };
				throw Base.stop;
			}
		});
		return ret;
	},

	find: function(iter, bind) {
		var entry = this.findEntry(iter, bind);
		return entry && entry.result;
	},

	contains: function(iter) {
		return !!this.findEntry(iter);
	},

	remove: function(iter, bind) {
		var entry = this.findEntry(iter, bind);
		if (entry) {
			delete this[entry.key];
			return entry.value;
		}
	},

	filter: function(iter, bind) {
		var that = this;
		return Base.each(this, function(val, i) {
			if (iter.call(bind, val, i, that))
				this[this.length] = val;
		}, []);
	},

	map: function(iter, bind) {
		var that = this;
		return Base.each(this, function(val, i) {
			this[this.length] = iter.call(bind, val, i, that);
		}, []);
	},

	every: function(iter, bind) {
		var that = this;
		return this.find(function(val, i) {
			return !iter.call(this, val, i, that);
		}, bind || null) == null;
	},

	some: function(iter, bind) {
		return this.find(iter, bind || null) != null;
	},

	collect: function(iter, bind) {
		var that = this, iter = Base.iterator(iter);
		return Base.each(this, function(val, i) {
		 	val = iter.call(bind, val, i, that);
			if (val != null)
				this[this.length] = val;
		}, []);
	},

	max: function(iter, bind) {
		var that = this, iter = Base.iterator(iter);
		return Base.each(this, function(val, i) {
			val = iter.call(bind, val, i, that);
			if (val >= (this.max || val)) this.max = val;
		}, {}).max;
	},

	min: function(iter, bind) {
		var that = this, iter = Base.iterator(iter);
		return Base.each(this, function(val, i) {
			val = iter.call(bind, val, i, that);
			if (val <= (this.min || val)) this.min = val;
		}, {}).min;
	},

	pluck: function(prop) {
		return this.map(function(val) {
			return val[prop];
		});
	},

	sortBy: function(iter, bind) {
		var that = this, iter = Base.iterator(iter);
		return this.map(function(val, i) {
			return { value: val, compare: iter.call(bind, val, i, that) };
		}, bind).sort(function(left, right) {
			var a = left.compare, b = right.compare;
			return a < b ? -1 : a > b ? 1 : 0;
		}).pluck('value');
	},

	toArray: function() {
		return this.map(function(value) {
			return value;
		});
	}
};

var Hash = Base.extend(Enumerable, {
	generics: true,

	initialize: function(arg) {
		if (typeof arg == 'string') {
			for (var i = 0, l = arguments.length; i < l; i += 2)
				this[arguments[i]] = arguments[i + 1];
		} else {
			this.append.apply(this, arguments);
		}
		return this;
	},

	each: function(iter, bind) {
		return Base.each(this, iter, bind, false); 
	},

	append: function() {
		for (var i = 0, l = arguments.length; i < l; i++) {
			var obj = arguments[i];
			for (var key in obj)
				if (Base.has(obj, key))
					this[key] = obj[key];
		}
		return this;
	},

	merge: function() {
		return Array.each(arguments, function(obj) {
			Base.each(obj, function(val, key) {
				this[key] = Base.type(this[key]) == 'object'
					? Hash.prototype.merge.call(this[key], val)
					: Base.type(val) == 'object' ? Base.clone(val) : val;
			}, this);
		}, this);
	},

	getKeys: function() {
		return Hash.getKeys(this);
	},

	getValues: Enumerable.toArray,

	getSize: function() {
		return this.each(function() {
			this.size++;
		}, { size: 0 }).size;
	},

	toQueryString: function() {
		return Base.each(this, function(val, key) {
			this.push(key + '=' + escape(val));
		}, []).join('&');
	},

	statics: {
		create: function(obj) {
			return arguments.length == 1 && obj.constructor == Hash
				? obj : Hash.prototype.initialize.apply(new Hash(), arguments);
		},

		getKeys: Object.keys || function(obj) {
			return Hash.map(function(val, key) {
				return key;
			});
		}
	}
});

var $H = Hash.create;

Array.inject(Enumerable, {
	generics: true,
	beans: true,
	_type: 'array',

	each: function(iter, bind) {
		return Base.each(this, iter, bind, true); 
	},

	collect: function(iter, bind) {
		var that = this;
		return this.each(function(val, i) {
			if ((val = iter.call(bind, val, i, that)) != null)
				this[this.length] = val;
		}, []);
	},

	findEntry: function(iter, bind) {
		if (typeof iter != 'function') {
			var i = this.indexOf(iter);
			return i == -1 ? null : { key: i, value: iter, result: iter };
		}
		return Enumerable.findEntry.call(this, iter, bind);
	},

	remove: function(iter, bind) {
		var entry = this.findEntry(iter, bind);
		if (entry) {
			this.splice(entry.key, 1);
			return entry.value;
		}
	},

	toArray: function() {
		return Array.prototype.slice.call(this);
	},

	clone: function() {
		return this.toArray();
	},

	clear: function() {
		this.length = 0;
	},

	compact: function() {
		return this.filter(function(value) {
			return value != null;
		});
	},

	append: function(items) {
		for (var i = 0, l = items.length; i < l; i++)
			this[this.length++] = items[i];
		return this;
	},

	associate: function(obj) {
		if (!obj)
			obj = this;
		else if (typeof obj == 'function')
			obj = this.map(obj);
		if (obj.length != null) {
			var that = this;
			return Base.each(obj, function(name, index) {
				this[name] = that[index];
				if (index == that.length)
					throw Base.stop;
			}, {});
		} else {
			obj = Hash.append({}, obj);
			return Array.each(this, function(val) {
				var type = Base.type(val);
				Base.each(obj, function(hint, name) {
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
		return Array.each(this, function(val) {
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
		while (i--) res.swap(i, Math.rand(i + 1));
		return res;
	},

	pick: function() {
		return this[Math.rand(this.length)];
	},

	getFirst: function() {
		return this[0];
	},

	getLast: function() {
		return this[this.length - 1];
	}
}, new function() {
	function combine(subtract) {
		return function(items) {
			var res = new this.constructor();
			for (var i = this.length - 1; i >= 0; i--)
				if (subtract == !Array.find(items, this[i]))
					res.push(this[i]);
			return res;
		}
	}

	return {
		subtract: combine(true),

		intersect: combine(false)
	}
});

Array.inject(new function() {
	var proto = Array.prototype, fields = ['push','pop','shift','unshift','sort',
		'reverse','join','slice','splice','forEach','indexOf','lastIndexOf',
		'filter','map','every','some','reduce','concat'].each(function(name) {
		this[name] = proto[name];
	}, { generics: true, preserve: true });

	Array.inject(fields);

	Hash.append(fields, proto, {
		clear: function() {
			for (var i = 0, l = this.length; i < l; i++)
				delete this[i];
			this.length = 0;
		},

		toString: proto.join,

		length: 0
	});

	return {
		statics: {
			create: function(obj) {
				if (obj == null)
					return [];
				if (obj.toArray)
					return obj.toArray();
				if (typeof obj.length == 'number')
					return Array.prototype.slice.call(obj);
				return [obj];
			},

			convert: function(obj) {
				return Base.type(obj) == 'array' ? obj : Array.create(obj);
			},

			extend: function(src) {
				var ret = Base.extend(fields, src);
				ret.extend = Function.extend;
				return ret;
			}
		}
	};
});

var $A = Array.create;

Function.inject(new function() {

	return {
		generics: true,
		preserve: true,

		wrap: function(bind, args) {
			var that = this;
			return function() {
				return that.apply(bind, args || arguments);
			}
		}
	}
});

Number.inject({
	_type: 'number',

	limit: function(min, max) {
		return Math.min(max, Math.max(min, this));
	},

	times: function(func, bind) {
		for (var i = 0; i < this; i++)
			func.call(bind, i);
		return bind || this;
	},

	toInt: function(base) {
		return parseInt(this, base || 10);
	},

	toFloat: function() {
		return parseFloat(this);
	},

	toPaddedString: function(length, base, prefix) {
		var str = this.toString(base || 10);
		return (prefix || '0').times(length - str.length) + str;
	}
});

String.inject({
	_type: 'string',

	test: function(exp, param) {
		return new RegExp(exp, param || '').test(this);
	},

	toArray: function() {
		return this ? this.split(/\s+/) : [];
	},

	toInt: Number.prototype.toInt,

	toFloat: Number.prototype.toFloat,

	capitalize: function() {
		return this.replace(/\b[a-z]/g, function(match) {
			return match.toUpperCase();
		});
	},

	camelize: function(separator) {
		return this.replace(separator ? new RegExp('[' + separator + '](\\w)', 'g') : /-(\w)/g, function(all, chr) {
			return chr.toUpperCase();
		});
	},

	uncamelize: function(separator) {
		separator = separator || ' ';
		return this.replace(/[a-z][A-Z0-9]|[0-9][a-zA-Z]|[A-Z]{2}[a-z]/g, function(match) {
			return match.charAt(0) + separator + match.substring(1);
		});
	},

	hyphenate: function(separator) {
		return this.uncamelize(separator || '-').toLowerCase();
	},

	escapeRegExp: function() {
		return this.replace(/([-.*+?^${}()|[\]\/\\])/g, '\\$1');
	},

	trim: function(exp) {
		exp = exp ? '[' + exp + ']' : '\\s';
		return this.replace(new RegExp('^' + exp + '+|' + exp + '+$', 'g'), '');
	},

	clean: function() {
		return this.replace(/\s{2,}/g, ' ').trim();
	},

	contains: function(string, sep) {
		return (sep ? (sep + this + sep).indexOf(sep + string + sep) : this.indexOf(string)) != -1;
	},

	times: function(count) {
		return count < 1 ? '' : new Array(count + 1).join(this);
	},

	isHtml: function() {
		return /^[^<]*(<(.|\s)+>)[^>]*$/.test(this);
	}
});

RegExp.inject({
	_type: 'regexp'
});

Date.inject({
	statics: {
		SECOND: 1000,
		MINUTE: 60000,
		HOUR: 3600000,
		DAY: 86400000,
		WEEK: 604800000, 
		MONTH: 2592000000, 
		YEAR: 31536000000 
	}
});

Math.rand = function(first, second) {
	return second == undefined
		? Math.rand(0, first)
		: Math.floor(Math.random() * (second - first) + first);
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
			if (this.length == 4 && this[3] == 0 && !toArray)
				return 'transparent';
			var hex = [];
			for (var i = 0; i < 3; i++)
				hex.push((this[i] - 0).toPaddedString(2, 16));
			return toArray ? hex : '#' + hex.join('');
		}
	},

	rgbToHsb: function() {
		var r = this[0], g = this[1], b = this[2];
		var hue, saturation, brightness;
		var max = Math.max(r, g, b), min = Math.min(r, g, b);
		var delta = max - min;
		brightness = max / 255;
		saturation = max != 0 ? delta / max : 0;
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

var Json = {
	encode: function(obj, properties) {
		return Base.type(obj) != 'java' ? JSON.stringify(obj, properties) : null;
	},

	decode: function(str, secure) {
		try {
			return JSON.parse(str);
		} catch (e) {
			return null;
		}
	}
};

