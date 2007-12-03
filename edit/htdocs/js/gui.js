// Copyright (c) 2003-2007 Juerg Lehni, Lineto.com. All rights reserved.
// Copying and reuse is strictly prohibited.

// add autoSize for gui to setSelectedIndex:

TabPane.inject({
	setSelectedIndex: function(index) {
		if (this.base(index))
			Edit.autoSize();
	}
});

Edit.inject({
	set: function(name, remember, html) {
		this.win = gui.edit;
		var collapsed = !this.win.open;
		if (collapsed) {
			this.win.zoom(true);
			this.win.moveBy(4000, 4000);
		}
		TabPane.dispose();

		this.win.setHtml(html, null, true);
		this.base(name, remember);
		this.win.show(true);

		if (collapsed) {
			this.win.moveBy(-4000, -4000);
			this.win.zoom(false);
		}
	},
	
	autoSize: function() {
		this.win.autoSize();
	},
	
	submit: function(postForm, params) {
		// use depriciated loader mechanism...
		load(this.form, postForm ? null : this.form.action, params);
	},
	
	execute: function(mode, params) {
		if (this.form.loader) {
			alert('Please wait until your last operation is completed.');
			return false;
		} else {
			return this.base(mode, params);
		}
	},

	close: function() {
		this.win.close();
	},
	
	chooseObject: function(e, values, path) {
		this.chooserValues = values;
		e = new CBEvent(e);
		var w = gui.editFinder;
		w.moveTo(e.clientX, e.clientY);
		if (path) w.selectPath(path);
		w.moveToFront();
		w.show(true);
		this.win.dontMoveToFront = true;
	},
	
	onChooseObject: function(name, prototype, id) {
		var ret = this.base(name, prototype, id);
		if (ret) {
			gui.editFinder.form.blur();
			gui.editFinder.show(false);
		}
		return ret;
	}
});

EditWindow.inject({
	create: function(name, title) {
		this.window = new GuiWindow(name, 0, 0, null, null, GuiSkin.SYSTEM.HOR, GuiWindow.CHOOSER | GuiWindow.NOTITLEBAR, this.html, 0);
		return document;
	},
	
	renderButton: function(value, action, id) {
		var str = '<a href="#" onclick="return false;"';
		if (action) str += ' onmouseup"' + action + '"';
		if (id) str += ' id="' + id + '"';
		str += ' class="button" style="display:block"';
		str += '>' + value + '</a>';
		return str;
	}
});

ColorChooser.inject({
	choose: function(target, x, y) {
		var win = this.window;
		var col = $('#' + target.name);
		new CBElement(col);
		col = col.cbe;
		this.base(target);
		win.moveTo(col.pageX() + gui.edit.left(), col.pageY() + gui.edit.top() + col.height() + win.margins.top - 1);
		gui.edit.dontMoveToFront = true;
		win.moveToFront();
		// avoid refresh flickers:
		(function() {
			win.show(true);
		}).delay(1);
	},

	close: function() {
		this.window.show(false);
	},

	focus: function() {
	},

	getOffsets: function() {
		return { x: gui.editColor.getLeft(), y: gui.editColor.getTop() };
	}
});
