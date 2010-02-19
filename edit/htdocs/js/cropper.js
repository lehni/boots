/**
 * Based on MooCrop (v. rc-1 - 2007-10-24 )
 *
 * @version			rc-1
 * @license			BSD-style license
 * @author			nwhite - < nw [at] nwhite.net >
 * @infos			http://www.nwhite.net/MooCrop/
 * @copyright		Author
 */

// TODO: create all handles (n/w/s/e etc) and disable if resize changes..

Cropper = Base.extend(Chain, Callback, {
	current: {},
	options: {
		min: { width: 50, height: 50 },
		cropperSize: { width: 500, height: 500 },
		resize: true, // boolean or { width: boolean, height: boolean }
		showMask: true, // false to remove, helps on slow machines
		showHandles: false, // hide handles on drag
		maxZoom: 1,
		//TODO: add ratio?

		maskColor: 'black',
		maskOpacity: 0.4,

		handleColor: '#ccc',
		handleBorder: '1px solid #000',
		handleOpacity: 0.75,
		handleSize: 7,

		cropColor: null,
		cropOpacity: 0.75
	},

	initialize: function(options) {
		this.setOptions(options);

		this.cropper = $('#cropper');
		this.canvas = $('cropper-canvas', this.cropper);
		this.footer = $('cropper-footer', this.cropper);
		this.image = $('#cropper-image', this.cropper);
		this.image.setStyle({ display: 'none' });

		this.buildButtons();
		this.buildSizePresets();
		this.buildOverlay();
		this.buildZoom();
		this.buildIndicator();

		this.canvas.setStyle('bottom', this.footer.getHeight());

		// Use asset to wait for image tio load in order to get load event either way
		Asset.image(this.image.getProperty('src'), {
			onLoad: function() {
				$('#cropper-loader', this.cropper).setStyle({ display: 'none' });
				this.image.setStyle({ display: 'block' });
				this.setup();
			}.bind(this)
		});

		$window.addEvent('resize', function(e) {
			this.setZoom(this.image.scale);
		}.bind(this));
	},

	setupImage: function() {
		var size = this.image.size;
		if (!size)
			size = this.image.size = this.image.getSize();
		this.imageBounds = size;
		var crop = this.options.crop;
		this.scrollCanvas(
			crop && (crop.left + crop.width / 2) || size.width / 2,
			crop && (crop.top + crop.height / 2) || size.height / 2);
		this.setZoom(crop && (crop.imageScale 
			|| crop.imageWidth && crop.imageWidth / size.width
			|| crop.imageHeight && crop.imageHeight / size.height)
			|| this.image.scale || 1);
	},

	setup: function() {
		this.resize = this.options.resize === true
			? { width: true, height: true } : this.options.resize;

		this.crop = this.options.crop || this.options.min;
		// We need to setup image now for imageBounds
		this.setupImage();
		this.setupHandles();

		var crop = this.options.crop;
		if (crop) {
			crop = {
				left: crop.x, top: crop.y,
				width: crop.width, height: crop.height
			};
		} else {
			// Center the minimum crop size the image
			var min = this.options.min;
			crop = {
				left: (this.imageBounds.width - min.width) / 2,
				top: (this.imageBounds.height - min.height) / 2,
				width: min.width, height: min.height
			};
		}
		this.setCrop(crop);
		this.crop = this.current.crop;
	},

	buildZoom: function() {
		this.zoomHandle = $('#cropper-slider-handle');
		this.sliderRange = 200;
		this.minZoom = 0;
		this.maxZoom = this.options.maxZoom;
		this.zoomHandle.addEvents({
			dragstart: function(event) {
				this.zoomOffset = this.zoomHandle.getLeft() - event.page.x;
			}.bind(this),
			drag: function(event) {
				var pos = Math.max(0, Math.min(1, (event.page.x + this.zoomOffset) / this.sliderRange));
				this.setZoom(pos * (this.maxZoom - this.minZoom) + this.minZoom);
			}.bind(this)
		});
	},

	setZoom: function(zoom) {
		// Find out the minimum zoom allowed by the croparea
		var minZoom = Math.max(
			this.crop.width / this.image.size.width,
			this.crop.height / this.image.size.height); 
		if (zoom < minZoom) zoom = minZoom;
		this.image.scale = zoom;
		// Even if the zoom is bigger than 1 (in case the image had to be scaled
		// to allow the crop area to fit), crop to 1 for the slider, which won't
		// be able to move in this case.
		if (zoom > 1)
			zoom = 1;
		this.zoomHandle.setLeft(zoom * this.sliderRange);
		var width = this.image.size.width * this.image.scale;
		var height = this.image.size.height * this.image.scale;
		var factor = width / this.imageBounds.width;
		var size = size = this.canvas.getSize();
		// Center image warpper on canvas
		this.wrapper.setOffset(Math.max(0, (size.width - width) / 2), Math.max(0, (size.height - height) / 2));
		this.imageBounds = { width: width, height: height };
		this.image.setSize(width, height);
		// Adjust scrolling
		var offset = this.canvas.getScrollOffset();
		var x = offset.x + size.width / 2, y = offset.y + size.height / 2;
		this.scrollCanvas(x * factor, y * factor);
		var crop = this.current.crop;
		if (crop) {
			crop.left = (crop.left + crop.width / 2) * factor - crop.width / 2;
			crop.top = (crop.top + crop.height / 2) * factor - crop.height / 2;
			this.setCrop(crop);
		}
	},

	scrollCanvas: function(x, y) {
		var size = this.canvas.getSize();
		this.canvas.setScrollOffset(x - size.width / 2, y - size.height / 2);
	},

	dragStart: function(event, handle) {
		this.current = {
			x: event.page.x,
			y: event.page.y,
			handle: handle,
			crop: this.current.crop
		};
		if (handle == 'nesw' && !this.options.showHandles)
			this.showHandles(false);
		this.fireEvent('start', [this.current.crop, this.getCropInfo(), handle]);
	},

	dragEnd: function() {
		if (this.current.handle == 'nesw' && !this.options.showHandles)
			this.showHandles(true);
		this.crop = this.current.crop;
		this.fireEvent('end', [this.current.crop, this.getCropInfo()]);
	},

	drag: function(event) {
		var min = this.options.min;
		var handle = this.current.handle;

		var resizing = handle.length <= 2;
		var xdiff = this.current.x - event.page.x;
		var ydiff = this.current.y - event.page.y;

		var crop = Base.clone(this.crop);
		if (handle.contains('n')) {
			if (resizing)
				crop.height += ydiff; // North handles only
			crop.top -= ydiff; // both drag and north handles
		}
		if (handle.contains('s')) {
			if (resizing)
				crop.height -= ydiff; // South handles only
		}
		if (handle.contains('w')) {
			if (resizing)
				crop.width += xdiff;
			crop.left -= xdiff; // both drag and west handles
		}
		if (handle.contains('e')) {
			if (resizing)
				crop.width -= xdiff;
		}
		this.setCrop(crop, resizing);
		this.fireEvent('move', [this.current.crop, this.getCropInfo()]);
	},

	dragImage: function(event) {
	},

	setCrop: function(crop, resizing) {
		crop.right = crop.left + crop.width;
		crop.bottom = crop.top + crop.height;
		var min = this.options.min;
		if (crop.width < min.width) {
			crop.width = min.width;
			crop.right = crop.left + min.width;
		}
		if (crop.height < min.height) {
			crop.height = min.height;
			crop.bottom = crop.top + min.height;
		}
		if (crop.left < 0) {
			crop.left = 0;
			if (resizing)
				crop.width = crop.right;
			else
				crop.right = crop.width;
		}
		if (crop.top < 0) {
			crop.top = 0;
			if (resizing)
				crop.height = crop.bottom;
			else
				crop.bottom = crop.height;
		}
		if (crop.right >= this.imageBounds.width) {
			crop.right = this.imageBounds.width;
			if (resizing)
				crop.width = crop.right - crop.left;
			else
				crop.left = crop.right - crop.width;
		}
		if (crop.bottom >= this.imageBounds.height) {
			crop.bottom = this.imageBounds.height;
			if (resizing)
				crop.height = crop.bottom - crop.top;
			else
				crop.top = crop.bottom - crop.height;
		}
		this.cropArea.setBounds(crop);
		this.current.crop = crop;
		this.updateMasks();
		this.updateHandles();
	},

	updateMasks: function() {
		if (!this.options.showMask)
			return;
		var crop = this.current.crop || this.crop;
		var size = this.imageBounds;
		this.masks.n.setSize(size.width, Math.max(0, crop.top));
		this.masks.s.setBounds({
			top: crop.bottom,
			width: size.width,
			height: Math.max(0, size.height - crop.bottom)
		});
		this.masks.e.setBounds({
			left: crop.right, top: crop.top,
			width: Math.max(0, size.width - crop.right),
			height: crop.height
		});
		this.masks.w.setBounds({
			top: crop.top,
			width: Math.max(0, crop.left),
			height: crop.height
		});
	},

	updateHandles: function() {
		var crop = this.current.crop || this.crop;
		var size = Math.ceil(this.options.handleSize / 2);
		if (this.resize.height) {
			this.handles.n.setOffset(crop.width / 2 - size, -size);
			this.handles.s.setOffset(crop.width / 2 - size, crop.height - size - 1);
		}
		if (this.resize.width) {
			this.handles.e.setOffset(crop.width - size - 1, crop.height / 2 - size);
			this.handles.w.setOffset(-size, crop.height / 2 - size);
		}
		if (this.resize.width && this.resize.height) {
			this.handles.ne.setOffset(crop.width - size - 1, - size);
			this.handles.se.setOffset(crop.width - size - 1, crop.height - size - 1);
			this.handles.sw.setOffset(-size, crop.height - size - 1);
			this.handles.nw.setOffset(-size, -size);
		}
	},

	showHandles: function(show) {
		if (show)
			this.updateHandles();
		Base.each(this.handles, function(handle) {
			handle.setStyle({ display: show ? 'block' : 'none' });
		});
	},

	buildIndicator: function() {
		var indicator = this.wrapper.injectTop('div', {
			text: '.',
			id: 'cropper-indicator',
			styles: { opacity: '.75' }
		});
		var distance = 10, scrollBarSize = 16;
		var height = indicator.getHeight() + distance;
		indicator.setStyle('display', 'none');

		var update = function(crop, info) {
			indicator.setOffset(crop.left,
				crop.bottom < this.canvas.getScrollOffset().y + this.canvas.getHeight() - height - scrollBarSize
					? crop.bottom + distance
					: crop.top - height)
				.setText('w:\xa0' + info.width + '\xa0h:\xa0' + info.height + '\xa0x:\xa0' + info.x + '\xa0y:\xa0' + info.y);
		}.bind(this);

		 // When dragging/resizing begins show indicator
		 this.addEvents({
			start: function(crop, info, handle) {
				indicator.setStyle('display', 'block');
				update(crop, info);
			},

			move: function(crop, info) {
				update(crop, info);
			},

			end: function() {
				indicator.setStyle('display', 'none');;
			 }
		 });
	},

	buildButtons: function() {
		$('#cropper-ok').addEvent('click', function() {
			if (!this.onOK || this.onOK())
				$window.close();
		}.bind(this));

		$('#cropper-cancel').addEvent('click', function() {
			$window.close();
		});

		$('#cropper-reset').addEvent('click', function() {
			// TODO: Implement
		});

	},

	buildSizePresets: function() {
		if (this.options.presets) {
			this.presets = $('#cropper-buttons').injectBottom('select', {
				id: 'presets',
				events: {
					change: function() {
						var preset = this.getPreset();
						if (preset) {
							if (preset.resize)
								this.options.resize = preset.resize;
							this.options.min = preset;
							this.setup();
						}
					}.bind(this)
				}
			});
			this.presets.injectBottom('option', { text: 'Presets', value: '' });
			this.options.presets.each(function(preset, i) {
				this.presets.injectBottom('option', {
					text: preset.name,
					value: i,
					selected: !!preset.selected
				});
			}, this);
		}
	},

	buildOverlay: function() {
		var opts = this.options;
		this.wrapper = this.image.wrap('div', {
			styles: { position: 'absolute' }
		});

		var events = {
			dragstart: this.dragStart.bind(this),
			drag: this.dragImage.bind(this),
			dragend: this.dragEnd.bind(this)
		};

		if (this.options.showMask) { // optional masks
			this.masks = {};
			['n', 's', 'e' , 'w'].each(function(mask) {
				this.masks[mask] = this.wrapper.injectBottom('div', { styles: {
					position: 'absolute', overflow: 'hidden',
					backgroundColor: opts.maskColor, opacity: opts.maskOpacity
				}, id: mask, events: events });
				
			}, this);
		}

		events.drag = this.drag.bind(this);

		this.cropArea = this.wrapper.injectBottom('div', {
			style: {
				position: 'absolute', cursor: 'move', opacity: opts.cropOpacity
			},
			events: Hash.merge({}, events, {
				dragstart: function(e) {
					this.dragStart(e, 'nesw');
				}.bind(this)
			})
		});

		this.handles = {};
		['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'].each(function(handle) {
			this.handles[handle] = this.cropArea.injectTop('div', {
				style: {
					position: 'absolute', overflow: 'hidden', cursor: handle + '-resize',
					backgroundColor: opts.handleColor, border: opts.handleBorder, 
					opacity: opts.handleOpacity, width: opts.handleSize, height: opts.handleSize
				},
				events: Hash.merge({}, events, {
					dragstart: function(e) {
						this.dragStart(e, handle);
					}.bind(this)
				})
			});
		}, this);

		// Marching Ants
		this.sides = {};
		Base.each({
			n: { top: 0, left: 0, width: '100%' },
			e: { top: 0, right: 0, height: '100%' },
			s: { bottom: 0, left: 0, width: '100%' },
			w: { top: 0, left: 0, height: '100%' }
		}, function(style, side) {
			this.sides[side] = this.cropArea.injectTop('div', { styles: Hash.merge({
				position: 'absolute', width: 1, height: 1, overflow: 'hidden', zIndex: 1,
				backgroundImage: 'url(/static/edit/css/assets/cropper-ants' + (/[ne]/.test(side) ? '' : '-reverse') + '.gif)'
			}, style) });
		}, this);
	},

	setupHandles: function() {
		var handles = [];
		if (this.resize.width) handles.push('e', 'w');
		if (this.resize.height) handles.push('s', 'n');
		if (this.resize.height && this.resize.width)
			handles.push('ne', 'se', 'sw', 'nw');
		['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'].each(function(name) {
			this.handles[name].setStyle({ visibility: handles.contains(name) ? 'visible': 'hidden' });
		}, this);
	},

	getCropInfo: function() {
		var crop = this.current.crop;
		return {
			width: Math.round(crop.width),
			height: Math.round(crop.height),
			x: Math.round(crop.left),
			y: Math.round(crop.top),
			imageWidth:  Math.round(this.imageBounds.width),
			imageHeight: Math.round(this.imageBounds.height),
			imageScale: this.image.scale
		}
	},

	getPreset: function() {
		return this.presets && this.options.presets[this.presets.getValue()];
	}
});