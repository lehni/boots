// Tab Pane 1.02, Created by Erik Arvidsson, http://webfx.eae.net/
// Adapted and optimized by Juerg Lehni for Lineto.com, 2003-2007
// TODO: Convert to Bootstrap _class mechanism

TabPane = Base.extend({
	initialize: function(el) {
		this.element = el;
		el.tabPane = this;
		this.pages = [];
		this.tabRow = el.getFirst();
		var tabIndex = 0;
		this.selectedIndex = tabIndex;
		$$('.tab-page', el).each(function(c) {
			this.addTabPage(c);
		}, this);
	},
	
	setSelectedIndex: function(n) {
		var current = this.selectedIndex;
		if (current != n) {
			if (current != null && this.pages[current])
				this.pages[current].show(false);
			if (this.pages[n]) {
				this.selectedIndex = n;
				this.pages[n].show(true);
				return true;
			}
		}
		return false;
	},
	
	getSelectedIndex: function() {
		return this.selectedIndex;
	},

	addTabPage: function(el) {
		if (el.tabPage == this)
			return el.tabPage;
		var index = this.pages.length;
		var page = this.pages[index] = new TabPage(el, this, index);
		this.tabRow.appendChild(page.tab);
		page.show(index == this.selectedIndex);
		return page;
	},
	
	statics: {
		setup: function() {
			var tabs = [];
			$$('div.tab-pane').each(function(el) {
				if (!el.tabPane)
					tabs.push(new TabPane(el));
			});
			$$('div.tab-page').each(function(el) {
				if (!el.tabPage && el.getParent().tabPane)
					tabs.push(new TabPane(el));
			});
			// Hide tab if there's only one
			tabs.each(function(p) {
				if (p.pages.length == 1)
					p.pages[0].tab.addClass('hidden');
			});
		}
	}
});

TabPage = Base.extend({
	initialize: function(el, tabPane, nIndex) {
		this.element = el;
		this.element.tabPage = this;
		this.tabPane = tabPane;
		this.index = nIndex;
		this.tab = $('.tab', el);
		this.anchor = new HtmlElement('a', { href: '#' });
		this.tab.getChildNodes().insertInside(this.anchor);
		this.tab.appendChild(this.anchor);
		var that = this;
		this.tab.addEvents({
			click: function(event) { that.select(); event.stop(); },
			mouseover: function() { that.tab.addClass('hover'); },
			mouseout: function() { that.tab.removeClass('hover'); }
		});
	},

	show: function(visible) {
		this.tab.modifyClass('selected', visible);
		this.element.modifyClass('hidden', !visible);
	},

	select: function() {
		this.tabPane.setSelectedIndex(this.index);
	}
});