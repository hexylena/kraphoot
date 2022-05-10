(function () {
	 function initialize() {
		var docurl = new URL(document.location);
		var roomId;

		if(mode === 'self' || mode === 'teacher'){
			loadQuiz(docurl.origin + docurl.pathname.replace('teacher.html', '') + docurl.searchParams.get('q') + '.json')
			var [roomNumber, roomId] = generateRoomId();
		}

		if(mode == 'self'){
			return;
		}

		peer = new Peer(roomId, {
			debug: 2,
			host: 'localhost',
			port: 9000,
			path: '/'
		});

		if(mode === 'teacher'){
			updateQrCode(roomNumber, roomId);
		}

		peer.on('open', (id) => peerOn(peer, id));
		peer.on('connection', (c) => peerConnect(c));
		peer.on('disconnected', peerDisconnect);
		peer.on('close', peerClose);
		peer.on('error', (err) => peerError(err));
	};

	advanceButton.addEventListener('click', advanceListener);

	initialize();
})();
