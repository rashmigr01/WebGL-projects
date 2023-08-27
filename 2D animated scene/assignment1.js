/////////////////////////////////////////////////////////////////////////////
// A WebGL program to replicate the provided final canvas of assignment 1 //
////////////////////////////////////////////////////////////////////////////

var gl;
var color;
var matrixStack = [];

var animation;
var boat_x;
var sun_x;
var windmill1_x;
var windmill2_x;

var mMatrix = mat4.create();
var uMMatrixLocation;

var circleBuf;
var circleIndexBuf;

var sqVertexPositionBuffer;
var sqVertexIndexBuffer;

var aPositionLocation;
var uColorLoc;

const vertexShaderCode = `#version 300 es
in vec2 aPosition;
uniform mat4 uMMatrix;

void main() {
  gl_Position = uMMatrix*vec4(aPosition,0.0,1.0);
  gl_PointSize = 10.0;
}`;

const fragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;

uniform vec4 color;

void main() {
  fragColor = color;
}`;

function pushMatrix(stack, m) {
  var copy = mat4.create(m);
  stack.push(copy);
}

function popMatrix(stack) {
  if (stack.length > 0) return stack.pop();
  else console.log("stack has no matrix to pop!");
}

function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function vertexShaderSetup(vertexShaderCode) {
  shader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(shader, vertexShaderCode);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function fragmentShaderSetup(fragShaderCode) {
  shader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(shader, fragShaderCode);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function initShaders() {
  shaderProgram = gl.createProgram();

  var vertexShader = vertexShaderSetup(vertexShaderCode);
  var fragmentShader = fragmentShaderSetup(fragShaderCode);

  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.log(gl.getShaderInfoLog(vertexShader));
    console.log(gl.getShaderInfoLog(fragmentShader));
  }

  gl.useProgram(shaderProgram);

  return shaderProgram;
}

function initGL(canvas) {
  try {
    gl = canvas.getContext("webgl2");
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
  } catch (e) {}
  if (!gl) {
    alert("WebGL initialization failed");
  }
}

function initSquareBuffer() {
  const sqVertices = new Float32Array([
    0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
  ]);
  sqVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, sqVertices, gl.STATIC_DRAW);
  sqVertexPositionBuffer.itemSize = 2;
  sqVertexPositionBuffer.numItems = 4;

  const sqIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
  sqVertexIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sqIndices, gl.STATIC_DRAW);
  sqVertexIndexBuffer.itemsize = 1;
  sqVertexIndexBuffer.numItems = 6;
}

function drawSquare(color, mMatrix) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

  gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
  gl.vertexAttribPointer(
    aPositionLocation,
    sqVertexPositionBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);

  gl.uniform4fv(uColorLoc, color);

  // Conditional check of the mode
  if (current_mode === "solid") {
    gl.drawElements(gl.TRIANGLES, sqVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  }
  else if (current_mode === "wireframe") {
    gl.drawElements(gl.LINE_LOOP, sqVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  }
  else {
    gl.drawElements(gl.POINTS, sqVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  }
  
}

function initTriangleBuffer() {
  const triangleVertices = new Float32Array([0.0, 0.5, -0.5, -0.5, 0.5, -0.5]);
  triangleBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
  gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
  triangleBuf.itemSize = 2;
  triangleBuf.numItems = 3;

  const triangleIndices = new Uint16Array([0, 1, 2]);
  triangleIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangleIndices, gl.STATIC_DRAW);
  triangleIndexBuf.itemsize = 1;
  triangleIndexBuf.numItems = 3;
}

function drawTriangle(color, mMatrix) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    triangleBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);

  gl.uniform4fv(uColorLoc, color);

  // Conditional check of the mode
  if (current_mode === "solid") {
    gl.drawElements(gl.TRIANGLES, triangleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
  }
  else if (current_mode === "wireframe") {
    gl.drawElements(gl.LINE_LOOP, triangleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
  }
  else {
    gl.drawElements(gl.POINTS, triangleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
  }
}

////////////////////////////////////////////////////////////////////////

function initCircleBuffer() {
  radius = 1.0;
  numSegments = 60;

  const circleVertices = [];
  const circleIndices = [];

  circleVertices.push(0.0, 0.0);

  for (let i = 0; i <= numSegments; i++) {
      const angle = (i / numSegments) * Math.PI * 2;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      circleVertices.push(x, y);

      if (i > 0) {
          circleIndices.push(0, i, i + 1);
      }

  }
  circleIndices.push(0, numSegments, 1);
    
  circleBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circleVertices), gl.STATIC_DRAW);
  circleBuf.itemSize = 2;
  circleBuf.numItems = circleVertices.length / 2;

  circleIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(circleIndices), gl.STATIC_DRAW);
  circleIndexBuf.itemSize = 1;
  circleIndexBuf.numItems = circleIndices.length;
}

function drawCircle(color, mMatrix) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

  gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    circleBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuf);

  gl.uniform4fv(uColorLoc, color);

  // Conditional check of the mode
  if (current_mode === "solid") {
    gl.drawElements(gl.TRIANGLES, circleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
  }
  else if (current_mode === "wireframe") {
    gl.drawElements(gl.LINE_LOOP, circleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
  }
  else {
    gl.drawElements(gl.POINTS, circleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
  }
}

////////////////////////////////////////////////////////////////////////

function drawFloor() {
    //Greenary
    pushMatrix(matrixStack, mMatrix);
    color = [0.408, 0.886, 0.541, 1.0];
    mMatrix = mat4.scale(mMatrix, [2.0, 1, 1.0]);
    mMatrix = mat4.translate(mMatrix, [0,-0.5,0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Greenary road
    pushMatrix(matrixStack, mMatrix);
    color = [0.471, 0.694, 0.282, 1.0];
    mMatrix = mat4.scale(mMatrix, [1.5, 2.5, 1.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(55), [0, 0, 1]);
    mMatrix = mat4.translate(mMatrix, [-0.13, -0.43,0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //River
    pushMatrix(matrixStack, mMatrix);
    color = [0.165, 0.392, 0.965, 1.0];
    mMatrix = mat4.scale(mMatrix, [2.0, 0.2, 1.0]);
    mMatrix = mat4.translate(mMatrix, [0, -0.64, 0.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //River Lines

    //Line 1
    pushMatrix(matrixStack, mMatrix);
    color = [0.604, 0.678, 0.878, 1.0];
    mMatrix = mat4.scale(mMatrix, [0.4, 0.004, 1.0]);
    mMatrix = mat4.translate(mMatrix, [0.1, -19.0, 0.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    //Line 2
    pushMatrix(matrixStack, mMatrix);
    color = [0.604, 0.678, 0.878, 1.0];
    mMatrix = mat4.scale(mMatrix, [0.4, 0.004, 1.0]);
    mMatrix = mat4.translate(mMatrix, [1.75, -50.0, 0.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    //Line 3
    pushMatrix(matrixStack, mMatrix);
    color = [0.604, 0.678, 0.878, 1.0];
    mMatrix = mat4.scale(mMatrix, [0.4, 0.004, 1.0]);
    mMatrix = mat4.translate(mMatrix, [-1.75, -35.0, 0.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

////////////////////////////////////////////////////////////////////////

function drawTop() {
    //Sky
    pushMatrix(matrixStack, mMatrix);
    color = [0.502, 0.792, 0.980, 1.0];
    mMatrix = mat4.scale(mMatrix, [2.0, 1, 1.0]);
    mMatrix = mat4.translate(mMatrix, [0,0.5,0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Mountains

    //Mountain - left - shade
    pushMatrix(matrixStack, mMatrix);
    color = [0.482, 0.369, 0.274, 1.0];
    mMatrix = mat4.scale(mMatrix, [1.5, 0.35, 1.0]);
    mMatrix = mat4.translate(mMatrix, [-0.5, 0.0, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Mountain - left - main
    pushMatrix(matrixStack, mMatrix);
    color = [0.569, 0.475, 0.341, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.71, 0.005, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(12), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [1.5, 0.35, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Mountain - right - main
    pushMatrix(matrixStack, mMatrix);
    color = [0.569, 0.475, 0.341, 1.0];
    mMatrix = mat4.scale(mMatrix, [1.5, 0.35, 1.0]);
    mMatrix = mat4.translate(mMatrix, [0.55, 0.0, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Mountain - center - shade
    pushMatrix(matrixStack, mMatrix);
    color = [0.482, 0.369, 0.274, 1.0];
    mMatrix = mat4.scale(mMatrix, [1.5, 0.5, 1.0]);
    mMatrix = mat4.translate(mMatrix, [0.03, 0.1, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    // //Mountain - center - main
    pushMatrix(matrixStack, mMatrix);
    color = [0.569, 0.475, 0.341, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.1, 0.055, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(12), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [1.5, 0.5, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Trees

    //Tree - right - trunk
    pushMatrix(matrixStack, mMatrix);
    color = [0.475, 0.310, 0.306, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.82, 0.14, 0]);
    mMatrix = mat4.scale(mMatrix, [0.05, 0.3, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Tree - right - lower layer
    pushMatrix(matrixStack, mMatrix);
    color = [0.263, 0.592, 0.333, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.82, 0.4, 0]);
    mMatrix = mat4.scale(mMatrix, [0.3, 0.3, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Tree - right - middle layer
    pushMatrix(matrixStack, mMatrix);
    color = [0.412, 0.694, 0.353, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.82, 0.44, 0]);
    mMatrix = mat4.scale(mMatrix, [0.35, 0.3, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Tree - right - upper layer
    pushMatrix(matrixStack, mMatrix);
    color = [0.502, 0.792, 0.373, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.82, 0.48, 0]);
    mMatrix = mat4.scale(mMatrix, [0.4, 0.3, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Tree - middle - trunk
    pushMatrix(matrixStack, mMatrix);
    color = [0.475, 0.310, 0.306, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.53, 0.16, 0]);
    mMatrix = mat4.scale(mMatrix, [0.05, 0.35, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Tree - middle - lower layer
    pushMatrix(matrixStack, mMatrix);
    color = [0.263, 0.592, 0.333, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.53, 0.48, 0]);
    mMatrix = mat4.scale(mMatrix, [0.42, 0.38, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Tree - middle - middle layer
    pushMatrix(matrixStack, mMatrix);
    color = [0.412, 0.694, 0.353, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.53, 0.53, 0]);
    mMatrix = mat4.scale(mMatrix, [0.48, 0.38, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Tree - middle - upper layer
    pushMatrix(matrixStack, mMatrix);
    color = [0.502, 0.792, 0.373, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.53, 0.58, 0]);
    mMatrix = mat4.scale(mMatrix, [0.54, 0.38, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Tree - left - trunk
    pushMatrix(matrixStack, mMatrix);
    color = [0.475, 0.310, 0.306, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.24, 0.13, 0]);
    mMatrix = mat4.scale(mMatrix, [0.05, 0.28, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Tree - left - lower layer
    pushMatrix(matrixStack, mMatrix);
    color = [0.263, 0.592, 0.333, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.24, 0.38, 0]);
    mMatrix = mat4.scale(mMatrix, [0.28, 0.28, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Tree - left - middle layer
    pushMatrix(matrixStack, mMatrix);
    color = [0.412, 0.694, 0.353, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.24, 0.42, 0]);
    mMatrix = mat4.scale(mMatrix, [0.32, 0.28, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Tree - left - upper layer
    pushMatrix(matrixStack, mMatrix);
    color = [0.502, 0.792, 0.373, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.24, 0.46, 0]);
    mMatrix = mat4.scale(mMatrix, [0.36, 0.28, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

////////////////////////////////////////////////////////////////////////

function drawClouds_Birds() {
    //Clouds

    //Cloud - left
    pushMatrix(matrixStack, mMatrix);
    color = [1.0, 1.0, 1.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.85, 0.55, 0]);
    mMatrix = mat4.scale(mMatrix, [0.2, 0.1, 0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Cloud - middle
    pushMatrix(matrixStack, mMatrix);
    color = [1.0, 1.0, 1.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.65, 0.525, 0]);
    mMatrix = mat4.scale(mMatrix, [0.15, 0.08, 0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Cloud - right
    pushMatrix(matrixStack, mMatrix);
    color = [1.0, 1.0, 1.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.45, 0.525, 0]);
    mMatrix = mat4.scale(mMatrix, [0.09, 0.055, 0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Birds

    //Bird - big - body
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.1, 0.65, 0]);
    mMatrix = mat4.scale(mMatrix, [0.018, 0.018, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Bird - big - wingl
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.055, 0.67, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-10), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.08, 0.01, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Bird - big - wingr
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.145, 0.67, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(10), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.08, 0.01, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Bird - medium1 - body
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.25, 0.7, 0]);
    mMatrix = mat4.scale(mMatrix, [0.012, 0.012, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Bird - medium1 - wingl
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.28, 0.715, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-10), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.06, 0.007, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Bird - medium1 - wingr
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.22, 0.715, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(10), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.06, 0.007, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Bird - medium2 - body
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.35, 0.84, 0]);
    mMatrix = mat4.scale(mMatrix, [0.012, 0.012, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Bird - medium2 - wingl
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.32, 0.855, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-10), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.06, 0.007, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Bird - medium2 - wingr
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.38, 0.855, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(10), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.06, 0.007, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Bird - small - body
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.05, 0.8, 0]);
    mMatrix = mat4.scale(mMatrix, [0.008, 0.008, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Bird - small - wingl
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.065, 0.81, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-10), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.04, 0.005, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Bird - small - wingr
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.03, 0.81, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(10), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.04, 0.005, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Bird - tiny - body
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.04, 0.85, 0]);
    mMatrix = mat4.scale(mMatrix, [0.004, 0.004, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Bird - tiny - wingl
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.03, 0.855, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-10), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.02, 0.003, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Bird - tiny - wingr
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.05, 0.855, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(10), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.02, 0.003, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

////////////////////////////////////////////////////////////////////////

function drawBoat() {
    //Boat straight line
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.1, 0.01, 0]);
    mMatrix = mat4.scale(mMatrix, [0.0125, 0.25, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Boat wing
    pushMatrix(matrixStack, mMatrix);
    color = [0.831, 0.345, 0.145, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.145, 0.0375, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(26), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.175, 0.175, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Boat slant line
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.05, 0.01, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-25), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.005, 0.27, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Boat body
    pushMatrix(matrixStack, mMatrix);
    color = [0.8, 0.8, 0.8, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.1, -0.125, 0]);
    mMatrix = mat4.scale(mMatrix, [0.225, 0.05, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Boat body left
    pushMatrix(matrixStack, mMatrix);
    color = [0.8, 0.8, 0.8, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.01, -0.125, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.05, 0.05, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Boat body right
    pushMatrix(matrixStack, mMatrix);
    color = [0.8, 0.8, 0.8, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.21, -0.125, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.05, 0.05, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

////////////////////////////////////////////////////////////////////////

function drawWindmillpoles() {
    //Windmill left - trunk
    pushMatrix(matrixStack, mMatrix);
    color = [0.2, 0.2, 0.2, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.46, -0.175, 0]);
    mMatrix = mat4.scale(mMatrix, [0.04, 0.5, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Windmill right - trunk
    pushMatrix(matrixStack, mMatrix);
    color = [0.2, 0.2, 0.2, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.625, -0.175, 0]);
    mMatrix = mat4.scale(mMatrix, [0.04, 0.5, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

////////////////////////////////////////////////////////////////////////

function drawWindmill1() {
    //Windmill left - wing1
    pushMatrix(matrixStack, mMatrix);
    color = [0.702, 0.702, 0.224, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.46, -0.02, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(0), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.08, 0.25, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Windmill left - wing2
    pushMatrix(matrixStack, mMatrix);
    color = [0.702, 0.702, 0.224, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.345, 0.1, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(90), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.08, 0.25, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Windmill left - wing3
    pushMatrix(matrixStack, mMatrix);
    color = [0.702, 0.702, 0.224, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.46, 0.225, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.08, 0.25, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Windmill left - wing4
    pushMatrix(matrixStack, mMatrix);
    color = [0.702, 0.702, 0.224, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.575, 0.1, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(270), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.08, 0.25, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Windmill left - center
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.46, 0.1, 0]);
    mMatrix = mat4.scale(mMatrix, [0.03, 0.03, 0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

////////////////////////////////////////////////////////////////////////

function drawWindmill2() {
    //Windmill right - wing1
    pushMatrix(matrixStack, mMatrix);
    color = [0.702, 0.702, 0.224, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.625, -0.02, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(0), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.08, 0.25, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Windmill left - wing2
    pushMatrix(matrixStack, mMatrix);
    color = [0.702, 0.702, 0.224, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.735, 0.1, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(90), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.08, 0.25, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Windmill left - wing3
    pushMatrix(matrixStack, mMatrix);
    color = [0.702, 0.702, 0.224, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.625, 0.225, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.08, 0.25, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Windmill left - wing4
    pushMatrix(matrixStack, mMatrix);
    color = [0.702, 0.702, 0.224, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.5, 0.1, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(270), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.08, 0.25, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Windmill right - center
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.625, 0.1, 0]);
    mMatrix = mat4.scale(mMatrix, [0.03, 0.03, 0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

////////////////////////////////////////////////////////////////////////

function drawSun() {
    //Sun center
    pushMatrix(matrixStack, mMatrix);
    color = [0.984, 0.902, 0.302, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.7, 0.8, 0]);
    mMatrix = mat4.scale(mMatrix, [0.11, 0.11, 0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Sun spokes - 1
    pushMatrix(matrixStack, mMatrix);
    color = [0.984, 0.902, 0.302, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.7, 0.8, 0]);
    mMatrix = mat4.scale(mMatrix, [0.008, 0.325, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Sun spokes - 2
    pushMatrix(matrixStack, mMatrix);
    color = [0.984, 0.902, 0.302, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.7, 0.8, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(45), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.008, 0.325, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Sun spokes - 3
    pushMatrix(matrixStack, mMatrix);
    color = [0.984, 0.902, 0.302, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.7, 0.8, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(90), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.008, 0.325, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Sun spokes - 4
    pushMatrix(matrixStack, mMatrix);
    color = [0.984, 0.902, 0.302, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.7, 0.8, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(135), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [0.008, 0.325, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

////////////////////////////////////////////////////////////////////////

function drawBottomElements() {
    //Bushes

    //Bush bottom

    //Right
    pushMatrix(matrixStack, mMatrix);
    color = [0.165, 0.392, 0.098, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.2, -1.005, 0]);
    mMatrix = mat4.scale(mMatrix, [0.08, 0.025, 0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Left
    pushMatrix(matrixStack, mMatrix);
    color = [0.314, 0.690, 0.200, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.35, -1.01, 0]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.05, 0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Middle
    pushMatrix(matrixStack, mMatrix);
    color = [0.263, 0.592, 0.165, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.07, -1.01, 0]);
    mMatrix = mat4.scale(mMatrix, [0.225, 0.12, 0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Bush left house

    //Left
    pushMatrix(matrixStack, mMatrix);
    color = [0.314, 0.690, 0.200, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.92, -0.57, 0]);
    mMatrix = mat4.scale(mMatrix, [0.06, 0.05, 0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Middle
    pushMatrix(matrixStack, mMatrix);
    color = [0.263, 0.592, 0.165, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.83, -0.56, 0]);
    mMatrix = mat4.scale(mMatrix, [0.09, 0.06, 0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Bush right house

    //Right
    pushMatrix(matrixStack, mMatrix);
    color = [0.165, 0.392, 0.098, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.1, -0.55, 0]);
    mMatrix = mat4.scale(mMatrix, [0.07, 0.05, 0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Left
    pushMatrix(matrixStack, mMatrix);
    color = [0.314, 0.690, 0.200, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.3, -0.56, 0]);
    mMatrix = mat4.scale(mMatrix, [0.06, 0.05, 0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Middle
    pushMatrix(matrixStack, mMatrix);
    color = [0.263, 0.592, 0.165, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.2, -0.54, 0]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.08, 0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Bush right

    //Left
    pushMatrix(matrixStack, mMatrix);
    color = [0.314, 0.690, 0.200, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.85, -0.42, 0]);
    mMatrix = mat4.scale(mMatrix, [0.09, 0.075, 0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Middle
    pushMatrix(matrixStack, mMatrix);
    color = [0.263, 0.592, 0.165, 1.0];
    mMatrix = mat4.translate(mMatrix, [1.0, -0.4, 0]);
    mMatrix = mat4.scale(mMatrix, [0.125, 0.09, 0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //House

    //House Body
    pushMatrix(matrixStack, mMatrix);
    color = [0.898, 0.898, 0.898, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.55, -0.5, 0]);
    mMatrix = mat4.scale(mMatrix, [0.5, 0.25, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //House door
    pushMatrix(matrixStack, mMatrix);
    color = [0.867, 0.710, 0.239, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.55, -0.545, 0]);
    mMatrix = mat4.scale(mMatrix, [0.075, 0.165, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //House right window
    pushMatrix(matrixStack, mMatrix);
    color = [0.867, 0.710, 0.239, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.7, -0.45, 0]);
    mMatrix = mat4.scale(mMatrix, [0.075, 0.075, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //House left window
    pushMatrix(matrixStack, mMatrix);
    color = [0.867, 0.710, 0.239, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.4, -0.45, 0]);
    mMatrix = mat4.scale(mMatrix, [0.075, 0.075, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //House roof
    pushMatrix(matrixStack, mMatrix);
    color = [0.925, 0.357, 0.161, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.55, -0.265, 0]);
    mMatrix = mat4.scale(mMatrix, [0.4, 0.225, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //House roof left
    pushMatrix(matrixStack, mMatrix);
    color = [0.925, 0.357, 0.161, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.75, -0.265, 0]);
    mMatrix = mat4.scale(mMatrix, [0.225, 0.225, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //House roof right
    pushMatrix(matrixStack, mMatrix);
    color = [0.925, 0.357, 0.161, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.35, -0.265, 0]);
    mMatrix = mat4.scale(mMatrix, [0.225, 0.225, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Car

    //Wheel outer right
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.3, -0.872, 0]);
    mMatrix = mat4.scale(mMatrix, [0.04, 0.04, 0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Wheel inner right
    pushMatrix(matrixStack, mMatrix);
    color = [0.502, 0.502, 0.502, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.3, -0.872, 0]);
    mMatrix = mat4.scale(mMatrix, [0.03, 0.03, 0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Wheel outer left
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.575, -0.872, 0]);
    mMatrix = mat4.scale(mMatrix, [0.04, 0.04, 0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Wheel inner left
    pushMatrix(matrixStack, mMatrix);
    color = [0.502, 0.502, 0.502, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.575, -0.872, 0]);
    mMatrix = mat4.scale(mMatrix, [0.03, 0.03, 0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Car top
    pushMatrix(matrixStack, mMatrix);
    color = [0.749, 0.420, 0.326, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.45, -0.75, 0]);
    mMatrix = mat4.scale(mMatrix, [0.25, 0.2, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Car top left
    pushMatrix(matrixStack, mMatrix);
    color = [0.749, 0.420, 0.326, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.575, -0.75, 0]);
    mMatrix = mat4.scale(mMatrix, [0.2, 0.2, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Car top right
    pushMatrix(matrixStack, mMatrix);
    color = [0.749, 0.420, 0.326, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.325, -0.75, 0]);
    mMatrix = mat4.scale(mMatrix, [0.2, 0.2, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Car body
    pushMatrix(matrixStack, mMatrix);
    color = [0.216, 0.494, 0.871, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.45, -0.8, 0]);
    mMatrix = mat4.scale(mMatrix, [0.45, 0.1, 0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Car body left
    pushMatrix(matrixStack, mMatrix);
    color = [0.216, 0.494, 0.871, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.675, -0.8, 0]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.1, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //Car body right
    pushMatrix(matrixStack, mMatrix);
    color = [0.216, 0.494, 0.871, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.225, -0.8, 0]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.1, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}

////////////////////////////////////////////////////////////////////////

function drawScene() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

  boat_x = -0.8;
  sun_x = 0.0;
  windmill1_x = 0.0;
  windmill2_x = 0.0;

  if (animation) {
    window.cancelAnimationFrame(animation);
  }

  var animate = function() {
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    mat4.identity(mMatrix);
    drawTop();
    drawFloor();
    drawClouds_Birds();

    //Boat Animation code begins
    pushMatrix(matrixStack, mMatrix);

    mat4.identity(mMatrix);

    const animationDist = 1.35;
    const animationSpeed = 0.3;

    boat_x = -0.75 + animationDist * 0.5 * (1 + Math.sin(performance.now() * animationSpeed * 0.001));
    mMatrix = mat4.translate(mMatrix, [boat_x, 0, 0]);
    drawBoat();

    mMatrix = popMatrix(matrixStack);
    //Boat Animation code ends

    drawWindmillpoles();

    //Windmill 1 animation begins
    pushMatrix(matrixStack, mMatrix);

    mat4.identity(mMatrix);

    windmill1_x -= 2.0;
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.46, 0.1, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(windmill1_x), [0.0, 0.0, 1.0]);
    mMatrix = mat4.translate(mMatrix, [0.46, -0.1, 0]);
    drawWindmill1();
    mMatrix = popMatrix(matrixStack);    

    mMatrix = popMatrix(matrixStack);
    //WIndmill 1 animation ends

    //Windmill 2 animation begins
    pushMatrix(matrixStack, mMatrix);

    mat4.identity(mMatrix);

    windmill2_x -= 2.0;
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.625, 0.1, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(windmill2_x), [0.0, 0.0, 1.0]);
    mMatrix = mat4.translate(mMatrix, [-0.625, -0.1, 0]);
    drawWindmill2();
    mMatrix = popMatrix(matrixStack);    

    mMatrix = popMatrix(matrixStack);
    //WIndmill 2 animation ends

    //Sun Animation code begins
    pushMatrix(matrixStack, mMatrix);

    mat4.identity(mMatrix);

    sun_x += 0.5;
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-0.7, 0.8, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(sun_x), [0.0, 0.0, 1.0]);
    mMatrix = mat4.translate(mMatrix, [0.7, -0.8, 0]);
    drawSun();
    mMatrix = popMatrix(matrixStack);

    mMatrix = popMatrix(matrixStack);
    //Sun Animation code ends

    drawBottomElements();
    animation = window.requestAnimationFrame(animate);
  };
  animate();
}

////////////////////////////////////////////////////////////////////////

let current_mode = "solid";

function webGLStart() {
  var canvas = document.getElementById("Assignment_1");
  initGL(canvas);
  shaderProgram = initShaders();

  const aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");

  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");

  gl.enableVertexAttribArray(aPositionLocation);

  uColorLoc = gl.getUniformLocation(shaderProgram, "color");

  initSquareBuffer();
  initTriangleBuffer();
  initCircleBuffer();

  drawScene();
}

////////////////////////////////////////////////////////////////////////

function PointView() {
    current_mode = "point";
    drawScene();
}
function WireframeView() {
    current_mode = "wireframe";
    drawScene();
}
function SolidView() {
    current_mode = "solid";
    drawScene();
}

////////////////////////////////////////////////////////////////////////

//List of colours used:

//River: rgba(42,100,246,255) = (0.165, 0.392, 0.965, 1.0)
//River Lines: rgba(109,152,238,255) = (0.427, 0.596, 0.933, 1.0) // opted for (0.604, 0.678, 0.878, 1.0)
//Greenary: rgba(104,226,138,255) = (0.408, 0.886, 0.541, 1.0)
//Greenary road: rgba(120,177,72,255) = (0.471, 0.694, 0.282, 1.0)
//Bush Middle: rgba(67,151,42,255) = (0.263, 0.592, 0.165, 1.0)
//Bush Left: rgba(80,176,51,255) = (0.314, 0.690, 0.200, 1.0)
//Bush Right: rgba(42,100,25,255) = (0.165, 0.392, 0.098, 1.0)
//Car body: rgba(55,126,222,255) = (0.216, 0.494, 0.871, 1.0)
//Car Top: rgba(191,107,83,255) = (0.749, 0.420, 0.326, 1.0)
//Car wheel: rgba(128,128,128,255) = (0.502, 0.502, 0.502, 1.0)
//Car wheel border: rgba(0,0,0,255) = (0.0, 0.0, 0.0, 1.0)
//House Body: rgba(229,229,229,255) = (0.898, 0.898, 0.898, 1.0)
//House Door, Windows: rgba(221,181,61,255) = (0.867, 0.710, 0.239, 1.0)
//House top: rgba(236,91,41,255) = (0.925, 0.357, 0.161, 1.0)
//Windmill pole: rgba(51,51,51,255) = (0.2, 0.2, 0.2, 1.0)
//Windmill wings: rgba(179,179,57,255) = (0.702, 0.702, 0.224, 1.0)
//Windmill center: rgba(0,0,0,255) = (0.0, 0.0, 0.0, 1.0)
//Boat body: rgba(204,204,204,255) = (0.8, 0.8, 0.8, 1.0)
//Boat wing: rgba(212,88,37,255) = (0.831, 0.345, 0.145, 1.0)
//Boat structure: rgba(0,0,0,255) = (0.0, 0.0, 0.0, 1.0)
//Mountain Main: rgba(145,121,87,255) = (0.569, 0.475, 0.341, 1.0)
//Mountain Left: rgba(123,94,70,255) = (0.482, 0.369, 0.274, 1.0)
//Tree trunk: rgba(121,79,78,255) = (0.475, 0.310, 0.306, 1.0)
//Tree top: rgba(128,202,95,255) = (0.502, 0.792, 0.373, 1.0)
//Tree middle: rgba(105,177,90,255) = (0.412, 0.694, 0.353, 1.0)
//Tree bottom: rgba(67,151,85,255) = (0.263, 0.592, 0.333, 1.0)
//Sky: rgba(128,202,250,255) = (0.502, 0.792, 0.980, 1.0)
//Clouds: rgba(255,255,255,255) = (1.0, 1.0, 1.0, 1.0)
//Sun: rgba(251,230,77,255) = (0.984, 0.902, 0.302, 1.0)
//Birds: rgba(0,0,0,255) = (0.0, 0.0, 0.0, 1.0)

////////////////////////////////////////////////////////////////////////