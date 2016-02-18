
// modules that need namespacing 
var gl;
var GLMat;

define(function (require) {
	GLMat = require('gl-matrix');
	
	// kick off this thing
	if (!window.loaded){
		$(window).load(function() {
			main();
		});
	}else{
		main();
	}
});


// --- main() wraps all "global" code for encapsulation and so we don't use dependencies before they are loaded --- //
function main(){
	
	var bulbs = [];
	
	function onLoaded(){
		webGLStart();
	}
	
	
	// Set up GL 
	function initGL(canvas) {
		try {
			gl = canvas.getContext("experimental-webgl");
			gl.viewportWidth = canvas.width;
			gl.viewportHeight = canvas.height;
		} catch (e) {
		}
		if (!gl) {
			alert("Could not initialise WebGL, sorry :-(");
		}
	}
	
	function getShader(gl, id) {
		var shaderScript = document.getElementById(id);
		if (!shaderScript) {
			return null;
		}
	
		var str = "";
		var k = shaderScript.firstChild;
		while (k) {
			if (k.nodeType == 3) {
				str += k.textContent;
			}
			k = k.nextSibling;
		}
	
		var shader;
		if (shaderScript.type == "x-shader/x-fragment") {
			shader = gl.createShader(gl.FRAGMENT_SHADER);
		} else if (shaderScript.type == "x-shader/x-vertex") {
			shader = gl.createShader(gl.VERTEX_SHADER);
		} else {
			return null;
		}
	
		gl.shaderSource(shader, str);
		gl.compileShader(shader);
	
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			alert(gl.getShaderInfoLog(shader));
			return null;
		}
	
		return shader;
	}
	
	var shaderProgram;
	
	function initShaders() {
		var fragmentShader = getShader(gl, "shader-fs");
		var vertexShader = getShader(gl, "shader-vs");
	
		shaderProgram = gl.createProgram();
		gl.attachShader(shaderProgram, vertexShader);
		gl.attachShader(shaderProgram, fragmentShader);
		gl.linkProgram(shaderProgram);
	
		if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
			alert("Could not initialise shaders");
		}
	
		gl.useProgram(shaderProgram);
	
		shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram,
				"aVertexPosition");
		gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
	
		shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram,
				"aTextureCoord");
		gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);
	
		shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram,
				"uPMatrix");
		shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram,
				"uMVMatrix");
		shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram,
				"uSampler");
		shaderProgram.colorUniform = gl.getUniformLocation(shaderProgram, "uColor");
	}
	
	
	
	
	
	function handleLoadedTexture(texture) {
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
				texture.image);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	
		gl.bindTexture(gl.TEXTURE_2D, null);
	}
	
	var bulbTexture;
	
	function initTexture() {
		bulbTexture = gl.createTexture();
		bulbTexture.image = new Image();
		bulbTexture.image.onload = function() {
			handleLoadedTexture(bulbTexture)
		}
	
		bulbTexture.image.src = "star.gif";
	}
	
	var mvMatrix = GLMat.mat4.create();
	var initMVMat = GLMat.mat4.create();
	var pMatrix = GLMat.mat4.create();
	
	function setMatrixUniforms() {
		gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
		gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
	}
	
	// utility functions
	function degToRad(degrees) {
		return degrees * Math.PI / 180;
	}
	
	// user input 
	var currentlyPressedKeys = {};
	
	function handleKeyDown(event) {
		currentlyPressedKeys[event.keyCode] = true;
	}
	
	function handleKeyUp(event) {
		currentlyPressedKeys[event.keyCode] = false;
	}
	
	var zoom = -15;
	
	var rota = 0;
	var pitch = 0;
	
	function handleKeys() {
		if (currentlyPressedKeys[34]) {
			// Page Up
			zoom -= 0.1;
		}
		if (currentlyPressedKeys[33]) {
			// Page Down
			zoom += 0.1;
		}
		if (currentlyPressedKeys[37]) {
			// Up cursor key
			rota += 2;
		}
		if (currentlyPressedKeys[39]) {
			// Down cursor key
			rota -= 2;
		}
		if (currentlyPressedKeys[38]) {
			// Up cursor key
			pitch += 2;
		}
		if (currentlyPressedKeys[40]) {
			// Down cursor key
			pitch -= 2;
		}
	}
	
	var bulbVertexPositionBuffer;
	var bulbVertexTextureCoordBuffer;
	
	function initBuffers() {
		bulbVertexPositionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, bulbVertexPositionBuffer);
		vertices = [ -1.0, -1.0, 0.0, 1.0, -1.0, 0.0, -1.0, 1.0, 0.0, 1.0, 1.0, 0.0 ];
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
		bulbVertexPositionBuffer.itemSize = 3;
		bulbVertexPositionBuffer.numItems = 4;
	
		bulbVertexTextureCoordBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, bulbVertexTextureCoordBuffer);
		var textureCoords = [ 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0 ];
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords),
				gl.STATIC_DRAW);
		bulbVertexTextureCoordBuffer.itemSize = 2;
		bulbVertexTextureCoordBuffer.numItems = 4;
	}
	
	function drawBulb() {
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, bulbTexture);
		gl.uniform1i(shaderProgram.samplerUniform, 0);
	
		gl.bindBuffer(gl.ARRAY_BUFFER, bulbVertexTextureCoordBuffer);
		gl.vertexAttribPointer(shaderProgram.textureCoordAttribute,
				bulbVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
	
		gl.bindBuffer(gl.ARRAY_BUFFER, bulbVertexPositionBuffer);
		gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
				bulbVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
	
		setMatrixUniforms();
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, bulbVertexPositionBuffer.numItems);
	}
	
	
	// ======= Bulb ======= //
	
	function Bulb(pos, latitude, longitude) {
		this.pos = pos;
		this.latitude = latitude; // 0 -> 1, from south pole to north pole
		this.longitude = longitude; // longitude in radians  
		
		this.color = {};
		
		this.color.r = 0;
		this.color.g = 0;
		this.color.b = 0;
		this.color.a = 1.0;
	}
	
	// TODO: this belongs in drawBulb(), we'll change it so drawBulb() accepts a bulb parameter 
	Bulb.prototype.draw = function() {
		// get the global model view matrix and copy it so we can mangle it
		
		
		// Move to the bulb's position
		GLMat.mat4.translate(mvMatrix, mvMatrix, this.pos);
	
		// Rotate back so that the bulb is facing the viewer
		GLMat.mat4.rotate(mvMatrix, mvMatrix, degToRad(-rota), [ 0.0, 1.0, 0.0 ]);
		GLMat.mat4.rotate(mvMatrix, mvMatrix, degToRad(-pitch), [ 1.0, 0.0, 0.0 ]);
		
		
		// Draw the bulb in its main color
		gl.uniform3f(shaderProgram.colorUniform, this.color.r, this.color.g, this.color.b);
		drawBulb()
		
		// restore the previous state of mvMatrix
		GLMat.mat4.copy(mvMatrix, initMVMat);
	};
	/*
	var effectiveFPMS = 60 / 1000;
	
	Bulb.prototype.onFrame = function(elapsedTime) {
		this.angle += this.rotationSpeed * effectiveFPMS * elapsedTime;
	
		// Decrease the distance, resetting the bulb to the outside of
		// the spiral if it's at the center.
		this.dist -= 0.01 * effectiveFPMS * elapsedTime;
		if (this.dist < 0.0) {
			this.dist += 5.0;
			this.randomiseColors();
		}
	
	};
	
	Bulb.prototype.randomiseColors = function() {
		// Give the bulb a random color for normal
		// circumstances...
		this.r = Math.random();
		this.g = Math.random();
		this.b = Math.random();
		
	};
	*/
	
	
	/*
	function initWorldObjects() {
		var numBulbs = 12;
	
		for ( var i = 0; i < numBulbs; i++) {
			var pos = GLMat.vec3.create();
			
			//var coord = (i-0.5)*3;
			//GLMat.vec3.set(pos, coord, coord, coord);
			
			
			var coord = i - 5.5;
			GLMat.vec3.set(pos, 0, coord, 0);
			
			
			
			bulbs.push( new Bulb(pos) );
		}
		
		var pos1 = GLMat.vec3.create();
		GLMat.vec3.set(pos1, -4.5, 0, 0);
		bulbs.push( new Bulb(pos1) );
		
		var pos2 = GLMat.vec3.create();
		GLMat.vec3.set(pos2, 4.5, 0, 0);
		bulbs.push( new Bulb(pos2) );
		
		var pos3 = GLMat.vec3.create();
		GLMat.vec3.set(pos3, 0, 0, -4.5);
		bulbs.push( new Bulb(pos3) );
		
		var pos4 = GLMat.vec3.create();
		GLMat.vec3.set(pos4, 0, 0, 4.5);
		bulbs.push( new Bulb(pos4) );
		
	}
	*/
	
	
	// === settings for size and shape of sculpture === //
	var unit = 0.8;
	var rows = 12;
	var poleR = 1 * unit; // radius of end caps
	var equatorR = 4.5 * unit;
	var curveExp = 0.6;
	
	
	function initWorldObjects(){
		var rOffset = 0;
		var rowBulbsNum;
		var rowRad; // row radius
		
		var latPct;
		var lat;
		var equatorPct;
		var rUnit;
		
		var x, y, z;
		var r;// rotation radians 
		
		var iRow;
		var iBulb;
		
		for (iRow = 0; iRow < rows; iRow++){
			latPct = iRow / (rows-1); // 0 -> 1
			lat = (latPct * 2) - 1; // -1 -> 0 -> 1
			equatorPct = 1 - Math.abs( lat ); // 0 -> 1 -> 0
			equatorPct = Math.pow(equatorPct, curveExp); // give the thing some roundness 
			rowRad = lerp(poleR, equatorR, equatorPct);
			rowBulbsNum = Math.floor( (twoPI*rowRad)/unit );
			
			rUnit = twoPI / rowBulbsNum;
			
			// alternating rows are rotated an additional half-segment width so the oranges stack better
			if (rOffset == 0){
				rOffset = rUnit * 0.5;
			}else{
				rOffset = 0;
			}
			
			for (iBulb = 0; iBulb < rowBulbsNum; iBulb++){
				y = lat * ((rows-1) * 0.5) * unit;
				r = rUnit * iBulb + rOffset;
				
				x = Math.sin(r) * rowRad;
				z = Math.cos(r) * rowRad;
				
				var pos = GLMat.vec3.create();
				GLMat.vec3.set(pos, x, y, z);
				var bulb = new Bulb(pos, latPct, r);
				//bulb.color.r = latPct;
				//bulb.color.g = 0;
				//bulb.color.b = 1 - latPct;
				bulbs.push(bulb);
			}
			
		}
		
	}
	
	function getBulbsByLatLong(lat0, lat1, long0, long1){
		long0 = modulo(long0, twoPI);
		long1 = modulo(long1, twoPI);
		lat0 = modulo(lat0, 1);
		lat1 = modulo(lat1, 1);
		
		var temp;
		
		if (lat1 < lat0){
			temp = lat0;
			lat0 = lat1;
			lat1 = temp;
		}
		
		var long2 = long0;
		var long3 = long1;
		
		// if our section crosses the international date line
		if (long1 < long0){
			long0 -= twoPI;
			long3 += twoPI;
		}
		
		var sectionBulbs = [];
		var bulb;
		var i;
		
		for (i = 0; i < bulbs.length; i++){
			bulb = bulbs[i];
			if ( 
					(lat0 <= bulb.latitude && bulb.latitude <= lat1) 
					&& 
					(
						(long0 <= bulb.longitude && bulb.longitude <= long1)
						||
						(long2 <= bulb.longitude && bulb.longitude <= long3)
					)
				){
				sectionBulbs.push(bulb);
			}
		}
		
		return sectionBulbs;
	}
	
	
	function drawScene() {
		//gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		//GLMat.mat4.perspective(pMatrix, degToRad(85), gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
		// play with these later
		//gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
		//gl.enable(gl.BLEND);
	
		GLMat.mat4.identity(mvMatrix);
		GLMat.mat4.translate(mvMatrix, mvMatrix, [ 0.0, 0.0, zoom ]);
		
		GLMat.mat4.rotate(mvMatrix, mvMatrix, degToRad(pitch), [ 1.0, 0.0, 0.0 ]);
		GLMat.mat4.rotate(mvMatrix, mvMatrix, degToRad(rota), [ 0.0, 1.0, 0.0 ]);
		
		//console.log(mvMatrix);
		GLMat.mat4.copy(initMVMat, mvMatrix);
		
		for ( var i in bulbs) {
			bulbs[i].draw();
		}
	
	}
	
	
	var prevFrameT = 0;
	var elapse = 0;
	
	function onFrame() {
		var nowT = new Date().getTime();
		if (prevFrameT == 0) {
			prevFrameT = nowT;
			return;
		}
		elapse = nowT - prevFrameT;
		
		pA.onFrame(elapse);
		
		prevFrameT = nowT;
	}
	
	function tick() {
		requestAnimFrame(tick);
		handleKeys();
		drawScene();
		onFrame();
	}
	
	function webGLStart() {
		var canvas = document.getElementById("beaconCanvas");
		initGL(canvas);
		initShaders();
		initBuffers();
		initTexture();
		initWorldObjects();
	
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
	
		document.onkeydown = handleKeyDown;
		document.onkeyup = handleKeyUp;
		
		
		// TODO: move this?
		gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		GLMat.mat4.perspective(pMatrix, degToRad(85), gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
		// play with these later
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
		gl.enable(gl.BLEND);
		// --- //
		
		tick();
	}
	
	// === utility === //
	var twoPI = Math.PI * 2;
	
	function lerp(from, to, pct){
		return (to - from) * pct + from;
	}
	
	function modulo(value, base){
		value = value % base;
		if (value < 0) value += Math.ceil( Math.abs(value) / base ) * base;
		return value;
	}
	
	function clamp(value, min, max){
		if (max < min){
			var holder = max;
			max = min;
			min = holder;
		}
		if (value < min) value = min;
		else if (max < value) value = max;
		return value;
	}
	
	function pctToHue(pct){
		
		//		
		//	c	1_ |_r___g_____b____r_|
		//	o	   |  /\    /\    /\  |
		//	l	   | g  r  b  g  r  b |
		//	o	   |/    \/    \/    \|
		//	r	0- |--b-----r-----g---|
		//	-	   |        ||        |
		//	deg	   0         1        3
		//		             8        6
		//		             0        0 
		
		
		// gets the color based on the degree around the color wheel
		// except we use 0 -> 1 instead of degrees 
		pct = modulo(pct, 1);
		
		// -3 -> 0 -> 3
		var deg = pct * 6;
		
		// helper bot
		var sixToChannel = function(six){
			six = modulo(six, 6) - 3; // // -3 -> 0 -> 3
			six = clamp( (Math.abs(six) - 1), 0, 1); // 1 -> 1 -> 0 -> 0 -> 0 -> 1 -> 1
			return six;
		}
		
		var color = {};
		color.r = sixToChannel(deg);
		color.g = sixToChannel(deg + 2);
		color.b = sixToChannel(deg + 4);
		
		return color;
	}
	// ======= animations ======= //
	
	// === programme A === //
	var pA = {}; // TODO: make this a class so it can be extended by users and passed in modularly
	
	// - square - //
	pA.sqW = twoPI / 7;
	pA.sqH = 1/5;
	pA.sqL = 0;
	pA.sqT = 1;
	pA.sqXRate = 6000; // milliseconds to complete a circle
	pA.sqYRate = 2750; // milliseconds to go from top to bottom
	pA.sqYDirMult = -1;
	
	// - wash - //
	pA.washYOffset = 0;
	pA.washYRate = 10000; // milliseconds to scroll the wash from bottom to top
	
	
	pA.onFrame = function(elapse){
		
		var bulb;
		var iBulb;
		
		// - wash 
		pA.washYOffset -= elapse / pA.washYRate;
		pA.washYOffset = modulo(pA.washYOffset, 1);
		
		var adjLat;
		for (iBulb = 0; iBulb < bulbs.length; iBulb++){
			var bulb = bulbs[iBulb];
			
			adjLat = pA.washYOffset + bulb.latitude;
			adjLat = modulo(adjLat, 1);
			var color = pctToHue(adjLat);
			bulb.color.r = color.r * 0.2;
			bulb.color.g = color.g * 0.2;
			bulb.color.b = color.b * 0.2;
		}
		
		// - square 
		pA.sqL += (elapse / pA.sqXRate) * twoPI;
		pA.sqL = modulo(pA.sqL, twoPI);
		
		pA.sqT += pA.sqYDirMult * (elapse / pA.sqYRate);
		var sqB = pA.sqT - pA.sqH;
		
		if (1 < pA.sqT){
			pA.sqT -= 2 * (pA.sqT - 1);
			pA.sqYDirMult = -1;
		}else if (sqB < 0){
			sqB = 0 - sqB;
			sqB = modulo(sqB, 1-pA.sqH);
			pA.sqT = sqB + pA.sqH;
			pA.sqYDirMult = 1;
		}
		
		
		var sqBulbs = getBulbsByLatLong(pA.sqT - pA.sqH, pA.sqT, pA.sqL, pA.sqL + pA.sqW);
		
		for (iBulb = 0; iBulb < sqBulbs.length; iBulb++){
			bulb = sqBulbs[iBulb];
			bulb.color.r = 1.0;
			bulb.color.g = 1.0;
			bulb.color.b = 1.0;
		}
	}
	
	// ======= o ======= //
	
	
	onLoaded();// kick it off 
} // end main()