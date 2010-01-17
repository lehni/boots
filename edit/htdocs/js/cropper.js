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
		handleWidth: 8,
		handleHeight: 8,
		cropBorder: '1px dashed blue',
		min: {
			width: 50,
			height: 50
		},
		showMask: true, // false to remove, helps on slow machines
		showHandles: false, // hide handles on drag
		maxZoom: 1,
		//TODO: add ratio?
		resize: true, // boolean or { width: boolean, height: boolean }
		cropperSize: { width: 500, height: 500 } //
	},

	initialize: function(options) {
		this.setOptions(options);

		this.boxDiff = this.options.cropBorder.toInt();

		this.cropCanvas = $('#cropCanvas');

		this.imageCropper = $('#imageCropper');
		this.imageCropper.setStyles({
			display: 'block',
			height: this.options.cropperSize.height,
			width: this.options.cropperSize.width
		});

		this.image = $('#cropImage');
		if (this.image.$.complete) {
			this.hideOverlay();
		} else {
			//hide the loading overlay when the image is loaded
			this.image.addEvent('load', function() {
					this.hideOverlay();
				}.bind(this)
			);
		}

		$('#cropSubmit').addEvent('click', function() {
			this.confirm && this.confirm();
			//window.close();
		}.bind(this))

		this.buildSizePresets();
		this.buildOverlay();
		this.buildZoom();
		this.buildIndicator();

		var panelHeight = $('#cropBg').getHeight();

		this.cropCanvas.setHeight(this.options.cropperSize.height - panelHeight);

		this.setup();
		this.setZoomSlidePosition();

		$window.addEvent('resize', function(e) {
			var size = $window.getSize();
			this.cropCanvas.setHeight(size.height - panelHeight);
			this.imageCropper.setSize(size);
			var event = { page: { x: size.width, y: size.height }};
			this.activate(event, 'NESW');
			this.resizeFunc(event);
			this.removeFunc();
			this.moveImage();
		}.bind(this));
	},

	hideOverlay: function() {
		$('#cropLoadingOverlay').setStyle({ display: 'none' });
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
		var maxWidth = wrapperBounds.width > this.crop.width ? wrapperBounds.width : this.crop.width;
		var maxHeight = wrapperBounds.height > this.crop.height ? wrapperBounds.height : this.crop.height;
		var scaledSize = {
			width: landscape ? maxWidth : maxHeight / this.image.aspectRatio,
			height: landscape ? maxWidth * this.image.aspectRatio : maxHeight
		};

		if (scaledSize.width > this.originalSize.width && scaledSize.height > this.originalSize.height)
			scaledSize = this.originalSize;

		var width = Math.floor(scaledSize.width);
		var height = Math.floor(scaledSize.height);
		var left = Math.floor(wrapperBounds.width / 2 - width / 2);
		var top = Math.floor(wrapperBounds.height / 2 - height / 2);

		this.imageBounds = {
			width: width, height: height, left: left, top: top,
			right: left + width, bottom: top + height
		}

		this.keepImageInsideCrop();
		this.image.setBounds(this.imageBounds);
	},

	setup: function() {
		this.handleWidthOffset = this.options.handleWidth / 2;
		this.handleHeightOffset = this.options.handleHeight / 2;

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
				left: (this.cropCanvas.getWidth() - width) / 2,
				top: (this.cropCanvas.getHeight() - height) / 2
			});
		}
		this.current.crop = this.crop = this.getCropArea();
		this.drawMasks();
		this.positionHandles();
	},

	buildZoom: function() {
		this.zoomHandle = $('#zoomSliderHandle');
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

		this.zoomHandle.setStyle({
			left: zoom * this.sliderRange
		});

		var bounds = this.imageBounds;

		var centerX = bounds.left + bounds.width / 2;
		var centerY = bounds.top + bounds.height / 2;

		bounds.width = this.originalSize.width * zoom;
		bounds.height = this.originalSize.height * zoom;
		bounds.left = centerX - bounds.width / 2;
		bounds.top = centerY - bounds.height / 2;

		this.keepImageInsideCrop();

		this.image.setBounds(bounds);
		this.imageBounds = this.image.getBounds();
	},

	keepImageInsideCrop: function() {
		var bounds = this.imageBounds;
		var crop = this.crop;
		var keepCropInsideImage = {
			x: this.imageBounds.width < crop.width,
			y: this.imageBounds.height < crop.height
		};

		// test the left edge
		if (bounds.left > crop.left || keepCropInsideImage.x)
			bounds.left = crop.left;

		// test the top edge
		if (bounds.top > crop.top || keepCropInsideImage.y)
			bounds.top = crop.top;

		// test the right edge
		if (!keepCropInsideImage.x && ((bounds.left + bounds.width) < (crop.left + crop.width)))
			bounds.left = (crop.left + crop.width) - bounds.width;

		// test the bottom edge
		if (!keepCropInsideImage.y && (bounds.top + bounds.height) < (crop.top + crop.height))
			bounds.top = (crop.top + crop.height) - bounds.height;
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
			this.imageBounds.right = (this.imageBounds.left += event.delta.x) + this.imageBounds.width;
			this.imageBounds.bottom = (this.imageBounds.top += event.delta.y) + this.imageBounds.top;
		}
		this.keepImageInsideCrop();
		this.image.setBounds(this.imageBounds);
	},

	resizeFunc: function(event) {
		var xdiff = this.current.x - event.page.x;
		var ydiff = this.current.y - event.page.y;

		var min = this.options.min;
		var crop = this.crop;
		var handle = this.current.handle;
		var keepCropInsideImage = {
			x: this.imageBounds.width < crop.width,
			y: this.imageBounds.height < crop.height
		};

		var bounds = {};
		var dragging = handle.length > 2;

		if (handle.contains('S')) {//SOUTH
			if (keepCropInsideImage.y || (crop.bottom - ydiff > this.imageBounds.bottom))
				ydiff = Math.round(crop.bottom - this.imageBounds.bottom); // box south
			if (!dragging) {
				if (crop.height - ydiff < min.height)
					ydiff = crop.height -  min.height; // size south
				bounds.height = crop.height - ydiff; // South handles only
			}
		}

		if (handle.contains('N')) {//NORTH
			if (!keepCropInsideImage.y && (crop.top - ydiff < this.imageBounds.top))
				ydiff = crop.top - this.imageBounds.top; //box north
			if (!dragging) {
				if (crop.height + ydiff <  min.height)
					ydiff = min.height - crop.height; // size north
				bounds.height = crop.height + ydiff; // North handles only
			}
			bounds.top = crop.top - ydiff; // both Drag and N handles
		}

		if (handle.contains('E')) {//EAST
			if (!keepCropInsideImage.x && (crop.right - xdiff > this.imageBounds.right))
				xdiff = Math.round(crop.right - this.imageBounds.right); //box east
			if (!dragging) {
				if (crop.width - xdiff <  min.width)
					xdiff = crop.width -  min.width; // size east
				bounds.width = crop.width - xdiff;
			}
		}

		if (handle.contains('W')) {//WEST
			if (keepCropInsideImage.x || (crop.left - xdiff < this.imageBounds.left))
				xdiff = Math.round(crop.left - this.imageBounds.left); //box west
			if (!dragging) {
				if (crop.width + xdiff <  min.width)
					xdiff =  min.width - crop.width; //size west
				bounds.width = crop.width + xdiff;
			}
			bounds.left = crop.left - xdiff; // both Drag and W handles
		}

		this.getCurrentBounds(bounds);
		bounds.width -= this.boxDiff * 2;
		bounds.height -= this.boxDiff * 2;
		this.cropArea.setBounds(bounds);
		this.drawMasks();
		this.positionHandles();
		this.fireEvent('change', [this.image.src, this.current.crop, this.getCropInfo()]);
	},

	getCurrentBounds: function(changed) {
		var current = Hash.merge({}, this.crop, changed);
		current.right = current.left + current.width;
		current.bottom = current.top + current.height;
		this.current.crop = current;
	},

	drawMasks: function() {
		if (!this.options.showMask)
			return;

		var size = this.cropCanvas.getSize();
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
		var offset = {
			width: this.handleWidthOffset,
			height: this.handleHeightOffset
		}

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
		var indicator = this.imageCropper.injectTop('span', {
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

	buildSizePresets: function() {
		var that = this;
		if (this.options.presets) {
			this.presets = $('#cropButtons').injectBottom('select', {
				id: 'presets',
				events: {
					change: function() {
						var index = this.getSelected()[0].$.value.toInt();
						var preset = that.options.presets[index];
						if (preset.resize)
							that.options.resize = preset.resize;
						this.options.min = preset;
						that.setup();
						that.setZoomSlidePosition();
						that.showHideHandles();
					}
				}
			});
			this.presets.injectBottom('option', { text: 'Presets', value: '' });
			var that = this;
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
				width: this.cropCanvas.getWidth(),
				height: this.cropCanvas.getHeight(),
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
					width: opts.handleWidth,
					height: opts.handleHeight,
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
			width: crop.width - this.boxDiff * 2,
			height: crop.height - this.boxDiff * 2,
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
