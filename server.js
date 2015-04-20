var express = require("express");
var app = express();

app.use(express.static("public"));

var server = app.listen(1377, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log("Server up & running...");
});

var io = require("socket.io").listen(server);

const STATUS_IDLE = 0;
const STATUS_CHALLENGED = 1;
const STATUS_READY = 2;

const ERROR_USERNAMEALREADYINUSE = {code:1, message:"Username already in use."};
const ERROR_USERNOTFOUND = {code:2, message:"User not found."};
const ERROR_USERALREADYCHALLENGED = {code:3, message:"User already in game."};

io.sockets.on("connection", function(socket) {

	socket.on("login", function(username) {
		if (nameInUse(username)) {
			err(socket, ERROR_USERNAMEALREADYINUSE);
		} else {
			socket.username = username;
			socket.logged = true;
			socket.challenge = null;
			socket.roomId = null;
			socket.status = STATUS_IDLE;
			socket.join("lobby");
			socket.emit("logged", socket.id);
			broadcastUsersList("lobby");
			console.log(username + " has connected");
		}
	});

	socket.on("challenge", function(id) {
		var user = getUserById(id);		
		if (user != null) {
			if (user.status == STATUS_IDLE) {
				user.status = STATUS_CHALLENGED;
				user.challenge = socket.id;
				user.emit("challenge", socket.id);

				socket.status = STATUS_CHALLENGED;
				socket.challenge = id;
				socket.emit("challenge", socket.id);

				broadcastUsersList("lobby");

				console.log(socket.username + " has challenged " + user.username);
			} else err(socket, ERROR_USERALREADYCHALLENGED);
		} else {
			err(socket, ERROR_USERNOTFOUND);
		}
	});

	socket.on("acceptChallenge", function() {
		var user = getUserById(socket.challenge);
		if (user != null) {
			var roomId = socket.challenge + "~" + user.challenge;
			user.join(roomId);
			user.leave("lobby");
			user.roomId = roomId;
			socket.join(roomId);
			socket.leave("lobby");
			socket.roomId = roomId;
			broadcastUsersList(roomId);
			broadcastUsersList("lobby");
			io.sockets.in(roomId).emit("challengeAccepted");
			createGame(roomId);
			console.log(socket.username + " has accepted challenge from " + user.username);
		} else {
			socket.challenge = null;
			socket.status = 0;
			err(socket, ERROR_USERNOTFOUND);
		}
	});

	socket.on("denyChallenge", function() {
		var user = getUserById(socket.challenge);
		if (user != null) {
			user.challenge = null;
			user.emit("challengeDenied");
			user.status = STATUS_IDLE;
			
			socket.challenge = null;
			socket.emit("challengeDenied");
			socket.status = STATUS_IDLE;

			broadcastUsersList("lobby");

			console.log(socket.username + " has denied challenged from " + user.username);
		} else {
			socket.challenge = null;
			socket.status = STATUS_IDLE;
			err(socket, ERROR_USERNOTFOUND);
		}
	});

	socket.on("cancelChallenge", function() {
		var user = getUserById(socket.challenge);
		if (user != null) {
			user.challenge = null;
			user.emit("challengeCanceled");
			user.status = STATUS_IDLE;
			
			socket.challenge = null;
			socket.emit("challengeCanceled");
			socket.status = STATUS_IDLE;

			broadcastUsersList("lobby");

			console.log(socket.username + " has canceled his challenge against " + user.username);
		} else {
			socket.challenge = null;
			socket.status = STATUS_IDLE;
			err(socket, ERROR_USERNOTFOUND);
		}
	});

	socket.on("leaveRoom", function() {
		var user = getUserById(socket.challenge);
		var roomId = socket.roomId;
		io.sockets.in(roomId).emit("roomLeaved");
		if (games[roomId]) delete games[roomId];
		if (user != null) {
			user.challenge = null;
			user.roomId = null;
			user.status = STATUS_IDLE;
			user.leave(roomId);
			user.join("lobby");
		}
		socket.challenge = null;
		socket.roomId = null;
		socket.status = STATUS_IDLE;
		socket.leave(roomId);
		socket.join("lobby");

		console.log(socket.username + " has quit room " + roomId);

		broadcastUsersList("lobby");
	});

	socket.on("ready", function() {
		var roomId = socket.roomId;
		var user = getUserById(socket.challenge);
		socket.status = STATUS_READY;
		console.log(socket.username + " is ready in room " + roomId);
		if (user.status == STATUS_READY) {
			games[roomId].init();
			io.sockets.in(roomId).emit("startGame", games[roomId].getCurrentPlayerId());
			console.log("game started " + socket.username + " vs " + user.username);
		}
		broadcastUsersList(roomId);
	});

	socket.on("chatMessage", function(message) {
		io.sockets.in(socket.roomId).emit("chatMessage", {from:socket.username, id:socket.id, message:message});
	});

	socket.on("selectTile", function(tileId) {
		var roomId = socket.roomId;
		var game = games[roomId];
		if (game) game.selectedTile = tileId;
		io.sockets.in(socket.roomId).emit("selectTile", tileId);
	});

	socket.on("validateTile", function(targetId) {
		var roomId = socket.roomId;
		var game = games[roomId];
		game.validateTile();
		io.sockets.in(roomId).emit("validateTile", targetId);
	});

	socket.on("pickTile", function() {
		io.sockets.in(socket.roomId).emit("pickTile");
	});

	socket.on("moveTile", function(targetId) {
		io.sockets.in(socket.roomId).emit("moveTile", targetId);
	});

	socket.on("dropTile", function(targetId) {
		var roomId = socket.roomId;
		var game = games[roomId];
		if (game) game.dropTile(targetId);
		var matches = game.checkMove();
		if (matches.length >= 4) {
			var winnerId = game.getCurrentPlayerId();
			var winner = getUserById(winnerId);
			var loserId = game.getOtherPlayerId();
			var loser = getUserById(loserId);
			io.sockets.in(winnerId).emit("win", targetId, matches);
			io.sockets.in(loserId).emit("lost", targetId, matches);
			io.sockets.in("lobby").emit("chatMessage", {from:"Server", id:0, message:winner.username + " won a game versus " + loser.username});
			console.log(winner.username + " has won versus " + loser.username);
		} else io.sockets.in(socket.roomId).emit("dropTile", targetId);
	});

	socket.on("disconnect", function() {
		if (socket.username != null) {
			var roomId = socket.roomId;
			if (roomId != null) {
				io.sockets.in(roomId).emit("roomLeaved");
				var user = getUserById(socket.challenge);
				if (games[roomId]) delete games[roomId];
				if (user != null) {
					user.challenge = null;
					user.roomId = null;
					user.status = STATUS_IDLE;
					user.leave(socket.rooms[1]);
					user.join("lobby");
				}
			}
			broadcastUsersList("lobby");
			console.log(socket.username + " has disconnected");
		}
	});
});

var games = {};

function createGame(roomId) {
	var game = {
		playerId: 0,
		players: [],
		grid: [],
		selectedTile: null,
		init: function(roomId) {
			this.playerId = Math.round(Math.random());
			this.grid = [];
			for (var x = 0; x < 4; x++) {
				this.grid[x] = [null,null,null,null];
			}		
		},
		getCurrentPlayerId: function() {
			return this.players[this.playerId];
		},
		getOtherPlayerId: function() {
			return this.players[(this.playerId+1)%2];
		},
		validateTile: function() {
			this.playerId = (this.playerId + 1) % 2;
		},
		dropTile: function(targetId) {
			targetId = targetId.split("_");
			var x = targetId[1];
			var y = targetId[2];
			var props = this.selectedTile.split("_");
			var tile = {};
			tile.name = this.selectedTile;
			tile.props = {
				shape:parseInt(props[1]),
				size:parseInt(props[2]),
				fill:parseInt(props[3]),
				color:parseInt(props[4])
			};
			this.grid[x][y] = tile;
		},
		checkMove: function() {
			var vMatches = this.checkForVerticalMatch();
			var hMatches = this.checkForHorizontalMatch();
			var dMatches = this.checkForDiagonalMatch(false);
			var d2Matches = this.checkForDiagonalMatch(true);
			var matches = vMatches.concat(hMatches.concat(dMatches.concat(d2Matches)));
			return matches;
		},
		addToCheck: function(tile, matchesCount,matches) {
			if (tile) {
				matchesCount.shape += (tile.props.shape == 0) ? -1 : 1;
				matchesCount.size += (tile.props.size == 0) ? -1 : 1;
				matchesCount.fill += (tile.props.fill == 0) ? -1 : 1;
				matchesCount.color += (tile.props.color == 0) ? -1 : 1;
				matches.push(tile.name);
			}
		},
		doCheck: function(matchesCount) {
			if ((Math.abs(matchesCount.shape) == 4) || (Math.abs(matchesCount.size) == 4) || (Math.abs(matchesCount.fill) == 4) || (Math.abs(matchesCount.color) == 4)) {
					return true;
			}
			return false;
		},
		checkForVerticalMatch: function() {
			for (var x = 0; x < 4; x++) {
				var matches = [];
				var matchesCount = {shape:0, size:0, fill:0, color:0};
				for (var y = 0; y < 4; y++) {
					var tile = this.grid[x][y];
					this.addToCheck(tile, matchesCount, matches);				
				}
				if (this.doCheck(matchesCount)) return matches;
			}
			return [];
		},
		checkForHorizontalMatch: function() {
			for (var y = 0; y < 4; y++) {
				var matches = [];
				var matchesCount = {shape:0, size:0, fill:0, color:0};
				for (var x = 0; x < 4; x++) {
					var tile = this.grid[x][y];
					this.addToCheck(tile, matchesCount, matches);
				}
				if (this.doCheck(matchesCount)) return matches;
			}
			return [];
		},
		checkForDiagonalMatch: function(reverse) {
			var matches = [];
			var matchesCount = {shape:0, size:0, fill:0, color:0};
			for (var i = 0; i < 4; i++) {
				var tile = (reverse) ? this.grid[i][3-i] : this.grid[i][i];
				this.addToCheck(tile, matchesCount, matches);
			}
			if (this.doCheck(matchesCount)) return matches;
			return [];
		}
	};
	game.players = roomId.split("~");
	games[roomId] = game;
}

function getUserById(clientId) {
	return io.sockets.connected[clientId] || null;
}

function broadcastUsersList(roomId) {
	var users = [], user;
	var clients_in_the_room = io.sockets.adapter.rooms[roomId];
	for (var clientId in clients_in_the_room ) {
		user = io.sockets.connected[clientId];
		users.push({username:user.username, status:user.status, id:user.id});
	}
	io.sockets.in(roomId).emit("updateUsersList", users);
}

function err(socket, error) {
	socket.emit("err", error);
}

function nameInUse(username) {
	for(var i = 0, l = io.sockets.sockets.length; i < l; i++) {
		var s = io.sockets.sockets[i];
		if (s.username == username) return true;
	}
	return false;
}