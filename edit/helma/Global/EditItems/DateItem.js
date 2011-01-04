DateItem = EditItem.extend({
	_types: 'date',

	render: function(baseForm, name, value, param, out) {
		var first = true;
		function renderSelect(name, start, end, format, value) {
			var options = [];
			var months = format == 'MMMM';
			for (var i = start; i <= end; i++) {
				options.push({ 
					value: i,
					name: months
							? new Date(2000, i, 1).format(format)
							: i.format(format),
					selected: i == value
				});
			}
			if (!first) out.write(' ');
			Html.select({
				name: name, options: options, className: this.className
			}, out);
			first = false;
		}
		var now = new Date();
		var date = value ? value : now;
		if (this.day)
			renderSelect(name + '[day]', 1, 31, '00', date.getDate());
		if (this.month)
			renderSelect(name + '[month]', 0, 12, 'MMMM', date.getMonth());
		if (this.year)
			renderSelect(name + '[year]', this.startYear || 2000,
				now.getFullYear() + 2, '0000', date.getFullYear());
		if (this.hours)
			renderSelect(name + '[hours]', 0, 23, '00', date.getHours());
		if (this.minutes)
			renderSelect(name + '[minutes]', 0, 59, '00', date.getMinutes());
		if (this.seconds)
			renderSelect(name + '[seconds]', 0, 59, '00', date.getSeconds());
	},

	convert: function(value) {
		return new Date(
			value.year,
			value.month || 0,
			value.day || 1,
			value.hours || 0,
			value.minutes || 0,
			value.seconds || 0
		);
	}
});
