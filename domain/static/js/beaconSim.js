
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
	
	function Bulb(id, pos, latitude, longitude) {
		this.id = id;
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
	Sculpture.prototype.initGL = function(canvas) {
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
	
	Sculpture.prototype.getShader = function(gl, id) {
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
	
	Sculpture.prototype.initShaders = function() {
		var fragmentShader = this.getShader(gl, "shader-fs");
		var vertexShader = this.getShader(gl, "shader-vs");
	
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
	
	
	Sculpture.prototype.setMatrixUniforms = function() {
		gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, this.pMatrix);
		gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.mvMatrix);
	}
	
	
	Sculpture.prototype.initBuffers = function() {
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
	
	Sculpture.prototype.drawBulb = function(bulb) {
		// Move to the bulb's position
		GLMat.mat4.translate(this.mvMatrix, this.mvMatrix, bulb.pos);
	
		// Rotate back so that the bulb is facing the viewer
		GLMat.mat4.rotate(this.mvMatrix, this.mvMatrix, degToRad(-this.rota), [ 0.0, 1.0, 0.0 ]);
		GLMat.mat4.rotate(this.mvMatrix, this.mvMatrix, degToRad(-this.pitch), [ 1.0, 0.0, 0.0 ]);
		
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
	
	Sculpture.prototype.initWorldObjects = function(){
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
				var bulb = new Bulb(iBulb, pos, latPct, r);
				this.bulbs.push(bulb);
			}
			
		}
		
	}
	
	Sculpture.prototype.getBulbsByLatLong = function(lat0, lat1, long0, long1){
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
	
	Sculpture.prototype.render = function() {
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		GLMat.mat4.identity(this.mvMatrix);
		GLMat.mat4.translate(this.mvMatrix, this.mvMatrix, [ 0.0, 0.0, this.zoom ]);
		
		GLMat.mat4.rotate(this.mvMatrix, this.mvMatrix, degToRad(this.pitch), [ 1.0, 0.0, 0.0 ]);
		GLMat.mat4.rotate(this.mvMatrix, this.mvMatrix, degToRad(this.rota), [ 0.0, 1.0, 0.0 ]);
		
		GLMat.mat4.copy(this.initMVMat, this.mvMatrix);
		
		for (var i in this.bulbs) {
			this.drawBulb(this.bulbs[i]);
		}
	}
	
	
	Sculpture.prototype.init = function() {
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
	
	function iLerp(from, to, at){
		// - caller deals with NaN when to == from
		return (at - from) / (to - from);
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
	
	function hsbToRGB(h, s, b){
		// all values are 0 -> 1
		
		// 				HUE 
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
		//
		//	ofSix   0  1  2  3  4  5  6
		
		
		// gets the color based on the degree around the color wheel
		// except we use 0 -> 1 instead of degrees 
		h = modulo(h, 1);
		s = clamp(s, 0, 1);
		b = clamp(b, 0, 1);
		
		// 0 -> 6
		var ofSix = h * 6;
		
		var color = {};
		
		var max = b;
		var min = (1 - s) * b;
		var flux = ofSix - Math.floor(ofSix)
		var upFlux = lerp(min, max, flux);
		var downFlux = lerp(min, max, 1-flux);
		
		if (ofSix < 1){
			color.r = max;
			color.g = upFlux;
			color.b = min;
		}else if(ofSix < 2){
			color.r = downFlux;
			color.g = max;
			color.b = min;
		}else if(ofSix < 3){
			color.r = min;
			color.g = max;
			color.b = upFlux;
		}else if(ofSix < 4){
			color.r = min;
			color.g = downFlux;
			color.b = max;
		}else if(ofSix < 5){
			color.r = upFlux;
			color.g = min;
			color.b = max;
		}else{
			color.r = max;
			color.g = min;
			color.b = downFlux;
		}
		
		
		return color;
	}
	
	
	function rgbToHSB(r, g, b){
		// all values are 0 -> 1
		r = clamp(r, 0, 1);
		g = clamp(g, 0, 1);
		b = clamp(b, 0, 1);
		
		var ofSix = 0;
		
		var hsb = {};
		var max;
		var flux;
		var min;
		
		if (r >= g && r >= b){
			if (g >= b){
				ofSix = 0;
			}else{
				ofSix = 5;
			}
		}else if (g >= r && g >= b){
			if (r >= b){
				ofSix = 1;
			}else{
				ofSix = 2;
			}
		}else{ // (b >= g && b >= r)
			if (g >= r){
				ofSix = 3;
			}else{
				ofSix = 4;
			}
		} 
		
		switch (ofSix){
			case 0:
				max = r;
				min = b;
				flux = ofSix + iLerp(min, max, g);
				break;
			case 1:
				max = g;
				min = b;
				flux = ofSix + (1 - iLerp(min, max, r));
				break;
			case 2:
				max = g;
				min = r;
				flux = ofSix + iLerp(min, max, b);
				break;
			case 3:
				max = b;
				min = r;
				flux = ofSix + (1 - iLerp(min, max, g));
				break;
			case 4:
				max = b;
				min = g;
				flux = ofSix + iLerp(min, max, r);
				break;
			default:
				max = r;
				min = g;
				flux = ofSix + (1 - iLerp(min, max, b));
			
		}
		
		hsb.h = flux/6;
		if (isNaN(hsb.h)) hsb.h = 0;
		hsb.s = 0;
		if (max != 0) hsb.s = 1 - min/max;
		hsb.b = max;
		
		return hsb;
	}
	
	
	
	// ======= animation Programme ======= //
	var Programme = function(title){
		this.title = title;
		this.sculpt;
		
		this.onFrame = function(elapse){}; // to be overridden 
		
		this.init = function(sculpt){ // can be overridden 
			this.sculpt = sculpt;
		}
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
	
	var onKeyPress = function(){}; // to be overridden
	
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
		
		// - if the code that governs the outside pg needs to monitor keypresses 
		onKeyPress();
	}
	
	// --- o --- //
	var sculpt = new Sculpture();
	var activeProgramme;
	var activeProgrammeIndex = 0;
	var programmes = [];
	
	function onFrame(){
		var nowT = new Date().getTime();
		if (prevFrameT == 0) {
			prevFrameT = nowT;
			requestAnimFrame(onFrame);
			return;
		}
		elapse = nowT - prevFrameT;
		
		if (100 < elapse) elapse = 100;
		
		handleKeys();
		
		activeProgramme.onFrame(elapse);
		sculpt.render();
		
		prevFrameT = nowT;
		requestAnimFrame(onFrame);
	}
	
	var onInit = function(){}; // - to be overridden by code that controlls the outer page
	function onLoaded(){
		// - any changes to sculpt settings go here
		
		sculpt.init();
		
		for ( var i in programmes) {
			programmes[i].init(sculpt);
		}
		
		activeProgramme = programmes[activeProgrammeIndex];
		
		onFrame();
		initSockets();
		onInit();
	}
	
	// ======= end main structure begin modular parts ======= //
	
	// ======= animations ======= //
	
	// === programme A === //
	var pA = new Programme('Programme A'); 
	
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
			var color = hsbToRGB(adjLat, 1.0, dimMult);
			bulb.color.r = color.r;
			bulb.color.g = color.g;
			bulb.color.b = color.b;
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
	
	programmes.push(pA);
	
	
	
	// === programme B=== //
	var pB = new Programme('Programme B'); 
	
	pB.centerLlat = 0.5;
	pB.latRange = 0.05;
	
	pB.bumpMax = 0.04;
	pB.bumpRate = 3000;
	
	pB.fadeRate = 3000;
	pB.fadeFloor = 0.01;
	//pB.glowMult = 0.1;
	
	pB.pTimeMult = 0.15;
	
	pB.pNum = 8;
	pB.particles = [];
	pB.entropyMult = 0.996;
	pB.elasticyY = 0.0002;
	pB.elasticyX = 0.0003;
	pB.breakY = 1;
	
	for (var iPart = 0; iPart < pB.pNum; iPart++){
		var p = {};
		p.id = 'p'+iPart;
		p.y1 = 0;
		p.y = 0;
		p.vY = 0;
		pB.particles.push(p);
	}
	
	pB.particles[3].vY = pB.bumpMax;
	
	pB.hueRate = 3000;
	
	pB.getForce = function(elapse, distance, elasticy) {
		var tension = -distance / pB.breakY;
		if (tension > 1)
			tension = 1;
		if (tension < -1)
			tension = -1;
		var force = tension * elasticy * elapse;

		return force;
	}
	
	pB.pFrame = function(elapse) {
		var lY;
		var rY;
		var diff;
		var force;
		var i;
		var lP;
		var rP;
		
		for (i = 0; i < pB.particles.length; i++) {
			if (0 == i) {
				lP = pB.particles[pB.particles.length - 1];
			} else {
				lP = pB.particles[i - 1];
			}
			rP = pB.particles[i];

			lY = (lP.y1 + lP.y) * 0.5;
			rY = (rP.y1 + rP.y) * 0.5;
			force = pB.getForce(elapse, lY - rY, pB.elasticyX);
			lP.vY += force;
			rP.vY -= force;
		}
		
		var avgVY;
		var avgY;
		
		for (i = 0; i < pB.particles.length; i++) {
			var p = pB.particles[i];
			
			avgVY = p.vY;
			avgY = (p.y1 + p.y) * 0.5;
			
			p.vY += pB.getForce(elapse, avgY, pB.elasticyY);

			p.vY *= Math.pow(pB.entropyMult, elapse);
			avgVY += p.vY;
			avgVY *= 0.5;
			p.y1 = p.y;
			p.y += avgVY * elapse;
		}
	}

	pB.oddsCollect = 0;
	
	pB.onFrame = function(elapse){
		var pElapse = elapse * pB.pTimeMult;
		
		var iBulb;
		var iPart;
		var strength;
		var hsb;
		var rgb;
		var cordLat;
		var prevCordLat;
		var atIndex;
		var lIndex;
		var rIndex;
		var bulbDist;
		
		// - add a push?
		pB.oddsCollect += Math.random() * (elapse/pB.bumpRate);
		if (pB.oddsCollect >= 1){
			pB.oddsCollect = 0;
			var pI = Math.floor(Math.random() * pB.particles.length);
			var bumpY = ((Math.random() * 2) -1) * pB.bumpMax;
			pB.particles[pI].vY += bumpY;
			//console.log('bump:'+bumpY);
		}
		
		pB.pFrame(pElapse);
		
		
		for (iBulb = 0; iBulb < this.sculpt.bulbs.length; iBulb++){
			var bulb = this.sculpt.bulbs[iBulb];
			atIndex =  (bulb.longitude / twoPI) * pB.particles.length;
			lIndex = Math.floor(atIndex);
			atIndex -= lIndex;
			rIndex = lIndex + 1;
			lIndex = modulo(lIndex, pB.particles.length);
			rIndex = modulo(rIndex, pB.particles.length);
			
			cordLat = lerp(pB.particles[lIndex].y, pB.particles[rIndex].y, atIndex);
			cordLat += pB.centerLlat;
			
			prevCordLat = lerp(pB.particles[lIndex].y1, pB.particles[rIndex].y1, atIndex);
			prevCordLat += pB.centerLlat;
			
			if (Math.abs(cordLat - prevCordLat) < pB.latRange){
				var dMult = 1;
				if (prevCordLat < cordLat){
					dMult = -1;
				}
				prevCordLat = cordLat + (pB.latRange * dMult);
			}
			
			var tOffset = iLerp(prevCordLat, cordLat, bulb.latitude);
			var fadeElapse = elapse;
			
			if (0 < tOffset && tOffset <= 1){
				/*
				strength = 1 - ((cordLat - bulb.latitude)/0.4);
				hsb = rgbToHSB(bulb.color.r, bulb.color.g, bulb.color.b);
				hsb.h += elapse / pB.hueRate;
				
				strength = (strength * pB.glowMult) + (hsb.b * (1-pB.glowMult));
				
				rgb = hsbToRGB(hsb.h, 1.0, strength);
				bulb.color.r = rgb.r; // TODO: make an RGB class so we can just do bulb.color = rgb and rgbToHSB(rgb)
				bulb.color.g = rgb.g;
				bulb.color.b = rgb.b;
				*/
				bulb.color.r = 1.0; // TODO: make an RGB class so we can just do bulb.color = rgb and rgbToHSB(rgb)
				bulb.color.g = 0.0;
				bulb.color.b = 0.0;
				//fadeElapse *= 1 - tOffset;
			}
			
			hsb = rgbToHSB(bulb.color.r, bulb.color.g, bulb.color.b);
			hsb.h += fadeElapse / pB.hueRate;
			hsb.b -= fadeElapse / pB.fadeRate
			rgb = hsbToRGB(hsb.h, hsb.s, hsb.b);
			
			bulb.color.r = rgb.r;
			bulb.color.g = rgb.g;
			bulb.color.b = rgb.b;
			
		}
	}
	
	programmes.push(pB);
	// === o === //
	
	activeProgrammeIndex = 1;
	
	// ======= code for anything outside of the sculpture ======= //
	function showProgInfo(){
		$('#progTitle').html(activeProgramme.title);
	}
	
	var prgCyclePressed = false;
	onKeyPress = function(){
		// - key 32 = spacebar
		if (currentlyPressedKeys[32] && !prgCyclePressed){
			activeProgrammeIndex = modulo(activeProgrammeIndex+1, programmes.length);
			activeProgramme = programmes[activeProgrammeIndex];
			
			showProgInfo();
			
			prgCyclePressed = true;
		}
		
		if (prgCyclePressed && !currentlyPressedKeys[32]){
			prgCyclePressed = false;
		}
	}
	
	onInit = function(){
		showProgInfo();
	}
	
	// ======= o ======= //
	
	// ======= Web Socket ======= //
	
	function logMessage(msg, type){
		var msgRoom = "";
		if (typeof msg.room != 'undefined'){
			msgRoom = msg.room;
		}
		console.log(msg.count +' '+ type.toString() +' '+ msgRoom);
		console.log( msg );
	}
	
	function initSockets(){
		namespace = '/beaconsim'; // change to an empty string to use the global namespace

	    // the socket.io documentation recommends sending an explicit package upon connection
	    // this is specially important when using the global namespace
	    socket = io.connect('http://' + document.domain + ':' + location.port + namespace);
	    socket.on('connect', function() {
	        socket.emit('my event', {data: 'I\'m connected!'});
	    });
		
	    socket.on('response', function(msg) {
	        logMessage(msg, "Received");
	    });
	    
	    socket.on('joined_room', function(msg) {
	    	logMessage(msg, "Joined Room");
	    	onJoinGame(msg);
	    });
	}
	
	// ======= o ======= //
	
	// ======= kick out the jam! ======= //
	onLoaded();
} // end main()