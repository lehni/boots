SearchField = HtmlInput.extend({
	_class: 'search-field',

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
				that.set('value', set ? placeholder : '');
				that.modifyClass('search-field-placeholder', set);
			};
			function updateClear() {
				clear = that.get('value').length > 0;
				right.modifyClass('search-field-clear', clear);
			}
			this.wrap('div', { width: this.getStyle('width') });
			this.injectBefore('span', { 'class': 'search-field-left' });
			var right = this.injectAfter('span', { 'class': 'search-field-right' });
			this.addClass('search-field-input');
			this.setWidth(this.getWidth() - 50); // 2 * 19 + 4 * 3
			var value = this.get('value');
			if (!value || value == placeholder) {
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
							that.set('value', '');
							that.focus();
						} else {
							showPlaceholder(true);
						}
						this.removeClass('search-field-clear');
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
					if (this.get('value') == placeholder)
						showPlaceholder(false);
				},

				blur: function() {
					this.focused = false;
					if (!this.get('value'))
						showPlaceholder(true);
				}
			});

			this.clear = function() {
				if (!this.focused && this.get('value') != placeholder) {
					showPlaceholder(true);
					this.fireEvent('search');
				}
			}

			this.getValue = function() {
				var value = this.get('value');
				return value != placeholder ? value : '';
			}

			this.setValue = function(value) {
				if (value == '' || value == placeholder) this.clear();
				else this.set('value', value);
			}
		}
		this.addEvents({
			keydown: function(event) {
				if (event.key == 'enter')
					this.fireEvent('search');
			},

			keyup: function(event) {
				if (event.key != 'enter') {
					var that = this;
					if (this.timer) this.timer.clear();
					if (this.getValue()) this.timer = (function() {
						that.fireEvent('search');
					}).delay(500);
					else this.fireEvent('search');
				}
			}
		});
	}
});
