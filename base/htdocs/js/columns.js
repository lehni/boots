// Bootstrap Multi Columns Script, based on CSS3MultiColumn, a javascript
// implementation of the CSS3 multi-column module
// Copyright (c) 2005 Cdric Savarese <pro@4213miles.com>
// Licensed under the CC-GNU LGPL <http://creativecommons.org/licenses/LGPL/2.1/>

// Changes by Juerg Lehni, 2009

HtmlElement.inject(new function() {

	function isSplitable(node) {
		return /^(p|div|span|blockquote|address|pre|em|i|strong|b|cite|ol|ul)$/.test(node.getTag())
			&& !node.hasClass('nonbreakable');
	}

	// Find the deepest splitable element that sits on the split point.
	function findSplitPoint(node, height, wrapper, result) {
		if (!result)
			result = { start: node, min: Number.MAX_VALUE, max: 0 };
		if (node instanceof DomElement) {
			var bounds = node.getBounds(wrapper), top = bounds.top, bottom = bounds.bottom;
//		 	Browser.log(node, 'height', height, 'top', top, 'bottom', bottom);
			if (top < height && bottom > height) {
				if (node != result.start)
					result.first = node;
				if (isSplitable(node)) {
					node.getChildNodes().each(function(child) {
						findSplitPoint(child, height, wrapper, result);
					});
				}
			} else {
				if (bottom > height && bottom < result.min) {
					result.min = bottom;
					result.second = node;
				}
				if (bottom <= height && bottom >= result.max) {
					result.max = bottom;
					result.third = node;
				}
			}
		}
		return result;
	}

	function splitElement(node, height, col1, col2) {
		node = node;
		var child = node.getLastNode(), previous = null;
		// The + 2 is for tweaking.. allowing lines to fit more easily
		height += 2;
		while (child) {
			// If the child node is a text node
			if (child instanceof DomTextNode && !/^\s*$/.test(child.getText())) {
				var stripped = ' ';
				var right = '';
				var all = node.getText();
				for (var i = 0; stripped && node.getHeight() > height; i++) {
					// In order to speed up processing, make a first guess at
					// where to split the text, just based on character count.
					var length = all.length - Math.ceil(all.length * height / node.getHeight());
					var left = child.getText();
					var pos = Math.max(0, left.length - length - 1);
					// Remove trailing white space, since we're matching non-white
					// in backward loop.
					var start = pos -= left.substring(0, pos).match(/([\s-]*)$/)[1].length;
					// Depending on the prediction, either one or the other of
					// the following loops is needed.
					// Now first go backwards until the height fits.
					while (true) {
						var str = left.substring(0, pos);
						child.setText(str);
						// Find the previous word using regexp, including whitespace.
						var word = (str.match(/([\s-]*[^\s-]*)$/) || [])[1];
						// Force the first shift by comparing with start,
						// since it also corrects breaks in the middle of words...
						if (!word || pos != start && node.getHeight() < height)
							break;
						pos -= word.length;
					}
					var next = pos;
					// Now go forward until the height is filled.
					while (true) {
						child.setText(left.substring(0, next));
						// Find the next word using regexp, including whitespace.
						var word = (left.substring(next).match(/^([^\s-]*[\s-])/) || [])[1];
						if (!word || node.getHeight() >= height)
							break;
						pos = next;
						next += word.length;
					}
					stripped = left.substring(pos);
					// Now see how much higher appending the full text would make the node.
					// If it's only one line, do it, in order to avoid widows.
					// We're already one line thicker right now, due to the loop above
					// (the last word made the node grow), so just compare with that.
					// But do not append it if it only contains white space, since it
					// be needed for layout (e.g. \n).
					var curHeight = node.getHeight();
					child.setText(left);
					if (node.getHeight() == curHeight && !/^\s*$/.test(stripped))
						break;
					right = stripped + right;
					child.setText(left.substring(0, pos));
				}
				if (right)
					createAncestors(child, col1, col2, 'top').prependText(right);
				if (!child.getText()) {
					child.remove();
					previous = null;
				} else {
					// Remove unused breaks at the beginning of columns.
					if (previous && previous.getTag() == 'br')
						previous.remove();
					break;
				}
			} else if (node.getHeight() > height) {
				previous = child;
				// Move element
				createAncestors(child, col1, col2, 'top').injectTop(child.remove());
			} else {
				break;
			}
			child = node.getLastNode();
		}
	}

	// method = 'top' / 'bottom', relative to col2
	function createAncestors(node, col1, col2, method) {
		var ancestors = [], p = node.getParentNode();
		while (node != col1 && p && p != col1) {
			ancestors.push(p);
			p = p.getParentNode();
		}
		var elem = col2;
		for (var i = ancestors.length - 1; i >= 0; i--) {
			var ancestor = ancestors[i];
			// Search previous ancestor...
			var found = elem.getChildNodes().find(function(child) {
				if (child.ancestor == ancestor)
					return child;
			});
			if (!found) {
				// Ancestor node not found, needs to be created.
				elem = elem['inject' + method.capitalize()](
						ancestor.getTag()).set('className', ancestor.getClass());
				elem.ancestor = ancestor;
				if (/^(ul|ol)$/.test(elem.getTag()) 
						&& node instanceof HtmlElement && node.getTag() == 'li')
					elem.start = node.getAllPrevious('li').length;
			} else {
				elem = found;
				// happens if the tag was created while processing a text node.
				if (/^(ul|ol)$/.test(elem.getTag()) && elem.start == 1 
						&& node instanceof HtmlElement && node.getTag() =='li')
					elem.start = node.getAllPrevious('li').length;
			}
		}
		return elem;
	}

	function process(elem, param) {
		var count = param.count || 2;
		var gap = Base.pick(param.gap, 15);
		var width = width || (elem.getStyle('width').toInt() - (gap * (count - 1))) / count;
		// Create a wrapper
		var wrapper = elem.injectBefore('div', {
			className: elem.getClass()
		});
		// Insert element first, clear div after. Can't chain with above
		// since injectbottom returns newly created items rather than this.
		wrapper.injectBottom(
			elem.set({
				className: '',
				width: width,
				styles: { float: 'left' }
			}),
			'div', { text: '', styles: { clear: 'left' }}
		);

		// Compute Desired Height.
		var height = Math.ceil(elem.getHeight() / count);

		var start = elem, orig = elem.getHtml(), cols = new HtmlElements();
		for (var i = 1; i < count && elem; i++) {
			// Create New Column
			var col = elem.clone().setStyle('paddingLeft', gap);
			elem.injectAfter(col);
			cols.push(col);

			// Find the split point (a child element, sitting on the column split point)
			var splits = findSplitPoint(elem, height, wrapper);
			var split = splits.first || splits.second || splits.third;
			// TODO: diff can come from findSplitPoint, where it is calculated?
			var bounds = split.getBounds(wrapper), splitable = isSplitable(split);
			// Browser.log('Splitting', split.getText().trim().substring(0, 100));
			createAncestors(split, elem, col, 'bottom');
			// Move all elements after the element to be splitted (split) to the new column
			var ref = split;
			while (ref && ref != elem) {
				// If the element is not splittable, move it over here fully too
				var next = ref == split && !splitable ? ref : ref.getNext();
				ref = ref.getParent();
				while (next) {
					var child = next;
					next = next.getNext();
					createAncestors(child, elem, col, 'bottom').appendChild(child);
				}
			}
			if (splitable)
				splitElement(split, height - bounds.top, elem, col);
			var h = Math.max(elem.getHeight(), col.getHeight());
			// Browser.log(h, bounds.bottom);
			if (start && h >= bounds.bottom) {
				// Browser.log('Restart ', elem.getText().trim());
				// Detected better layout approach, change height and restart
				cols.remove();
				col = start;
				col.setHtml(orig);
				// Restart once, but avoid restart loops
				start = null;
				height = bounds.bottom;
				i = 0;
			}
			// Move on to split the newly added column
			elem = col;
		}
		return wrapper;
	}

	return {
		columns: function(param) {
			return process(this, param);
		}
	}
});
