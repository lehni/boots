////////////////////////////////////////////////////////////////////////
// Rendering

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
					action: base.href(EditForm.ACTION_EDIT) + '?uid=' + Date.now(),
					width: this.width + this.widthUnit
				};

				var title = node.getTitle();

				var itemsParam = {
					width: param.width,
					showProgress: this.getShowProgress()
				};

				if (this.getShowTitle())
					itemsParam.title = this.renderTitle(node, mode);

				param.items = this.renderItems(this, itemsParam);

				var canGoBack = node.parent != null && node.parent.visible;

				var buttonMode = Base.pick(this.buttonMode, EditForm.BUTTON_MODE);

				var buttonBack = buttonMode & EditForm.BUTTON_MODE_BACK;
				var buttonStay = !buttonBack || (buttonMode & EditForm.BUTTON_MODE_STAY);

				var creating = /^(new|create)$/.test(mode);

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
					if (buttonBack && (canGoBack || (buttonMode & EditForm.BUTTON_MODE_APPLY_CLOSE))) {
						rightButtons.push({
							value: canGoBack ? this.titles.applyBack || EditForm.TITLE_APPLY_BACK
								: this.titles.applyClose || EditForm.TITLE_APPLY_CLOSE,
							onClick: this.renderHandle('apply', { post: true, edit_back: 1 })
						});
					}
					if (buttonStay) {
						rightButtons.push({
							value: this.titles.apply || EditForm.TITLE_APPLY,
							onClick: this.renderHandle('apply', { post: true })
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
				param.leftButtons = buttons.join('');
				// Right
				param.rightButtons = this.renderButtons(rightButtons);
				html = this.renderTemplate('form', param);
			}
		} catch (e) {
			EditForm.reportError('EditForm#render()', e);
		}
		// Create response object:
		var response = {
			id: node.id, html: html, visible: node.visible
		};
		// Produce parent information for the client side, including
		// information about the parentItem
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
		var action = args.shift();
		// Encode with single quotes since it goes into html attributes with doubles
		var str = Json.encode(args, true);
		// Remove [] from string:
		str = str.substring(1, str.length - 1);
		// Pass the element on which this handler is called and the form id to each call.
		// Sequence: form, action, elment
		str = "'" + this.id + "','"  + action + "',this" + (str ? ',' + str : '');
		// Pass event object last, e.g. in case we need mouse position
		// TODO: Try instead: arguments[0] && new DomEvent(arguments[0])
		if (action == 'list_sort')
			str += ',new DomEvent(arguments[0])';
		return 'EditForm.handle(' + str + ');';
	},

	renderTitle: function(node, mode) {
		var nodes = [];
		var showPath = this.getShowPath();
		while (node && node.visible) {
			nodes.unshift(node);
			node = node.parent;
			if (!showPath)
				break;
		}
		var last = nodes.length - 1, lastForm = nodes.last.form;
		var parts = [];
		nodes.each(function(node, index) {
			if (node.visible) {
				// TODO: Template
				var title = '<span class="edit-node-title">' + node.getTitle() + '</span>', form = node.getForm();
				if (this.getShowPrototype() && form && !form.title
					&& mode == 'edit' && this.object != root)
						title += ' <span class="edit-node-type">(' + EditForm.getPrototypeName(node.object) + ')</span>';
				// TODO: Template
				if (index < last)
					title = '<a href="javascript:' +
						lastForm.renderHandle('back', last - index) + '">'
						+ title + '</a>';
				parts.push(title);
			}
		}, this)
		return parts.join(' &raquo; ');
	},

	renderItem: function(baseForm, item, param, out) {
		param = param || {};
		if (item instanceof Array) {
			for (var i = 0; i < item.length; i++)
				this.renderItem(baseForm, item[i], param, out);
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
			item.render(baseForm, item.getEditName(), value, param, out);
		    if (item.suffix) {
				out.write(' ');
				out.write(item.suffix);
			}
		}
	}.toRender(),

	renderItems: function(baseForm, param, out) {
		if (this.tabs) {
			// If param.itemsOnly is provided from the start, just render
			// all items from all tabs, but not the tabs themselves.
			// This is required by EditableListItem.
			// TODO: Code could use some major clean-up...
			var itemsOnly = param.itemsOnly;
			if (!itemsOnly) {
				out.push();
			}
			var tabs = this.tabs;
			// Set param.itemsOnly for tab.groupForm.renderItems()
			param.itemsOnly = true;
			for (var i = 0; i < tabs.length; i++) {
				var tab = tabs[i];
				if (tab.type == 'tab') {
					if (itemsOnly) {
						tab.groupForm.renderItems(baseForm, param, out);
					} else {
						baseForm.renderTemplate('tab#page', {
							label: tab.groupForm.label,
							items: tab.groupForm.renderItems(baseForm, param),
							width: param.width
						}, out);
					}
				}
			}
			if (!itemsOnly) {
				param.tabs = out.pop();
				baseForm.renderTemplate('tab#pane', param, out);
			}
		} else {
			var rows = this.rows;
			if (!param.itemsOnly)
				out.push();
			for (var i = 0; i < rows.length; i++)
				this.renderItemRow(baseForm, rows[i], i, out);
			if (!param.itemsOnly) {
				param.tabs = baseForm.renderTemplate('tab#page', {
					items: out.pop(),
					width: param.width
				});
				baseForm.renderTemplate('tab#pane', param, out);
			}
		}
	}.toRender(),

	renderItemRow: function(baseForm, row, index, out) {
		if (index == 0) {
			// Calculate maxRowLength, for creating span values in rows smaller
			// than the maximum. This is only calculated once per edit form, when
			this.maxRowLength = 0;
			for (var i = 0; i < this.rows.length; i++)
				this.maxRowLength = Math.max(this.rows[i].length, this.maxRowLength);
		}

		var rowSpan = null;
		if (row.length == 1 && this.maxRowLength > 1)
			rowSpan = 2 * this.maxRowLength - 1;

		var itemWidth, spacerWidth = this.spacerWidth;
		// Scan through each item and see if it sets width
		var availableWidth = this.width;
		var definedWidths = {};
		var cellCount = 0;
		var autoLayoutCount = 0;
		for (var i = 0; i < row.length; i++) {
			var item = row[i];
			// If there's an array of items to merge, just look at the first one
			// for the cell settings
			if (item instanceof Array)
				item = item[0];
			if (item.type != 'hidden') {
				cellCount++;
				if (item.width) {
					// If an item defines its width, remove it from the available with,
					// and decrese the cellCount used for calculating automatic layouts
					var width = parseFloat(item.width);
					if (/%$/.test(item.width))
						width = this.width * width / 100.0;
					availableWidth -= width;
					definedWidths[i] = width + this.widthUnit;
				} else {
					autoLayoutCount++;
				}
			}
		}
		// Now calculate the default item width for all the others that do not
		// set item.width:
		itemWidth = Math.floor((availableWidth - spacerWidth * (cellCount - 1)) / autoLayoutCount);
		itemWidth += this.widthUnit;
		spacerWidth += this.widthUnit;
		var items = [];
		var labels = [];
		var hasLabels = false;
		for (var i = 0; i < row.length; i++) {
			var item = row[i];
			// If there's an array of items to merge, just look at the first one
			// for the cell settings
			if (item instanceof Array)
				item = item[0];
			if (item.type != 'hidden') {
				var definedWidth = definedWidths[i];
				var param = {
					name: item.getEditName(),
					label: item.label,
					className: item.itemClassName,
					span: item.span ? item.span : rowSpan, align: item.align,
					spacer: i > 0, spacerWidth: spacerWidth,
					width: definedWidth, calculatedWidth: definedWidth || itemWidth,
				 	// Scale when item tells the renderer to scale it in,
					// or if it defines a width
					scaleToFit: item.scaleToFit || definedWidth != null
				}
				if (item.label)
					hasLabels = true;
				// Don't use item here, as it might have been overriden above
				// for the cell settings when arrays are passed, use row[i]
				// pass param to renderItem so EditItems can access calculatedWidth
				param.content = this.renderItem(baseForm, row[i], param);
				items.push(baseForm.renderTemplate('item#item', param));
				// Collect the param here, so they can be used in itemRow
				// bellow, for rendering the labels. It is optional to use this
				// in itemRow.jstl. Labels can also be directly rendered in item.jstl
				// But in order to render table rows properly, the split-up is needed.
				labels.push(param);
			}
		}
		// At least one item needs to be rendered
		var showLabels = this.getShowLabels();
		if  (items.length > 0) {
			baseForm.renderTemplate('item#row', {
				showLabels: showLabels && hasLabels,
				labels: hasLabels && labels,
				labelLeft: showLabels == 'left' && hasLabels && labels[0],
				items: items,
				index: index
				// TODO: Fix this
				// addEmptyCell: labels[0].width != null
			}, out);
		}
	}.toRender(),

	renderButton: function(button, out) {
		return this.renderTemplate('button#button', button, out);
	},

	renderButtons: function(buttons, wrapped, out) {
		return this.renderTemplate('button#buttons', {
			buttons: buttons,
			wrapped: wrapped
		}, out);
	},

	/**
	 * addResponse / res.data.editResponse is only to be used to add values for
	 * the response when edit forms are to be rendered. To send other values back,
	 * e.g. for CropImageHandler, use sendResponse(data)
	 */
	addResponse: function(data) {
		res.data.editResponse.append(data);
	},

	/**
	 * Send back a raw repsonse, without rendering edit form stuff. Used for
	 * image / link choosers and image crop stuff.
	 */
	sendResponse: function(data) {
		res.write(Json.encode(data));
	}
});
