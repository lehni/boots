EditRequirement = Base.extend(new function() {
	var types = new Hash();

	function check(item, type, value) {
		// Fetch the requirement object with given name from item.
		var req = item.requirements[type];
		// Get the type class for this requirement.
		type = types[type];
		if (req && type) {
			var message = null;
			// Convert simple requirement (e.g. notNull: true) to an object
			// so check can be called on it.
			if (req.value === undefined)
				req = { value: req };
			// Call the prototype function on the plain requirement object.
			// Returning errors is supported both through throw and return
			try {
				message = type.prototype.check.call(req, value, item);
			} catch (e) {
				message = e;
			}
			// Received an error message for a requirement. See if message
			// is overridden through requirement object, and throw accordingly:
			if (message)
				throw req.message || message;
		}
	}

	return {
		// For the instance version of check, pass item as a 2nd parameter,
		// as it is mostly not needed for checking values.
		check: function(value, item) {
		},

		statics: {
			extend: function(src) {
				return (src._types || '').split(',').each(function(type) {
					types[type] = this;
				}, this.base(src));
			},

			check: function(item, value) {
				// Check any defined requirements for this item and throw exceptions
				// if requirements are not met.
				// First we allways check for notNull:
				check(item, 'notNull', value);
				// Now all the others:
				for (var name in item.requirements)
					if (name != 'notNull')
						check(item, name, value);
			}
		}
	}
});

NotNullRequirement = EditRequirement.extend({
	_types: 'notNull',

	check: function(value) {
		if (this.value && value == null)
			throw 'cannot be empty.';
	}
});

// TODO: Merge length,minLength,maxLength to one protoype and use compare / throw lookups?
LengthRequirement = EditRequirement.extend({
	_types: 'length',

	check: function(value) {
		if (value != null && value.length != this.value)
			throw 'needs to contain exactly ' + 
				this.value + ' characters.';
	}
});

MinLengthRequirement = EditRequirement.extend({
	_types: 'minLength',

	check: function(value) {
		if (value != null && value.length < this.value)
			throw 'needs to contain at least ' + 
				this.value + ' characters.';
	}
});

MaxLengthRequirement = EditRequirement.extend({
	_types: 'maxLength',

	check: function(value) {
		if (value != null && value.length > this.value)
			throw 'cannot contain more than ' + 
				this.value + ' characters.';
	}
});

MatchRequirement = EditRequirement.extend({
	_types: 'match',

	check: function(value) {
		if (value != null && (!this.value.test || !this.value.test(value)))
			throw 'is not correctly formated.';
	}
});

EmailRequirement = EditRequirement.extend({
	_types: 'email',

	check: function(value) {
		if (value != null && this.value
				&& !/^([a-zA-Z0-9\-\.\_]+)(\@)([a-zA-Z0-9\-\.]+)(\.)([a-zA-Z]{2,4})$/.test(value))
			throw 'is not a valid address.';
	}
});

UriRequirement = EditRequirement.extend({
	_types: 'uri,url',

	check: function(value) {
		if (value != null && this.value
				&& !/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/.test(value))
			throw 'is not a valid URI.';
	}
});

UniqueInRequirement = EditRequirement.extend({
	_types: 'uniqueIn',

	check: function(value, item) {
		var obj = this.value.get(value);
		if (obj != null && obj != item.form.object)
			throw 'is already in use.';
	}
});

CallbackRequirement = EditRequirement.extend({
	_types: 'callback',

	check: function(value, item) {
		// The callback handler can either return an error as
		// a string or throw it directly.
		return this.value.call(item.form.object, value);
	}
});
