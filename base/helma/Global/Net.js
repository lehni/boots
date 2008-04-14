Net = {
	getHost: function(host) {
		if (!host)
			host = req.data.http_remotehost;
		var hostName = java.net.InetAddress.getByName(host).getCanonicalHostName();
		return hostName ? hostName : host;
	},

	parseUrl: function(url) {
		var values = url.match(/^(?:([^:]+):\/\/)?([^:\/]+)(?::([0-9]+))?(\/.*)?/) || {};
		return {
			protocol: values[1],
			host: values[2],
			port: values[3],
			path: values[4]
		};
	}
};