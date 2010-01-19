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

	calculateHandles: true,
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
		this.canvas = $('#cropper-canvas', this.cropper);
		this.image = $('#cropper-image', this.cropper);

		// Use asset to wait for image tio load in order to get load event either way
		Asset.image(this.image.getProperty('src'), {
			onLoad: function() {
				$('#cropper-loader', this.cropper).setStyle({ display: 'none' });
			}.bind(this)
		});

		this.buildButtons();
		this.buildSizePresets();
		this.buildOverlay();
		this.buildZoom();
		this.buildIndicator();

		this.setup();

		$window.addEvent('resize', function(e) {
			this.updateMasks();
			this.updateImageBounds();
		}.bind(this));
	},

	setupImage: function() {
		if (!this.image.size) {
			this.image.size = this.image.getSize();
			this.image.setStyle('position', 'absolute');
			this.image.aspectRatio = this.image.size.height / this.image.size.width;
		}

		var bounds = this.canvas.getBounds();
		var aspectRatio = bounds.height / bounds.width;
		// scale the image to fit within the wrapper only if it's larger than the wrapper
		var landscape = this.image.aspectRatio > aspectRatio;

		// scale the image to fit within the wrapper & crop area, if its larger than them;
		var width = bounds.width > this.crop.width ? bounds.width : this.crop.width;
		var height = bounds.height > this.crop.height ? bounds.height : this.crop.height;
		var scaledSize = {
			width: landscape ? width : (height / this.image.aspectRatio),
			height: landscape ? width * this.image.aspectRatio : height
		};

		if (scaledSize.width > this.image.size.width || scaledSize.height > this.image.size.height)
			scaledSize = this.image.size;

		this.setImageBounds(
			bounds.width / 2, bounds.height / 2,
			scaledSize.width, scaledSize.height
		);

		var crop = this.options.crop;
		this.setZoom(crop && crop.imageWidth
			? crop.imageWidth / this.image.size.width
			: crop && crop.imageHeight
				? crop.imageHeight / this.image.size.height
				: this.zoom || 1);
	},

	setup: function() {
		this.resize = this.options.resize === true
			? { width: true, height: true } : this.options.resize;

		this.crop = this.options.crop || this.options.min;
		// We need to setup image now for imageBounds
		this.setupImage();

		var width = this.options.min.width;
		var height = this.options.min.height;
		//center the crop on the canvas
		var crop = this.options.crop;
		if (crop) {
			this.cropArea.setBounds({
				width: crop.width, 
				height: crop.height,
				left: crop.x + this.imageBounds.left,
				top: crop.y + this.imageBounds.top
			});
		} else {
			this.cropArea.setBounds({
				width: width, 
				height: height,
				left: (this.canvas.getWidth() - width) / 2,
				top: (this.canvas.getHeight() - height) / 2
			});
		}
		this.current.crop = this.crop = this.cropArea.getBounds();
		this.setupHandles();
		this.updateMasks();
		this.updateHandles();
	},

	buildZoom: function() {
		this.zoomHandle = $('#cropper-slider-handle');
		this.sliderRange = 192;
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
		// find out the minimum zoom allowed by the croparea
		var aspectRatio = this.crop.height / this.crop.width;
		var landscape = this.image.aspectRatio > aspectRatio;
		var minZoom = (landscape ? this.crop.width : this.crop.height / this.image.aspectRatio) / this.image.size.width;
		if (zoom < minZoom) zoom = minZoom;
		this.zoom = zoom;

		this.zoomHandle.setLeft(zoom * this.sliderRange);

		this.setImageBounds(
			this.imageBounds.left + this.imageBounds.width / 2,
			this.imageBounds.top + this.imageBounds.height / 2,
			this.image.size.width * zoom,
			this.image.size.height * zoom
		);
	},

	setImageBounds: function(centerX, centerY, width, height) {
		width = Math.round(width);
		height = Math.round(height);
		var left = Math.round(centerX - width / 2);
		var top = Math.round(centerY - height / 2);
		this.imageBounds = {
			left: left, top: top,
			width: width, height: height
		};
		this.updateImageBounds();
	},

	updateImageBounds: function() {
		var bounds = this.imageBounds;
		var crop = this.crop;
		var keepInside = {
			x: bounds.width < crop.width,
			y: bounds.height < crop.height
		};

		// test the left edge
		if (bounds.left > crop.left || keepInside.x)
			bounds.left = crop.left;

		// test the top edge
		if (bounds.top > crop.top || keepInside.y)
			bounds.top = crop.top;

		// test the right edge
		if (!keepInside.x && ((bounds.left + bounds.width) < (crop.left + crop.width)))
			bounds.left = (crop.left + crop.width) - bounds.width;

		// test the bottom edge
		if (!keepInside.y && (bounds.top + bounds.height) < (crop.top + crop.height))
			bounds.top = (crop.top + crop.height) - bounds.height;

		bounds.right = bounds.left + bounds.width;
		bounds.bottom = bounds.top + bounds.height;

		this.image.setBounds(bounds);
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
		this.fireEvent('start', [this.image.src, this.current.crop, this.getCropInfo(), handle]);
	},

	dragEnd: function() {
		if (this.current.handle == 'nesw' && !this.options.showHandles)
			this.showHandles(true);
		this.crop = this.current.crop;
		this.fireEvent('end', [this.image.src, this.current.crop, this.getCropInfo()]);
	},

	drag: function(event) {
		var xdiff = this.current.x - event.page.x;
		var ydiff = this.current.y - event.page.y;

		var min = this.options.min;
		var crop = this.crop;
		var handle = this.current.handle;
		var keepInside = {
			x: this.imageBounds.width < crop.width,
			y: this.imageBounds.height < crop.height
		};

		var bounds = {};
		var dragging = handle.length > 2;

		if (handle.contains('s')) {
			if (keepInside.y || (crop.bottom - ydiff > this.imageBounds.bottom))
				ydiff = Math.round(crop.bottom - this.imageBounds.bottom); // box south
			if (!dragging) {
				if (crop.height - ydiff < min.height)
					ydiff = crop.height -  min.height; // size south
				bounds.height = crop.height - ydiff; // South handles only
			}
		}

		if (handle.contains('n')) {
			if (!keepInside.y && (crop.top - ydiff < this.imageBounds.top))
				ydiff = crop.top - this.imageBounds.top; //box north
			if (!dragging) {
				if (crop.height + ydiff <  min.height)
					ydiff = min.height - crop.height; // size north
				bounds.height = crop.height + ydiff; // North handles only
			}
			bounds.top = crop.top - ydiff; // both Drag and N handles
		}

		if (handle.contains('e')) {
			if (!keepInside.x && (crop.right - xdiff > this.imageBounds.right))
				xdiff = Math.round(crop.right - this.imageBounds.right); //box east
			if (!dragging) {
				if (crop.width - xdiff <  min.width)
					xdiff = crop.width -  min.width; // size east
				bounds.width = crop.width - xdiff;
			}
		}

		if (handle.contains('w')) {
			if (keepInside.x || (crop.left - xdiff < this.imageBounds.left))
				xdiff = Math.round(crop.left - this.imageBounds.left); //box west
			if (!dragging) {
				if (crop.width + xdiff <  min.width)
					xdiff =  min.width - crop.width; //size west
				bounds.width = crop.width + xdiff;
			}
			bounds.left = crop.left - xdiff; // both Drag and W handles
		}

		// update current crop
		var crop = Hash.merge({}, this.crop, bounds);
		crop.right = crop.left + crop.width;
		crop.bottom = crop.top + crop.height;
		this.current.crop = crop;

		this.cropArea.setBounds(bounds);
		this.updateMasks();
		this.updateHandles();
		this.fireEvent('move', [this.image.src, this.current.crop, this.getCropInfo()]);
	},

	dragImage: function(event) {
		this.imageBounds.left += event.delta.x;
		this.imageBounds.top += event.delta.y;
		this.updateImageBounds();
	},

	updateMasks: function() {
		if (!this.options.showMask)
			return;
		var size = this.canvas.getSize();
		var crop = this.current.crop;
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
		if (!this.calculateHandles)
			return;
		var crop = this.current.crop;
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
		this.calculateHandles = show;
		if (show)
			this.updateHandles();
		Base.each(this.handles, function(handle) {
			handle.setStyle({ display: show ? 'block' : 'none' });
		});
	},

	buildIndicator: function() {
		var indicator = this.canvas.injectTop('div', {
			styles: {
				position: 'absolute', display: 'none', zIndex: 1,
				padding: '4px', opacity: '.75',
				background: '#fdf2a4', border: '1px solid #bba82a'
			}
		});

		var setIndicator = function(imgsrc, crop, info) {
			indicator.setBounds({
				top: crop.bottom + 10,
				left: crop.left
			}).setText('w: '+ info.width + ' h: ' + info.height + ' x: ' + info.x + ' y: ' + info.y);
		};

		 // when dragging/resizing begins show indicator
		 this.addEvents({
			start: function(imgsrc, crop, info, handle) {
				indicator.setStyle({ display: 'block' });
				setIndicator(imgsrc, crop, info, handle);
			},

			move: function(imgsrc, crop, info) {
				setIndicator(imgsrc, crop, info);
			},

			end: function() {
				indicator.setStyle({ display: 'none' });
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
		this.wrapper = this.image.injectBefore('div', {
			styles: {
				position: 'absolute',
				width: '100%', height: '100%',
				overflow: 'hidden'
			},
			id: 'wrapper'
		});
		this.wrapper.injectInside(this.image);

		var events = {
			dragstart: this.dragStart.bind(this),
			drag: this.drag.bind(this),
			dragend: this.dragEnd.bind(this)
		};

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
				backgroundImage: 'url(/static/edit/css/assets/crop.gif)'
			}, style) });
		}, this);

		if (this.options.showMask) { // optional masks
			events.drag = this.dragImage.bind(this);
			this.masks = {};
			['n', 's', 'e' , 'w'].each(function(mask) {
				this.masks[mask] = this.wrapper.injectBottom('div', { styles: {
					position: 'absolute', overflow: 'hidden',
					backgroundColor: opts.maskColor, opacity: opts.maskOpacity
				}, id: mask, events: events });
				
			}, this);
		}
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
			width: crop.width,
			height: crop.height,
			x: crop.left - this.imageBounds.left,
			y: crop.top - this.imageBounds.top,
			imageWidth:  this.imageBounds.width,
			imageHeight: this.imageBounds.height,
			zoom: this.imageBounds.width / this.image.size.width
		}
	},

	getPreset: function() {
		return this.presets && this.options.presets[this.presets.getValue()];
	},

	removeOverlay: function() {
		this.wrapper.remove();
		this.image.setStyle({ display: 'block' });
	}
});