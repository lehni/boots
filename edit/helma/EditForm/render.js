////////////////////////////////////////////////////////////////////////
// rendering

EditForm.inject({
	render: function(base, mode, node) {
		try {
			var html;
			if (!node.visible) {
				html = '';
			} else if (this.object == EditForm.NOT_ALLOWED) {
				html = this.renderTemplate('notAllowed');
			} else {
				if (mode == 'edit' && this.object.isCreating())
					mode = 'create';

				var param = {
					action: base.href(EditForm.ACTION),
					width: this.width + (this.widthInPercent ? '%' : '')
				};

				var title = node.getTitle();

				var itemsParam = {
					width: param.width,
					showProgress: EditForm.SHOW_PROGRESS
				};

				if (EditForm.SHOW_TITLE && this.showTitle !== false)
					itemsParam.title = this.renderPath(node, mode);

				param.items = this.renderItems(this, itemsParam);

				var canGoBack = node.parent != null && node.parent.visible;

				var buttonMode = Base.pick(this.buttonMode, EditForm.BUTTON_MODE);

				var buttonBack = buttonMode & EditForm.BUTTON_MODE_BACK;
				var buttonStay = !buttonBack || (buttonMode & EditForm.BUTTON_MODE_STAY);

				var creating = /^new|create$/.test(mode);

				var leftButtons = [], rightButtons = [];
				if (EditForm.PREVIEWABLE && this.previewable !== false) {
					leftButtons.push({
						value: creating ? this.titles.createPreview || EditForm.TITLE_CREATE_PREVIEW
							: this.titles.applyPreview || EditForm.TITLE_APPLY_PREVIEW,
						onClick: this.renderHandle('execute', 'preview', { post: true, edit_create: creating ? 1 : 0 })
					});
				}
				rightButtons.push({
					value: canGoBack ? this.titles.back || EditForm.TITLE_BACK
						: this.titles.close || EditForm.TITLE_CLOSE,
					onClick: this.renderHandle('back', 1)
				});

				if (creating) {
					// New or Create:
					if (buttonBack) {
						rightButtons.push({
							value: canGoBack ? this.titles.createBack || EditForm.TITLE_CREATE_BACK
								: this.titles.createClose || EditForm.TITLE_CREATE_CLOSE,
							onClick: this.renderHandle('execute', mode, { post: true, edit_back: 1 })
						});
					} 
					if (buttonStay) {
						rightButtons.push({
							value: this.titles.create || EditForm.TITLE_CREATE,
							onClick: this.renderHandle('execute', mode, { post: true })
						});
					}
				} else {
					// Edit:
					if (this.removable && EditForm.REMOVABLE)
						rightButtons.push({
							value: 'Delete',
							onClick: this.renderHandle('remove', title)
						});
					if (buttonBack) {
						rightButtons.push({
							value: canGoBack ? this.titles.applyBack || EditForm.TITLE_APPLY_BACK
								: this.titles.applyClose || EditForm.TITLE_APPLY_CLOSE,
							onClick: this.renderHandle('execute', 'apply', { post: true, edit_back: 1 })
						});
					}
					if (buttonStay) {
						rightButtons.push({
							value: this.titles.apply || EditForm.TITLE_APPLY,
							onClick: this.renderHandle('execute', 'apply', { post: true })
						});
					}
				}
				// Render buttons after items, so items can add buttons in render.
				// renderItem can handle arrays directly:
				var buttons = [];
				// Left
				var str = this.renderItem(this, this.buttons);
				if (str) buttons.push(str);
				str = this.renderButtons(leftButtons);
				if (str) buttons.push(str);
				param.leftButtons = buttons.join('&nbsp;');
				// Right
				param.rightButtons = this.renderButtons(rightButtons);
				html = this.renderTemplate('form', param);
			}
		} catch (e) {
			EditForm.reportError(e);
		}
		// Create response object:
		var response = {
			id: node.id, html: html, visible: node.visible
		};
		if (node.parent) {
			var parent = { id: node.parent.id };
			var parentItem = node.parentItem;
			if (parentItem) {
				parent.item = parentItem.name;
				if (parentItem.type == 'group')
					parent.group = parentItem.groupForm.name;
			}
			response.parent = parent;
		}
		this.addResponse(response);
	},

	renderHandle: function(handler) {
		var args = handler instanceof Array ? handler : Array.create(arguments);
		args.unshift(this.id);
		var str = Json.encode(args);
		// Encode for inline html JS by replacing ' with \' and " with ':
		str = str.substring(1, str.length - 1).replaceAll("'", "\\'").replaceAll('"', "'");
		return "EditForm.handle(" + str + ");";
	},

	renderPath: function(node, mode) {
		var nodes = [];
		while (node) {
			nodes.unshift(node);
			node = node.parent;
		}
		var last = nodes.length - 1, lastForm = nodes.last().form;
		return nodes.each(function(node, index) {
			if (node.visible) {
				var title = node.getTitle(), form = node.getForm();
				if (EditForm.SHOW_PROTOTYPE && form && !form.title
					&& mode == 'edit' && this.object != root)
						title += ' (' + this.object._prototype.uncamelize(' ') + ')';
				if (index < last)
					title = '<a href="javascript:' +
						lastForm.renderHandle('back', last - index) + '">'
						+ title + '</a>';
				this.push(title);
			}
		}, []).join(' &raquo; ');
	},

	renderItem: function(baseForm, item, param, out) {
		param = param || {};
		if (item instanceof Array) {
			for (var i = 0; i < item.length; i++) {
				if (i > 0 && !item[i].type == 'hidden')
					out.write('&nbsp;');
				this.renderItem(baseForm, item[i], param, out);
			}
		} else {
			var value = item.getValue();
			if (value == null && item.form.object.isCreating() && item.defaultValue)
				value = item.defaultValue;
			item.getOptions().each(function(val, key) {
				param[key] = val;
			});
		    if (item.prefix) {
				out.write(item.prefix);
				out.write(' ');
			}
			item.render(baseForm, this.variablePrefix + item.name, value, param, out);
		    if (item.suffix) {
				out.write(' ');
				out.write(item.suffix);
			}
		}
	}.toRender(),

	renderItems: function(baseForm, param, out) {
		if (this.tabs != null) {
			res.push();
			var tabs = this.tabs;
			param.noPane = true;
			for (var i = 0; i < tabs.length; i++) {
				var tab = tabs[i];
				if (tab.type == 'tab') {
					baseForm.renderTemplate('tabPage', {
						label: tab.groupForm.label,
						items: tab.groupForm.renderItems(baseForm, param),
						width: param.width
					}, res);
				}
			}
			param.tabs = res.pop();
			baseForm.renderTemplate('tabPane', param, out);
		} else {
			var rows = this.rows;
			if (!param.noPane)
				res.push();
			for (var i = 0; i < rows.length; i++)
				this.renderItemRow(baseForm, rows[i], i);
			if (!param.noPane) {
				param.tabs = baseForm.renderTemplate('tabPage', {
					items: res.pop(),
					width: param.width
				});
				baseForm.renderTemplate('tabPane', param, out);
			}
		}
	}.toRender(),

	renderItemRow: function(baseForm, row, index) {
		if (index == 0) {
			// calculate maxRowLength, for creating span values in rows smaller
			// than the maximum. This is only calculated once per edit form, when
			this.maxRowLength = 0;
			for (var i = 0; i < this.rows.length; i++)
				this.maxRowLength = Math.max(this.rows[i].length, this.maxRowLength);
		}

		var rowSpan = null;
		if (row.length == 1 && this.maxRowLength > 1)
			rowSpan = 2 * this.maxRowLength - 1;

		var itemWidth, spacerWidth = this.spacerWidth;
		// scan through each item and see if it sets with
		var width = this.width;
		var widths = {};
		var cellCount = row.length;
		for (var i = 0; i < row.length; i++) {
			var item = row[i];
			// if there's an array of items to merge, just look at the first one
			// for the cell settings
			if (item instanceof Array)
				item = item[0];
			if (item.hidden) {
				cellCount--;
			} else if (item.width) {
				var w = parseFloat(item.width);
				if (typeof item.width == 'string' && item.width.endsWith('%'))
					w = this.width * w / 100.0;
				width -= w;
				if (this.widthInPercent)
					w += '%';
				widths[i] = w;
			}
		}
		// now calculate the default item width for all the others that do not
		// set item.width:
		itemWidth = Math.floor((width - spacerWidth * (cellCount - 1)) / cellCount);
		if (this.widthInPercent) {
			itemWidth += '%';
			spacerWidth += '%';
		}
		res.push();
		var firstItem = null;
		var labels = [];
		for (var i = 0; i < row.length; i++) {
			var item = row[i];
			// if there's an array of items to merge, just look at the first one
			// for the cell settings
			if (item instanceof Array)
				item = item[0];

			if (!item.hidden) {
				if (!firstItem)
					firstItem = item;
				var width = widths[i];
				var param = {
					name: item.name && this.variablePrefix + item.name,
					label: !EditForm.LABEL_LEFT ? item.label : null,
					span: item.span ? item.span : rowSpan, align: item.align,
					spacer: i > 0, spacerWidth: spacerWidth,
					width: width, calculatedWidth: width || itemWidth,
				 	// scale when item tells the renderer to scale it in,
					// or if it defines a width
					scaleToFit: item.scaleToFit || width != null
				}
				// don't use item here, as it might have been overriden above
				// for the cell settings when arrays are passed, use row[i]
				// pass param to renderItem so EditItems can access calculatedWidth
				param.item = this.renderItem(baseForm, row[i], param);
				baseForm.renderTemplate('item', param, res);
				// Collect the param here, so they can be used in itemRow
				// bellow, for rendering the labels. It is optional to use this
				// in itemRow.jstl. Labels can also be directly rendered in item.jstl
				// But in order to render table rows properly, the split-up is needed.
				labels.push(param);
			}
		}
		// at least one item needs to be rendered
		if  (firstItem) {
			baseForm.renderTemplate('itemRow', {
				label: EditForm.LABEL_LEFT ? firstItem.label ?
					firstItem.label + ':' : ' ' : null,
				labels: labels,
				items: res.pop(),
				index: index
				// TODO: fix this
				// addEmptyCell: firstItem.width != null
			}, res);
		}
	},

	renderButton: function(button, out) {
		Html.input({
			name: button.name,
			type: 'button', value: button.value,
			className: button.className,
			onmouseup: button.onClick
		}, out);
	}.toRender(),
/*
	renderButton: function(button, out) {
		return this.renderTemplate('button', button, out);
	},
*/

	renderButtons: function(buttons, out) {
		var first = true;
		for (var i = 0; i < buttons.length; i++) {
			var button = buttons[i];
			if (button) {
				if (first) first = false;
				else res.write('&nbsp;');
				this.renderButton(button, out);
			}
		}
	}.toRender(),

	addResponse: function(data) {
		res.data.editResponse.merge(data);
	}
});
