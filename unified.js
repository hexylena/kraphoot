function getUrlParam(name){
	return (new URL(document.location)).searchParams.get(name);
}

const roomIdBase = 'e8a2e4ea-galaxy-training-network-';
const is_teacher = getUrlParam('teacher') !== null;

function generateRoomId(){
	var roomNumber = (Math.random() * 10000000).toString().substring(0, 4),
		roomId = roomIdBase + roomNumber;

	return [roomNumber, roomId]
}


function postInit(){
	console.log(is_teacher)
	if(!is_teacher){
		var urlOption = getUrlParam("id");
		if(urlOption !== null){
			//recvIdInput.value = urlOption;
			join(null, urlOption);
			//setTimeout(function() { join(null, urlOption) }, 500);
		}
		showWelcome();
	} else {
		status.innerHTML = "Awaiting connections...";
	}
}

function peerOn(id){
	// Workaround for peer.reconnect deleting previous id
	if (peer.id === null) {
		console.log('Received null id from peer open');
		peer.id = lastPeerId;
	} else {
		lastPeerId = peer.id;
	}

	console.log('ID: ' + peer.id, is_teacher);
	postInit();
}

function peerClose(){
	conn = null;
	status.innerHTML = "Connection destroyed. Please refresh";
	console.log('Connection destroyed');
}
function peerError (err) {
	console.log(err);
	questionArea.innerHTML = err;
}

function peerConnect(c){
	console.log("Peer connected", c, is_teacher)
	if(!is_teacher){
		// Disallow incoming connections
		c.on('open', function() {
			c.send("Sender does not accept incoming connections");
			setTimeout(function() { c.close(); }, 500);
		});
	} else {
		// Allow only a single connection
		conns.push(c);
		players[c.peer] = {}
		updateStudentList();
		ready();

		setTimeout(function(){
			c.send({type: 'setup', title: quiz_title});
		}, 1000);
	}
}

function peerDisconnect() {
	status.innerHTML = "Connection lost. Please reconnect";
	console.log('Connection lost. Please reconnect');

	// Workaround for peer.reconnect deleting previous id
	peer.id = lastPeerId;
	peer._lastServerId = lastPeerId;
	peer.reconnect();
}

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
	console.log('connecting to e8a2e4ea-galaxy-training-network-' + connectToId)
	conn = peer.connect('e8a2e4ea-galaxy-training-network-' + connectToId, {
		reliable: true
	});

	conn.on('open', function () {
		status.innerHTML = "Connected to: gtn-" + conn.peer.substring(33);
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
	} else {
		console.log('Connection is closed');
	}
}

function safeSend(msg){
	console.log("Sending", msg)
	if (conn && conn.open) {
		conn.send(msg);
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
	if(is_teacher){
		return showQuestionTeacher(data);
	} else {
		return showQuestionStudent(data);
	}
}

function showQuestionStudent(data){
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


function showQuestionTeacher(data){
	var show = `<h2>${data.title}</h2><div class="answer-group" style="display: none;">`;
	show += data.answers.map((q, idx) => {
		return `
			<button id="answer-${data.id}-${idx}" value="${q}" class="btn answer-button">${q}</button>
		`
	}).join("");

	show += '</div>'
	return show;
}

function updateStudentList(){
	status.innerHTML = `${conns.length} connections`;
	if(currentSlide === -1) {
		lobby.innerHTML =
			Object.keys(players).map(playerId => {
				return `<div class="player-name">${playerName(playerId)}</div>`
			}).join(" ") + '</div>';
	}
}

function processStudentMessage(connId, message){
	console.log(connId, message)
	if(message.event == "registerPlayer"){
		players[connId] = {
			"name": message.player.name,
		}
		updateStudentList();
	} else if (message.event === "answer") {
		if(message.question !== currentSlide){
			console.log("Attempting to answer wrong question! Ignoring.")
			return
		}

		slides[currentSlide].results[connId] =
			slides[currentSlide].answers.indexOf(message.result)

		if(slides[currentSlide].live){
			showResults(slides[currentSlide])
		}

		console.log(slides[currentSlide])
	} else {
		console.log("Unknown message", message);
	}
}

function chunkArray(array, chunkSize){
	var chunks = []
	for (let i = 0; i < array.length; i += chunkSize) {
		chunks.push(array.slice(i, i + chunkSize));
	// do whatever
	}
	return chunks;
}

function broadcast(msg){
	console.log("Broadcast", msg)
	conns.filter(conn => conn && conn.open).forEach(conn => {
		conn.send(msg);
	})
}

function showResults(){
	var slide = slides[currentSlide];
	var show = '<h1>Results</h1>';
	var counts = {}
	var final_count = 0;
	Object.keys(slide.results).forEach(connId => {
		var theirAnswer = slide.results[connId];
		var answerKey = "";
		if(theirAnswer < 0){
			answerKey = "SOMETHING ODD";
		} else {
			answerKey = slide.answers[theirAnswer]
			final_count += 1;
		}

		if(answerKey === slide.correct){
			console.log(players[connId])
			players[connId]['score'] = 1 + (players[connId]['score'] || 0);
		}

		counts[answerKey] = 1 + (counts[answerKey] || 0)
	})
	slide.final_results = counts;
	slide.final_count = final_count;
	console.log(slide)
	console.log(players)

	show += '<table class="table table-striped">'
	slide.answers.forEach(x => {
		show += `<tr ${slide.correct ===  x ? 'class="correct-answer"' : ''}><td>${x}</td> <td><div class="bar-chart" style="width: ${25 * (counts[x] || 0) / final_count}em">${counts[x] || 0}</div></td></tr>`
	})
	show += '</table>'
	questionArea.innerHTML = show;
}

function renderTable(arr, headers){
	show = '<table class="table table-striped">'
	if(headers !== undefined){
		show += '<thead>'
		show += "<tr>" + headers.map(col => `<th>${col}</th>`).join("") + "</tr>"
		show += '</thead>'
	}
	show += '<tbody>'
	show += arr.map(row => {
		return "<tr>" + row.map(col => `<td>${col}</td>`).join("") + "</tr>"
	}).join("")
	show += '</tbody>'
	show += '</table>'
	show += '</div>'
	return show
}

function playerName(playerId){
	return players[playerId].name || "Anonymous " + playerId.substr(0, 6)
}

function showFinalResults(){
	var show = '<h1>Final Results</h1>';
	var counts = {}
	// Ensure they have a score.
	var playerIds = Object.keys(players);
	playerIds.forEach(playerId => { players[playerId].score = players[playerId].score || 0 })

	// Sort them
	playerIds.sort(function(a, b){return players[b].score - players[a].score});

	// Display
	show += renderTable(playerIds.map(playerId => {
		return [
			playerName(playerId),
			players[playerId].score || 0
		]
	}).slice(0, 3), ['Name', 'Score'])
	show += '</table>'


	// Difficult questions
	show += '<h2>Difficult Questions</h2>';
	// What's our def here? Top 3 worst?
	worstQuestions = slides
		.filter(s => s.type !== "poll")
		.map(s => {
			var pc = 0;
			if (!s.final_results || !s.final_results[s.correct]) {
				pc = 0;
			} else {
				if(s.final_count == 0){
					pc = 0;
				} else {
					pc = s.final_results[s.correct] / s.final_count;
				}
			}

			return {
				"title": s.title,
				"correct": s.correct,
				"final_results": s.final_results,
				"pc": pc,
				"percent_correct": (pc * 100).toFixed(1) + '%',
			}
		})
		.filter(s => s.pc < 1)

	// Sort by % correct
	worstQuestions.sort((a, b) => b.percent_correct < a.percent_correct)

	// Render
	show += renderTable(worstQuestions.slice(0, 3).map(wq => {
		return [
			wq.title,
			wq.percent_correct,
			JSON.stringify(wq.final_results)
			//renderTable(Object.keys(wq.final_results).map(x => [x, wq.final_results[x]]))
		]
	}), ['Question', '% Correct', 'Answers'])

	show += '</div>'

	console.log(worstQuestions)


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
		live: slides[currentSlide].live,
	}

	questionArea.innerHTML = showQuestion(studentSlide);
	broadcast({type: 'clear', question: currentSlide})

	var haveBroadcast = false;

	// Update the count down every 1 second
	slideTimer = setInterval(function() {
		var now = new Date().getTime(),
			showQuestionLeft = studentSlide.started + 5000 - now
			timeLeft = studentSlide.started + (studentSlide.timeout * 1000) + 5000 - now;

		if(showQuestionLeft < 0){
			if(!haveBroadcast){
				haveBroadcast = true;
				broadcast(studentSlide)
				document.getElementsByClassName("answer-group")[0].style.display = '';
			}
		} else {
			document.getElementById("progress").style.width = ((5000 - showQuestionLeft) / 50) + "vw"
			return;
		}

		var doneCondition = timeLeft < 0;
		// How many students have answered?
		if(Object.keys(players).length === Object.keys(slides[currentSlide].results).length && ! slides[currentSlide].live){
			doneCondition = true
		}

		// Check the time left
		if(doneCondition){
			document.getElementById("progress").style.width = "100vw"
			document.getElementById("progress").innerHTML = "&nbsp;";
			clearInterval(slideTimer);
			showResults(studentSlide);
			if(studentSlide.type !== "poll"){
				broadcast({
					"type": "answer",
					"question": currentSlide,
					"answer": slides[currentSlide].correct
				});
			}
		} else {
			document.getElementById("progress").style.width = timeLeft / studentSlide.timeout / 10 + "vw"
			document.getElementById("progress").innerHTML = Math.round(timeLeft / 1000, 2);
		}
	}, 25);

}

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

function advanceListener(){
	// Remove any existing timer if there is one.
	clearInterval(slideTimer);
	advanceButton.innerHTML = 'Next Question'
	currentSlide += 1;
	if(currentSlide === slides.length - 1){
		advanceButton.innerHTML = 'Final Results'
	}
	if(currentSlide === slides.length){
		advanceButton.style.display = 'none';
		showFinalResults();
		return
	}
	handleCurrentSlide();
}

function hideJoin(){
	document.getElementById("connect-area").style.display = 'none';
}

function showDebug(){
	document.getElementsByClassName("debug-info")[0].style.display = '';
}

function loadQuiz(url){
	fetch(url)
		.then(response => response.json())
		.then(data => {
			slides = data.questions.map(x => {
				x.results = {};
				return x
			});

			quiz_title = data.title;
			document.getElementById("title").innerHTML = data.title;
			document.getElementsByTagName("title")[0].innerHTML = data.title;
		})
}
