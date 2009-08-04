Function.inject({
	inject: function(src /*, ... */) {
		// The way Helma 1.x handles HopObject constructors is a bit weird:
		// Setting proto.constructor defines the HopObject's constructor
		// function, but retrieving it again still returns the native
		// HopObject constructor, that internally then calls the Js constructor.
		// While this is good news since we can still retrieve ctor.dont and count
		// on proto.constructor to always return the same value, there is no way
		// to check if a constructor was defined or not, nor call the previous
		// definition. The solution is to not support constructor in favour of
		// bootstrap's initialize.
		// Also, inject first through base and then modfiy after, since otherwise
		// our constructor is overridden again.
		this.base(src);
		var proto = this.prototype, ctor = proto.constructor;
		// Keep setting it each time, since  .constructor might be overridden
		// by this.base again...
		if (proto instanceof HopObject && proto.getEditForm) {
			proto.constructor = function(param) {
				if (param !== ctor.dont) {
					app.log('Creating ' + this);
					this.setCreating(true);
					// Now get the node. This gets getEditParent to work.
					// Support passing an EditItem to the constructor, so
					// the editing parent can be determined from it. This
					// is then passed to EditNode.get...
					var isItem = param instanceof EditItem;
					EditNode.get(this, isItem ? param : null);
					// Now call initialize that we suppressed above when creating ctor:
					if (proto.initialize) {
						var ret = proto.initialize.apply(this, isItem ? [] : arguments);
						// TODO: Check if this really works?
						if (ret && ret != this) {
							ret.setCreating(true);
							return ret;
						}
					}
				}
			}
		}
		for (var i = 1, l = arguments.length; i < l; i++)
			this.inject(arguments[i]);
		return this;
	}
});
