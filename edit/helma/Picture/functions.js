function getSpanPresets(selectedSpan) {
	var sizes = [];
	if (global.Blueprint) {
		for(var i = 1, l = Blueprint.columnCount; i < l; i++) {
			sizes.push({
				name: 'span ' + i,
				value: i,
				selected: i == selectedSpan,
				width: Blueprint.getWidth(i),
				canResize: {
					width: false,
					height: true
				}
			});
		}
	}
	sizes.push({
		name: '640 * 480',
		value: 99,
		width: 640,
		height: 480,
		canResize: {
			width: true,
			height: true
		}
	});
	return sizes;
}