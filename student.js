/**
This code was originally licensed under MIT, and then heavily modified. The MIT license is retained below.

MIT License

Copyright (c) 2017 Jack McKernan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 * */

function hideJoin(){
	document.getElementById("connect-area").style.display = 'none';
}

function showDebug(){
	document.getElementsByClassName("debug-info")[0].style.display = '';
}

(function () {

	var lastPeerId = null;
	var peer = null; // own peer object
	var conn = null;
	var recvIdInput = document.getElementById("receiver-id");
	var status = document.getElementById("status");
	var message = document.getElementById("message");
	var goButton = document.getElementById("goButton");
	var resetButton = document.getElementById("resetButton");
	var fadeButton = document.getElementById("fadeButton");
	var offButton = document.getElementById("offButton");
	var sendMessageBox = document.getElementById("sendMessageBox");
	var sendButton = document.getElementById("sendButton");
	var clearMsgsButton = document.getElementById("clearMsgsButton");
	var connectButton = document.getElementById("connect-button");
	var cueString = "<span class=\"cueMsg\">Cue: </span>";

	var player = {};
	var answersGiven = {};

	/**
	 * Create the Peer object for our end of the connection.
	 *
	 * Sets up callbacks that handle any events related to our
	 * peer object.
	 */
	function initialize() {
		// Create own peer object with connection to shared PeerJS server
		peer = new Peer(null, {
			debug: 2,
			host: 'localhost',
			port: 9000,
			path: '/'
		});

		peer.on('open', function (id) {
			// Workaround for peer.reconnect deleting previous id
			if (peer.id === null) {
				console.log('Received null id from peer open');
				peer.id = lastPeerId;
			} else {
				lastPeerId = peer.id;
			}

			console.log('ID: ' + peer.id);
			postInit();
		});
		peer.on('connection', function (c) {
			// Disallow incoming connections
			c.on('open', function() {
				c.send("Sender does not accept incoming connections");
				setTimeout(function() { c.close(); }, 500);
			});
		});
		peer.on('disconnected', function () {
			status.innerHTML = "Connection lost. Please reconnect";
			console.log('Connection lost. Please reconnect');

			// Workaround for peer.reconnect deleting previous id
			peer.id = lastPeerId;
			peer._lastServerId = lastPeerId;
			peer.reconnect();
		});
		peer.on('close', function() {
			conn = null;
			status.innerHTML = "Connection destroyed. Please refresh";
			console.log('Connection destroyed');
		});
		peer.on('error', function (err) {
			console.log(err);
			questionArea.innerHTML = err;
		});

	};

	function postInit(){
		var urlOption = (new URL(document.location)).searchParams.get("id");
		if(urlOption !== null){
			//recvIdInput.value = urlOption;
			join(null, urlOption);
			//setTimeout(function() { join(null, urlOption) }, 500);
		}
		showWelcome();
	}

	/**
	 * Create the connection between the two Peers.
	 *
	 * Sets up callbacks that handle any events related to the
	 * connection and data received on it.
	 */
	function join(evt, joinId) {
		// Close old connection
		if (conn) {
			conn.close();
		}

		// Create connection to destination peer specified in the input field
		var connectToId = joinId || recvIdInput.value
		console.log('connecting to ' + connectToId)
		conn = peer.connect(connectToId, {
			reliable: true
		});

		conn.on('open', function () {
			status.innerHTML = "Connected to: " + conn.peer;
			console.log("Connected to: " + conn.peer);

			// Check URL params for comamnds that should be sent immediately
			var command = getUrlParam("command");
			if (command)
				conn.send(command);
		});
		// Handle incoming data (messages only since this is the signal sender)
		conn.on('data', function (data) {
			console.log(data)
			if(data.type === "choose-1"){
				showQuestion(data);
			} else if (data.type === "poll") {
				showQuestion(data);
			} else if (data.type === "setup") {
				document.getElementById("title").innerHTML = data.title;
				document.getElementsByTagName("title")[0].innerHTML = data.title;
			} else if (data.type === "clear") {
				questionArea.innerHTML = `<h2>Question ${data.question + 1}</h2>`;
			} else if (data.type === "answer") {
				if(data.answer === answersGiven[data.question]){
					// correct!
					questionArea.innerHTML = `
						<h2>Congratulations</h2>
					`
				} else {
					questionArea.innerHTML = `
						<h2>Too bad :(</h2>
					`
				}
			} else {
				console.log("Unknown message")
			}
		});
		conn.on('close', function () {
			status.innerHTML = "Connection closed";
		});
	};

	/**
	 * Send a signal via the peer connection and add it to the log.
	 * This will only occur if the connection is still alive.
	 */
	 function signal(sigName) {
		if (conn && conn.open) {
			conn.send(sigName);
			console.log(sigName + " signal sent");
			addMessage(cueString + sigName);
		} else {
			console.log('Connection is closed');
		}
	}

	function addMessage(msg) {
		var now = new Date();
		var h = now.getHours();
		var m = addZero(now.getMinutes());
		var s = addZero(now.getSeconds());

		if (h > 12)
			h -= 12;
		else if (h === 0)
			h = 12;

		function addZero(t) {
			if (t < 10)
				t = "0" + t;
			return t;
		};
	};

	function showWelcome(){
		questionArea.innerHTML = `
			<div class="display: flex; align-items: center; justify-content: center;">
				<h1>Enter your name</h1>
				<input type="text" id="name">
				<button id="submit-name" class="btn btn-primary">Join!</button>
			</div>
		`

		var name_input = document.getElementById(`submit-name`);
		name_input.addEventListener('click', () => {
			player.name = document.getElementById("name").value;
			safeSend({
				"event": "registerPlayer",
				"player": player,
			})
			showPostWelcome();
		})
	}

	function showPostWelcome(){
		questionArea.innerHTML = `
			<div class="display: flex; align-items: center; justify-content: center;">
				<h1>Get Ready ${player.name}</h1>
			</div>
		`
	}

	function safeSend(msg){
		if (conn && conn.open) {
			conn.send(msg);
			addMessage("<span class=\"selfMsg\">Self: </span> " + msg);
		} else {
			console.log('Connection is closed');
		}
	}

	function showResult(result, score){
		message.innerHTML = `
			<div class="display: flex; align-items: center; justify-content: center;">
				<h1>${result}</h1>
				<div>
					Your score is: ${score}
				</div>
			</div>
		`
	}

	function showQuestion(data){
		var show = `<h2>${data.title}</h2><div class="answer-group">`;
		show += data.answers.map((q, idx) => {
			return `
				<button id="answer-${data.id}-${idx}" value="${q}" class="btn answer-button">${q}</button>
			`
		}).join("");
		show += '</div>';
		questionArea.innerHTML = show;

		data.answers.forEach((q, idx) => {
			var e = document.getElementById(`answer-${data.id}-${idx}`);
			e.addEventListener('click', function () {
				safeSend({
					"event": "answer",
					"question": data.id,
					"result": e.value,
				})
				answersGiven[data.id] = e.value
				console.log(data);
				if(data.type !== "poll" || ! data.live) {
					Array.from(document.getElementsByClassName("answer-button")).forEach(x => x.style.display = 'none')
				}
			})
		})

		return show;
	}

	/**
	 * Get first "GET style" parameter from href.
	 * This enables delivering an initial command upon page load.
	 *
	 * Would have been easier to use location.hash.
	 */
	function getUrlParam(name) {
		name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
		var regexS = "[\\?&]" + name + "=([^&#]*)";
		var regex = new RegExp(regexS);
		var results = regex.exec(window.location.href);
		if (results == null)
			return null;
		else
			return results[1];
	};

	function clearMessages() {
		message.innerHTML = "";
		addMessage("Msgs cleared");
	};

	// Start peer connection on click
	//connectButton.addEventListener('click', join);

	// Snce all our callbacks are setup, start the process of obtaining an ID
	initialize();

	// Show debug panel
	var urlShowDebug = (new URL(document.location)).searchParams.get("debug");
	if(urlShowDebug !== null){
		showDebug();
	}

})();
