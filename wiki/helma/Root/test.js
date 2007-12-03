function test1(a) {
	var t = new Date().getTime();
	var total = 0;
	a.each(function(val) {
		total += val;
	});
	res.write("each: " + (new Date().getTime() - t) + ": " + total + "<br/>");
}

function test2(a) {
	var t = new Date().getTime();
	var total = 0;
	for (var i in a)
		total += a[i];
	res.write("in:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + (new Date().getTime() - t) + ": " + total + "<br/>");
}

function test3(a) {
	var t = new Date().getTime();
	var total = 0;
	for (var i = 0; i < a.length; i++)
		total += a[i];
	res.write("for:&nbsp;&nbsp;&nbsp;&nbsp;" + (new Date().getTime() - t) + ": " + total + "<br/>");
}

function test_action() {
	res.encode("HiHowAreYou".uncamelize());
	res.write(([1, 10, 2, 4]).max() + "<br/>");
	var a = [];
	for (var i = 1000; i >= 0; i--)
		a[i] = i;
	var that = this;
	Number(1).times(function() {
		that.test3(a);
		that.test2(a);
		that.test1(a);
	});
}