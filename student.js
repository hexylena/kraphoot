(function () {
	function initialize() {
		// Create own peer object with connection to shared PeerJS server
		peer = new Peer(null, {
			debug: 2,
			host: 'localhost',
			port: 9000,
			path: '/'
		});

		peer.on('open', (id) => peerOn(peer, id));
		peer.on('connection', (c) => peerConnect(c));
		peer.on('disconnected', peerDisconnect);
		peer.on('close', peerClose);
		peer.on('error', (err) => peerError(err));

	};
	initialize();
})();
