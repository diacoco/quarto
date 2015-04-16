var CDE = CDE || {};

CDE.Quarto = function() {
	this.canvas = document.getElementById("gameCanvas");
	this.abs = Math.abs;
	this.cos = Math.cos;
	this.min = Math.min;
	this.max = Math.max;
	this.floor = Math.floor;
	this.PI = Math.PI;
	this.player = 0;
	this.mouse = new THREE.Vector2();
	this.loader = new CDE.Loader();
	this.loader.init(this.ready.bind(this));
}

CDE.Quarto.prototype.constructor = CDE.Quarto;

CDE.Quarto.prototype.ready = function() {
	this.updateDisplayInfo();
	// scene
	this.threeScene = new THREE.Scene();
	this.threeScene.add(new THREE.AmbientLight(0xc0c0c0));
	this.threeCamera = new THREE.PerspectiveCamera(40, this.display.ratio, 1, 10000);
	this.threeCamera.position.set(30, 30, 0);
	this.threeCamera.lookAt(new THREE.Vector3(0, 0, 0));
	this.threeScene.add(this.threeCamera);
	// lights
	this.light = new THREE.SpotLight(0xf2dbd4, 1, 0, Math.PI / 2, 1);
	this.light.position.set(0, 150, 10);
	this.light.target.position.set(0, 0, 0);
	this.light.castShadow = true;
	this.light.shadowCameraNear = 130;
	this.light.shadowCameraFar = 160;
	this.light.shadowCameraFov = 15;
	//this.light.shadowCameraVisible = true;
	this.light.shadowBias = 0.001;
	this.light.shadowDarkness = 0.5;
	this.light.shadowMapWidth = 2048;
	this.light.shadowMapHeight = 2048;
	this.threeScene.add(this.light);
	// renderer
	this.threeRenderer = new THREE.WebGLRenderer({
		canvas: this.canvas,
		antialias: true,
		devicePixelRatio: this.display.devicePixelRatio,
		alpha: false
	});
	this.threeRenderer.setSize(this.display.width, this.display.height);
	this.threeRenderer.setClearColor(0xdbdecc);
	this.threeRenderer.autoClear = true;
	this.threeRenderer.shadowMapEnabled = true;
	this.threeRenderer.shadowMapType = THREE.BasicShadowMap;
	//
	this.raycaster = new THREE.Raycaster();
	// Orbit control
	this.controls = new THREE.OrbitControls(this.threeCamera, this.threeRenderer.domElement);
	this.controls.userPan = false;
	this.controls.userPanSpeed = 0.0;
	this.controls.maxDistance = 50.0;
	this.controls.maxPolarAngle = Math.PI * 0.495;
	this.controls.center.set(0, 0, 0);
	//
	this.initObjects();
}

CDE.Quarto.prototype.initObjects = function() {
	this.set = [];
	var materials = [new THREE.MeshPhongMaterial({color:0x362f2d, transparent:true}),new THREE.MeshPhongMaterial({color:0xd0a26c, transparent:true})];
	for (var i = 0, l = this.loader.set.children.length; i < l; i++) {
		var geometry = this.loader.set.children[i].children[0].geometry.clone();
		if (this.loader.set.children[i].name == "board") {
			var material = new THREE.MeshPhongMaterial({color:0xffffff, map:this.loader.boardMap});
			this.board = new THREE.Mesh(geometry, material);
			this.threeScene.add(this.board);
			this.board.canMove = false;
			this.board.castShadow = false;
			this.board.receiveShadow = true;
		} else {
			for (var j = 0; j < 2; j++) {
				var tile = new THREE.Mesh(geometry, materials[j]);
				tile.name = this.loader.set.children[i].name + "_" + j;
				var props = this.loader.set.children[i].name.split("_");
				tile.props = {
					shape:parseInt(props[1]),
					size:parseInt(props[2]),
					fill:parseInt(props[3]),
					color:j
				};
				tile.castShadow = true;
				tile.receiveShadow = false;
				tile.canMove = true;
				if (i % 2) tile.origin = new THREE.Vector3((i * 2.5) - 8.50, -1, (j * 26) -13);
				else tile.origin = new THREE.Vector3((i * 2.5) - 8.50, -1, (j * -26) +13);
				this.threeScene.add(tile);
				this.set.push(tile);
			}
		}
	}

	var material = new THREE.MeshPhongMaterial({color:0xff0000});
	var geometry = new THREE.CylinderGeometry(.5, 0, 2, 16, 1);
	var bottomHelper = new THREE.Mesh(geometry, material);
	bottomHelper.position.y = 1;

	this.helper = new THREE.Object3D();
	this.helper.add(bottomHelper);
	this.helper.position.y = 100;
	this.threeScene.add(this.helper);

	this.targets = [];
	var material = new THREE.MeshBasicMaterial({color:0xffff00, transparent:true, opacity:0});
	var geometry = new THREE.PlaneBufferGeometry(3, 3, 1, 1);
	for (var x = 0; x < 4; x++) {
		for (var z = 0; z < 4; z++) {
			var plane = new THREE.Mesh(geometry, material);
			plane.name = "target_" + x + "_" + z;
			plane.origin = new THREE.Vector2(x, z);
			plane.isTarget = true;
			plane.rotation.x = -this.PI/2;
			plane.position.x = (x * 3.3)-4.95;
			plane.position.z = (z * 3.3)-4.95;
			plane.position.y = .05;
			this.threeScene.add(plane);
			this.targets.push(plane);
		}
	}

	var material = new THREE.MeshBasicMaterial({map:this.loader.validatorMap, transparent:true});
	var geometry = new THREE.PlaneBufferGeometry(6, 6, 1, 1);
	var validatorTop = new THREE.Mesh(geometry, material);
	validatorTop.name = "validatorTop";
	validatorTop.isValidator = true;
	validatorTop.rotation.x = -this.PI/2;
	validatorTop.rotation.z = this.PI/2;
	validatorTop.position.x = -15;
	validatorTop.position.z = 6;
	validatorTop.position.y = -1;
	this.threeScene.add(validatorTop);
	
	this.loader.set = null;
	this.startRender();
}

CDE.Quarto.prototype.startRender = function() {
	var self = this;
	this.resize();
	this.mousedown = this.onDocumentMouseDown.bind(this);
	this.mousemove = this.onDocumentMouseMove.bind(this);
	window.addEventListener("resize", function(){
		self.resize();
	});
	this.animId = window.requestAnimationFrame(function(){self.gameAnim()});
	this.reset();	
	radio("ready").broadcast();
}

CDE.Quarto.prototype.reset = function() {

	for (var i = 0, l = this.set.length; i < l; i++) {
		var tile = this.set[i];
		tile.position.x = tile.origin.x;
		tile.position.y = tile.origin.y;
		tile.position.z = tile.origin.z;
		tile.canMove = true;
	}
	for (var i = 0, l = this.targets.length; i < l; i++) {
		var target = this.targets[i];
		target.isTarget = true;
	}

	this.nextTarget = null;
	this.canSelectTile = false;
	this.canPickTile = false;
	this.canMoveTile = false;
	this.helper.position.y = 100;
}

CDE.Quarto.prototype.start = function(canSelectTile) {
	this.canSelectTile = canSelectTile;
	this.threeRenderer.domElement.addEventListener("mousedown", this.mousedown, false);
	this.threeRenderer.domElement.addEventListener("mousemove", this.mousemove, false);
}

CDE.Quarto.prototype.onDocumentMouseMove = function(event) {
	this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	this.mouse.y = - (event.clientY / (window.innerHeight * .7)) * 2 + 1;
}

CDE.Quarto.prototype.onDocumentMouseDown = function(event) {
	this.raycaster.setFromCamera(this.mouse, this.threeCamera);
	var intersects = this.raycaster.intersectObjects(this.threeScene.children);
	if (this.canSelectTile) {
		var intersected, validator;
		for (var i = 0, l = intersects.length; i < l; i++) {
			if (intersects[i].object.canMove) intersected = intersects[i].object;
			if (intersects[i].object.isValidator) validator = intersects[i].object;
		}
		if (intersected) 
			radio("tileSelected").broadcast(intersected.name);
		if (validator && this.selectedTile) 
			radio("tileValidated").broadcast(validator.name);
	}
	if (this.canPickTile) {
		var intersected;
		for (var i = 0, l = intersects.length; i < l; i++) {
			if (intersects[i].object == this.selectedTile) intersected = this.selectedTile;
		}
		if (intersected)
			radio("tilePicked").broadcast();
	}
	if (this.canMoveTile) {
		var target;
		for (var i = 0, l = intersects.length; i < l; i++) {
			if (intersects[i].object.isTarget) target = intersects[i].object;
		}
		if (target)
			radio("tileDroped").broadcast(target.name);
	}
}

CDE.Quarto.prototype.selectTile = function(tileId) {
	this.unselectTile();
	this.selectedTile = this.threeScene.getObjectByName(tileId);
	this.pickTile();
}

CDE.Quarto.prototype.unselectTile = function() {
	if (this.selectedTile) {
		var tween = new TWEEN.Tween({x:this.selectedTile.position.x, y:this.selectedTile.position.y, z:this.selectedTile.position.z, tile:this.selectedTile})
		.to({x:this.selectedTile.origin.x, y:this.selectedTile.origin.y, z:this.selectedTile.origin.z}, 300)
		.easing(TWEEN.Easing.Quadratic.InOut)
		.onUpdate(function () {
			this.tile.position.x = this.x;
			this.tile.position.y = this.y;
			this.tile.position.z = this.z;
		}).start();
	}
}

CDE.Quarto.prototype.validateTile = function(targetId) {
	var target = this.threeScene.getObjectByName(targetId);
	var tween = new TWEEN.Tween({x:this.selectedTile.position.x, y:this.selectedTile.position.y, z:this.selectedTile.position.z, tile:this.selectedTile})
	.to({x:target.position.x, y:target.position.y, z:target.position.z}, 300)
	.easing(TWEEN.Easing.Quadratic.InOut)
	.onUpdate(function () {
		this.tile.position.x = this.x;
		this.tile.position.y = this.y;
		this.tile.position.z = this.z;
	}).start();
	if (this.canSelectTile == false)
		this.canPickTile = true;
	this.canSelectTile = false;
	this.selectedTile.canMove = false;
}

CDE.Quarto.prototype.pickTile = function() {
	var tween = new TWEEN.Tween({y:this.selectedTile.position.y, tile:this.selectedTile})
	.to({y:6}, 300)
	.easing(TWEEN.Easing.Quadratic.InOut)
	.onUpdate(function () {
		this.tile.position.y = this.y;
	}).start();
	if (this.canPickTile)
		this.canMoveTile = true;
	this.canPickTile = false;
}

CDE.Quarto.prototype.moveTile = function(targetId) {
	var target = this.threeScene.getObjectByName(targetId);
	var tween = new TWEEN.Tween({x:this.selectedTile.position.x, z:this.selectedTile.position.z, tile:this.selectedTile})
	.to({x:target.position.x, z:target.position.z}, 300)
	.easing(TWEEN.Easing.Quadratic.InOut)
	.onUpdate(function () {
		this.tile.position.x = this.x;
		this.tile.position.z = this.z;
	}).start();
	this.helper.position.set(target.position.x, target.position.y, target.position.z);
}

CDE.Quarto.prototype.dropTile = function(targetId) {
	var target = this.threeScene.getObjectByName(targetId);
	target.isTarget = false;
	var tween = new TWEEN.Tween({x:this.selectedTile.position.x, y:this.selectedTile.position.y, z:this.selectedTile.position.z, tile:this.selectedTile})
	.to({x:target.position.x, y:target.position.y, z:target.position.z}, 300)
	.easing(TWEEN.Easing.Quadratic.InOut)
	.onUpdate(function () {
		this.tile.position.x = this.x;
		this.tile.position.y = this.y;
		this.tile.position.z = this.z;
	}).start();
	if (this.canMoveTile)
		this.canSelectTile = true;
	this.canMoveTile = false;
	this.selectedTile = false;
	this.helper.position.y = 100;
}

CDE.Quarto.prototype.gameOver = function(targetId, tiles) {
	var self = this;
	var target = this.threeScene.getObjectByName(targetId);
	target.isTarget = false;
	var tween = new TWEEN.Tween({x:this.selectedTile.position.x, y:this.selectedTile.position.y, z:this.selectedTile.position.z, tile:this.selectedTile})
	.to({x:target.position.x, y:target.position.y, z:target.position.z}, 300)
	.easing(TWEEN.Easing.Quadratic.InOut)
	.onUpdate(function () {
		this.tile.position.x = this.x;
		this.tile.position.y = this.y;
		this.tile.position.z = this.z;
	}).onComplete(function() {
		for (var i = 0; i < tiles.length; i++) {
			var tile = self.threeScene.getObjectByName(tiles[i]);
			var tween = new TWEEN.Tween({y:tile.position.y, tile:tile})
			.to({y:6}, 300)
			.easing(TWEEN.Easing.Quadratic.InOut)
			.delay(500+(i*100))
			.onUpdate(function () {
				this.tile.position.y = this.y;
			}).onComplete(function() {
				radio("gameOver").broadcast();
			}).start();
		}
	}).start();
	this.canMoveTile = false;
	this.canSelectTile = false;
	this.canPickTile = false;
	this.helper.position.y = 100;
}

CDE.Quarto.prototype.update = function(timestamp) {
	TWEEN.update(timestamp);
	//
	if ((this.selectedTile) && (this.canMoveTile)) {
		this.raycaster.setFromCamera(this.mouse, this.threeCamera);
		var intersects = this.raycaster.intersectObjects(this.threeScene.children);
		var target;		
		for (var i = 0, l = intersects.length; i < l; i++) {
			if (intersects[i].object.isTarget) target = intersects[i].object;
		}
		if ((target) && (target != this.nextTarget))
		{
			this.nextTarget = target;
			radio("tileMoved").broadcast(target.name);
		}
			
	}
	// render
	this.threeRenderer.render(this.threeScene, this.threeCamera);
}

CDE.Quarto.prototype.gameAnim = function(timestamp) {
	var self = this;
	this.animId = window.requestAnimationFrame(function(){self.gameAnim(timestamp)});
	this.update(timestamp);
}

CDE.Quarto.prototype.updateDisplayInfo = function() {
	this.display = {
		width: window.innerWidth,
		height: (window.innerHeight * .7)
	};
	this.display.ratio = this.display.width / this.display.height;
	this.display.devicePixelRatio = window.devicePixelRatio || 1;
	this.display.halfWidth = (this.display.width / 2) * this.display.devicePixelRatio;
	this.display.halfHeight = (this.display.height / 2) * this.display.devicePixelRatio;
}

CDE.Quarto.prototype.resize = function() {
	this.updateDisplayInfo();

	this.threeCamera.aspect = this.display.ratio;
	this.threeCamera.updateProjectionMatrix();

	this.threeRenderer.setSize(this.display.width, this.display.height);
}