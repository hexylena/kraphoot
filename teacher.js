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

(function () {

	var lastPeerId = null;
	var peer = null; // Own peer object
	var peerId = null;
	var conns = [];
	var recvId = document.getElementById("receiver-id");
	var status = document.getElementById("status");
	var message = document.getElementById("message");
	var standbyBox = document.getElementById("standby");
	var goBox = document.getElementById("go");
	var fadeBox = document.getElementById("fade");
	var offBox = document.getElementById("off");
	var sendMessageBox = document.getElementById("sendMessageBox");
	var sendButton = document.getElementById("sendButton");
	var clearMsgsButton = document.getElementById("clearMsgsButton");
	var startButton = document.getElementById("startButton");
	var showAnswer = document.getElementById("showAnswer");
	var showNext = document.getElementById("showNext");
	var questionArea = document.getElementById("questionArea");

	var players = {};

	var currentSlide;
	var slides = [
		{
			type: 'choose-1',
			title: 'How gay are you?',
			answers: [
				'A bit',
				'Extremely',
				'Not a lot',
				'cis/het',
			],
			results: {},
			correct: 'Extremely',
			timeout: 10
		},
		{
			type: 'choose-1',
			title: 'NOT a Mode of Transportation',
			answers: [
				'Train',
				'Bike',
				'Boat',
				'Telephone',
			],
			results: {},
			correct: 'Telephone',
			timeout: 10
		}
	]
	/**
	 * Create the Peer object for our end of the connection.
	 *
	 * Sets up callbacks that handle any events related to our
	 * peer object.
	 */
	 function initialize() {
		// Create own peer object with connection to shared PeerJS server
		var roomId = (Math.random() * 10000000).toString().substring(0, 4);
		//peer = new Peer(`gtn-${roomId}`, {
		peer = new Peer(`gtn`, {
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
			recvId.innerHTML = "ID: " + peer.id;
			status.innerHTML = "Awaiting connection...";
		});
		peer.on('connection', function (c) {
			// Allow only a single connection
			conns.push(c);
			console.log("Connected to: " + conns.map(c => c.peer));
			status.innerHTML = `${conns.length} students connected`;
			players[c.peer] = {}
			ready();
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
			//conn = null;
			status.innerHTML = "Connection destroyed. Please refresh";
			console.log('Connection destroyed');
		});
		peer.on('error', function (err) {
			console.log(err);
			alert('' + err);
		});
	};

	/**
	 * Triggered once a connection has been achieved.
	 * Defines callbacks to handle incoming data and connection events.
	 */
	function ready() {
		conns
			.filter(conn => {
				return Object.keys(conn._events).indexOf('data') == -1
			})
			.forEach(conn => {
				console.log(conn.peer, Object.keys(conn._events))
				conn.on('data', function (data) {
					console.log("Data recieved");
					console.log(data)
					processStudentMessage(conn.peer, data);
					var cueString = "<span class=\"cueMsg\">Cue: </span>";
					addMessage(conn.peer.substring(0, 9) + cueString + data);
				});
			})

		conns
			.filter(conn => {
				return Object.keys(conn._events).indexOf('data') == -1
			})
			.forEach(conn => {
				conn.on('close', function () {
					status.innerHTML = "Connection reset<br>Awaiting connection...";
					conns = conns.filter(c => c.peer != conn.peer);
				});
			});
	}

	function processStudentMessage(connId, message){
		if(message.event == "registerPlayer"){
			console.log("New player!")
			players[connId] = {
				"name": message.player.name,
			}
			status.innerHTML =
				Object.keys(players).map(x => players[x].name).join(" ");
		} else if (message.event === "answer") {
			if(message.question !== currentSlide){
				console.log("Attempting to answer wrong question! Ignoring.")
				return
			}

			slides[currentSlide].results[connId] =
				slides[currentSlide].answers.indexOf(message.result)

			console.log(slides[currentSlide])
		} else {
			console.log("Unknown message", message);
		}
	}

	function addMessage(msg) {
		var now = new Date();

		message.innerHTML = `<br>${msg}${message.innerHTML}`;
	}

	function clearMessages() {
		message.innerHTML = "";
		addMessage("Msgs cleared");
	}

	function chunkArray(array, chunkSize){
		var chunks = []
		for (let i = 0; i < array.length; i += chunkSize) {
			chunks.push(array.slice(i, i + chunkSize));
		// do whatever
		}
		return chunks;
	}

	function showQuestion(data){
		var show = `<h2>${data.title}</h2><div>`;
		show += data.answers.map((q, idx) => {
			return `
				<button id="answer-${data.id}-${idx}" value="${q}" class="btn btn-primary">${q}</button>
			`
		}).join("");

		show += '</div>'
		show += `<div id="timer">${data.timeout} seconds</div>`
		return show;
	}

	// Listen for enter in message box
	sendMessageBox.addEventListener('keypress', function (e) {
		var event = e || window.event;
		var char = event.which || event.keyCode;
		if (char == '13')
			sendButton.click();
	});
	// Send message
	sendButton.addEventListener('click', function () {
		if (conns) {
			var msg = sendMessageBox.value;
			conns.filter(conn => conn.open).forEach(conn => {
				conn.send(msg);
				addMessage("<span class=\"selfMsg\">Self: </span>" + msg);
			})
			console.log("Sent: " + msg)
			sendMessageBox.value = "";
		} else {
			console.log('Connection is closed');
		}
	});

	showAnswer.addEventListener('click', function () {
		var correctAnswer = slides[currentSlide].correct
		var idx = slides[currentSlide].answers.indexOf(correctAnswer);
		var e = document.getElementById(`answer-${currentSlide}-${idx}`);
		e.classList.remove("btn-primary");
		e.classList.add("btn-success");
	})

	showAnswer.addEventListener('click', function () {
		var correctAnswer = slides[currentSlide].correct
		var idx = slides[currentSlide].answers.indexOf(correctAnswer);
		var e = document.getElementById(`answer-${currentSlide}-${idx}`);
		e.classList.remove("btn-primary");
		e.classList.add("btn-success");
	})

	function showResults(){
		var slide = slides[currentSlide];
		var show = `<h1>Results</h1>`;
		var counts = {}
		Object.keys(slide.results).forEach(connId => {
			var theirAnswer = slide.results[connId];
			var answerKey = "";
			if(theirAnswer < 0){
				answerKey = "SOMETHING ODD";
			} else {
				answerKey = slide.answers[theirAnswer]
			}

			if(answerKey === slide.correct){
				console.log(players[connId])
				players[connId]['score'] = 1 + (players[connId]['score'] || 0);
			}

			counts[answerKey] = 1 + (counts[answerKey] || 0)
		})
		console.log(counts)
		console.log(players)

		show += '<table class="table table-striped">'
		slide.answers.forEach(x => {
			if(slide.correct === x) {
				show += `<tr class="correct-answer"><td>${x}</td> <td>${counts[x] || 0}</td></tr>`
			} else {
				show += `<tr><td>${x}</td> <td>${counts[x] || 0}</td></tr>`
			}
		})
		show += '</table>'
		questionArea.innerHTML = show;
	}

	function showFinalResults(){
		var show = `<h1>Final Results</h1>`;
		var counts = {}
		show += JSON.stringify(players)
		//show += '<table class="table table-striped">'
		//show += '</table>'
		questionArea.innerHTML = show;
	}

	function handleCurrentSlide(){
		var studentSlide = {
			id: currentSlide,
			type: slides[currentSlide].type,
			title: slides[currentSlide].title,
			answers: slides[currentSlide].answers,
			started: new Date().getTime(),
			timeout: slides[currentSlide].timeout,
		}

		questionArea.innerHTML = showQuestion(studentSlide);

		// Update the count down every 1 second
		var slideTimer = setInterval(function() {
			var now = new Date().getTime(),
				timeLeft = studentSlide.started + (studentSlide.timeout * 1000) - now;
			var doneCondition = timeLeft < 0;

			// How many students have answered?
			if(Object.keys(players).length === Object.keys(slides[currentSlide].results).length){
				doneCondition = 'true'
			}

			// Check the time left
			if(doneCondition){
				document.getElementById("timer").innerHTML = "DONE";
				clearInterval(slideTimer);
				showResults(studentSlide);
			} else {
				document.getElementById("timer").innerHTML = Math.round(timeLeft / 1000, 2) + ' seconds';
			}
		}, 1000);

		conns.filter(conn => conn.open).forEach(conn => {
			conn.send(studentSlide);
		})

		addMessage(`<span class="selfMsg">Self: Sent question ${currentSlide}</span>`);
	}

	startButton.addEventListener('click', function () {
		// Set the current slide
		// Send it to the students
		currentSlide = 0;
		handleCurrentSlide();
	});

	showNext.addEventListener('click', function () {
		currentSlide += 1;
		if(currentSlide === slides.length - 1){
			showNext.innerHTML = 'Final Results'
		}
		if(currentSlide === slides.length){
			showFinalResults();
			return
		}
		handleCurrentSlide();
	})

	// Clear messages box
	clearMsgsButton.addEventListener('click', clearMessages);

	initialize();
})();
