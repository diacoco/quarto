$(function() {
	var sockets;
	var quarto = new CDE.Quarto();

	gameReady = function() {
		sockets = new CDE.Sockets();
		$('#loginModal').modal("show");
	}

	radio("ready").subscribe(gameReady);

	// ERROR

	error = function(e) {
		switch(e.code) {
			case 1:
				$("#loginInvalid").show();
				break;
		}
	}

	radio("error").subscribe(error);

	// LOGIN

	$("#loginForm").submit(function(e){
		e.preventDefault();
		if (checkUsername($("#username").val()) && ($("#username").val().toLowerCase() != "server")) sockets.login($("#username").val());
		else $("#loginInvalid").show();
	});

	logged = function() {
		$('#loginModal').modal("hide");
		displayChatMessage("Server", "Welcome to the lobby...", true);
	}
	
	radio("logged").subscribe(logged);

	checkUsername = function(username) {
		var re = /^\w+$/i;
		return re.test(username);
	}

	// USERS LIST

	updateUsersList = function(users) {
		var usersTD = "";
		for (var i = 0, l = users.length; i < l; i++) {
			if (users[i].id == sockets.userId) {
				switch (users[i].status)
				{
					case 0:
						usersTD += "<tr><td class='bg-info'> "+users[i].username+"</td></tr>";
						break;
					case 1:
						usersTD += "<tr><td class='bg-warning'>"+users[i].username+"</td></tr>";
						break;
					case 2:
						usersTD += "<tr><td class='bg-success'>"+users[i].username+"</td></tr>";
						break;
				}
			}
			else {
				switch (users[i].status)
				{
					case 0:
						usersTD += "<tr><td>"+users[i].username+"<button type='button' class='btn btn-default pull-right btn-xs challenge-btn' data-id='"+users[i].id+"'><span class='glyphicon glyphicon-screenshot'></span></button></td></tr>";
						break;
					case 1:
						usersTD += "<tr><td class='bg-warning'>"+users[i].username+"</td></tr>";
						break;
					case 2:
						usersTD += "<tr><td class='bg-success'>"+users[i].username+"</td></tr>";
						break;
				}
			}
		}
		$('#users').html(usersTD);
	}

	radio("updateUsersList").subscribe(updateUsersList);

	// PLAYER READY

	$("#users").on("click", ".ready-btn", function() {
		sockets.ready();
	});

	// CHAT

	$("#chatForm").submit(function(e){
		e.preventDefault();
		sockets.chatMessage($("#chatForm .message").val());
		$("#chatForm .message").val("");
		$("#chatForm .message").focus();
	});

	chatMessage = function(data) {
		displayChatMessage(data.from, data.message);
	}

	radio("chatMessage").subscribe(chatMessage);

	displayChatMessage = function(from, message, clear) {
		var style = "";
		if (from.toLowerCase() == "server") {
			from = from.toUpperCase();
			style = " class='server-message'";
		}
		if (clear) $("#chat").html("<span"+style+"><strong>"+from+"&gt; </strong>"+message+"<br/></span>");
		else $("#chat").append("<span"+style+"><strong>"+from+"&gt; </strong>"+message+"<br/></span>");
		var containerHeight = $(".chat-messages").height();
		var contentHeight = $(".chat-messages-container").outerHeight();
		$(".chat-messages").scrollTop(contentHeight - containerHeight);
	}	

	// CHALLENGE

	$("#users").on("click", ".challenge-btn", function() {
		sockets.challenge($(this).data('id'));
	});

	$("#denyChallenge").click(function(e) {
		sockets.denyChallenge();
	});

	$("#acceptChallenge").click(function(e) {
		sockets.acceptChallenge();
	});

	$("#cancelChallenge").click(function(e) {
		sockets.cancelChallenge();
	});

	$(".quit-room").click(function(e) {
		sockets.leaveRoom();
	});

	$("#quit").click(function(e) {
		sockets.leaveRoom();
	});

	$("#replay").click(function(e) {
		sockets.replay();
		$(".game-over").animate({opacity:0}, 300, function(){$(".game-over").hide();});
	});

	challenge = function(user) {
		if (user.id == sockets.userId) $('#challengerModal').modal("show");
		else {
			$('#challengeModal .modal-title').html("New challenge from <strong>" + user.username + "</strong>");
			$('#challengeModal').modal("show");
		}
	}

	radio("challenge").subscribe(challenge);

	challengeAccepted = function() {
		$(".quit-room").show();
		$('#challengeModal').modal("hide");
		$('#challengerModal').modal("hide");
		displayChatMessage("Server", "Let's get ready to rumble...", true);
	}

	radio("challengeAccepted").subscribe(challengeAccepted);

	challengeDenied = function() {
		$('#challengeModal').modal("hide");
		$('#challengerModal').modal("hide");
	}

	radio("challengeDenied").subscribe(challengeDenied);

	challengeCanceled = function() {
		$('#challengeModal').modal("hide");
		$('#challengerModal').modal("hide");
	}

	radio("challengeCanceled").subscribe(challengeCanceled);

	// ROOM LEAVED

	roomLeaved = function() {
		console.log("roomLeaved");
		$(".quit-room").hide();
		$(".your-turn").animate({top:"0px", opacity:0}, 300);
		$(".game-over").animate({opacity:0}, 300, function(){$(".game-over").hide();});
		displayChatMessage("Server", "Back to the lobby...", true);
		quarto.reset();
	}

	radio("roomLeaved").subscribe(roomLeaved);

	// GAME

	startGame = function(itsMyTurn) {
		$(".game-over").animate({opacity:0}, 300, function(){$(".game-over").hide();});
		if (itsMyTurn) {
			$(".your-turn").animate({top:"20px", opacity:1}, 300);
			displayChatMessage("Server", "Select a tile for your opponent and place it on the validation square.");
		}
		else displayChatMessage("Server", "Please wait for opponent move.");
		quarto.reset();
		quarto.start(itsMyTurn);
	}

	radio("startGame").subscribe(startGame);

	selectTile = function(tileId) {
		quarto.selectTile(tileId);
	}

	radio("selectTile").subscribe(selectTile);

	validateTile = function(targetId) {
		quarto.validateTile(targetId);
		if (quarto.canPickTile) {
			$(".your-turn").animate({top:"20px", opacity:1}, 300);
			displayChatMessage("Server", "It's your turn, pick the tile and place it somewhere on the board.");
		} 
		else {
			$(".your-turn").animate({top:"0px", opacity:0}, 300);
			displayChatMessage("Server", "Please wait for opponent move.");
		}
	}

	radio("validateTile").subscribe(validateTile);

	pickTile = function() {
		quarto.pickTile();
	}

	radio("pickTile").subscribe(pickTile);

	moveTile = function(targetId) {
		quarto.moveTile(targetId);
	}

	radio("moveTile").subscribe(moveTile);

	dropTile = function(targetId) {
		quarto.dropTile(targetId);
		if (quarto.canSelectTile) displayChatMessage("Server", "Now select a tile for your opponent and place it on the validation square.");
	}

	radio("dropTile").subscribe(dropTile);

	win = function(targetId, tiles) {
		$("win").show();
		$("lost").hide();
		$(".your-turn").animate({top:"0px", opacity:0}, 300);
		quarto.gameOver(targetId, tiles);
	}

	radio("win").subscribe(win);
	
	lost = function(targetId, tiles) {
		$(".lost").show();
		$(".win").hide();
		$(".your-turn").animate({top:"0px", opacity:0}, 300);
		quarto.gameOver(targetId, tiles);
	}

	radio("lost").subscribe(lost);

	gameOver = function() {
		$(".game-over").show();
		$(".game-over").animate({opacity:1}, 300);
	}

	radio("gameOver").subscribe(gameOver);

	//

	tileSelected = function(tileId) {
		sockets.selectTile(tileId);
	}

	radio("tileSelected").subscribe(tileSelected);

	tileValidated = function(targetId) {
		sockets.validateTile(targetId);
	}

	radio("tileValidated").subscribe(tileValidated);

	tilePicked = function() {
		sockets.pickTile();
	}

	radio("tilePicked").subscribe(tilePicked);
	
	tileMoved = function(targetId) {
		sockets.moveTile(targetId);
	}

	radio("tileMoved").subscribe(tileMoved);

	tileDroped = function(targetId) {
		sockets.dropTile(targetId);
	}

	radio("tileDroped").subscribe(tileDroped);

	$.fn.modal.Constructor.DEFAULTS.keyboard = false;
	$.fn.modal.Constructor.DEFAULTS.backdrop = "static"

	function reposition() {
		var modal = $(this), dialog = modal.find(".modal-dialog");
		modal.css("display", "block");
		dialog.css("margin-top", Math.max(0, ($(window).height() - dialog.height()) / 2));
	}
	$(".modal").on("show.bs.modal", reposition);
	$(window).on("resize", function() {
		$(".modal:visible").each(reposition);
	});
});