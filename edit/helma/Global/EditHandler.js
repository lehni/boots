EditHandler = Base.extend(new function() {
	var handlers = new Hash();

	function handle(handler, node, base, mode) {
		// Call the handler and commit changes if there are any.
		// Make sure a new form is produced each time when editing.
		var form = node.getForm(mode == 'edit');
		// Retrieve item too if defined and pass it to the handler.
		var item = req.data.edit_item !== undefined
				? form.getItem(req.data.edit_item, req.data.edit_group)
				: null;
		// If the item could not be found and edit_entry_id is set, the item is
		// to be found in a editable list entry.
		if (item == null && req.data.edit_entry_id) {
			// Find the form through the entry edit node, and the item from
			// there.
			var entryNode = EditNode.get(req.data.edit_entry_id);
			// Do not override node with entryNode, as editable list entries do
			// not have nodes, they are inlined.
			var entryForm = entryNode
					&& entryNode.getForm(mode == 'edit');
			if (entryForm) {
				item = entryForm.getItem(req.data.edit_item,
						req.data.edit_group);
			}
		}
		var oldHref = base.href();
		var result = handler.handle(base, node.object, node, form, item);
		if (result == EditForm.COMMIT) {
			res.commit();
			var redirect = null;
			if (base.isTransient()) {
				// The object has been removed in the meantime, redirect to its
				// parent.
				redirect = base.getParent();
				if (!redirect) {
					// Find parent in path:
					for (var i = path.length - 1; i > 0; i--) {
						var obj = path[i];
						if (obj == base) {
							redirect = path[i - 1];
							break;
						}
					}
				}
			} else if (base.href() != oldHref) {
				// A renaming has lead to a changing href. We need to redirect
				// to the new place in order to be able to continue editing.
				redirect = base;
			}
			if (redirect) {
				res.data.editResponse.redirect = redirect.href();
			} else {
				// Render the updated html and cause edit.js to update on the
				// fly. See if there is a render_action on the object.
				var render = EditForm.ACTION_RENDER
						&& base[EditForm.ACTION_RENDER + '_action'];
				if (render) {
					// Render the page into res.data.editResponse.page:
					res.push();
					render.call(base);
					res.data.editResponse.page = res.pop();
				}
			}
		} else if (result == EditForm.NOT_ALLOWED) {
			EditForm.setMessage('editNotAllowed');
			return false;
		}
		return true;
	}

	return {
		statics: {
			extend: function(src) {
				var ctor = this.base(src), handler = new ctor();
				handlers[src.mode] = handler;
				return ctor;
			},

			handle: function(base, mode) {
				var startTime = Date.now();
				var editObj = null;
				// The default for response content-type is javascript for 
				// outputing json data. If something else  is sent back,
				// res.contentType needs to be changed accordingly.
				// The code bellow handling iframes checks for this again.
				res.contentType = 'text/javascript';
				EditNode.onRequest();
				var editResponse = res.data.editResponse = new Hash();
				var mode = req.data.edit_mode || mode || 'edit';
				var fullId = req.data.edit_id;
				if (app.properties.debugEdit) {
					User.log();
					var values = [];
					var filter = /^(http_host|HopSession|http_language|http_remotehost|autoLogin|http_browser|http_referer)$/;
					for (var i in req.data)
						if (!filter.test(i))
							values.push(i + ': ' + Json.encode(req.data[i]));
					User.log('EditHandler.handle() Request:', fullId,
							"'" + mode + "', Form Data:\n" + values.join('\n'));
				}
				var handler = handlers[mode];
				var out = null;
				// Only allow editing modes if the edi stack is valid. Otherwise
				// it just renders the edit form again and ignores the editing
				// step.
				var handled = true;
				if (req.data.helma_upload_error) {
					EditForm.alert(req.data.helma_upload_error);
					User.log('EditHandler.handle() Upload Error',
							req.data.helma_upload_error);
				} else if (handler) {
					res.push();
					try {
						if (!fullId) {
							var hasEdit = false;
							for (var key in req.data) {
								if (/^edit_/.test(key)) {
									hasEdit = true;
									break;
								}
							}
							if (!hasEdit) {
								app.log('HACK ATTEMPT? ' + req.data.http_remotehost);
								return false;
							}
							throw 'A rare error has occured, as a result of '
								+ 'which your changes were unfortunately lost. '
								+ 'If text was lost, it may be restored from '
								+ 'log-files on the server.\n\nPlease contact '
								+ 'the administrator.';
						}
						var node = EditNode.get(fullId);
						if (node) {
							// Call the handler and commit changes if there are.
							node.log(mode);
							handled = handle(handler, node, base, mode);
						}
					} catch (e) {
						EditForm.reportError('EditHandler.handle()', e);
						// Rollback changes in case there was an exception in
						// res.commit() above, as otherwise the same error  will
						// be thrown again at the end of the response handling
						// in the automatic commit() call. This is required to
						// make sure error messages get through to the client.
						res.rollback();
					}
					out = res.pop();
					// Assume that if id was not set yet, no form was rendered
					// yet, and we should render the current one. This allows
					// the handlers to be lazy about rendering of the current
					// form, e.g. when the ApplyHandler receives an exception.
					if (!out && !editResponse.id) {
						// Go back the given amount, if any
						if (req.data.edit_back) {
							var back = parseInt(req.data.edit_back);
							while (node && node.visible && back--)
								node = node.parent;
							if (node && !node.visible)
								node = null;
						}
						// Only render node if no error has happened in the
						// meantime.
						if (node && !res.message) {
							try {
								node.render(base, 'edit');
							} catch (e) {
								EditForm.reportError('EditHandler.handle()', e);
							}
						}
					}
				} else {
					EditForm.reportError('EditHandler.handle()',
							'Unknown edit handler: ' + mode);
				}
				if (!out) {
					if (res.message)
						editResponse.alert = res.message;
					delete editResponse.added;
					out = Json.encode(editResponse);
				}
				// Prevent any caching at the remote server or any intermediate
				// proxy. Tested on most browsers with:
				// http://www.mnot.net/javascript/xmlhttprequest/cache.html
				res.servletResponse.setHeader('Cache-Control',
						'no-cache,max-age=0');
				if (/^multipart\/form-data/.test(req.servletRequest.contentType)
						&& res.contentType == 'text/javascript') {
					// Unfortunately an iframe response needs to be inside a
					// textarea...
					res.contentType = 'text/html';
					res.write('<html><body><textarea>' + encodeEntities(out)
							+ '</textarea></body></html>');
				} else {
					res.write(out);
				}
				if (app.properties.debugEdit)
					User.log('EditHandler.handle() time: ',
							Date.now() - startTime);
				return handled;
			},

			call: function(mode, base, object, node, form) {
				var handler = handlers[mode];
				return handler && handler.handle(base, object, node, form);
			}
		}
	}
});
