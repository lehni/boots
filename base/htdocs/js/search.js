SearchField = Input.extend({
	_class: 'search',

	initialize: function() {
		this.removeClass('hidden');
		if (Browser.WEBKIT) {
			this.setProperty('type', 'search');

			this.clear = function() {
				if (this.getValue()) {
					this.setValue('');
					this.fireEvent('search');
				}
			}
		} else {
			var that = this, clear = false;
			var placeholder = this.getProperty('placeholder');
			function showPlaceholder(set) {
				that.setValue(set ? placeholder : '');
				that.modifyClass('apple-search-placeholder', set);
			};
			function updateClear() {
				clear = that.getValue().length > 0;
				right.modifyClass('apple-search-clear', clear);
			}
			this.injectBefore('span', { 'class': 'apple-search-left' });
			var right = this.injectAfter('span', { 'class': 'apple-search-right' });
			this.addClass('apple-search');
			this.setWidth(this.getWidth() - 50); // 2 * 19 + 4 * 3
			if (!this.getValue()) {
				showPlaceholder(true);
			} else {
				updateClear();
			}
			right.addEvents({
				mousedown: function() {
					this.focused = that.focused;
				},

				click: function() {
					if (clear) {
						if (this.focused) {
							that.setValue('');
							that.focus();
						} else {
							showPlaceholder(true);
						}
						this.removeClass('apple-search-clear');
						that.fireEvent('search');
						clear = false;
					}
				}
			});

			this.addEvents({
				keyup: function() {
					updateClear();
				},

				focus: function() {
					this.focused = true;
					if (this.getValue() == placeholder)
						showPlaceholder(false);
				},

				blur: function() {
					this.focused = false;
					if (!this.getValue())
						showPlaceholder(true);
				}
			});

			this.clear = function() {
				if (!this.focused && this.getValue() != placeholder) {
					showPlaceholder(true);
					this.fireEvent('search');
				}
			}
		}
		this.addEvents({
			keydown: function(event) {
				if (event.key == 'enter') {
					this.fireEvent('search');
				}
			},

			keyup: function() {
				var that = this;
				if (this.timer) this.timer.clear();
				if (this.getValue()) this.timer = (function() {
					that.fireEvent('search');
				}).delay(500);
				else this.fireEvent('search');
			}			
		});
	}
});
