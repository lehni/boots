Net = {
	getHost: function(host) {
		if (!host)
			host = req.data.http_remotehost;
		var hostName = java.net.InetAddress.getByName(host).getCanonicalHostName();
		return hostName ? hostName : host;
	}
};