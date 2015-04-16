var CDE = CDE || {};
var Sockets;
var SERVER_IP_PORT = "http://localhost:1377";

CDE.Sockets = function() {
	
	var self = this;

	this.users = [];
	this.userId = "";

	this.socket = io(SERVER_IP_PORT);
	
	this.socket.on("err", function(e) {
		radio("error").broadcast(e);
	});

	this.socket.on("logged", function(id) {
		self.userId = id;
		radio("logged").broadcast();
	});

	this.socket.on("updateUsersList", function(usersList) {
		self.users = usersList;
		radio("updateUsersList").broadcast(usersList);
	});

	this.socket.on("chatMessage", function(message) {
		radio("chatMessage").broadcast(message);
	});

	this.socket.on("challenge", function(id) {
		radio("challenge").broadcast(self.getUserById(id));
	});

	this.socket.on("challengeAccepted", function() {
		radio("challengeAccepted").broadcast();
	});

	this.socket.on("challengeDenied", function() {
		radio("challengeDenied").broadcast();
	});

	this.socket.on("challengeCanceled", function() {
		radio("challengeCanceled").broadcast();
	});

	this.socket.on("roomLeaved", function() {
		radio("roomLeaved").broadcast();
	});

	this.socket.on("startGame", function(playerId) {
		console.log("startGame", playerId, self.userId, playerId == self.userId);
		radio("startGame").broadcast(playerId == self.userId);
	});

	this.socket.on("selectTile", function(tileId) {
		radio("selectTile").broadcast(tileId);
	});

	this.socket.on("validateTile", function(targetId) {
		radio("validateTile").broadcast(targetId);
	});

	this.socket.on("pickTile", function(targetId) {
		radio("pickTile").broadcast(targetId);
	});

	this.socket.on("moveTile", function(targetId) {
		radio("moveTile").broadcast(targetId);
	});

	this.socket.on("dropTile", function(targetId) {
		radio("dropTile").broadcast(targetId);
	});

	this.socket.on("win", function(targetId, tiles) {
		radio("win").broadcast(targetId, tiles);
	});

	this.socket.on("lost", function(targetId, tiles) {
		radio("lost").broadcast(targetId, tiles);
	});

	this.socket.on("err", function(error) {
		radio("error").broadcast(error);
	});
}

CDE.Sockets.prototype.constructor = CDE.Sockets;

CDE.Sockets.prototype.login = function(username) {
	this.socket.emit("login", username);
}

CDE.Sockets.prototype.chatMessage = function(message) {
	message = this.escapeHTML(message);
	this.socket.emit("chatMessage", message);
}

CDE.Sockets.prototype.challenge = function(userId) {
	this.socket.emit("challenge", userId);
}

CDE.Sockets.prototype.acceptChallenge = function() {
	this.socket.emit("acceptChallenge");
}

CDE.Sockets.prototype.denyChallenge = function() {
	this.socket.emit("denyChallenge");
}

CDE.Sockets.prototype.cancelChallenge = function() {
	this.socket.emit("cancelChallenge");
}

CDE.Sockets.prototype.leaveRoom = function() {
	this.socket.emit("leaveRoom");
}

CDE.Sockets.prototype.ready = function() {
	this.socket.emit("ready");
}

CDE.Sockets.prototype.selectTile = function(tileId) {
	this.socket.emit("selectTile", tileId);
}

CDE.Sockets.prototype.validateTile = function(targetId) {
	this.socket.emit("validateTile", targetId);
}

CDE.Sockets.prototype.pickTile = function() {
	this.socket.emit("pickTile");
}

CDE.Sockets.prototype.moveTile = function(targetId) {
	this.socket.emit("moveTile", targetId);
}

CDE.Sockets.prototype.dropTile = function(targetId) {
	this.socket.emit("dropTile", targetId);
}

CDE.Sockets.prototype.getUserById = function(id) {
	for (var i=0, l=this.users.length; i < l; i++) {
		if (this.users[i].id == id) return this.users[i];
	}
	return null;
}

CDE.Sockets.prototype.escapeHTML = function(html) {
	var fn=function(tag) {
		var charsToReplace = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&#34;'
		};
		return charsToReplace[tag] || tag;
	}
	return html.replace(/[&<>"]/g, fn);
}