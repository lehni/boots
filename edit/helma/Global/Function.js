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
		this.base.apply(this, arguments);
		var proto = this.prototype, ctor = proto.constructor;
		// Keep setting it each time, since  .constructor might be overridden
		// by this.base again...
		if (proto instanceof HopObject && proto.getEditForm) {
			proto.constructor = function(param) {
				if (param !== ctor.dont) {
					app.log('Creating ' + this.getEditId());
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
			// We need to prevent wrapping of previously defined onPerist
			// methods by marking ours to distinguish it from normal ones.
			// This allows users still to define normal onPersist methods 
			// without having to call base for support of onStore.
			var onPersist = proto.onPersist;
			if (!onPersist || !onPersist._wrapped) {
				proto.onPersist = function() {
					if (this.cache.transientId) {
						var beforeId = this.getEditId();
						// This was a transient node before, call onStore
						// with the transient id, so for example resources
						// can be renamed.
						if (this.onStore)
							this.onStore(this.cache.transientId);
						// This marks the end of editing
						this.setCreating(false);
						app.log('Storing ' + beforeId + ', now: ' + this.getEditId());
					}
					if (onPersist)
						onPersist.apply(this, arguments);
				}
				proto.onPersist._wrapped = true;
			}
		}
		return this;
	}
});
