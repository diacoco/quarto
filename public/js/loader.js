var CDE = CDE || {};

CDE.Loader = function() {
	this.toLoad = [];
	this.onReady = null;
}

CDE.Loader.prototype.init = function(callBack) {
	this.addLoader("set", "3d/quatro.dae");
	this.addLoader("boardMap", "3d/board.png");
	this.addLoader("validatorMap", "3d/validate.png");
	this.onReady = callBack;
	this.loadNext();
}	

CDE.Loader.prototype.addLoader = function(target, url) {
		this.toLoad.push({target:target, url:url})
}

CDE.Loader.prototype.loadNext = function() {
	var self = this;
	if (this.toLoad.length > 0)
	{
		var toLoadItem = this.toLoad.shift();
		var url = toLoadItem.url;
		switch(url.split(".").pop().toLowerCase())
		{
			case 'png':
				self[toLoadItem.target] = THREE.ImageUtils.loadTexture(url, THREE.UVMapping, function() {self.loadComplete()});
				break;
			case 'jpg':
				self[toLoadItem.target] = THREE.ImageUtils.loadTexture(url, THREE.UVMapping, function() {self.loadComplete()});
				break;
			case 'dae':
				var loader = new THREE.ColladaLoader();
				loader.options.convertUpAxis = true;
				loader.load(url, function (collada) {
					self[toLoadItem.target] = collada.scene;
					self.loadComplete()
				});
				break;
		}
	} else {
		this.onReady();
	}
}

CDE.Loader.prototype.loadComplete = function() {
	this.loadNext();
}

CDE.Loader.prototype.constructor = CDE.Loader;