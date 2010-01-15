/***
 * MooCrop (v. rc-1 - 2007-10-24 )
 *
 * @version			rc-1
 * @license			BSD-style license
 * @author			nwhite - < nw [at] nwhite.net >
 * @infos			http://www.nwhite.net/MooCrop/
 * @copyright		Author
 */

// TODO: create all handles (n/w/s/e etc) and disable if canResize changes..

var Cropper = Base.extend(Chain, Callback, {

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
		canResize: true, // boolean or {width: boolean, height: boolean}
		cropperSize: {width: 500, height: 500} //
	},

	initialize: function(options) {
		$window.addEvent('resize', function(e) {
			var imageCropper = $('imageCropper');
			var windowSize = $window.getSize();
			var cropperSize = imageCropper.getSize();
			var delta = {
				x: windowSize.width - cropperSize.width,
				y: windowSize.height - cropperSize.height
			}
			var event = {
				page: {
					x: windowSize.width,
					y: windowSize.height
				},
				delta: {
					x: 0,
					y: 0
				}
			}

			$('cropCanvas').setStyles({
				height: windowSize.height - 84
			});

			imageCropper.setStyles({
				height: windowSize.height,
				width: windowSize.width
			});

			this.fixBoxModel();
			this.activate(event, 'imageNESW')
			this.resizeFunc(event);
			this.removeFunc();
			this.moveImage()
		}.bind(this));

		this.setOptions(options);
		this.img = $('cropImage');

		$('cropCanvas').setStyles({
			height: this.options.cropperSize.height - 84
		});

		$('imageCropper').setStyles({
			height: this.options.cropperSize.height,
			width: this.options.cropperSize.width
		});
		if(this.img.$.complete) {
			this.hideOverlay();
		} else {
			//hide the loading overlay when the image is loaded
			this.img.addEvent('load', function() {
					this.hideOverlay();
				}.bind(this)
			);
		}

		$('imageCropper').setStyle({display:'block'});
		this.cropCanvas = $('cropCanvas');

		$('cropSubmit').addEvent('click', function() {
			this.confirm && this.confirm();
			//window.close();
		}.bind(this))

		this.buildSizePresets();
		this.buildOverlay();
		this.setup();
		this.setupImage();
		this.initializeZoom();
		this.addIndicator();
	},

	hideOverlay: function() {
		$('cropLoadingOverlay').setStyle({display: 'none'});
	},

	setupImage: function() {
		if(!this.originalSize){
			this.originalSize = this.img.getSize();
			this.img.setStyles({position:'absolute'});
			this.img.aspectRatio = (this.originalSize.height / this.originalSize.width);
		}
		// scale the image to fit within the wrapper only if it's larger then the wrapper
		var landscape = this.img.aspectRatio > this.wrapperBounds.aspectRatio;

		// scale the image to fit within the wrapper & crop area, if its larger then them;
		var maxWidth = this.wrapperBounds.width > this.crop.width ? this.wrapperBounds.width : this.crop.width;
		var maxHeight = this.wrapperBounds.height > this.crop.height ? this.wrapperBounds.height : this.crop.height;
		var scaledSize = {
			width: landscape ? maxWidth : maxHeight / this.img.aspectRatio,
			height: landscape ? maxWidth * this.img.aspectRatio : maxHeight
		};

		if(scaledSize.width > this.originalSize.width && scaledSize.height > this.originalSize.height)
			scaledSize = this.originalSize;

		this.imageBounds = this.img.getBounds();
		this.imageBounds.width = Math.floor(scaledSize.width);
		this.imageBounds.height = Math.floor(scaledSize.height);
		this.imageBounds.left = Math.floor(this.wrapperBounds.width / 2 - this.imageBounds.width / 2);
		this.imageBounds.top = Math.floor(this.wrapperBounds.height / 2 - this.imageBounds.height / 2);
		this.imageBounds.bottom = this.imageBounds.top + this.imageBounds.height;
		this.imageBounds.right = this.imageBounds.left + this.imageBounds.width;

		this.keepImageInsideCrop();
		this.img.setBounds(this.imageBounds);
	},

	setup: function(width, height) {
		if(width)
			this.options.min.width = width;
		if(height)
			this.options.min.height = height;
		var width = this.options.min.width;//Base.pick(width, this.options.min.width);
		var height = this.options.min.height;//Base.pick(height, this.options.min.height);
		//center the crop on the canvas
		$(this.cropArea).setStyles({
			width: width, 
			height: height,
			top: (this.cropCanvas.getHeight() - height) / 2,
			left: (this.cropCanvas.getWidth() - width) / 2
		});

		this.current.crop = this.crop = width || height ? this.cropArea.getBounds() : this.getCropArea();

		this.wrapperBounds = this.wrapper.getBounds();

		this.wrapperBounds.aspectRatio = this.wrapperBounds.height / this.wrapperBounds.width;

		this.handleWidthOffset = this.options.handleWidth / 2;
		this.handleHeightOffset = this.options.handleHeight / 2;

		this.fixBoxModel();
		this.drawMasks();
		this.positionHandles();
	},

	initializeZoom: function() {
		//the zoom slider
		var zoomSlider = $('zoomSlider');
		this.zoomHandle = $('zoomSliderHandle');
		this.sliderRange = 192;
		this.minZoom = 0;
		this.maxZoom = this.options.maxZoom;
		this.setZoomSlidePosition();
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
		var landscape = this.img.aspectRatio > this.crop.aspectRatio;
		var minZoom = (landscape ? this.crop.width : this.crop.height / this.img.aspectRatio) / this.originalSize.width;

		// zoom the image in and out around its center.
		var curSliderPos = x / this.sliderRange;
		var zoom = ((curSliderPos * (this.maxZoom - this.minZoom)) + this.minZoom);

		if(zoom < minZoom) zoom = minZoom;

		this.zoomHandle.setStyle({
			left: zoom * this.sliderRange
		});

		var bounds = this.imageBounds;

		var centerX = bounds.left + (bounds.width / 2);
		var centerY = bounds.top + (bounds.height / 2);

		bounds.width = this.originalSize.width * zoom;
		bounds.height = this.originalSize.height * zoom;
		bounds.left = centerX - (bounds.width / 2);
		bounds.top = centerY - (bounds.height / 2);

		this.keepImageInsideCrop();

		this.img.setBounds(bounds);
		this.imageBounds = this.img.getBounds();
	},

	keepImageInsideCrop: function() {
		var bounds = this.imageBounds;
		var crop = this.crop;
		var keepCropInsideImage = {
			x: this.imageBounds.width < crop.width,
			y: this.imageBounds.height < crop.height
		};

		// test the left edge
		if(bounds.left > crop.left || keepCropInsideImage.x)
			bounds.left = crop.left;

		// test the top edge
		if(bounds.top > crop.top || keepCropInsideImage.y)
			bounds.top = crop.top;

		// test the right edge
		if(!keepCropInsideImage.x && ((bounds.left + bounds.width) < (crop.left + crop.width)))
			bounds.left = (crop.left + crop.width) - bounds.width;

		// test the bottom edge
		if(!keepCropInsideImage.y && (bounds.top + bounds.height) < (crop.top + crop.height) )
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

	fixBoxModel: function() {
		this.boxDiff = (this.crop.width - this.options.min.width)/2;
		this.bounds = {
			top: this.boxDiff,
			left: this.boxDiff, 
			right: this.cropCanvas.getWidth(),
			bottom: this.cropCanvas.getHeight(),
			width: this.options.min.width,
			height: this.options.min.height
		};

		this.wrapper.setStyles({
			width: this.bounds.right,
			height: this.bounds.bottom
		});

		if(this.options.showMask) {
			this.north.setStyle({width: this.bounds.right});
			this.south.setStyle({width: this.bounds.right});
		}
	},

	activate: function(event, handle) {
		this.current = {
			x: event.page.x,
			y: event.page.y,
			handle: handle,
			crop: this.current.crop
		};
		if(this.current.handle == 'NESW' && !this.options.showHandles) this.hideHandles();
		this.fireEvent('start', [this.img.src, this.current.crop, this.getCropInfo(), handle]);
	},

	removeFunc: function() {
		if( this.current.handle == 'NESW' && !this.options.showHandles) this.showHandles();
		this.crop = this.current.crop;
		this.fireEvent('complete', [this.img.src, this.current.crop, this.getCropInfo()]);
	},

	moveImage: function(event) {
		if(event) {
			this.imageBounds.left += event.delta.x;
			this.imageBounds.top += event.delta.y;
			this.imageBounds.bottom = this.imageBounds.height + this.imageBounds.top;
			this.imageBounds.right = this.imageBounds.left + this.imageBounds.width;
		}
		this.keepImageInsideCrop();
		this.img.setBounds(this.imageBounds);
	},

	resizeFunc: function(event) {
		var xdiff = this.current.x - event.page.x;
		var ydiff = this.current.y - event.page.y;

		var bounds = this.bounds;
		var crop = this.crop;
		var handle = this.current.handle;
		var keepCropInsideImage = {
			x: this.imageBounds.width < crop.width,
			y: this.imageBounds.height < crop.height
		};

		var styles = {};
		var dragging = handle.length > 2;

		if( handle.contains('S') ) {//SOUTH
//			if(crop.bottom - ydiff > bounds.bottom) ydiff = crop.bottom - bounds.bottom; // box south
			if(keepCropInsideImage.y || (crop.bottom - ydiff > this.imageBounds.bottom)) ydiff = Math.round(crop.bottom - this.imageBounds.bottom); // box south
			if(!dragging) {
				if( (crop.height - ydiff) < bounds.height ) ydiff = crop.height - bounds.height; // size south
				styles.height = crop.height - ydiff; // South handles only
			}
		}

		if( handle.contains('N') ) {//NORTH
//			if(crop.top - ydiff < bounds.top ) ydiff = crop.top; //box north
			if(!keepCropInsideImage.y && (crop.top - ydiff < this.imageBounds.top)) ydiff = crop.top - this.imageBounds.top; //box north
			if(!dragging) {
				if( (crop.height + ydiff ) < bounds.height ) ydiff = Math.round(bounds.height - crop.height); // size north
				styles.height = crop.height + ydiff; // North handles only
			}
			styles.top = crop.top - ydiff; // both Drag and N handles
		}

		if( handle.contains('E') ) {//EAST
//			if(crop.right - xdiff > bounds.right) xdiff = crop.right - bounds.right; //box east
			if(!keepCropInsideImage.x && (crop.right - xdiff > this.imageBounds.right)) xdiff = Math.round(crop.right - this.imageBounds.right); //box east
			if(!dragging) {
				if( (crop.width - xdiff) < bounds.width ) xdiff = crop.width - bounds.width; // size east
				styles.width = crop.width - xdiff;
			}
		}

		if( handle.contains('W') ) {//WEST
//			if(crop.left - xdiff < bounds.left) xdiff = crop.left; //box west
			if(keepCropInsideImage.x || (crop.left - xdiff < this.imageBounds.left)) xdiff = Math.round(crop.left - this.imageBounds.left); //box west

			if(!dragging) {
				if( (crop.width + xdiff) < bounds.width ) xdiff = bounds.width - crop.width; //size west
				styles.width = crop.width + xdiff;
			}
			styles.left = crop.left - xdiff; // both Drag and W handles
		}

		var preCssStyles = Base.clone(styles);
		if(styles.width != undefined) styles.width -= this.boxDiff*2;
		if(styles.height != undefined) styles.height -= this.boxDiff*2;
		this.cropArea.setStyles(styles);
		this.getCurrentCoords(preCssStyles);
		this.drawMasks();
		this.positionHandles();
		this.fireEvent('changeCrop', [this.img.src, this.current.crop, this.getCropInfo()]);
	},

	getCurrentCoords: function(changed) {
		var current = Base.clone(this.crop);

		if(changed.left != undefined) {
			current.left = changed.left;
			if(changed.width != undefined) current.width = changed.width;
			else current.right = current.left + current.width;
		}
		if(changed.top != undefined) {
			current.top = changed.top;
			if(changed.height != undefined) current.height = changed.height;
			else current.bottom = current.top + current.height;
		}
		if((changed.width != undefined) && (changed.left == undefined)) {
			current.width = changed.width;
			current.right = current.left + current.width;
		}
		if((changed.height != undefined) && (changed.top == undefined)) {
			current.height = changed.height;
			current.bottom = current.top + current.height;
		}
		this.current.crop = current;
	},

	drawMasks: function() {
		if(!this.options.showMask) return;
		var bounds = this.bounds;
		var currentCrop = this.current.crop;
		var handle = this.current.handle;

		this.north.setStyle({height: Math.max(0, currentCrop.top)});
		this.south.setStyle({height: Math.max(0, bounds.bottom  - currentCrop.bottom)});

		this.east.setStyles({
			height: currentCrop.height,
			width: Math.max(0, bounds.right  - currentCrop.right),
			top: currentCrop.top,
			left: currentCrop.right
		});

		this.west.setStyles({
			height: currentCrop.height,
			width: Math.max(0, currentCrop.left),
			top: currentCrop.top
		});
	},

	positionHandles: function() {
		if(!this.calculateHandles) return;
		var crop = this.current.crop;
		var offset = {
			width: this.handleWidthOffset,
			height: this.handleHeightOffset
		}

		if(this.options.canResize === true || this.options.canResize.height) {
			this.handles.N.setOffset(crop.width / 2 - offset.width, - offset.height);
			this.handles.S.setOffset(crop.width / 2 - offset.width, crop.height - offset.height);
		}

		if(this.options.canResize === true || this.options.canResize.width) {
			this.handles.E.setOffset(crop.width - offset.width, crop.height / 2 - offset.height);
			this.handles.W.setOffset(-offset.width, crop.height / 2 - offset.height);
		}

		if(this.options.canResize === true || this.options.canResize.width && this.options.canResize.height) {
			this.handles.NE.setOffset(crop.width - offset.width, - offset.height);
			this.handles.SE.setOffset(crop.width - offset.width, crop.height - offset.height);
			this.handles.SW.setOffset(-offset.width, crop.height - offset.height);
			this.handles.NW.setOffset(-offset.width, -offset.height);
		}
	},

	hideHandles: function() {
		this.calculateHandles = false;
		this.handles.each(function(handle) {
			handle.setStyle({display: 'none'});
		});
	},

	showHandles: function() {
		this.calculateHandles = true;
		this.positionHandles();
		this.handles.each(function(handle) {
			handle.setStyle({display: 'block'});
		});
	},

	addIndicator: function() {
		var indicator = $('imageCropper').injectTop('span', {
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

		var setIndicator = function(imgsrc, crop, cropInfo) {
			indicator.setStyles({
				top: crop.bottom + 10,
				left: crop.left
			}).setText('w: '+(cropInfo.width) + ' h: ' + (cropInfo.height) + ' x: ' + (cropInfo.left) + ' y: ' + (cropInfo.top));
		};

		 // when dragging/resizing begins show indicator
		 this.addEvents({
			start: function(imgsrc, crop, cropInfo, handle) {
				indicator.setStyle({display: 'block'});
				setIndicator(imgsrc, crop, cropInfo, handle);
			},

			changeCrop: function(imgsrc, crop, cropInfo) {
				setIndicator(imgsrc, crop, cropInfo);
			},

			complete: function() {
				indicator.setStyle({display: 'none'});
			 }
		 });
	},

	buildSizePresets: function() {
		var that = this;
		if(this.options.sizePresets) {
			this.sizePresets = $('cropButtons').injectBottom('select', {
				id: 'sizePresets',
				events: {
					change: function() {
						var index = this.getSelected()[0].$.value.toInt();
						var preset = that.options.sizePresets[index];
						if(preset.canResize)
							that.options.canResize = preset.canResize;
						that.setup(preset.width, preset.height);
						that.setupImage();
						that.setZoomSlidePosition();
						that.showHideHandles();
					}
				}
			});
			this.sizePresets.injectBottom('option', { text: 'Size presets', value: '' });
			var that = this;
			this.options.sizePresets.each(function(preset, i) {
				this.sizePresets.injectBottom('option', {
					text: preset.name,
					value: i,
					selected: !!preset.selected
				});
			})
		}
	},

	buildOverlay: function() {
		var o = this.options;
		this.wrapper = this.img.injectBefore('div', {
			style: {
				position: 'relative',
				width: this.cropCanvas.getWidth(),
				height: this.cropCanvas.getHeight(),
				overflow: 'hidden'
			},
			id: 'wrapper'
		});

		this.wrapper.injectInside(this.img);

		this.offsets = {
			x: this.wrapper.getLeft(),
			y: this.wrapper.getTop()
		};

		if(this.options.showMask) {		// optional masks
			var maskStyles = {
				position: 'absolute',
				overflow: 'hidden',
				backgroundColor: o.maskColor,
				opacity: o.maskOpacity
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

			this.north = this.wrapper.injectBottom('div', { style: maskStyles, id: 'north', events: dragFunctions });
			this.south = this.wrapper.injectBottom('div', { style: Hash.merge({ bottom: 0 }, maskStyles), id: 'south', events: dragFunctions });
			this.east = this.wrapper.injectBottom('div', { style: maskStyles, id: 'east', events: dragFunctions});
			this.west = this.wrapper.injectBottom('div', { style: maskStyles, id: 'west', events: dragFunctions});
		}

		this.cropArea = this.wrapper.injectBottom('div', {
			style: {
				position: 'absolute',
				top: 0,
				left: 0,
				border: o.cropBorder,
				cursor: 'move'
			},

			events: {
				dblclick: function() {
					this.fireEvent('dblClk', [this.img.src, this.current.crop, this.getCropInfo()]);
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

		var handles = ['N','NE','E','SE','S','SW','W','NW'];

		// if(this.options.canResize===true) {
		//	handles = ['N','NE','E','SE','S','SW','W','NW'];
		// } else {
		// 	if(this.options.canResize) {
		// 		if(this.options.canResize.width) handles.push('E', 'W');
		// 		if(this.options.canResize.height) handles.push('S', 'N');
		// 		if(this.options.canResize.height && this.options.canResize.width)
		// 			handles.push('NE', 'SE', 'SW', 'NW');
		// 	}
		// }

		handles.each(function(handle) {
			var handleDiv = this.cropArea.injectTop('div', {
				style: {
					position: 'absolute',
					backgroundColor: o.handleColor, 
					width: o.handleWidth,
					height: o.handleHeight,
					overflow: 'hidden',
					cursor: (handle.toLowerCase()+'-resize')
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
			this.handles[handle] = handleDiv;
		}, this);
		this.showHideHandles();
	},

	showHideHandles: function() {
		var that = this;
		['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].each(function(handleName){
			that.handles[handleName].setStyle({visibility: 'hidden'});
		});
		var handles = [];
		if(this.options.canResize === true) {
			handles.push('N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW');
		} else {
			var handles = [];
			if(this.options.canResize) {
				if(this.options.canResize.width) handles.push('E', 'W');
				if(this.options.canResize.height) handles.push('S', 'N');
				if(this.options.canResize.height && this.options.canResize.width)
					handles.push('NE', 'SE', 'SW', 'NW');
			}
		}
		handles.each(function(handleName){
			that.handles[handleName].setStyle({visibility: 'visible'});
		})
	},

	getCropInfo: function() {
		var cropInfo = Base.clone(this.current.crop);
		cropInfo.width -= this.boxDiff * 2;
		cropInfo.height -= this.boxDiff * 2;
		cropInfo.left = cropInfo.left - this.imageBounds.left;
		cropInfo.top = cropInfo.top - this.imageBounds.top;
		cropInfo.imageWidth =  this.imageBounds.width;
		cropInfo.imageHeight = this.imageBounds.height;
		return cropInfo;
	},

	removeOverlay: function() {
		this.wrapper.remove();
		this.img.setStyle({display:'block'});
	}

});

// function initializeCropper(options) {
// 	return new Cropper(options);
// }