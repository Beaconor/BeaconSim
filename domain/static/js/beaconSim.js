
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
	
	
	// ======= Sculpture ======= //
	
	function Sculpture(){
		// --- settings for size and shape of sculpture --- //
		this.unit = 0.8;
		this.bulbRows = 12;
		this.poleR = 1 * this.unit; // radius of end caps
		this.equatorR = 4.5 * this.unit;
		this.curveExp = 0.6;
		
		// --- vars --- //
		
		this.bulbs = [];
		
		this.mvMatrix = GLMat.mat4.create();
		this.initMVMat = GLMat.mat4.create();
		this.pMatrix = GLMat.mat4.create();
		
		this.zoom = -15;
		this.rota = 0;
		this.pitch = 0;
		
		// - technically these won't be attached until they are given a value 
		// 	but we'll declare them here for organizational purposes 
		this.shaderProgram;
		this.bulbVertexPositionBuffer;
		this.bulbBGVertexPositionBuffer;
		this.bulbVertexColorBuffer;
		this.bulbBGVertexColorBuffer;
	}
	
	
	// Set up GL 
	Sculpture.prototype.initGL(canvas) {
		try {
			gl = canvas.getContext("experimental-webgl");
			gl.viewportWidth = canvas.width;
			gl.viewportHeight = canvas.height;
		} catch (e) {
			console.log(e);
		}
		if (!gl) {
			alert("Could not initialise WebGL, sorry :-(");
		}
	}
	
	Sculpture.prototype.getShader(gl, id) {
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
	
	Sculpture.prototype.initShaders() {
		var fragmentShader = getShader(gl, "shader-fs");
		var vertexShader = getShader(gl, "shader-vs");
	
		this.shaderProgram = gl.createProgram();
		gl.attachShader(this.shaderProgram, vertexShader);
		gl.attachShader(this.shaderProgram, fragmentShader);
		gl.linkProgram(this.shaderProgram);
	
		if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) {
			alert("Could not initialise shaders");
		}
	
		gl.useProgram(this.shaderProgram);
	
		this.shaderProgram.vertexPositionAttribute = gl.getAttribLocation(this.shaderProgram, "aVertexPosition");
		gl.enableVertexAttribArray(this.shaderProgram.vertexPositionAttribute);
		
		this.shaderProgram.vertexColorAttribute = gl.getAttribLocation(this.shaderProgram, "aVertexColor");
		gl.enableVertexAttribArray(this.shaderProgram.vertexColorAttribute);
		
		this.shaderProgram.pMatrixUniform = gl.getUniformLocation(this.shaderProgram, "uPMatrix");
		this.shaderProgram.mvMatrixUniform = gl.getUniformLocation(this.shaderProgram, "uMVMatrix");
	}
	
	
	Sculpture.prototype.setMatrixUniforms() {
		gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, this.pMatrix);
		gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.mvMatrix);
	}
	
	
	Sculpture.prototype.initBuffers() {
		// circle shape "triangle fan"
		
		// TODO: move some of these to settings so they can be changed before init
		var outlineW = 0.05;
		var bgZ = 0.1;
		
		var originX = 0.0;
		var originY = 0.0;
		var originZ = 0.0;
		var radius = this.unit * 0.8;
		var bgRadius = radius + outlineW;
		var fansNum = 16;
		
		var vertices = [originX, originY, originZ];
		var bgVertices = [originX, originY, originZ];
		
		var x, y, z;
		z = originZ;
		var degPerFan = twoPI / fansNum;
		var angle;
		
		var i;
		for (i=0; i <= fansNum; i++) {
			angle = degPerFan * (i+1);
			x = originX + Math.cos(angle) * radius;
			y = originY + Math.sin(angle) * radius;
			vertices = vertices.concat([x, y, z]);
			
			x = originX + Math.cos(angle) * bgRadius;
			y = originY + Math.sin(angle) * bgRadius;
			bgVertices = bgVertices.concat([x, y, z-bgZ]);
		}
		
		// TODO: Maybe change this itemSize/numItems being tacked on to the buffer paradigm.  
		this.bulbVertexPositionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.bulbVertexPositionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
		this.bulbVertexPositionBuffer.itemSize = 3;
		this.bulbVertexPositionBuffer.numItems = vertices.length / this.bulbVertexPositionBuffer.itemSize;
		
		this.bulbBGVertexPositionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.bulbBGVertexPositionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bgVertices), gl.STATIC_DRAW);
		this.bulbBGVertexPositionBuffer.itemSize = 3;
		this.bulbBGVertexPositionBuffer.numItems = bgVertices.length / this.bulbBGVertexPositionBuffer.itemSize;
		
		
		var colors = [];
        for (i=0; i < this.bulbVertexPositionBuffer.numItems; i++) {
            colors = colors.concat([0.0, 0.0, 0.0, 1.0]);
        }
		
		this.bulbVertexColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bulbVertexColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        this.bulbVertexColorBuffer.itemSize = 4;
        this.bulbVertexColorBuffer.numItems = this.bulbVertexPositionBuffer.numItems;
        
        this.bulbBGVertexColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bulbBGVertexColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        this.bulbBGVertexColorBuffer.itemSize = 4;
        this.bulbBGVertexColorBuffer.numItems = this.bulbBGVertexPositionBuffer.numItems;
	}
	
	Sculpture.prototype.drawBulb(bulb) {
		// Move to the bulb's position
		GLMat.mat4.translate(this.mvMatrix, this.mvMatrix, bulb.pos);
	
		// Rotate back so that the bulb is facing the viewer
		GLMat.mat4.rotate(this.mvMatrix, this.mvMatrix, degToRad(-rota), [ 0.0, 1.0, 0.0 ]);
		GLMat.mat4.rotate(this.mvMatrix, this.mvMatrix, degToRad(-pitch), [ 1.0, 0.0, 0.0 ]);
		
		this.setMatrixUniforms();
		
		
		// - draw BG circle (for black outline) - //
		var useOutline = false;
		if (useOutline){
			gl.bindBuffer(gl.ARRAY_BUFFER, this.bulbBGVertexPositionBuffer);
			gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, this.bulbBGVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
			
			gl.bindBuffer(gl.ARRAY_BUFFER, this.bulbBGVertexColorBuffer);
			gl.vertexAttribPointer(this.shaderProgram.vertexColorAttribute, this.bulbBGVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
			
			gl.drawArrays(gl.TRIANGLE_FAN, 0, this.bulbBGVertexPositionBuffer.numItems);
		}
		
		// - draw main circle - //
		gl.bindBuffer(gl.ARRAY_BUFFER, this.bulbVertexPositionBuffer);
		gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, this.bulbVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
		
		// colors
		gl.bindBuffer(gl.ARRAY_BUFFER, this.bulbVertexColorBuffer);
		var edgeMult = 0.5;// TODO: move this to settings
		colors = [bulb.color.r, bulb.color.g, bulb.color.b, 1.0];
        for (var i=0; i < this.bulbVertexPositionBuffer.numItems-1; i++) {
            colors = colors.concat([bulb.color.r*edgeMult, bulb.color.g*edgeMult, bulb.color.b*edgeMult, 1.0]);
        }
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
		
		
        gl.vertexAttribPointer(this.shaderProgram.vertexColorAttribute, this.bulbVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, this.bulbVertexPositionBuffer.numItems);
		
		// restore the previous state of mvMatrix
		GLMat.mat4.copy(this.mvMatrix, this.initMVMat);
	}
	
	
	// === construct the sculpture === //
	
	Sculpture.prototype.initWorldObjects(){
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
		
		for (iRow = 0; iRow < this.bulbRows; iRow++){
			latPct = iRow / (this.bulbRows-1); // 0 -> 1
			lat = (latPct * 2) - 1; // -1 -> 0 -> 1
			equatorPct = 1 - Math.abs( lat ); // 0 -> 1 -> 0
			equatorPct = Math.pow(equatorPct, this.curveExp); // give the thing some roundness 
			rowRad = lerp(this.poleR, this.equatorR, equatorPct);
			rowBulbsNum = Math.floor( (twoPI*rowRad)/this.unit );
			
			rUnit = twoPI / rowBulbsNum;
			
			// alternating rows are rotated an additional half-segment width so the oranges stack better
			if (rOffset == 0){
				rOffset = rUnit * 0.5;
			}else{
				rOffset = 0;
			}
			
			for (iBulb = 0; iBulb < rowBulbsNum; iBulb++){
				y = lat * ((this.bulbRows-1) * 0.5) * this.unit;
				r = rUnit * iBulb + rOffset;
				
				x = Math.sin(r) * rowRad;
				z = Math.cos(r) * rowRad;
				
				var pos = GLMat.vec3.create();
				GLMat.vec3.set(pos, x, y, z);
				var bulb = new Bulb(pos, latPct, r);
				this.bulbs.push(bulb);
			}
			
		}
		
	}
	
	Sculpture.prototype.getBulbsByLatLong(lat0, lat1, long0, long1){
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
		
		// - if our section crosses the international date line
		if (long1 < long0){
			long0 -= twoPI;
			long3 += twoPI;
		}
		
		var sectionBulbs = [];
		var bulb;
		var i;
		
		for (i = 0; i < this.bulbs.length; i++){
			bulb = this.bulbs[i];
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
	
	// === on frame and init functions === //
	
	Sculpture.prototype.render() {
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		GLMat.mat4.identity(this.mvMatrix);
		GLMat.mat4.translate(this.mvMatrix, this.mvMatrix, [ 0.0, 0.0, this.zoom ]);
		
		GLMat.mat4.rotate(this.mvMatrix, this.mvMatrix, degToRad(pitch), [ 1.0, 0.0, 0.0 ]);
		GLMat.mat4.rotate(this.mvMatrix, this.mvMatrix, degToRad(rota), [ 0.0, 1.0, 0.0 ]);
		
		GLMat.mat4.copy(this.initMVMat, this.mvMatrix);
		
		for ( var i in this.bulbs) {
			this.drawBulb(this.bulbs[i]);
		}
	}
	
	
	Sculpture.prototype.init() {
		var canvas = document.getElementById("beaconCanvas");
		this.initGL(canvas);
		this.initShaders();
		this.initBuffers();
		this.initWorldObjects();
	
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
	
		document.onkeydown = handleKeyDown;
		document.onkeyup = handleKeyUp;
		
		// TODO: move this?
		gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		GLMat.mat4.perspective(this.pMatrix, degToRad(85), gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
		// play with these later
		//gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
		//gl.enable(gl.BLEND);
		gl.enable(gl.DEPTH_TEST);
		// --- //
		
		//this.tick();
	}
	
	// === utility === //
	var twoPI = Math.PI * 2;
	
	function degToRad(degrees) {
		return degrees * Math.PI / 180;
	}
	
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
		
		var dimMult = 0.5;
		var adjLat;
		for (iBulb = 0; iBulb < this.sculpt.bulbs.length; iBulb++){
			var bulb = this.sculpt.bulbs[iBulb];
			
			adjLat = pA.washYOffset + bulb.latitude;
			adjLat = modulo(adjLat, 1);
			var color = pctToHue(adjLat);
			bulb.color.r = color.r * dimMult;
			bulb.color.g = color.g * dimMult;
			bulb.color.b = color.b * dimMult;
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
		
		
		var sqBulbs = sculpt.getBulbsByLatLong(pA.sqT - pA.sqH, pA.sqT, pA.sqL, pA.sqL + pA.sqW);
		
		for (iBulb = 0; iBulb < sqBulbs.length; iBulb++){
			bulb = sqBulbs[iBulb];
			bulb.color.r = 1.0;
			bulb.color.g = 1.0;
			bulb.color.b = 1.0;
		}
	}
	
	pA.init = function(sculpt){
		this.sculpt = sculpt;
	}
	
	// ======= o ======= //
	
	var currentlyPressedKeys = {};
	var prevFrameT = 0;
	var elapse = 0;
	
	// --- user input --- //
	
	function handleKeyDown(event) {
		currentlyPressedKeys[event.keyCode] = true;
	}
	
	function handleKeyUp(event) {
		currentlyPressedKeys[event.keyCode] = false;
	}
	
	function handleKeys() {
		if (currentlyPressedKeys[34]) {
			// Page Up
			sculpt.zoom -= 0.1;
		}
		if (currentlyPressedKeys[33]) {
			// Page Down
			sculpt.zoom += 0.1;
		}
		if (currentlyPressedKeys[37]) {
			// Up cursor key
			sculpt.rota += 2;
		}
		if (currentlyPressedKeys[39]) {
			// Down cursor key
			sculpt.rota -= 2;
		}
		if (currentlyPressedKeys[38]) {
			// Up cursor key
			sculpt.pitch += 2;
		}
		if (currentlyPressedKeys[40]) {
			// Down cursor key
			sculpt.pitch -= 2;
		}
	}
	
	// --- o --- //
	var sculpt = new Sculpture();
	
	
	function onFrame() {
		var nowT = new Date().getTime();
		if (prevFrameT == 0) {
			prevFrameT = nowT;
			requestAnimFrame(onFrame);
			return;
		}
		elapse = nowT - prevFrameT;
		
		
		handleKeys();
		
		pA.onFrame(elapse);
		sculpt.render();
		
		prevFrameT = nowT;
		requestAnimFrame(onFrame);
	}
	
	
	function onLoaded(){
		// - any changes to sculpt settings go here
		
		sculpt.init();
		pA.init(sculpt);
		onFrame();
	}
	
	
	onLoaded();// kick it off 
} // end main()