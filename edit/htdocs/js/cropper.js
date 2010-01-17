/***
 * MooCrop (v. rc-1 - 2007-10-24 )
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
		maskColor: 'black',
		maskOpacity: 0.4,
		handleColor: 'blue',
		handle: { width: 8, height: 8 },
		cropBorder: '1px dashed blue',
		min: { width: 50, height: 50 },
		showMask: true, // false to remove, helps on slow machines
		showHandles: false, // hide handles on drag
		maxZoom: 1,
		//TODO: add ratio?
		resize: true, // boolean or { width: boolean, height: boolean }
		cropperSize: { width: 500, height: 500 } //
	},

	initialize: function(options) {
		this.setOptions(options);

		this.boderWidth = this.options.cropBorder.toInt();

		this.element = $('#cropper');
		this.canvas = $('#cropper-canvas', this.element);
		this.image = $('#cropper-image', this.element);

		this.element.setStyles({
			display: 'block',
			height: this.options.cropperSize.height,
			width: this.options.cropperSize.width
		});

		// Use asset to wait for image tio load in order to get load event either way
		Asset.image(this.image.getProperty('src'), {
			onLoad: function() {
				$('#cropper-loader', this.element).setStyle({ display: 'none' });
			}.bind(this)
		});

		this.buildButtons();
		this.buildSizePresets();
		this.buildOverlay();
		this.buildZoom();
		this.buildIndicator();

		var panelHeight = $('#cropper-background').getHeight();

		this.canvas.setHeight(this.options.cropperSize.height - panelHeight);

		this.setup();
		this.setZoomSlidePosition();

		$window.addEvent('resize', function(e) {
			var size = $window.getSize();
			this.canvas.setHeight(size.height - panelHeight);
			this.element.setSize(size);
			var event = { page: { x: size.width, y: size.height }};
			this.activate(event, 'NESW');
			this.resizeFunc(event);
			this.removeFunc();
			this.moveImage();
		}.bind(this));
	},

	setupImage: function() {
		if (!this.originalSize) {
			this.originalSize = this.image.getSize();
			this.image.setStyle('position', 'absolute');
			this.image.aspectRatio = this.originalSize.height / this.originalSize.width;
		}

		var wrapperBounds = this.wrapper.getBounds();
		var aspectRatio = wrapperBounds.height / wrapperBounds.width;
		// scale the image to fit within the wrapper only if it's larger than the wrapper
		var landscape = this.image.aspectRatio > aspectRatio;

		// scale the image to fit within the wrapper & crop area, if its larger than them;
		var width = wrapperBounds.width > this.crop.width ? wrapperBounds.width : this.crop.width;
		var height = wrapperBounds.height > this.crop.height ? wrapperBounds.height : this.crop.height;
		var scaledSize = {
			width: landscape ? width : height / this.image.aspectRatio,
			height: landscape ? width * this.image.aspectRatio : height
		};

		if (scaledSize.width > this.originalSize.width && scaledSize.height > this.originalSize.height)
			scaledSize = this.originalSize;

		this.setImageBounds(
			wrapperBounds.width / 2, wrapperBounds.height / 2,
			scaledSize.width, scaledSize.height
		);
	},

	setup: function() {
		var handle = this.options.handle;
		this.handleOffset = { width: handle.width / 2, height: handle.height / 2 };
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
				left: (crop.left || crop.x) + this.imageBounds.left,
				top: (crop.top || crop.y) + this.imageBounds.top
			});
		} else {
			this.cropArea.setBounds({
				width: width, 
				height: height,
				left: (this.canvas.getWidth() - width) / 2,
				top: (this.canvas.getHeight() - height) / 2
			});
		}
		this.current.crop = this.crop = this.getCropArea();
		this.drawMasks();
		this.positionHandles();
	},

	buildZoom: function() {
		this.zoomHandle = $('#cropper-slider-handle');
		this.sliderRange = 192;
		this.minZoom = 0;
		this.maxZoom = this.options.maxZoom;
		this.zoomHandle.addEvent('drag', function(event) {
			this.zoomHandleDrag(event);
		}.bind(this));
	},

	setZoomSlidePosition: function() {
		var currentZoom = this.imageBounds.width / this.originalSize.width;
		this.zoomHandle.setStyle({
			left: Math.max(0, this.sliderRange * currentZoom)
		});
	},

	zoomHandleDrag: function(event) {
		var curLeft = this.zoomHandle.getStyle('left').toInt();
		var x = Math.max(0, Math.min(this.sliderRange, curLeft + event.delta.x));

		// find out the minimum zoom allowed by the croparea
		this.crop.aspectRatio = this.crop.height / this.crop.width;
		var landscape = this.image.aspectRatio > this.crop.aspectRatio;
		var minZoom = (landscape ? this.crop.width : this.crop.height / this.image.aspectRatio) / this.originalSize.width;

		// zoom the image in and out around its center.
		var curSliderPos = x / this.sliderRange;
		var zoom = ((curSliderPos * (this.maxZoom - this.minZoom)) + this.minZoom);

		if (zoom < minZoom) zoom = minZoom;

		this.zoomHandle.setOffset({
			x: zoom * this.sliderRange
		});

		this.setImageBounds(
			this.imageBounds.left + this.imageBounds.width / 2,
			this.imageBounds.top + this.imageBounds.height / 2,
			this.originalSize.width * zoom,
			this.originalSize.height * zoom
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
			x: this.imageBounds.width < crop.width,
			y: this.imageBounds.height < crop.height
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

	getCropArea: function() {
		var crop = this.cropArea.getBounds();
		crop.left -= this.offsets.x;
		crop.right -= this.offsets.x; // calculate relative (horizontal)
		crop.top -= this.offsets.y;
		crop.bottom  -= this.offsets.y; // calculate relative (vertical)
		return crop;
	},

	activate: function(event, handle) {
		this.current = {
			x: event.page.x,
			y: event.page.y,
			handle: handle,
			crop: this.current.crop
		};
		if (this.current.handle == 'NESW' && !this.options.showHandles) this.hideHandles();
		this.fireEvent('start', [this.image.src, this.current.crop, this.getCropInfo(), handle]);
	},

	removeFunc: function() {
		if (this.current.handle == 'NESW' && !this.options.showHandles) this.showHandles();
		this.crop = this.current.crop;
		this.fireEvent('complete', [this.image.src, this.current.crop, this.getCropInfo()]);
	},

	moveImage: function(event) {
		if (event) {
			this.imageBounds.left += event.delta.x;
			this.imageBounds.top += event.delta.y;
		}
		this.updateImageBounds();
	},

	resizeFunc: function(event) {
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

		if (handle.contains('S')) {//SOUTH
			if (keepInside.y || (crop.bottom - ydiff > this.imageBounds.bottom))
				ydiff = Math.round(crop.bottom - this.imageBounds.bottom); // box south
			if (!dragging) {
				if (crop.height - ydiff < min.height)
					ydiff = crop.height -  min.height; // size south
				bounds.height = crop.height - ydiff; // South handles only
			}
		}

		if (handle.contains('N')) {//NORTH
			if (!keepInside.y && (crop.top - ydiff < this.imageBounds.top))
				ydiff = crop.top - this.imageBounds.top; //box north
			if (!dragging) {
				if (crop.height + ydiff <  min.height)
					ydiff = min.height - crop.height; // size north
				bounds.height = crop.height + ydiff; // North handles only
			}
			bounds.top = crop.top - ydiff; // both Drag and N handles
		}

		if (handle.contains('E')) {//EAST
			if (!keepInside.x && (crop.right - xdiff > this.imageBounds.right))
				xdiff = Math.round(crop.right - this.imageBounds.right); //box east
			if (!dragging) {
				if (crop.width - xdiff <  min.width)
					xdiff = crop.width -  min.width; // size east
				bounds.width = crop.width - xdiff;
			}
		}

		if (handle.contains('W')) {//WEST
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

		// TODO: Add boderWidth to left / top?
		bounds.width -= this.boderWidth * 2;
		bounds.height -= this.boderWidth * 2;
		this.cropArea.setBounds(bounds);
		this.drawMasks();
		this.positionHandles();
		this.fireEvent('change', [this.image.src, this.current.crop, this.getCropInfo()]);
	},

	drawMasks: function() {
		if (!this.options.showMask)
			return;

		var size = this.canvas.getSize();
		var crop = this.current.crop;

		this.wrapper.setSize(size);

		this.north.setSize(size.width, Math.max(0, crop.top));

		this.south.setSize(size.width, Math.max(0, size.height - crop.bottom));

		this.east.setBounds({
			left: crop.right,
			top: crop.top,
			width: Math.max(0, size.width - crop.right),
			height: crop.height
		});

		this.west.setBounds({
			top: crop.top,
			width: Math.max(0, crop.left),
			height: crop.height
		});
	},

	positionHandles: function() {
		if (!this.calculateHandles)
			return;
		var crop = this.current.crop;
		var offset = this.handleOffset;

		if (this.options.resize === true || this.options.resize.height) {
			this.handles.N.setOffset(crop.width / 2 - offset.width, - offset.height);
			this.handles.S.setOffset(crop.width / 2 - offset.width, crop.height - offset.height);
		}

		if (this.options.resize === true || this.options.resize.width) {
			this.handles.E.setOffset(crop.width - offset.width, crop.height / 2 - offset.height);
			this.handles.W.setOffset(-offset.width, crop.height / 2 - offset.height);
		}

		if (this.options.resize === true || this.options.resize.width && this.options.resize.height) {
			this.handles.NE.setOffset(crop.width - offset.width, - offset.height);
			this.handles.SE.setOffset(crop.width - offset.width, crop.height - offset.height);
			this.handles.SW.setOffset(-offset.width, crop.height - offset.height);
			this.handles.NW.setOffset(-offset.width, -offset.height);
		}
	},

	hideHandles: function() {
		this.calculateHandles = false;
		this.handles.each(function(handle) {
			handle.setStyle({ display: 'none' });
		});
	},

	showHandles: function() {
		this.calculateHandles = true;
		this.positionHandles();
		this.handles.each(function(handle) {
			handle.setStyle({ display: 'block' });
		});
	},

	buildIndicator: function() {
		var indicator = this.element.injectTop('span', {
			styles: {
				position: 'absolute',
				display: 'none',
				padding: '4px',
				opacity: '.7',
				background: '#ffffff',
				border: '1px solid #525252',
				fontSize: '11px',
				zIndex: 40
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

			change: function(imgsrc, crop, info) {
				setIndicator(imgsrc, crop, info);
			},

			complete: function() {
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
							this.setZoomSlidePosition();
							this.showHideHandles();
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
				position: 'relative',
				width: this.canvas.getWidth(),
				height: this.canvas.getHeight(),
				overflow: 'hidden'
			},
			id: 'wrapper'
		});

		this.wrapper.injectInside(this.image);

		this.offsets = {
			x: this.wrapper.getLeft(),
			y: this.wrapper.getTop()
		};

		if (this.options.showMask) {		// optional masks
			var maskStyles = {
				position: 'absolute',
				overflow: 'hidden',
				backgroundColor: opts.maskColor,
				opacity: opts.maskOpacity
			};

			var dragFunctions = {
				dragstart: function(e) {
					this.activate(e, 'image');
				}.bind(this),
				drag: function(e) {
					this.moveImage(e);
				}.bind(this),
				dragend: function () {
					this.removeFunc();
				}.bind(this)
			};

			this.north = this.wrapper.injectBottom('div', { styles: maskStyles, id: 'north', events: dragFunctions });
			this.south = this.wrapper.injectBottom('div', { styles: Hash.merge({  bottom: 0 }, maskStyles), id: 'south', events: dragFunctions });
			this.east = this.wrapper.injectBottom('div', { styles: maskStyles, id: 'east', events: dragFunctions });
			this.west = this.wrapper.injectBottom('div', { styles: maskStyles, id: 'west', events: dragFunctions });
		}

		this.cropArea = this.wrapper.injectBottom('div', {
			style: {
				position: 'absolute',
				top: 0,
				left: 0,
				border: opts.cropBorder,
				cursor: 'move'
			},

			events: {
				dblclick: function() {
					this.fireEvent('dblClk', [this.image.src, this.current.crop, this.getCropInfo()]);
				}.bind(this),
				dragstart: function(e) {
					this.activate(e, 'NESW');
				}.bind(this),
				drag: function(e) {
					this.resizeFunc(e);
				}.bind(this),
				dragend: function () {
					this.removeFunc();
				}.bind(this)
			}
		});

		this.handles = new Hash();
		['N','NE','E','SE','S','SW','W','NW'].each(function(handle) {
			this.handles[handle] = this.cropArea.injectTop('div', {
				style: {
					position: 'absolute',
					backgroundColor: opts.handleColor, 
					width: opts.handle.width,
					height: opts.handle.height,
					overflow: 'hidden',
					cursor: handle.toLowerCase() + '-resize'
				},
				events: {
					dragstart: function(e) {
						this.activate(e, handle);
					}.bind(this),
					drag: function(e) {
						this.resizeFunc(e);
					}.bind(this),
					dragend: function () {
						this.removeFunc();
					}.bind(this)
				}
			});
		}, this);
		this.showHideHandles();
	},

	showHideHandles: function() {
		['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].each(function(handleName){
			this.handles[handleName].setStyle({ visibility: 'hidden' });
		}, this);
		var handles = [];
		if (this.options.resize === true) {
			handles.push('N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW');
		} else {
			var handles = [];
			if (this.options.resize) {
				if (this.options.resize.width) handles.push('E', 'W');
				if (this.options.resize.height) handles.push('S', 'N');
				if (this.options.resize.height && this.options.resize.width)
					handles.push('NE', 'SE', 'SW', 'NW');
			}
		}
		handles.each(function(handleName){
			this.handles[handleName].setStyle({ visibility: 'visible' });
		}, this);
	},

	getCropInfo: function() {
		var crop = this.current.crop;
		return {
			width: crop.width - this.boderWidth * 2,
			height: crop.height - this.boderWidth * 2,
			x: crop.left - this.imageBounds.left,
			y: crop.top - this.imageBounds.top,
			imageWidth:  this.imageBounds.width,
			imageHeight: this.imageBounds.height,
			zoom: this.imageBounds.width / this.originalSize.width
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
