// Copyright (c) 2003-2008 Juerg Lehni, Lineto.com. All rights reserved.
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

	set: function(values) {
		if (values.applied)
			this.applied = true;
		this.html = values.html;
		if (EditSettings.useButtons && Browser.WEBKIT) {
			// On safari, remove buttons before setting of new html, to prevent
			// the odd bug described bellow from happening.
			this.container.getElements('input[type=button]').remove();
		}
		this.container.setHtml(this.html);
		// On Safari, there is a very odd bug that very rarely mixes all the
		// buttons on one page, as if they were all thrown into one container,
		// and redistributed by picking blindy. The workaround is to not produce
		// buttons in edit forms, but use <a> tags, and replace them with buttons
		// here, if useButtons is set to true:
		if (EditSettings.useButtons) {
			this.container.getElements('a.button').each(function(el, index) {
				var id = el.getId();
				el.removeClass('button'); // for getClass bellow
				el.replaceWith(['input', {
					type: 'button',
					name: id,
					name: id,
					value: el.getText(),
					className: el.getClass(),
					onmouseup: el.getProperty('onmouseup')
				}].toElement());
			});
		}
		this.form = $('form', this.container);
		if (this.form) {
			this.empty = false;
			this.url = this.form.getAction();
			var tab = $('div.tab-pane', this.form);
			TabPane.setup();
			this.tab = tab && tab.tabPane;
			this.show(true);
			if (values.error) {
				$('#edit-error-' + values.error.name, this.form).setHtml(values.error.message).removeClass('hidden');
				this.setSelectedTab(values.error.tab);
				var field = $('#' + values.error.name, this.form);
				if (field && field.focus) {
					field.focus();
					field.setValue(values.error.value);
				}
			}
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
		if (!EditForm.forms.length())
			Document.fireEvent('endedit');
		return this.parent;
	},

	preview: function(previousHtml) {
		this.show(false);
		var that = this;
		var offset = Window.getScrollOffset();
		Window.scrollTo(0, 0);
		var button = $('body').injectBottom('div', {
				className: 'edit-preview'
			}, [
				'a', {
					html: 'Exit Preview', href: '#',
					events: {
						click: function(event) {
							that.show(true);
							EditForm.setBody(previousHtml);
							Window.scrollTo(offset);
							button.remove();
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

	autoSize: function() {
		// To be overridden if size changes require repositioning of things.
	},

	setSelectedTab: function(index) {
		if (this.tab) this.tab.setSelectedIndex(index);
	},

	getSelectedTab: function() {
		return this.tab && this.tab.getSelectedIndex();
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
					return { text: opt.getText(), value: opt.getValue(), selected: opt.getSelected() }
				}) };
			} else if ((!(el instanceof Input) || !/^(file|button)$/.test(el.getType())) && el.getValue() != null) {
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
					var options = lookupIds[opt.value] ? multi.left.element :  multi.right.element;
					if (options)
						options.appendChild(new SelectOption(opt));
				}
			});
			this.handle('multiselect_update', name);
		}, this);
	},

	// To be overridden by different implementations!
	submit: function(post, params) {
		// clear all errors:
		$$('div.edit-error', this.form).addClass('hidden');
		var progress = $('div.edit-progress', this.form);
		if (progress) progress.removeClass('hidden');
		var method = 'get';
		var url = this.url;
		var back = params.edit_back;
		var that = this;
		if (post) {
 			// Post values using internal form
			method = 'post';
			if (this.form.hasElement('input[type=file]')) {
				// Display upload progress
				var uploadId = Math.random().toString(36).substring(2);
				url += '?upload_id=' + uploadId;
				if (this.uploadTimer)
					this.uploadTimer.clear();
				var startTime = new Date().getTime(), current;
				var uploadStatus = $('div.edit-upload', this.container);
				if (uploadStatus) {
					var request = new Request({
						url: url, method: 'get', json: true, data: this.getData('upload_status')
					}, function(status) {
						if (that.uploadTimer && status && status.total) {
							if (status.current == status.total ||
								current == status.current && new Date().getTime() - startTime > 6000)
									that.uploadTimer = that.uploadTimer.clear();
							uploadStatus.setWidth(status.current / status.total * 100 + '%');
							// .setHtml(status.current + ' of ' + status.total + ' uploaded.');
							current = status.current;
						}
					});
					this.uploadTimer = (function() {
						request.send();
						that.uploadTimer = (function() {
							request.send();
						}).periodic(500);
					}).delay(50);
				}
			}
			// Set / add fields to form as elements and use the form as params.
			params = this.form.setValues(params);
		}
		this.request = new Request({
			url: url, method: method, json: true, data: params
		}, function(values) {
			if (progress) progress.addClass('hidden');
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

	getData: function(mode, params, request) {
		if (request) EditForm.data.request++;
		return Hash.merge({
			edit_mode: mode,
			edit_id: this.id,
			edit_data: Json.encode(EditForm.data)
		}, params);
	},

	execute: function(mode, params) {
		if (!params) params = {};
		if (!params.confirm || confirm(params.confirm)) {
			// this is necessay for mozilla browsers, because otherwise form focus
			// gets messed up (because the input that still has the focus gets
			// deleted by innerHTML....)
			this.form.blur();
			var post = params.post;
			var enable = !!params.enable;
			Base.each(params, function(val, key) {
				if (!/^edit_/.test(key))
					delete params[key];
			});
			this.submit(post, this.getData(mode, params, true));
			this.form.enable(enable);
		}
	},

	statics: {
		forms: new Hash(),
		data: {
			request: 0,
			version: 0,
			nodes: new Hash()
		},
		targets: new Hash(),
		mode: 'inline',

		get: function(id, target, parent) {
			var form = this.forms[id];
			if (target) { // If target is passed, we're asked to create a form
				if (!this.forms.length())
					Document.fireEvent('beginedit');
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

		inline: function(url, param) {
			var target = $('#' + param.target);
			if (!target) {
				alert('Cannot find target element for editor of object ' + param.id);
			} else if (!param.confirm || confirm(param.confirm)) {
				var elements = $('div#edit-elements-' + param.id + '.edit-elements');
				var progress = $('span.edit-progress', elements);
				var buttons = $('span.edit-buttons', elements);
				if (progress) {
					var hideButtons = progress.getParent() != buttons;
					progress.removeClass('hidden');
					if (hideButtons) buttons.addClass('hidden');
				}
				var form = $('form', buttons);
				form.enable(false);
				this.mode = 'inline';
				var editForm = this.get(param.id, target);
				editForm.request = new Request({
					url: url, method: 'get', json: true,
					data: editForm.getData(param.mode, param)
				}, function(values) {
					if (progress) {
						progress.addClass('hidden');
						if (hideButtons) buttons.removeClass('hidden');
					}
					form.enable(true);
					if (values) {
						EditForm.set(values);
						// Only set the style once the stuff is loaded and hidden
						if (param.style)
							editForm.container.setStyle(param.style);
						if (param['class'])
							editForm.container.addClass(param['class']);
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
				// update version so server knows wether to sync or not.
				this.data.version++;
				if (backup) form.restore(backup);
				form.autoSize();
			}
			if (values.page)
				this.setHtml(values.page);
			if (values.preview)
				this.preview(values.id, this.setHtml(values.preview));
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

		setHtml: function(html) {
			html = html.match(/<body[^>]*>([\u0000-\uffff]*)<\/body>/i);
			if (html) {
				var offset = Window.getScrollOffset();
				var previous = this.setBody(html[1]);
				Window.scrollTo(offset);
				return previous;
			}
		},

		setBody: function(html) {
			// store references to the targets and remove containers from
			// the dom, so they can be inserted again bellow in the new dom.
			this.forms.each(function(form, id) {
				form.container.remove();
			});
			EditChooser.choosers.each(function(chooser) {
				chooser.element.remove();
			});
			// Replace the content of the body only...
			Document.fireEvent('beforeupdate');
			var body = $('body');
			var previousHtml = body.getHtml();
			body.setHtml(html);
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
			Document.fireEvent('domready');
			// Fire event on document so website can react to html update
			// and do some JS magic with it if needed before the ditors are
			// injected again.
			Document.fireEvent('afterupdate');
			EditChooser.choosers.each(function(chooser) {
				chooser.element.insertInside(body);
			});
			return previousHtml;
		},

		close: function(id) {
			var form = this.get(id);
			return form ? form.close() : null;
		},

		preview: function(id, previousHtml) {
			var form = this.get(id);
			if (form) form.preview(previousHtml);
		}
	}
});

// handlers
EditForm.inject(new function() {
	var handlers = new Hash();

	return {
		handle: function(action) {
			var handler = handlers[action];
			if (handler) {
				var args = Array.slice(arguments, 1);
				args.unshift(this);
				return handler.apply(handlers, args);
			} else alert('Handler missing: ' + action);
			return true;
		},

		statics: {
			register: function(items) {
				handlers.merge(items);
			},

			handle: function(id, handler) {
				var form = EditForm.get(id);
				if (form)
					return form.handle.apply(form, Array.slice(arguments, 1));
				else
					alert('Cannot find form: ' + id);
			}
		}
	};
});

// default:
EditForm.register({
	execute: function(editForm, mode, params) {
		editForm.execute(mode, params);
	},

	remove: function(editForm, title) {
		editForm.execute('remove', {
			confirm: 'Do you really want to delete "' + title + '"?',
			post: true
		});
	},

	close: function(editForm) {
		editForm.close();
	},

	back: function(editForm, count) {
		editForm.back(count);
	},

	number_format: function(editForm, name, type, def, min, max) {
		var item = $('input#' + name, editForm.form);
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

	help_toggle: function(editForm) {
		var el = $('.edit-help-button', editForm.container);
		if (el instanceof Input) {
			el.setValue(el.getValue() == 'Help' ? 'Close Help' : 'Help');
		} else {
			el.setText(el.getText() == 'Help' ? 'Close Help' : 'Help');
		}
		$$('div.edit-help').toggleClass('hidden');
		editForm.autoSize();
	}
});

// select
EditForm.register(new function() {
	function getSelected(editForm, sels) {
		var names = [];
		var values = [];
		sels.each(function(sel) {
			sel = $('#' + sel, editForm.form);
			if (sel) {
				sel.getOptions().each(function(opt) {
					if (opt.getSelected() && opt.getValue()) {
						names.push(opt.getText());
						values.push(opt.getValue());
					}
				});
			}
		});
		return values.length > 0 ?
			{ values: values, names: names.join(', '), ids: values.join(',') } : null;
	}

	var prototypeChooser = null;

	return {
		select_new: function(editForm, name, prototype, params) {
			if (typeof prototype == 'string') {
				editForm.execute('new', params);
			} else {
				if (!prototypeChooser)
					prototypeChooser = new PrototypeChooser();
				prototypeChooser.choose(editForm, name + '_new', prototype);
			}
		},

		select_edit: function(editForm, sels, params) {
			var sel = getSelected(editForm, sels);
			if (sel && sel.values.length == 1) {
				var val = sel.values[0];
				if (val != 'null') {
					params.edit_object_id = val;
					editForm.execute('edit', params);
				}
			}
		},

		select_remove: function(editForm, sels, params) {
			if (params) {
				var sel = getSelected(editForm, sels);
				if (sel) {
					params.confirm = 'Do you really want to delete ' + 
						(sel.values.length > 1 ? 'these items: "' + 
						sel.names : '"' + sel.names) + '"?';
					params.edit_object_ids = sel.ids;
					editForm.execute('remove', params);
				}
			} else {
				// Remove links from list
				sels.each(function(sel) {
					sel = $('#' + sel, editForm.form);
					sel.getOptions().each(function(opt) {
						if (opt.getSelected())
							opt.remove();
					});
				 	// Generate values
					// TODO: replace substring with regexp
					this.multiselect_update(editForm, el.name.substring(0, el.name.indexOf('_left')));
				}, this);
			}
		},

		select_move: function(editForm, name, sels, params) {
			var sel = getSelected(editForm, sels);
			if (sel) {
				sel.params = params;
				sel.move = true;
				// TODO: Finish porting. Pass sel, etc
				editForm.handle('choose_move', name + '_move');
			}
		}
	};
});

// multiselect
EditForm.register(new function() {
	function moveSelected(from, to) {
		var children = to.getOptions();
		var at = children.last();
		children.each(function(opt) {
			if (opt.getSelected()) {
				opt.setSelected(false);
				at = opt;
			}
		});
		from.getOptions().each(function(opt) {
			if (opt.getSelected()) {
				if (at) opt.insertAfter(at);
				else opt.insertInside(to);
				at = opt;
			}
		});
	}

	function swapSelected(options, i1, i2) {
		var o1 = options[i1];
		var o2 = options[i2];
		if (o1.getSelected() && !o2.getSelected()) {
			if (i1 < i2) o2.insertBefore(o1);
			else o1.insertBefore(o2);
		}
	}

	return {
		multiselect_arrange: function(editForm, name, dir) {
			var left = $('#' + name + '_left', editForm.form);
			var right = $('#' + name + '_right', editForm.form);
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
			this.multiselect_update(editForm, name);
		},

		multiselect_update: function(editForm, name) {
			var ids = $('#' + name + '_left', editForm.form).getOptions().getProperty('value');
			$('#' + name, editForm.form).setValue(ids.join(','));
		}
	};
});

// choose
EditForm.register(new function() {
	var objectChooser = null;

	function getChooser() {
		if (!objectChooser)
			objectChooser = new ObjectChooser();
		return objectChooser;
	}

	function choose(editForm, name, params, onChoose) {
		var chooser = getChooser();
		editForm.onChoose = onChoose;
		chooser.choose(editForm, name, params);
	}

	return {
		choose_link: function(editForm, name, params) {
			choose(editForm, name + '_link', params, function(id, title) {
				var field = $('#' + name, editForm.form);
				if (field) {
					var text = field.getSelectedText();
					field.replaceSelectedText(
						(text ? EditSettings.objectLink : EditSettings.unnamedObjectLink).replace('@link', id).replace('@text', text)
					);
				}
				return true; // close
			});
		},

		choose_reference: function(editForm, name, params) {
			var that = this, element = null, backup = null;
			// make sure the chooser is there:
			var chooser = getChooser();
			if (params.multiple) {
				element = $('#' + name + '_left');
				backup = element.getChildren();
				chooser.onCancel = function() {
					element.removeChildren();
					element.appendChildren(backup);
					that.multiselect_update(editForm, name);
					this.onCancel = this.onOK;
					this.close();
				}
			}
			choose(editForm, name + '_choose', params, function(id, title) {
				var match;
				if (params.multiple) {
					if (element.getElement('option[value="' + id + '"]')) {
						alert('This element was already added to the list.');
					} else {
						var selected = element.getSelected().last();
						var opt = new SelectOption({ text: title, value: id });
						if (selected)
							opt.insertAfter(selected);
						else
							opt.insertInside(element);
						that.multiselect_update(editForm, name);
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

		choose_move: function(editForm, name, params) {
			choose(editForm, name, params, function(id, title) {
				return true;
			});
		},

		choose_toggle: function(editForm, id) {
			objectChooser.toggle(id);
		},

		choose_select: function(editForm, id, title) {
			// only close if onChoose returns true.
			if (editForm.onChoose && editForm.onChoose(id, title))
				EditChooser.closeAll();
		},

		choose_url: function(editForm, name) {
			var field = $('#' + name, editForm.form);
			if (field) {
				var url = prompt('Enter link URL (email or internet address):\n' +
					'Email addresses are encryption and protected against spam.');
				if (url) {
					var text = prompt('Enter link text (empty = same as URL):', field.getSelectedText());
					if (text || text == '') {
						var link = text ? EditSettings.urlLink : EditSettings.unnamedUrlLink;
						if (/^([a-zA-Z0-9\-\.\_]+)(\@)([a-zA-Z0-9\-\.]+)(\.)([a-zA-Z]{2,4})$/.test(url)) {
							if (!text) text = 'Email';
							link = EditSettings.mailLink;
						}
						if (!text) text = url;
						field.replaceSelectedText(link.replace('@link', url).replace('@text', text));
					}
				}
			}
		}
	};
});

// references
EditForm.register({
	references_remove: function(editForm, name) {
		var el = $('#' + name + '_left');
		el.getSelected().remove();
		this.multiselect_update(editForm, name);
	}
});


// color
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

	var colorChooser = null;

	return {
		color_choose: function(editForm, name) {
			var target = $('#' + name, editForm.form);
			updateColor(target);
			target.onUpdate = function() {
				updateColor(this);
			};
			if (!colorChooser)
				colorChooser = new ColorChooser(168);
			colorChooser.choose(editForm, name + '-color', target);
		},

		color_update: function(editForm, name) {
			updateColor($('input#' + name, editForm.form));
		}
	};
});

// Choosers:
EditChooser = Base.extend({
	initialize: function(params) {
		this.element = $('body').injectBottom('div', {
			id: params.name,
			className: 'edit-chooser'
		});

		this.content = this.element.injectBottom('div', {
			html: params.html || '',
			padding: params.padding || 0,
			className: params.className || ''
		});
		var that = this;

		if (params.buttons == undefined)
			params.buttons = true;

		if (params.buttons) {
			var ok = this.createButton('OK', function() {
				if (that.onOK)
					that.onOK();
			});

			var cancel = this.createButton('Cancel', function() {
				if (that.onCancel)
					that.onCancel();
			});

			this.buttons = this.element.injectBottom('div', { className: 'edit-element edit-buttons-right' }, [
				cancel,
				ok,
			]);
		}

		this.show(false);

		if (!EditChooser.choosers.length) {
			// The first chooser. Install catch-all mousedown....
			Document.addEvent('mousedown', function(event) {
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
		return new Input({ type: 'button', value: title, className: 'edit-button' }).addEvent('mouseup', handler);
	},

	choose: function(editForm, name) {
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
		}
	}
});

PrototypeChooser = EditChooser.extend({
	initialize: function() {
		this.base({ name: 'edit-prototype', padding: 4, className: 'edit-object-chooser', buttons: false });
	},

	choose: function(editForm, name, prototypes) {
		this.content.setHtml('<ul>' + prototypes.map(function(proto) {
			return '<li><a href="javascript:' + proto.href + '">' + proto.name + '</a></li>';
		}).join('') + '</ul>');
		this.editForm = editForm;
		this.base(editForm, name);
	}
});

ObjectChooser = EditChooser.extend({
	initialize: function() {
		this.base({ name: 'edit-choose', padding: 4, className: 'edit-object-chooser' });
	},

	choose: function(editForm, name, params) {
		this.editForm = editForm;
		this.base(editForm, name);
		this.buttons.modifyClass('hidden', !params.multiple);
		this.show(false);
		// Open the root list
		this.toggle(params.root);
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
		var children = $('#edit-choose-children-' + id, this.content) || this.content;
		var show = children == this.content || children.hasClass('hidden');
		if (show) {
			new Request({
				url: this.editForm.url, method: 'get',
				data: this.editForm.getData('choose', {
					edit_root_id: id || ''
				})
			}, (function(result) {
				children.setHtml(result);
				this.setArrow(id, true);
				if (show) {
					children.removeClass('hidden');
					this.show(true);
				}
			}).bind(this)).send();
		} else {
			this.setArrow(id, false);
		}
		if (!show)
			children.addClass('hidden');
	}
});

ColorChooser = EditChooser.extend({
	initialize: function(size) {
		this.base({ name: 'edit-color', padding: 1, html: '<form id="edit-color-form" target="" method="post" autocomplete="off">\
			<table border="0" cellpadding="0" cellspacing="0">\
				<tr>\
					<td rowspan="8">\
						<div class="edit-element">\
							<div style="position:absolute;clip:rect(0px,' + size + 'px,' + size + 'px,0px)"><div id="edit-color-cross" style="position:relative; width:12px; height:12px; background-image:url(/static/edit/media/color-cross.gif);"></div></div>\
							<img id="edit-color-overlay" class="edit-color" src="/static/edit/media/color-overlay.png" width="' + size + '" height="' + size + '" border="0" alt="">\
						</div>\
					</td>\
					<td rowspan="8">\
						<div class="edit-element">\
							<div style="position:absolute;clip:rect(0px,' + Math.round(size / 10 + 5) + 'px,' + size + 'px,-4px)"><div id="edit-color-slider" style="position:relative; left:-4px; width:25px; height:7px; background-image:url(/static/edit/media/color-slider.gif);"></div></div>\
							<img id="edit-color-rainbow" class="edit-color" src="/static/edit/media/color-rainbow.png" width="' + Math.round(size / 10) + '" height="' + size + '" border="0" alt="">\
						</div>\
					</td>\
					<td colspan="2">\
						<div class="edit-element">\
							<img id="edit-color-preview" class="edit-color" src="/static/edit/media/spacer.gif" width="100%" height="' + Math.round(size / 4) + '" border="0" alt="">\
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
		</form>' });
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
				target.setCaretPosition(target.getCaretPosition() + 1);
			}
			return value;
		}
	}
});

/* TODO: Port this
Edit = {
	onChooseObject: function(name, prototype, id) {
		var values = this.chooserValues;
		if (values) {
			if (values.linkElement) {
			} else if (values.move) {
				var params = values.params;
				params.confirm = 'Do you really want to move ' +
					(values.values.length > 1 ? 'these items: "' + values.names :
					'"' + values.names) + '" to "' + name + '"?';
				params.edit_object_ids = values.ids;
				params.edit_object_id = id;
				this.execute(id, 'move', params);
			}
			this.chooserValues = null;
		}
		return values != null;
	}
};
*/