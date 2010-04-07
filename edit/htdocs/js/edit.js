// Copyright (c) 2003 - 2008 Juerg Lehni, Lineto.com. All rights reserved.
// Copying and reuse is strictly prohibited.

EditForm = Base.extend({
	initialize: function(id, target, parent) {
		this.id = id;
		this.target = target;
		this.targetId = target.getId();
		this.parent = parent;
		// Mark as empty until it gets set, so empty editforms can be skipped
		// in close()
		this.empty = true;
		if (EditForm.mode == 'inline') {
			this.container = target.injectAfter('div', { id: 'edit-container-' + id });
			// Pass on style and class settings
			if (parent) {
				this.container.setStyle(parent.container.getStyle());
				this.container.addClass(parent.container.getClass());
			}
		}
	},

	setup: function(obj) {
		// On Safari, there is a very odd bug that very rarely mixes all the
		// buttons on one page, as if they were all thrown into one container,
		// and redistributed by picking blindy. The workaround is to not produce
		// buttons in edit forms, but use <a> tags, and replace them with buttons
		// here, if useButtons is set to true:
		if (EditSettings.useButtons) {
			$$('a.edit-button', obj).each(function(el, index) {
				var id = el.getId();
				// el.removeClass('button'); // For getClass bellow
				el.replaceWith('input', {
					type: 'button',
					id: id, name: id,
					value: el.getText(),
					className: el.getClass(),
					onclick: el.getProperty('onclick')
				});
			});
		}
		var that = this;
		// Remember focused elements and their last selection and scroll position,
		// so they can be restored after previewing pages.
		// Do not store direct references since the elements are replaced when
		// saving before preview, therefore use ids instead.
		var fields = $$('input[type=text],input[type=password],textarea', obj);
		function store() {
			if (that.focus && this.getId() == that.focus.id) {
				that.focus.selection = this.getSelection();
				that.focus.offset = this.getScrollOffset();
			}
		}
		fields.addEvents({
			focus: function() {
				that.focus = { id: this.getId() };
			},
			// Since we cannot store getSelection in blur on IE (it relies on
			// focus() which cannot be called in blur), store status in all of these
			// occasions:
			keyup: store,
			mouseup: store,
			change: store
		});
		// We're asking inputs and textareas to be a certain size, but they grow
		// bigger due to their border and padding settings that differ from browser
		// to browser.
		// This can be fixed by calculating these widths now and subtracting them
		// from  their resulting size. Since we're using getWidth(), this needs
		// to happen after this.show(true). Also, it needs to happen before
		// TabPane.setup(), since that would hide tabs again, for which the fix
		// won't work...
		fields.each(function(field) {
			function width(val) {
				return field.getStyle('border-' + val + '-width').toInt()
						+ field.getStyle('padding-' + val).toInt();
			}
			var width = field.getWidth() - 2 * (width('left') + width('right')) + 'px';
			field.setStyles({
				width: width,
				// Prevent textareas from resizing horizontally. 
				// Setting maxWidth instead of max-width breaks Firefox. Why?
				'max-width': width
			});
		});
		// Initialize word counts
		$$('textarea.edit-text-count', obj).each(function(text) {
			this.handle('text_count', text);
		}, this);
	},

	set: function(values) {
		if (values.applied)
			this.applied = true;
		this.html = values.html;
		// On safari, remove buttons before setting of new html, to prevent
		// the odd bug described bellow from happening.
		if (EditSettings.useButtons && Browser.WEBKIT)
			$$('input[type=button]', this.container).remove();
		this.container.setHtml(this.html);
		this.form = $('form', this.container);
		if (this.form) {
			this.show(true);
			this.setup(this.form);
			TabPane.setup();
			this.empty = false;
			this.url = this.form.getAction();
			var tab = $('div.tab-pane', this.form);
			this.tab = tab && tab.tabPane;
			// Set a reference to the editForm so TabPane can call autoSize
			// if needed (on Lineto)
			if (this.tab)
				this.tab.editForm = this;

		}
	},

	reportError: function(error) {
		$('#edit-label-' + error.name + ' > .edit-error', this.form)
			.setHtml(error.message)
			.removeClass('hidden');
		this.setSelectedTab(error.tab);
		var field = $('#' + error.name, this.form);
		if (field && field.focus) {
			field.setValue(error.value);
			field.setCaret(0);
		}
	},

	show: function(show) {
		this.container.modifyClass('hidden', !show);
		if (this.target)
			this.target.modifyClass('hidden', show);
		EditChooser.closeAll();
		if (show && this.form)
			this.form.enable(true);
		this.visible = show;
	},

	close: function(stopAt) {
		this.show(false);
		if (this.parent)
			this.parent.show(true);
		if (this.request)
			this.request.cancel();
		EditChooser.closeAll();
		this.container.remove();
		delete EditForm.data.nodes[this.id];
		delete EditForm.forms[this.id];
		// EditForm.targets allways keeps pointers to the topmost 
		// form for a given target element in the dom. 
		// When closing, set it to the parent.
		if (EditForm.targets[this.targetId] == this)
			EditForm.targets[this.targetId] = this.parent;
		// Close all stacked editors down to a given element (stopAt):
		if (stopAt && this.parent && this.parent != stopAt)
			return this.parent.close(stopAt);
		// Close empty parents, as they never recieved content.
		// This happens when creating / editing sub items through the
		// inline interface
		if (this.parent && this.parent.empty)
			return this.parent.close();
		if (!EditForm.forms.getSize())
			$document.fireEvent('endedit');
		return this.parent;
	},

	preview: function(previousContent) {
		this.show(false);
		var that = this;
		var offset = $window.getScrollOffset();
		var button = $('body').injectBottom('div', {
				className: 'edit-preview'
			}, [
				'a', {
					html: 'Exit Preview', href: '#',
					events: {
						click: function(event) {
							that.show(true);
							EditForm.setContent(previousContent);
							$window.setScrollOffset(offset);
							button.remove();
							// TODO: See if we also need to restore these states
							// after clicking back, or apply & back, and if so,
							// put it in one central place.
							var focus = that.focus && $(that.focus.id, that.form);
							if (focus) {
								focus.setSelection(that.focus.selection);
								focus.setScrollOffset(that.focus.offset);
								focus.focus();
							}
							event.stop();
						}
					}
				}
			]
		);
	},

	back: function(count) {
		if (this.applied) {
			this.applied = false;
			this.execute('edit', { edit_back: count });
		} else {
			var form = this;
			for (var i = 0; i < count && form; ++i)
				form = form.close();
		}
	},

	setSelectedTab: function(index) {
		if (this.tab)
			this.tab.setSelectedIndex(index);
	},

	getSelectedTab: function() {
		return this.tab && this.tab.getSelectedIndex();
	},

	autoSize: function() {
		// To be overridden if size changes require repositioning of things.
	},

	backup: function() {
		// Backup old values, as we're setting new ones
		if (this.empty)
			return null;
		var values = new Hash();
		$$('[name^="value_"]', this.form).each(function(el) {
			var val = null;
			if (el instanceof Select) {
				val = { options: el.getOptions().map(function(opt) {
					return { 
						text: opt.getText(), value: opt.getValue(), 
						selected: opt.getSelected()
					};
				}) };
			} else if ((!(el instanceof Input) 
				|| !/^(file|button)$/.test(el.getType())) && el.getValue() != null) {
				val = { value: el.getValue() };
			}
			if (val)
				values[el.getName()] = val;
		});
	 	return { values: values, tab: this.getSelectedTab() };
	},

	restore: function(backup) {
		this.setSelectedTab(backup.tab);
		// restore old values if they're there:
		var multis = new Hash();
		backup.values.each(function(val, name) {
			var el = $('#' + name, this.form);
			if (el) {
				if (val.options) {
					// Part of a multi selection? just collect the items now.
					// the rest is done later.
					var match;
					if (match = name.match(/^(\w*?)_(left|right)$/)) {
						// For multiselects, merge both lists into one
						// object that holds all values and options,
						// and create lookup tables for them all.
						// For further processing after the looop.
						name = match[1];
						var multi = multis[name] = multis[name] || {
							ids: backup.values[name].value.split(','),
							values: [], options: [], lookup: {}
						};
						var options = el.getOptions();
						// Collect backed-up values and current options
						multi.values.append(val.options);
						multi.options.append(options);
						// Store reference to the object, its options and
						// a lookup table using the option's values
						var lookup = options.each(function(opt) {
							var val = opt.getValue();
							this[val] = multi.lookup[val] = opt;
						}, {});
						multi[match[2]] = {
							element: el, options: options, lookup: lookup
						};
					} else {
						// Only take over the selection from the previous
						// select input.
						el.setValue(val.options.filter(function(opt) {
							return opt.selected;
						}));
					}
				} else {
					el.setValue(val.value);
				}
			}
		}, this);
		multis.each(function(multi, name) {
			// Ids is the activated ids of this multi select.
			// use this for the ordering
			// create lookups
			var lookupIds = multi.ids.each(function(id) {
				this[id] = true;
			}, {});
			var lookupValues = multi.values.each(function(opt) {
				this[opt.value] = opt;
			}, {});
			// Now sync them:
			// Scan stored options and sync with the new values
			// (what was deleted? what added?), but keep the backed-up order:
			multi.options.each(function(opt) {
				var val = lookupValues[opt.getValue()];
				if (val) val.text = opt.getText(); // Update changed titles 
				else {
					// Not found -> add
					val = { text: opt.getText(), value: opt.getValue() };
					multi.values.push(val);
					// If the option is in the selected list, add it to lookupIds,
					// so it gets selected again:
					if (multi.left.lookup[val.value])
						lookupIds[val.value] = true;
				}
			});
			multi.values.each(function(opt, i) {
				if (!multi.lookup[opt.value])
					this[i] = null; // Not found in new sets -> Erase
			});
			// Empty the lists and fill them again:
			multi.left.element.removeChildren();
			if (multi.right)
				multi.right.element.removeChildren();
			multi.values.each(function(opt) {
				if (opt) {
					var options = lookupIds[opt.value]
						? multi.left.element :  multi.right.element;
					if (options)
						options.appendChild(new SelectOption(opt));
				}
			});
			this.updateMultiselects(name);
		}, this);
	},

	submit: function(post, param) {
		// Clear all errors:
		$$('.edit-error', this.form).addClass('hidden');
		var progress = $('.edit-progress', this.form);
		if (progress)
			progress.removeClass('hidden');
		var method = 'get';
		var url = this.url;
		var back = param.edit_back;
		var that = this;
		if (post) {
 			// Post values using internal form
			method = 'post';
			// Set / add fields to form as elements and use the form as param.
			param = this.form.setValues(param);
			if (this.form.hasElement('input[type=file]')) {
				// Display upload progress
				var uploadId = Math.random().toString(36).substring(2);
				url += '?upload_id=' + uploadId;
				if (this.uploadTimer)
					this.uploadTimer.clear();
				var startTime = new Date().getTime(), current;
				var uploadStatus = $('.edit-upload', this.container);
				if (uploadStatus) {
					var maxWidth = uploadStatus.getParent().getWidth();
					var request = new Request({
						url: url, method: 'get', json: true, iframe: Browser.WEBKIT && Browser.VERSION < 531.22,
						data: this.getData('upload_status')
					}, function(status) {
						if (that.uploadTimer && status && status.total) {
							if (status.current == status.total
								|| current == status.current
								&& new Date().getTime() - startTime > 6000)
									that.uploadTimer = that.uploadTimer.clear();
							uploadStatus.setWidth(status.current / status.total * maxWidth);
							// .setHtml(status.current + ' of ' + status.total + ' uploaded.');
							current = status.current;
						}
					});
					this.uploadTimer = (function() {
						request.send();
						that.uploadTimer = (function() {
							request.send();
						}).periodic(500);
					}).delay(500);
				}
			}
		}
		this.request = new Request({
			url: url, method: method, json: true, data: param
		}, function(values) {
			if (progress)
				progress.addClass('hidden');
			if (values) {
				if (EditForm.mode == 'inline')
					that.show(false);
				if (that.uploadTimer)
					that.uploadTimer = that.uploadTimer.clear();
				if (EditForm.set(values) && back)
					that.back(back);
			} else {
				that.close();
				alert('Error: ' + values + ' Status: ' + this.status);
			}
		}).send();
	},

	getData: function(mode, param) {
		return Hash.merge({
			edit_mode: mode,
			edit_id: this.id,
			edit_data: Json.encode(EditForm.data)
		}, param);
	},

	getUrl: function(mode, param) {
		return this.url + '?' + Base.toQueryString(this.getData(mode, param));
	},

	execute: function(mode, param) {
		if (!param) param = {};
		if (!param.confirm || confirm(param.confirm)) {
			// This is necessay for mozilla browsers, because otherwise form focus
			// gets messed up (because the input that still has the focus gets
			// deleted by innerHTML....)
			this.form.blur();
			var post = param.post;
			var enable = !!param.enable;
			// Filter out all parameters that do not start with edit_
			Base.each(param, function(val, key) {
				if (!/^edit_/.test(key))
					delete param[key];
			});
			this.submit(post, this.getData(mode, param));
			this.form.enable(enable);
		}
	},

	load: function(mode, param, callback) {
		new Request({
			url: this.url, method: 'get', json: true,
			data: this.getData(mode, param)
		}, callback && callback.bind(this)).send();
	},

	getSelectedTag: function(field, tag) {
		var sel = field.getSelection(), text = field.getValue();
		// Decrease end by 1 if it's not just a caret so we're sure to be inside
		// the tag, not at its boundary.
		var pos = sel.start < sel.end ? sel.end - 1 : sel.end;
		var exp = new RegExp('<' + tag + '[^\n\r]*$');
		var start = text.substring(0, pos).search(exp)
		if  (start == -1)
			start = text.substring(0, pos + tag.length + 1).search(exp);
		if (start != -1) {	
			var end = text.indexOf('</' + tag + '>', pos - tag.length - 3);
			if (end != -1)
				end += tag.length + 3;
			var end2 = text.indexOf('/>', pos - 2);
			if (end2 != -1) {
				end2 += 2;
				if (end == -1 || end2 < end)
					end = end2;
			}
			if (start <= pos && end > pos) {
				return {
					tag: text.substring(start, end),
					start: start,
					end: end
				}
			}
		}
	},

	statics: {
		forms: new Hash(),
		data: {
			nodes: new Hash(),
			version: 0
		},
		targets: new Hash(),
		mode: 'inline',

		get: function(id, target, parent) {
			var form = this.forms[id];
			if (target) { // If target is passed, we're asked to create a form
				if (!this.forms.getSize())
					$document.fireEvent('beginedit');
				if (!form)
					form = this.forms[id] = new EditForm(id, target, parent);
				var targetId = target.getId();
				// Check if the form currently displayed for this target
				// does need to be closed. 
				var other = this.targets[targetId];
				if (other && other != parent && other != form)
					form.closeOther = other;
				this.targets[targetId] = form;
			}
			return form;
		},

		getTarget: function(param) {
			return $('#' + param.target);
		},

		inline: function(url, param) {
			var target = this.getTarget(param);
		 	var editForm = target && this.get(param.id, target);
			if (!editForm) {
				alert('Cannot find edit form for object ' + param.id);
			} else if (!param.confirm || confirm(param.confirm)) {
				var offset = target.getOffset(); // for scrolling
				var elements = $('#edit-elements-' + param.target + '-' + param.id + '.edit-elements');
				var progress = $('.edit-progress', elements);
				var buttons = $('.edit-buttons', elements);
				if (progress) {
					var height = elements.getStyle('height');
					if (EditSettings.hideButtons)
						buttons.addClass('hidden');
					progress.removeClass('hidden');
					elements.setStyle('height', height);
				}
				var form = $('form', buttons);
				form.enable(false);
				editForm.request = new Request({
					url: url, method: 'get', json: true,
					data: editForm.getData(param.mode, param)
				}, function(values) {
					if (progress) {
						progress.addClass('hidden');
						if (EditSettings.hideButtons)
							buttons.removeClass('hidden');
					}
					form.enable(true);
					if (values) {
						EditForm.set(values);
						if (values.id != param.id)
							editForm = EditForm.get(values.id);
						// Only set the style once the stuff is loaded and hidden
						if (param.style)
							editForm.container.setStyle(param.style);
						if (param['class'])
							editForm.container.addClass(param['class']);
						if (param.scroll)
							$window.setScrollOffset(offset);
					} else {
						EditForm.close(param.id);
						alert('Error: ' + values + ' Status: ' + this.status);
					}
				}).send();
			}
			return false;
		},

		set: function(values) {
			if (values.id) {
				var form = this.get(values.id);
				var backup = null;
				if (!form) {
					var parent = this.get(values.parent.id);
					form = this.get(values.id, parent.target, parent);
				} else {
					// handle other form to be closed now, insead
					// of directly when editing is requested, to avoid flickering
					if (form.closeOther)
						form.closeOther.close(form);
					form.closeOther = null;
					backup = form.backup();
				}
				if (values.html)
					form.set(values);
				this.data.nodes[values.id] = {
					id: values.id,
					visible: values.visible,
					parent: values.parent
				};
				// Update version so server knows wether to sync or not.
				this.data.version++;
				if (backup)
					form.restore(backup);
				if (values.error)
					form.reportError(values.error);
				form.autoSize();
			}
			if (values.page)
				this.setPage(values.page);
			if (values.preview)
				this.preview(values.id, this.setPage(values.preview));
			if (values.redirect) {
				// Redirect one level up, since the href object itself was removed
				// TODO: Find a way to implement this in lineto.
				window.location.href = values.redirect;
			}
			if (values.alert)
				alert(values.alert);
			if (values.close)
				this.close(values.id);
			return !values.alert && !values.error && !values.close;
		},

		setPage: function(page) {
			var match = page.match(/<body[^>]*>([\u0000-\uffff]*)<\/body>/i);
			if (match) {
				var offset = $window.getScrollOffset();
				var previous = this.setContent(match[1]);
				$window.setScrollOffset(offset);
				return previous;
			}
		},

		setContent: function(content) {
			// store references to the targets and remove containers from
			// the dom, so they can be inserted again bellow in the new dom.
			this.forms.each(function(form, id) {
				form.container.remove();
			});
			EditChooser.choosers.each(function(chooser) {
				chooser.element.remove();
			});
			// Replace the content of the body only...
			$document.fireEvent('beforeupdate');
			var body = $('body');
			var previousContent = body.getHtml();
			body.setHtml(content);
			// now insert forms again
			this.forms.each(function(form, id) {
				form.target = $('#' + form.targetId);
				if (form.target) {
					form.container.insertAfter(form.target);
					form.show(form.visible);
				} else {
					// if the target has disappeared after the update,
					// close the form.
					form.close();
				}
			});
			// Retrigger domready event since things have completely changed.
			$document.fireEvent('domready');
			// Fire event on document so website can react to html update
			// and do some JS magic with it if needed before the ditors are
			// injected again.
			$document.fireEvent('afterupdate');
			EditChooser.choosers.each(function(chooser) {
				chooser.element.insertInside(body);
			});
			return previousContent;
		},

		close: function(id) {
			var form = this.get(id);
			return form ? form.close() : null;
		},

		preview: function(id, previousContent) {
			var form = this.get(id);
			if (form) form.preview(previousContent);
		}
	}
});

// handlers
//
// TODO: Clean up similar to way Markup and EditHandler is handled on 
// server side?

EditForm.inject(new function() {
	var handlers = new Hash();

	return {
		handle: function(action, element) {
			var handler = handlers[action];
			if (handler) {
				var args = Array.slice(arguments, 1);
				// Pass the wrapped element instead of the native one
				args[0] = $(element);
				return handler.apply(this, args);
			} else {
				alert('Handler missing: ' + action);
			}
			return true;
		},

		statics: {
			register: function(items) {
				handlers.merge(items);
			},

			handle: function(formOrId, action, element) {
				var form = formOrId instanceof EditForm ? formOrId : EditForm.get(formOrId);
				if (form)
					return form.handle.apply(form, Array.slice(arguments, 1));
				else
					alert('Cannot find form: ' + formOrId + ' ' + Json.encode(EditForm.data));
			}
		}
	};
});

// Default:
EditForm.register({
	execute: function(element, mode, param) {
		this.execute(mode, param);
	},

	remove: function(element, title) {
		this.execute('remove', {
			confirm: 'Do you really want to delete "' + title + '"?',
			post: true
		});
	},

	apply: function(element, param) {
		if ($$('.edit-list-remove input[value=1]').find(function(item) {
			// Only warn for items not newly created. (= not containing ids like _n10_)
			if (!/_n\d*_/.test(item.getId()))
				return true;
		})) {
			param.confirm = 'Do you really want to delete the marked entries?';
		}
		this.execute('apply', param);
	},

	close: function(element) {
		this.close();
	},

	back: function(element, count) {
		this.back(count);
	},

	number_format: function(element, name, type, def, min, max) {
		var item = $('input#' + name, this.form);
		var val = item.getValue();
		var orig = val;
		if (isNaN(val) || val == '') val = def;
		else {
			val = parseFloat(val);
			if (type == 'integer') val = Math.round(val);
			if (min != null && val < min) val = min;
			if (max != null && val > max) val = max;
		}
		if (val != orig)
			item.setValue(val);
	},

	text_count: function(element) {
		// Split at punctiation. Values taken from Java's \p{Punct}
		var count = element.getValue().trim().split(/[!"#$%&'()*+,-.\/:;<=>?@[\]^_`{|}~]*/g).length;
		if (count)
			count--;
		var name = element.getId();
		var label = $('#edit-label-' + name);
		var element = $('.edit-count', label);
		if (!element)
			element = label.getFirst().injectAfter('div', { className: 'edit-count' });
		element.setHtml(count + (count == 1 ? ' Word' : ' Words'));
	},

	help_toggle: function(element) {
		var el = $('.edit-help-button', this.container);
		if (el instanceof Input) {
			el.setValue(el.getValue() == 'Help' ? 'Close Help' : 'Help');
		} else {
			el.setText(el.getText() == 'Help' ? 'Close Help' : 'Help');
		}
		$$('.edit-help').toggleClass('hidden');
		this.autoSize();
	}
});

// Select
EditForm.register(new function() {
	function getSelected(form, sels) {
		var names = [];
		var values = [];
		sels.each(function(sel) {
			sel = $('#' + sel, form.form);
			if (sel) {
				sel.getSelected().each(function(opt) {
					if (opt.getValue()) {
						names.push(opt.getText());
						values.push(opt.getValue());
					}
				});
			}
		});
		return values.length > 0 ?
			{ values: values, names: names.join(', '), ids: values.join() } : null;
	}

	var prototypeChooser = null;

	return {
		select_new: function(element, name, prototypes, param) {
			if (typeof prototypes == 'string') {
				var str = $('#' + prototypes).getText();
				// name: listId_entryId_new
				var match = name.match(/((.*)_(?:[^_]*))_new$/);
				var entryId = match[1], listId = match[2];
				prototypes = Json.decode(str.replace(
					new RegExp('{%' + listId + '_entry_id%}', 'g'), entryId));
			}
			if (!prototypeChooser)
				prototypeChooser = new PrototypeChooser();
			prototypeChooser.choose(this, name, prototypes, element);
		},

		select_edit: function(element, sels, param) {
			var sel = getSelected(this, sels);
			if (sel && sel.values.length == 1) {
				var val = sel.values[0];
				if (val != 'null') {
					param.edit_object_id = val;
					this.execute('edit', param);
				}
			}
		},

		select_remove: function(element, sels, param) {
			if (param) {
				var sel = getSelected(this, sels);
				if (sel) {
					param.confirm = 'Do you really want to delete ' + 
						(sel.values.length > 1 ? 'these items: "' + 
						sel.names : '"' + sel.names) + '"?';
					param.edit_object_ids = sel.ids;
					this.execute('remove', param);
				}
			} else {
				// Remove links from list
				sels.each(function(sel) {
					sel = $('#' + sel, this.form);
					sel.getSelected().remove();
				 	// Generate values
					// TODO: replace substring with regexp
					this.updateMultiselects(el.name.substring(0, el.name.indexOf('_left')));
				}, this);
			}
		},

		select_move: function(element, name, sels, param) {
			var sel = getSelected(this, sels);
			if (sel) {
				this.handle('choose_move', element, name, param, sel);
			}
		}
	};
});

// Multiselect
EditForm.register(new function() {
	function moveSelected(from, to) {
		var at = null;
		to.getSelected().each(function(opt) {
			opt.setSelected(false);
			at = opt;
		});
		from.getSelected().each(function(opt) {
			if (at) opt.insertAfter(at);
			else opt.insertInside(to);
			at = opt;
		});
	}

	function swapSelected(options, i1, i2) {
		var o1 = options[i1], o2 = options[i2];
		if (o1.getSelected() && !o2.getSelected()) {
			if (i1 < i2) o2.insertBefore(o1);
			else o1.insertBefore(o2);
			options.swap(i1, i2);
		}
	}

	return {
		multiselect_arrange: function(element, name, dir) {
			var left = $('#' + name + '_left', this.form);
			var right = $('#' + name + '_right', this.form);
			var options = left.getOptions();
			switch(dir) {
				case 'up':
					for (var i = 1; i < options.length; i++)
						swapSelected(options, i, i - 1);
					break;
				case 'down':
					for (var i = options.length - 2; i >= 0; i--)
						swapSelected(options, i, i + 1);
					break;
				case 'left':
					moveSelected(right, left);
					break;
				case 'right':
					moveSelected(left, right);
					break;
			}
			// After each change, update the value, in case the user submits
			this.updateMultiselects(name);
		}
	};
});

EditForm.inject({
	updateMultiselects: function(name) {
		var ids = $('#' + name + '_left', this.form).getOptions().getProperty('value');
		$('#' + name, this.form).setValue(ids);
	}
});

// Object Chooser
EditForm.register(new function() {
	var chooser = null;

	function getChooser() {
		if (!chooser)
			chooser = new ObjectChooser();
		return chooser;
	}

	function choose(form, name, param, onChoose) {
		form.onChoose = onChoose;
		getChooser().choose(form, name, param);
	}

	return {
		choose_link: function(element, name, param) {
			choose(this, name + '_link', param, function(id, title) {
				var field = $('#' + name, this.form);
				if (field) {
					var text = field.getSelectedText();
					field.replaceSelectedText(
						EditSettings[text ? 'objectLink' : 'unnamedObjectLink']
							.replace('@link', id).replace('@text', text)
					);
				}
				return true; // close
			});
		},

		choose_reference: function(element, name, param) {
			var that = this, element = null, backup = null;
			// make sure the chooser is there:
			var chooser = getChooser();
			if (param.multiple) {
				element = $('#' + name + '_left');
				backup = element.getChildren();
				chooser.onCancel = function() {
					element.removeChildren();
					element.appendChildren(backup);
					that.updateMultiselects(name);
					this.onCancel = this.onOK;
					this.close();
				}
			}
			choose(this, name + '_choose', param, function(id, title) {
				var match;
				if (param.multiple) {
					if (element.getElement('option[value="' + id + '"]')) {
						alert('This element was already added to the list.');
					} else {
						var selected = element.getSelected().getLast();
						var opt = new SelectOption({ text: title, value: id });
						if (selected)
							opt.insertAfter(selected);
						else
							opt.insertInside(element);
						that.updateMultiselects(name);
					}
					// Don't close yet, since we add multiples
					return false;
				} else {
					$('#' + name + '_reference').setValue(title);
					$('#' + name).setValue(id);
					return true;
				}
			});
		},

		choose_move: function(element, name, param, sel) {
			choose(this, name + '_move', param, function(id, title) {
				param.confirm = 'Do you really want to move ' +
					(sel.values.length > 1 ? 'these items: "' + sel.names :
					'"' + sel.names) + '" to "' + title + '"?';
				param.edit_object_ids = sel.ids;
				param.edit_object_id = id;
				this.execute('move', param);
				return true;
			});
		},

		choose_toggle: function(element, id) {
			getChooser().toggle(id);
		},

		choose_select: function(element, id, title) {
			// only close if onChoose returns true.
			if (this.onChoose && this.onChoose(id, title))
				EditChooser.closeAll();
		},

		choose_url: function(element, name) {
			var field = $('#' + name, this.form);
			if (field) {
				var url = prompt('Enter link URL (email or internet address):\n' +
					'Email addresses are encrypted and protected against spam.');
				if (url) {
					var text = prompt('Enter link text (empty = same as URL):',
						field.getSelectedText());
					if (text || text == '') {
						var link;
						// Handle emails seperately
						if (/^([a-zA-Z0-9\-\.\_]+)(\@)([a-zA-Z0-9\-\.]+)(\.)([a-zA-Z]{2,4})$/.test(url)) {
							link = EditSettings.emailLink;
							if (!text)
								text = 'Email';
						} else {
							link = text ? EditSettings.urlLink : EditSettings.unnamedUrlLink;
							if (!text)
								text = url;
						}
						field.replaceSelectedText(link.replace('@link', url).replace('@text', text));
					}
				}
			}
		}
	};
});

// References
EditForm.register({
	references_remove: function(element, name) {
		var el = $('#' + name + '_left', this.form);
		el.getSelected().remove();
		that.updateMultiselects(name);
	}
});

// Image Chooser
EditForm.register(new function() {
	var chooser = null;
	var field = null;
	var json = false;

	function choose(form, element, name, action, param) {
		if (!chooser)
			chooser = new ImageChooser();
		chooser.choose(form, element, name, action, param);
	}

	return {
		choose_image: function(element, name, param) {
			field = $('#' + name, this.form);
			var tag = this.getSelectedTag(field, 'image');
			if (tag)
				field.setSelection(tag);
			choose(this, element, name + '_image', 'choose_image', param);
		},

		choose_image_select: function(element, param) {
			var text = field.getSelectedText();
			field.replaceSelectedText(
				EditSettings.image.replace('@name', param.image_name).replace('@text', text)
			);
			EditChooser.closeAll();
		},

		choose_crop: function(element, name, param) {
			field = $('#' + name, this.form);
			json = field.getProperty('type') == 'hidden';
			if (json) {
				var crop = Json.decode(field.getValue());
				if (crop) {
					param.image_name = crop.name;
					param.image_id = crop.id;
					delete crop.resource;
					delete crop.id;
					param.image_crop = Json.encode(crop);
					return this.handle('choose_crop_select', element, param);
				}
			} else {
				var tag = this.getSelectedTag(field, 'crop');
				if (tag) {
					field.setSelection(tag);
					param.crop_tag = tag.tag;
				}
			}
			choose(this, element, name + '_crop', 'choose_crop', param);
		},

		choose_crop_select: function(element, param) {
			// TODO: choose_crop_select is sometimes called from ImageChooser 
			// (mostly). Check if it is, and fetch the original element from
			// there, as we might use it for crop_preview (where image ids)
			// do not work... TODO: Fix this on server and decide whether
			// element should be used like this or not. Stop passing it to
			// ImageChooser.choose if not needed.
			var chooser = EditChooser.getChooser(element);
			if (chooser)
				element = chooser.target;
			var win = new Window({
				name: param.image_name,
				url: this.getUrl('crop', param),
				width: 800, height: 600,
				resizable: true, focus: true
			});
			win.setResult = (function(crop, preset) {
				if (json) {
					crop.id = param.image_id;
					crop.name = param.image_name;
					crop = Json.encode(crop);
					field.setValue(crop);
					param.image_crop = crop;
					this.load('crop_preview', param, function(result) {
						var image =  element.getParent('.edit-item').getElement('.edit-crop-preview img');
						if (image) {
							var id = image.getId();
							image = image.replaceWith(result.html);
							// TODO: We need to set id correctly, as the server
							// side looses the EditableListItem's variablePrefix
							// since this information is not cached on client/server.
							// TODO: Fix this!
							image.setId(id);
						}
					});
				} else {
					// TODO: Find a way to produce this through EditSettings too, maybe
					// as a function that takes crop and preset?
					var tag = '<crop "' + param.image_name + '" '
						+ ['x', 'y', 'width', 'height', 'imageWidth'].collect(function(name) {
							if(crop[name] && (name != 'imageWidth' || crop.imageScale != 1))
								return name.toLowerCase() + '="' + crop[name] + '"';
						}).join(' ') + ' />';
					field.replaceSelectedText(tag);
				}
			}).bind(this);
			EditChooser.closeAll();
		},

		clear_crop: function(element, name) {
			$('#' + name, this.form).setValue('');
			$('#' + name + '_preview', this.form).setProperty('src', '/static/edit/assets/spacer.gif');
		}
	};
});

// Color Chooser
EditForm.register(new function() {
	function updateColor(target) {
		if (!target.color)
			target.color = $('#' + target.getId() + '-color', target.getParent('form'));
		var value = ColorChooser.filter(target);
		if (value.length != 7)
			value = '#dddddd';
		target.color.setStyle('background', value);
		return target;
	}

	var chooser = null;

	return {
		color_choose: function(element, name) {
			var target = $('#' + name, this.form);
			updateColor(target);
			target.onUpdate = function() {
				updateColor(this);
			};
			if (!chooser)
				chooser = new ColorChooser(168);
			chooser.choose(this, name + '-color', target);
		},

		color_update: function(element, name) {
			updateColor($('input#' + name, this.form));
		}
	};
});

// Editable List
EditForm.register(new function() {
	function getList(form, name) {
		if (typeof name == 'object')
			return name;
		var list =  $('#edit-list-' + name, form.form);
		return {
			name: name, element: list,
			entries: $('.edit-list-entries', list)
		};
	}

	function getEntry(form, entry) {
		return $('#edit-list-entry-' + entry, form.form);
	}

	function updateEntry(form, id, toggle) {
		var opacity = 1;
		var entry = getEntry(form, id);
		['remove', 'hide'].each(function(type) {
			var obj = $('#' + id + '_' + type);
			if (obj) {
				var value = obj.getValue().toInt();
				if (toggle == type) {
					value = value ? 0 : 1;
					obj.setValue(value);
				}
				var overlay = $('#edit-list-' + type + '-' + id + ' .overlay');
				overlay.modifyClass('hidden', !value);
				if (value)
					opacity = 0.5;
			}
		})
		$('div.edit-list-entry-background', entry).setOpacity(opacity);
	}

	function updateList(form, list) {
		var list = getList(form, list);
		// Update ids list with the right sequence
		var ids = list.entries.getChildren().each(function(entry) {
			var id = entry.getId();
			this.push(id.substring(id.lastIndexOf('_') + 1));
		}, []);
		$('#' + list.name, this.form).setValue(ids);
	}

	return {
		// TODO: Instead of passing names and using ids excessively, rely
		// on the newly passed element, class names and dom query functions,
		// to produce shorter html.
		list_add: function(element, name, html, entryId) {
			var list = getList(this, name);
			list.element.counter = list.element.counter || 0;
			var id = 'n' + list.element.counter++, obj;
			// Replace id placeholder with generated id, mark with 'n' for new
			html = html.replace(new RegExp('{%' + name + '_id%}', 'g'), id);
			var entry = entryId && getEntry(this, entryId);
			var top = list.element.hasClass('edit-list-insert-top');
			if (entry) {
				// When inserting at the bottom, use the + buttons of entries
				// to insert above them, to cover all gaps
				obj = entry[top ? 'injectAfter' : 'injectBefore'](html);
			} else {
				obj = list.entries[top ? 'injectTop' : 'injectBottom'](html);
			}
			// Make sure this newly inserted html gets initalised, e.g. buttons,
			// width, gecko workaround, etc.
			this.setup(obj);
			updateList(this, list);
			EditChooser.closeAll();
		},

		list_remove: function(element, name, id) {
			updateEntry(this, id, 'remove');
			updateList(this, name);
		},

		list_hide: function(element, name, id) {
			updateEntry(this, id, 'hide');
		},

		list_sort: function(element, name, id, event) {
			var that = this;
			var list = getList(this, name);
			var entries = list.entries.getChildren();
			var entry = getEntry(this, id);
			var handle = $('#edit-list-handle-' + id, this.form);
			if (!handle.draggable) {
				var bounds, listBounds, dummy, position, opacity;
				handle.addEvents({
					dragstart: function(e) {
						bounds = entry.getBounds(true);
						listBounds = list.entries.getBounds(true);
						// Insert dummy of same size behind, to keep space
						dummy = entry.injectAfter('div');
						dummy.setSize(bounds);
						opacity = entry.getOpacity();
						entry.setStyle({
							position: 'absolute',
							opacity: 0.75 * opacity,
							zIndex: 1
						});
						entry.setBounds(bounds);
						position = entry.getTop();
					},
					dragend: function(e) {
						entry.insertAfter(dummy);
						dummy.remove();
						// Make relative again
						entry.setStyle({
							position: 'relative',
							opacity: opacity,
							zIndex: 0,
							// Clear width and height again, so Textarea resizing
							// can still work in Safari.
							width: null,
							height: null
						});
						entry.setOffset(0, 0);
						updateList(that, list);
					},
					drag: function(e) {
						position += e.delta.y;
						var y = position;
						if (y < listBounds.top)
							y = listBounds.top;
						else if (y > listBounds.bottom - bounds.height)
							y = listBounds.bottom - bounds.height;
						entry.setOffset(entry.getLeft(), y);
						// Find closest entry
						var dist = bounds.height / 2, closest, above;
						entries.each(function(other) {
							// Do not use the one that's moved but it's dummy
							// instead
							if (other == entry)
								other = dummy;
							var diff = y - other.getOffset(true).y;
							if (Math.abs(diff) < dist) {
								closest = other;
								dist =  Math.abs(diff);
								above = diff > 0;
							}
						});
						if (closest)
							dummy[above ? 'insertBefore' : 'insertAfter'](closest);
					}
				});
				handle.triggerEvent('dragstart', [event]);
				handle.draggable = true;
			}
		}
	};
});

// Choosers:
EditChooser = Base.extend({
	initialize: function(param) {
		this.element = $('body').injectBottom('div', { className: 'edit-chooser' });
		// Create link from dom object to chooser, as needed by PrototypeChooser
		this.element.chooser = this;
		this.content = this.element.injectBottom('div', {
			html: param.html || '',
			padding: param.padding || 0,
			className: param.className
		});
		var that = this;

		if (param.buttons) {
			var ok = this.createButton('OK', function() {
				if (that.onOK)
					that.onOK();
			});

			var cancel = this.createButton('Cancel', function() {
				if (that.onCancel)
					that.onCancel();
			});

			this.buttons = this.element.injectBottom('div', { 
				className: 'edit-element edit-buttons-right'
			}, [
				cancel,
				ok,
			]);
		}

		this.show(false);

		if (!EditChooser.choosers.length) {
			// The first chooser. Install catch-all mousedown....
			$document.addEvent('mousedown', function(event) {
				var close = true;
				var chooser = EditChooser.current;
				if (chooser && chooser.buttons && !chooser.buttons.hasClass('hidden'))
					close = false;
				if (close)
					EditChooser.closeAll();
			});
		}
		this.element.addEvent('mousedown', function(event) {
			// Allow activation of input fields still
			if (!event.target || !event.target.match('input'))
				event.stop();
		});
		EditChooser.choosers.push(this);
	},

	createButton: function(title, handler) {
		return new Input({
			type: 'button', value: title, className: 'edit-button'
		}).addEvent('mouseup', handler);
	},

	choose: function(editForm, name) {
		this.editForm = editForm;
		EditChooser.closeAll();
		EditChooser.current = this;
		var bounds = $('#' + name, editForm.container).getBounds();
		this.element.setOffset({ x: bounds.left, y: bounds.bottom });
		this.show(true);
	},

	show: function(show) {
		this.element.modifyClass('hidden', !show);
	},

	close: function() {
		this.show(false);
	},

	statics: {
		choosers: [],
		current: null,

		closeAll: function() {
			this.current = null;
			this.choosers.each(function(chooser) {
				chooser.close();
			});
		},

		getChooser: function(element) {
			var chooser = $(element).getParent('.edit-chooser');
			return chooser ? chooser.chooser : null;
		}
	}
});

HtmlChooser = EditChooser.extend({
	initialize: function() {
		this.base({ padding: 4, className: 'edit-simple-chooser' });
	},

	choose: function(editForm, name, html) {
		this.content.setHtml(html);
		this.base(editForm, name);
	}
});

PrototypeChooser = HtmlChooser.extend({
	choose: function(editForm, name, prototypes, target) {
		this.prototypes = prototypes;
		this.target = target;
		if (prototypes.length == 1) {
			// Call the href function directl on element, so 'this' is still right
			this.handle(0);
		} else {
			this.base(editForm, name, '<ul>' + prototypes.map(function(proto, index) {
					return '<li><a href="#" onclick="EditChooser.getChooser(this).handle('
						+ index + '); return false;">' + proto.name + '</a></li>';
				}).join('') + '</ul>');
		}
	},

	handle: function(index) {
		new Function(this.prototypes[index].handler).call(this.target);
	}
});

ObjectChooser = EditChooser.extend({
	initialize: function() {
		this.base({ padding: 4, className: 'edit-simple-chooser', buttons: true });
	},

	choose: function(editForm, name, param) {
		this.param = param;
		this.base(editForm, name);
		this.buttons.modifyClass('hidden', !param.multiple);
		this.show(false);
		// Open the root list
		this.toggle();
	},

	close: function() {
		this.base();
		// Clean up, so things get refetched the next time the chooser is opened
		this.content.removeChildren();
	},

	onOK: function() {
		this.close();
	},

	setArrow: function(id, open) {
		var arrow = $('#edit-choose-arrow-' + id, this.content);
		if (arrow) {
			var src = arrow.getProperty('src').match(/^(.*?)(?:close|open)(.*)$/);
			arrow.setProperty('src', src[1] + (open ? 'open' : 'close') + src[2]);
		}
	},

	toggle: function(id) {
		var children = id && $('#edit-choose-children-' + id, this.content) || this.content;
		var show = children == this.content || children.hasClass('hidden');
		if (show) {
			this.editForm.load('choose', Hash.merge({ edit_child_id: id || '' }, this.param),
				function(result) {
					children.setHtml(result.html);
					this.setArrow(id, true);
					if (show) {
						children.removeClass('hidden');
						this.show(true);
					}
				}.bind(this)
			);
		} else {
			this.setArrow(id, false);
		}
		if (!show)
			children.addClass('hidden');
	}
});

ImageChooser = EditChooser.extend({
	initialize: function() {
		this.base({ padding: 4, className: 'edit-simple-chooser edit-image-chooser' });
	},

	choose: function(editForm, target, name, action, param) {
		this.editForm = editForm;
		this.target = target;
		this.base(editForm, name);
		this.show(false);
		editForm.load(action, param,
			function(result) {
				if (result.html) {
					this.content.setHtml(result.html);
					this.show(true);
				} else if (result.image_crop) {
					editForm.handle('choose_crop_select', null, result);
				}
			}.bind(this)
		);
	}
});

ColorChooser = EditChooser.extend({
	initialize: function(size) {
		this.base({ padding: 1, buttons: true, html: 
'<form id="edit-color-form" target="" method="post" autocomplete="off">\
	<table>\
		<tr>\
			<td rowspan="8">\
				<div class="edit-element">\
					<div style="position:absolute;clip:rect(0px,' + size + 'px,' + size + 'px,0px)"><div id="edit-color-cross" style="position:relative; width:12px; height:12px; background-image:url(/static/edit/assets/color-cross.gif);"></div></div>\
					<img id="edit-color-overlay" class="edit-color" src="/static/edit/assets/color-overlay.png" width="' + size + '" height="' + size + '">\
				</div>\
			</td>\
			<td rowspan="8">\
				<div class="edit-element">\
					<div style="position:absolute;clip:rect(0px,' + Math.round(size / 10 + 5) + 'px,' + size + 'px,-4px)"><div id="edit-color-slider" style="position:relative; left:-4px; width:25px; height:7px; background-image:url(/static/edit/assets/color-slider.gif);"></div></div>\
					<img id="edit-color-rainbow" class="edit-color" src="/static/edit/assets/color-rainbow.png" width="' + Math.round(size / 10) + '" height="' + size + '">\
				</div>\
			</td>\
			<td colspan="2">\
				<div class="edit-element">\
					<img id="edit-color-preview" class="edit-color" src="/static/edit/assets/spacer.gif" width="100%" height="' + Math.round(size / 4) + '">\
				</div>\
			</td>\
		</tr>\
		<tr><td class="edit-element">&nbsp;R:</td><td align="right" class="edit-element"><input type="text" id="edit-color-red" size="3" maxlength="3"></td></tr>\
		<tr><td class="edit-element">&nbsp;G:</td><td align="right" class="edit-element"><input type="text" id="edit-color-green" size="3" maxlength="3"></td></tr>\
		<tr><td class="edit-element">&nbsp;B:</td><td align="right" class="edit-element"><input type="text" id="edit-color-blue" size="3" maxlength="3"></td></tr>\
		<tr><td class="edit-element">&nbsp;H:</td><td align="right" class="edit-element"><input type="text" id="edit-color-hue" size="3" maxlength="3"></td></tr>\
		<tr><td class="edit-element">&nbsp;S:</td><td align="right" class="edit-element"><input type="text" id="edit-color-saturation" size="3" maxlength="3"></td></tr>\
		<tr><td class="edit-element">&nbsp;B:</td><td align="right" class="edit-element"><input type="text" id="edit-color-brightness" size="3" maxlength="3"></td></tr>\
		<tr><td class="edit-element" colspan="2"><input type="text" id="edit-color-hex" size="7" maxlength="7" class="edit-element"></td></tr>\
	</table>\
</form>'
		});
		this.size = size;
		this.hsb = [0, 0, 0];
		this.target = null;
		this.form = $('#edit-color-form', this.content);

		var that = this;
		this.form.addEvent('submit', function(event) {
			that.close();
			event.stop();
		});

		$A('red green blue hue saturation brightness hex overlay rainbow cross slider preview').each(function(name) {
			var obj = this[name] = $('#edit-color-' + name, this.form);
			if ((obj instanceof Input)) {
				obj.addEvent('keyup', function() {
					that.editField(this);
				});
			} else {
				obj.setStyle('cursor', 'default');
				if (name != 'preview') obj.addEvent('drag', function(e) {
					var rel;
					if (this == that.overlay || this == that.cross) rel = that.overlay;
					else rel = that.rainbow;
					var offs = rel.getOffset();
					var x = Math.min(1, Math.max(0, (e.page.x - offs.x) / that.size));
					var y = 1 - Math.min(1, Math.max(0, (e.page.y - offs.y) / that.size));
					if (rel == that.overlay) {
						that.hsb[1] = Math.round(x * 100);
						that.hsb[2] = Math.round(y * 100);
					} else {
						that.hsb[0] = Math.round(y * 360);
					}
					that.updateFields(that.hsb, that.hsb.hsbToRgb());
				});
			}
		}, this);
	},

	onOK: function() {
		this.close();
	},

	onCancel: function() {
		this.target.setValue(this.target.backup);
		if (this.target.onUpdate)
			this.target.onUpdate();
		this.close();
	},

	choose: function(editForm, name, target) {
		this.target = target;
		var value = target.backup = target.getValue();
		var rgb = value.hexToRgb(true);
		if (!rgb) rgb = [255, 255, 255];
		var hsb = rgb.rgbToHsb();
		if (hsb) {
			this.hsb = hsb;
			this.updateFields(hsb, rgb);
		}
		this.base(editForm, name);
	},

	updateFields: function(hsb, rgb, dontHex) {
		if (rgb) {
			this.red.setValue(rgb[0]);
			this.green.setValue(rgb[1]);
			this.blue.setValue(rgb[2]);
		}
		if (hsb) {
			this.hue.setValue(hsb[0]);
			this.saturation.setValue(hsb[1]);
			this.brightness.setValue(hsb[2]);
			this.cross.setOffset(
				Math.round(hsb[1] * this.size / 100) - 6,
				Math.round((1 - hsb[2] / 100) * this.size) - 6
			);
			this.slider.setTop(Math.round((1 - hsb[0] / 360) * this.size) - 3);
			this.overlay.setStyle('background', [hsb[0], 100, 100].hsbToRgb().rgbToHex());
			rgb = hsb.hsbToRgb();
		}
		if (rgb) {
			rgb = rgb.rgbToHex();
			if (!dontHex) this.hex.setValue(rgb);
			this.preview.setStyle('background', rgb);
			if (this.target) {
				this.target.setValue(rgb);
				if (this.target.onUpdate)
					this.target.onUpdate();
			}
		}
	},

	editField: function(field) {
		var rgb = null;
		var name = /edit-color-(.*)/.exec(field.getId())[1];
		var hex = name == 'hex';
		if (hex) {
			var value = ColorChooser.filter(field);
			if (value.length == 7)
				rgb = value.hexToRgb(true);
		} else {
			var value = parseFloat(field.getValue());
			if (!isNaN(value)) {
				if (this.hsb[name] != null) {
					var max = name == 'hue' ? 360 : 100;
					if (value < 0) field.setValue(value = 0);
					else if (value > max) field.setValue(value = max);
					this.hsb[name] = value;
					this.updateFields(null, this.hsb.hsbToRgb());
				} else {
					var rgb = this.hsb.hsbToRgb();
					if (rgb  && rgb[name] != null) {
						if (value < 0) field.setValue(value = 0);
						else if (value > 255) field.setValue(value = 255);
						rgb[name] = value;
					}
				}
			}
		}
		var hsb = rgb && rgb.rgbToHsb();
		if (hsb) {
			this.hsb = hsb;
			this.updateFields(hsb, hex ? rgb : null, hex);
		}
	},

	statics: {
		filter: function(target) {
			var value = target.getValue().toLowerCase();
			if (value && !/^#/.test(value)) value = ('#' + value).substring(0, 7);
			if (value != target.getValue()) {
				target.setValue(value);
				target.setCaret(target.getCaret() + 1);
			}
			return value;
		}
	}
});

/* XXX: Port this
Edit = {
	onChooseObject: function(name, prototype, id) {
		var values = this.chooserValues;
		if (values) {
			if (values.linkElement) {
			} else if (values.move) {
				var param = values.param;
				param.confirm = 'Do you really want to move ' +
					(values.values.length > 1 ? 'these items: "' + values.names :
					'"' + values.names) + '" to "' + name + '"?';
				param.edit_object_ids = values.ids;
				param.edit_object_id = id;
				this.execute(id, 'move', param);
			}
			this.chooserValues = null;
		}
		return values != null;
	}
};
*/