/////////////////////////////////////////////////////////////////////////////
// A WebGL program to replicate the provided final canvas of assignment 2 //
////////////////////////////////////////////////////////////////////////////

var gl;
var canvas;
var matrixStack = [];

var buf;
var indexBuf;
var aPositionLocation;
var aNormalLocation;
var uColorLocation;
var uPMatrixLocation;
var uMMatrixLocation;
var uVMatrixLocation;

var uLightPositionLocation;
var uAmbientLightColorLocation;
var uDiffuseLightColorLocation;
var uSpecularLightColorLocation;
var uShininessLocation;

var degree1_1 = 0.0;
var degree0_1 = 0.0;
var degree1_2 = 0.0;
var degree0_2 = 0.0;
var degree1_3 = 0.0;
var degree0_3 = 0.0;
var prevMouseX = 0.0;
var prevMouseY = 0.0;

var vMatrix = mat4.create();
var mMatrix = mat4.create();
var pMatrix = mat4.create();

var eyePos = [0.0, 0.0, 2.0];
var COI = [0.0, 0.0, 0.0];
var viewUp = [0.0, 1.0, 0.0];
var x = 20.0;
var y = 10.0;

var lightPosition = [1.0, 3, 2.5];
var ambientLightColor = [0.25, 0.25, 0.25];
var diffuseLightColor = [1.0, 1.0, 1.0];
var specularLightColor = [1.0, 1.0, 1.0];
var shininess = 22.0;

var cubeNormalBuf;

var spBuf;
var spIndexBuf;
var spNormalBuf;

var spVerts = [];
var spIndicies = [];
var spNormals = [];

var vertexShader, fragmentShader;

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

/////////////////////////////////////////////////////////////////////////

const flatVertexShaderCode = `#version 300 es
precision mediump float;

in vec3 aPosition;
uniform mat4 uMMatrix;
uniform mat4 uVMatrix;
uniform mat4 uPMatrix;

out vec3 posInEyeSpace;

void main() {
    mat4 projectionModelView = uPMatrix * uVMatrix * uMMatrix;
    gl_Position = projectionModelView * vec4(aPosition, 1.0);
    
    posInEyeSpace = (uVMatrix * uMMatrix * vec4(aPosition, 1.0)).xyz;
}`;

const flatFragShaderCode = `#version 300 es
precision mediump float;

in vec3 posInEyeSpace;
uniform vec4 objColor;

uniform vec3 lightPosition;
uniform vec3 ambientLightColor;
uniform vec3 diffuseLightColor;
uniform vec3 specularLightColor;
uniform float shininess;

out vec4 fragColor;

void main() {
  vec3 dFdxPos = dFdx(posInEyeSpace);
  vec3 dFdyPos = dFdy(posInEyeSpace);
  vec3 normal = normalize(cross(dFdxPos, dFdyPos));

  vec3 lightDir = normalize(lightPosition - posInEyeSpace);

  vec3 viewDir = normalize(-posInEyeSpace);
  vec3 reflectDir = reflect(lightDir, normal);
  reflectDir = normalize(-reflectDir);

  vec3 ambient = ambientLightColor * objColor.rgb;

  float diff = max(dot(normal, lightDir), 0.0);
  vec3 diffuse = diffuseLightColor * objColor.rgb * diff;

  float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
  vec3 specular = specularLightColor * spec;

  vec3 finalColor = ambient + diffuse + specular;

  fragColor = vec4(finalColor, objColor.a);
}`;

/////////////////////////////////////////////////////////////////////////

const perVertexVertexShaderCode = `#version 300 es
precision mediump float;

in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
uniform vec4 objColor;

uniform vec3 lightPosition;
uniform vec3 ambientLightColor;
uniform vec3 diffuseLightColor;
uniform vec3 specularLightColor;
uniform float shininess;

out vec3 vertColor;

void main() {
  mat4 modelViewMatrix = uVMatrix * uMMatrix;

  vec4 posInEyeSpace = modelViewMatrix * vec4(aPosition, 1.0);
  vec3 fragPos = posInEyeSpace.xyz;

  mat3 normalMatrix = mat3(modelViewMatrix);

  vec3 fragNormal = normalize(normalMatrix * aNormal);

  vec3 fragLightDir = normalize(lightPosition - fragPos);

  vec3 fragViewDir = normalize(-fragPos);
  vec3 fragReflectDir = normalize(reflect(-fragLightDir, fragNormal));

  vec3 ambient = ambientLightColor * objColor.rgb;

  float diff = max(dot(fragNormal, fragLightDir), 0.0);
  vec3 diffuse = diffuseLightColor * objColor.rgb * diff;

  float spec = pow(max(dot(fragViewDir, fragReflectDir), 0.0), shininess);
  vec3 specular = specularLightColor * spec;

  vertColor = ambient + diffuse + specular;
  gl_Position = uPMatrix * posInEyeSpace;
}`;

const perVertexFragShaderCode = `#version 300 es
precision mediump float;

in vec3 vertColor;
uniform vec4 objColor;

out vec4 fragColor;

void main() {
    fragColor = vec4(vertColor, objColor.a);
}`;

/////////////////////////////////////////////////////////////////////////

const perFragmentVertexShaderCode = `#version 300 es
precision mediump float;

in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
uniform vec4 objColor;

out vec3 fragPosition;
out vec3 fragNormal;

void main() {
  mat4 modelViewMatrix = uVMatrix * uMMatrix;

  vec4 posInEyeSpace = modelViewMatrix * vec4(aPosition, 1.0);
  fragPosition = posInEyeSpace.xyz;

  fragNormal = mat3(modelViewMatrix) * aNormal;

  gl_Position = uPMatrix * posInEyeSpace;
}`;

const perFragmentFragShaderCode = `#version 300 es
precision mediump float;

in vec3 fragPosition;
in vec3 fragNormal;

uniform vec3 lightPosition;
uniform vec3 ambientLightColor;
uniform vec3 diffuseLightColor;
uniform vec3 specularLightColor;
uniform vec4 objColor;
uniform float shininess;

out vec4 fragColor;

void main() {
  vec3 fragLightDir = normalize(lightPosition - fragPosition);
  vec3 fragViewDir = normalize(-fragPosition);
  vec3 fragReflectDir = reflect(-fragLightDir, normalize(fragNormal));

  vec3 ambient = ambientLightColor * objColor.rgb;

  float diff = max(dot(normalize(fragNormal), fragLightDir), 0.0);
  vec3 diffuse = diffuseLightColor * objColor.rgb * diff;

  float spec = pow(max(dot(fragViewDir, fragReflectDir), 0.0), shininess);
  vec3 specular = specularLightColor * spec;

  vec3 result = ambient + diffuse + specular;
  fragColor = vec4(result, objColor.a);
}`;

/////////////////////////////////////////////////////////////////////////

function vertexShaderSetup(vertexShaderCode) {
  var shader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(shader, vertexShaderCode);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(gl.getShaderInfoLog(shader));
      return null;
  }
  return shader;
}

function fragmentShaderSetup(fragShaderCode) {
  var shader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(shader, fragShaderCode);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(gl.getShaderInfoLog(shader));
      return null;
  }
  return shader;
}


function initShaders(vertexShader, fragmentShader) {
    var shaderProgram = gl.createProgram();

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);

    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.log(gl.getShaderInfoLog(vertexShader));
        console.log(gl.getShaderInfoLog(fragmentShader));
    }

    return shaderProgram;
}

/////////////////////////////////////////////////////////////////////////

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

/////////////////////////////////////////////////////////////////////////

function initSphere(nslices, nstacks, radius) {
  for (var i = 0; i <= nslices; i++) {
    var angle = (i * Math.PI) / nslices;
    var comp1 = Math.sin(angle);
    var comp2 = Math.cos(angle);

    for (var j = 0; j <= nstacks; j++) {
      var phi = (j * 2 * Math.PI) / nstacks;
      var comp3 = Math.sin(phi);
      var comp4 = Math.cos(phi);

      var xcood = comp4 * comp1;
      var ycoord = comp2;
      var zcoord = comp3 * comp1;

      spVerts.push(radius * xcood, radius * ycoord, radius * zcoord);
      spNormals.push(xcood, ycoord, zcoord);
    }
  }

  for (var i = 0; i < nslices; i++) {
    for (var j = 0; j < nstacks; j++) {
      var id1 = i * (nstacks + 1) + j;
      var id2 = id1 + nstacks + 1;

      spIndicies.push(id1, id2, id1 + 1);
      spIndicies.push(id2, id2 + 1, id1 + 1);
    }
  }
}
  
function initSphereBuffer() {
  var nslices = 20;
  var nstacks = 30;
  var radius = 1.0;

  initSphere(nslices, nstacks, radius);

  spBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spVerts), gl.STATIC_DRAW);
  spBuf.itemSize = 3;
  spBuf.numItems = spVerts.length / 3;

  spIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint32Array(spIndicies),
    gl.STATIC_DRAW
  );
  spIndexBuf.itemsize = 1;
  spIndexBuf.numItems = spIndicies.length;

  spNormalBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spNormals), gl.STATIC_DRAW);
  spNormalBuf.itemSize = 3;
  spNormalBuf.numItems = spNormals.length / 3;
}

/////////////////////////////////////////////////////////////////////////
  
function initCubeBuffer() {
  var vertices = [
    -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
    -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
    0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
    -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5,
  ];
  buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  buf.itemSize = 3;
  buf.numItems = vertices.length / 3;

  var normals = [
    0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
    0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,
    0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
    0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,
    1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
    -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
  ];
  cubeNormalBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  cubeNormalBuf.itemSize = 3;
  cubeNormalBuf.numItems = normals.length / 3;


  var indices = [
    0,
    1,
    2,
    0,
    2,
    3,
    4,
    5,
    6,
    4,
    6,
    7,
    8,
    9,
    10,
    8,
    10,
    11,
    12,
    13,
    14,
    12,
    14,
    15,
    16,
    17,
    18,
    16,
    18,
    19,
    20,
    21,
    22,
    20,
    22,
    23,
  ];
  indexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  );
  indexBuf.itemSize = 1;
  indexBuf.numItems = indices.length;
}

////////////////////////////////////////////////////////////////////////

function drawCube(color) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(
      aPositionLocation,
      buf.itemSize,
      gl.FLOAT,
      false,
      0,
      0
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);

    if(aNormalLocation !== -1) {
      gl.vertexAttribPointer(
        aNormalLocation, 
        cubeNormalBuf.itemSize, 
        gl.FLOAT, 
        false, 
        0, 
        0
      );
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
  
    gl.drawElements(gl.TRIANGLES, indexBuf.numItems, gl.UNSIGNED_SHORT, 0);
  }

/////////////////////////////////////////////////////////////////////////

function drawSphere(color) {
    gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
    gl.vertexAttribPointer(
        aPositionLocation,
        spBuf.itemSize,
        gl.FLOAT,
        false,
        0,
        0
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);

    if(aNormalLocation !== -1) {
      gl.vertexAttribPointer(
        aNormalLocation, 
        spNormalBuf.itemSize, 
        gl.FLOAT, 
        false, 
        0, 
        0
      );
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);

    gl.drawElements(gl.TRIANGLES, spIndexBuf.numItems, gl.UNSIGNED_INT, 0);
}

////////////////////////////////////////////////////////////////////////

function drawScene() {

  /////////////////////////////////////////////////////////////////////////
  // Viewport 1
  /////////////////////////////////////////////////////////////////////////

  gl.viewport(0, 0, gl.canvas.width/3, gl.canvas.height);
  gl.useProgram(shaderProgram1);

  aPositionLocation = gl.getAttribLocation(shaderProgram1, "aPosition");
  aNormalLocation = gl.getAttribLocation(shaderProgram1, "aNormal");
  uMMatrixLocation = gl.getUniformLocation(shaderProgram1, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(shaderProgram1, "uVMatrix");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram1, "uPMatrix");
  uColorLocation = gl.getUniformLocation(shaderProgram1, "objColor");


  uLightPositionLocation = gl.getUniformLocation(shaderProgram1, "lightPosition");
  uAmbientLightColorLocation = gl.getUniformLocation(shaderProgram1, "ambientLightColor");
  uDiffuseLightColorLocation = gl.getUniformLocation(shaderProgram1, "diffuseLightColor");
  uSpecularLightColorLocation = gl.getUniformLocation(shaderProgram1, "specularLightColor");
  uShininessLocation = gl.getUniformLocation(shaderProgram1, "shininess");

  gl.enableVertexAttribArray(aPositionLocation);

  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(0, 0, gl.canvas.width/3, gl.canvas.height);

  gl.clearColor(0.827, 0.827, 0.933, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  mat4.identity(vMatrix);
  eyePos[2] = x/10.0;
  lightPosition[0] = y/10.0;
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  mat4.identity(mMatrix);

  mMatrix = mat4.rotate(mMatrix, degToRad(degree0_1), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree1_1), [1, 0, 0]);

  //Section 1 bottom cube

  mMatrix = mat4.translate(mMatrix, [0, -0.25, 0, 0]);

  mMatrix = mat4.rotate(mMatrix, degToRad(30), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(10), [1, 0, 1]);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.45, 0.7, 0.45, 1.0]);
  var color = [0.674, 0.678, 0.455, 1.0];

  gl.uniform4fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.uniform3fv(uLightPositionLocation, lightPosition);
  gl.uniform3fv(uAmbientLightColorLocation, ambientLightColor);
  gl.uniform3fv(uDiffuseLightColorLocation, diffuseLightColor);
  gl.uniform3fv(uSpecularLightColorLocation, specularLightColor);
  gl.uniform1f(uShininessLocation, shininess);

  drawCube(color);
  mMatrix = popMatrix(matrixStack);

  //Section 1 top sphere

  mMatrix = mat4.translate(mMatrix, [0, 0.625, 0, 0]);
  mMatrix = mat4.scale(mMatrix, [0.275, 0.275, 0.275, 1.0]);
  var color = [0, 0.357, 0.526, 1.0];

  gl.uniform4fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.uniform3fv(uLightPositionLocation, lightPosition);
  gl.uniform3fv(uAmbientLightColorLocation, ambientLightColor);
  gl.uniform3fv(uDiffuseLightColorLocation, diffuseLightColor);
  gl.uniform3fv(uSpecularLightColorLocation, specularLightColor);
  gl.uniform1f(uShininessLocation, shininess);

  drawSphere(color);

  /////////////////////////////////////////////////////////////////////////
  // Viewport2
  /////////////////////////////////////////////////////////////////////////

  gl.viewport(gl.viewportWidth/3, 0, gl.canvas.width/3, gl.canvas.height);

  gl.useProgram(shaderProgram2);

  aPositionLocation = gl.getAttribLocation(shaderProgram2, "aPosition");
  aNormalLocation = gl.getAttribLocation(shaderProgram2, "aNormal");
  uMMatrixLocation = gl.getUniformLocation(shaderProgram2, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(shaderProgram2, "uVMatrix");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram2, "uPMatrix");
  uColorLocation = gl.getUniformLocation(shaderProgram2, "objColor");

  uLightPositionLocation = gl.getUniformLocation(shaderProgram2, "lightPosition");
  uAmbientLightColorLocation = gl.getUniformLocation(shaderProgram2, "ambientLightColor");
  uDiffuseLightColorLocation = gl.getUniformLocation(shaderProgram2, "diffuseLightColor");
  uSpecularLightColorLocation = gl.getUniformLocation(shaderProgram2, "specularLightColor");
  uShininessLocation = gl.getUniformLocation(shaderProgram2, "shininess");

  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);
  
  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(gl.viewportWidth/3, 0, gl.canvas.width/3, gl.canvas.height);

  gl.clearColor(0.933, 0.827, 0.827, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  mat4.identity(mMatrix);

  mMatrix = mat4.rotate(mMatrix, degToRad(degree0_2), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree1_2), [1, 0, 0]);

  //Section 2 bottom sphere

  mMatrix = mat4.translate(mMatrix, [0, -0.5, 0, 0]);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.35, 0.35, 0.35, 1.0]);
  var color = [0.467, 0.467, 0.467, 1.0];

  gl.uniform4fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.uniform3fv(uLightPositionLocation, lightPosition);
  gl.uniform3fv(uAmbientLightColorLocation, ambientLightColor);
  gl.uniform3fv(uDiffuseLightColorLocation, diffuseLightColor);
  gl.uniform3fv(uSpecularLightColorLocation, specularLightColor);
  gl.uniform1f(uShininessLocation, shininess);

  drawSphere(color);
  mMatrix = popMatrix(matrixStack);

  //Section 2 bottom cube

  mMatrix = mat4.translate(mMatrix, [-0.4, 0.4, 0, 0]);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.rotate(mMatrix, degToRad(-25), [0, 0, 1]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-8), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(10), [1, 0, 0]);
  mMatrix = mat4.scale(mMatrix, [0.8, 0.8, 0.8, 1.0]);
  var color = [0, 0.584, 0, 1.0];
  mMatrix = mat4.scale(mMatrix, [0.5, 0.5, 0.5, 1.0]);

  gl.uniform4fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.uniform3fv(uLightPositionLocation, lightPosition);
  gl.uniform3fv(uAmbientLightColorLocation, ambientLightColor);
  gl.uniform3fv(uDiffuseLightColorLocation, diffuseLightColor);
  gl.uniform3fv(uSpecularLightColorLocation, specularLightColor);
  gl.uniform1f(uShininessLocation, shininess);

  drawCube(color);
  mMatrix = popMatrix(matrixStack);

  //Section 2 middle sphere

  mMatrix = mat4.translate(mMatrix, [0.2, 0.4, 0, 0]);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.25, 0.25, 0.25, 1.0]);

  var color = [0.467, 0.467, 0.467, 1.0];

  gl.uniform4fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.uniform3fv(uLightPositionLocation, lightPosition);
  gl.uniform3fv(uAmbientLightColorLocation, ambientLightColor);
  gl.uniform3fv(uDiffuseLightColorLocation, diffuseLightColor);
  gl.uniform3fv(uSpecularLightColorLocation, specularLightColor);
  gl.uniform1f(uShininessLocation, shininess);

  drawSphere(color);
  mMatrix = popMatrix(matrixStack);

  //Section 2 top cube

  mMatrix = mat4.translate(mMatrix, [0.3, 0.25, 0, 0]);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.rotate(mMatrix, degToRad(35), [0, 0, 1]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-5), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(10), [1, 0, 0]);
  mMatrix = mat4.scale(mMatrix, [0.75, 0.75, 0.75, 1.0]);
  var color = [0, 0.584, 0, 1.0];
  mMatrix = mat4.scale(mMatrix, [0.35, 0.35, 0.35, 1.0]);

  gl.uniform4fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.uniform3fv(uLightPositionLocation, lightPosition);
  gl.uniform3fv(uAmbientLightColorLocation, ambientLightColor);
  gl.uniform3fv(uDiffuseLightColorLocation, diffuseLightColor);
  gl.uniform3fv(uSpecularLightColorLocation, specularLightColor);
  gl.uniform1f(uShininessLocation, shininess);

  drawCube(color);
  mMatrix = popMatrix(matrixStack);

  //Section 2 top sphere

  mMatrix = mat4.translate(mMatrix, [-0.1, 0.215, 0, 0]);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.1, 0.1, 0.1, 1.0]);
  var color = [0.467, 0.467, 0.467, 1.0];

  gl.uniform4fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.uniform3fv(uLightPositionLocation, lightPosition);
  gl.uniform3fv(uAmbientLightColorLocation, ambientLightColor);
  gl.uniform3fv(uDiffuseLightColorLocation, diffuseLightColor);
  gl.uniform3fv(uSpecularLightColorLocation, specularLightColor);
  gl.uniform1f(uShininessLocation, shininess);

  drawSphere(color);
  mMatrix = popMatrix(matrixStack);

  /////////////////////////////////////////////////////////////////////////
  // Viewport 3
  /////////////////////////////////////////////////////////////////////////

  gl.viewport(2*gl.viewportWidth/3, 0, gl.canvas.width/3, gl.canvas.height);
  gl.useProgram(shaderProgram3);

  aPositionLocation = gl.getAttribLocation(shaderProgram3, "aPosition");
  aNormalLocation = gl.getAttribLocation(shaderProgram3, "aNormal");
  uMMatrixLocation = gl.getUniformLocation(shaderProgram3, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(shaderProgram3, "uVMatrix");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram3, "uPMatrix");
  uColorLocation = gl.getUniformLocation(shaderProgram3, "objColor");

  uLightPositionLocation = gl.getUniformLocation(shaderProgram3, "lightPosition");
  uAmbientLightColorLocation = gl.getUniformLocation(shaderProgram3, "ambientLightColor");
  uDiffuseLightColorLocation = gl.getUniformLocation(shaderProgram3, "diffuseLightColor");
  uSpecularLightColorLocation = gl.getUniformLocation(shaderProgram3, "specularLightColor");
  uShininessLocation = gl.getUniformLocation(shaderProgram3, "shininess");

  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);
  
  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(2*gl.viewportWidth/3, 0, gl.canvas.width/3, gl.canvas.height);
  
  gl.clearColor(0.827, 0.933, 0.827, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  mat4.identity(mMatrix);

  mMatrix = mat4.rotate(mMatrix, degToRad(degree0_3), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree1_3), [1, 0, 0]);

  //Section 3 bottom sphere

  mMatrix = mat4.translate(mMatrix, [0, -0.65, 0, 0]);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.225, 0.225, 0.225, 1.0]);
  var color = [0, 0.584, 0.118, 1.0];

  gl.uniform4fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.uniform3fv(uLightPositionLocation, lightPosition);
  gl.uniform3fv(uAmbientLightColorLocation, ambientLightColor);
  gl.uniform3fv(uDiffuseLightColorLocation, diffuseLightColor);
  gl.uniform3fv(uSpecularLightColorLocation, specularLightColor);
  gl.uniform1f(uShininessLocation, shininess);

  drawSphere(color);
  mMatrix = popMatrix(matrixStack);

  //Section 3 bottom plate

  mMatrix = mat4.translate(mMatrix, [0.05, 0.265, 0, 0]);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.rotate(mMatrix, degToRad(5), [0, 0, 1]);
  mMatrix = mat4.rotate(mMatrix, degToRad(25), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(25), [1, 0, 0]);
  mMatrix = mat4.scale(mMatrix, [1.45, 0.05, 0.25, 1.0]);
  var color = [0.420, 0.153, 0.051, 1.0];

  gl.uniform4fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.uniform3fv(uLightPositionLocation, lightPosition);
  gl.uniform3fv(uAmbientLightColorLocation, ambientLightColor);
  gl.uniform3fv(uDiffuseLightColorLocation, diffuseLightColor);
  gl.uniform3fv(uSpecularLightColorLocation, specularLightColor);
  gl.uniform1f(uShininessLocation, shininess);

  drawCube(color);
  mMatrix = popMatrix(matrixStack);

  //Section 3 mid-bottom left sphere

  mMatrix = mat4.translate(mMatrix, [-0.45, 0.15, 0.25, 0]);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.175, 0.175, 0.175, 1.0]);
  var color = [0.29, 0.286, 0.616, 1.0];

  gl.uniform4fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.uniform3fv(uLightPositionLocation, lightPosition);
  gl.uniform3fv(uAmbientLightColorLocation, ambientLightColor);
  gl.uniform3fv(uDiffuseLightColorLocation, diffuseLightColor);
  gl.uniform3fv(uSpecularLightColorLocation, specularLightColor);
  gl.uniform1f(uShininessLocation, shininess);

  drawSphere(color);
  mMatrix = popMatrix(matrixStack);

  //Section 3 mid-bottom right sphere

  mMatrix = mat4.translate(mMatrix, [0.9, 0.085, -0.5, 0]);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.175, 0.175, 0.175, 1.0]);
  var color = [0.149, 0.502, 0.588, 1.0];

  gl.uniform4fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.uniform3fv(uLightPositionLocation, lightPosition);
  gl.uniform3fv(uAmbientLightColorLocation, ambientLightColor);
  gl.uniform3fv(uDiffuseLightColorLocation, diffuseLightColor);
  gl.uniform3fv(uSpecularLightColorLocation, specularLightColor);
  gl.uniform1f(uShininessLocation, shininess);

  drawSphere(color);
  mMatrix = popMatrix(matrixStack);

  //Section 3 middle left plate

  mMatrix = mat4.translate(mMatrix, [-0.9, 0.115, 0.5, 0]);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.rotate(mMatrix, degToRad(-25), [0, 0, 1]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-55), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(25), [1, 0, 0]);
  mMatrix = mat4.scale(mMatrix, [0.75, 0.05, 0.45, 1.0]);
  var color = [0.788, 0.788, 0, 1.0];

  gl.uniform4fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.uniform3fv(uLightPositionLocation, lightPosition);
  gl.uniform3fv(uAmbientLightColorLocation, ambientLightColor);
  gl.uniform3fv(uDiffuseLightColorLocation, diffuseLightColor);
  gl.uniform3fv(uSpecularLightColorLocation, specularLightColor);
  gl.uniform1f(uShininessLocation, shininess);

  drawCube(color);
  mMatrix = popMatrix(matrixStack);

  //Section 3 middle right plate

  mMatrix = mat4.translate(mMatrix, [0.9, 0.075, -0.45, 0]);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.rotate(mMatrix, degToRad(-25), [0, 0, 1]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-55), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(25), [1, 0, 0]);
  mMatrix = mat4.scale(mMatrix, [0.75, 0.05, 0.45, 1.0]);
  var color = [0.212, 0.757, 0.592, 1.0];

  gl.uniform4fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.uniform3fv(uLightPositionLocation, lightPosition);
  gl.uniform3fv(uAmbientLightColorLocation, ambientLightColor);
  gl.uniform3fv(uDiffuseLightColorLocation, diffuseLightColor);
  gl.uniform3fv(uSpecularLightColorLocation, specularLightColor);
  gl.uniform1f(uShininessLocation, shininess);

  drawCube(color);
  mMatrix = popMatrix(matrixStack);

  //Section 3 mid-top left sphere

  mMatrix = mat4.translate(mMatrix, [-0.9, 0.115, 0.5, 0]);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.175, 0.175, 0.175, 1.0]);
  var color = [0.674, 0.004, 0.674, 1.0];

  gl.uniform4fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.uniform3fv(uLightPositionLocation, lightPosition);
  gl.uniform3fv(uAmbientLightColorLocation, ambientLightColor);
  gl.uniform3fv(uDiffuseLightColorLocation, diffuseLightColor);
  gl.uniform3fv(uSpecularLightColorLocation, specularLightColor);
  gl.uniform1f(uShininessLocation, shininess);

  drawSphere(color);
  mMatrix = popMatrix(matrixStack);

  //Section 3 mid-top right sphere

  mMatrix = mat4.translate(mMatrix, [0.9, 0.075, -0.5, 0]);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.175, 0.175, 0.175, 1.0]);
  var color = [0.596, 0.416, 0.122, 1.0];

  gl.uniform4fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.uniform3fv(uLightPositionLocation, lightPosition);
  gl.uniform3fv(uAmbientLightColorLocation, ambientLightColor);
  gl.uniform3fv(uDiffuseLightColorLocation, diffuseLightColor);
  gl.uniform3fv(uSpecularLightColorLocation, specularLightColor);
  gl.uniform1f(uShininessLocation, shininess);

  drawSphere(color);
  mMatrix = popMatrix(matrixStack);

  //Section 3 top plate

  mMatrix = mat4.translate(mMatrix, [-0.45, 0.125, 0.35, 0]);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.rotate(mMatrix, degToRad(5), [0, 0, 1]);
  mMatrix = mat4.rotate(mMatrix, degToRad(25), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(5), [1, 0, 0]);
  mMatrix = mat4.scale(mMatrix, [1.45, 0.05, 0.25, 1.0]);
  var color = [0.420, 0.153, 0.051, 1.0];

  gl.uniform4fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.uniform3fv(uLightPositionLocation, lightPosition);
  gl.uniform3fv(uAmbientLightColorLocation, ambientLightColor);
  gl.uniform3fv(uDiffuseLightColorLocation, diffuseLightColor);
  gl.uniform3fv(uSpecularLightColorLocation, specularLightColor);
  gl.uniform1f(uShininessLocation, shininess);

  drawCube(color);
  mMatrix = popMatrix(matrixStack);

  //Section 3 top sphere

  mMatrix = mat4.translate(mMatrix, [0, 0.225, 0, 0]);

  pushMatrix(matrixStack, mMatrix);
  mMatrix = mat4.scale(mMatrix, [0.225, 0.225, 0.225, 1.0]);
  var color = [0.537, 0.541, 0.694, 1.0];

  gl.uniform4fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.uniform3fv(uLightPositionLocation, lightPosition);
  gl.uniform3fv(uAmbientLightColorLocation, ambientLightColor);
  gl.uniform3fv(uDiffuseLightColorLocation, diffuseLightColor);
  gl.uniform3fv(uSpecularLightColorLocation, specularLightColor);
  gl.uniform1f(uShininessLocation, shininess);

  drawSphere(color);
  mMatrix = popMatrix(matrixStack);

}

/////////////////////////////////////////////////////////////////////////

function onMouseDown(event) {
    document.addEventListener("mousemove", onMouseMove, false);
    document.addEventListener("mouseup", onMouseUp, false);
    document.addEventListener("mouseout", onMouseOut, false);
  
    if (
      event.layerX <= canvas.width/3 &&
      event.layerX >= 0 &&
      event.layerY <= canvas.height &&
      event.layerY >= 0
    ) {
      prevMouseX = event.clientX;
      prevMouseY = canvas.height - event.clientY;
    }
    else if (
      event.layerX <= 2*canvas.width/3 &&
      event.layerX >= canvas.width/3 &&
      event.layerY <= canvas.height &&
      event.layerY >= 0
    ) {
      prevMouseX = event.clientX;
      prevMouseY = canvas.height - event.clientY;
    }
    else if (
      event.layerX <= canvas.width &&
      event.layerX >= 2*canvas.width/3 &&
      event.layerY <= canvas.height &&
      event.layerY >= 0
    ) {
      prevMouseX = event.clientX;
      prevMouseY = canvas.height - event.clientY;
    }
  }
  
  function onMouseMove(event) {
    if (
      event.layerX <= canvas.width/3 &&
      event.layerX >= 0 &&
      event.layerY <= canvas.height &&
      event.layerY >= 0
    ) {
      var mouseX = event.clientX;
      var diffX1 = mouseX - prevMouseX;
      prevMouseX = mouseX;
      degree0_1 = degree0_1 + diffX1 / 5;
  
      var mouseY = canvas.height - event.clientY;
      var diffY2 = mouseY - prevMouseY;
      prevMouseY = mouseY;
      degree1_1 = degree1_1 - diffY2 / 5;
  
      drawScene();
    }
    else if (
      event.layerX <= 2*canvas.width/3 &&
      event.layerX >= canvas.width/3 &&
      event.layerY <= canvas.height &&
      event.layerY >= 0
    ) {
      var mouseX = event.clientX;
      var diffX1 = mouseX - prevMouseX;
      prevMouseX = mouseX;
      degree0_2 = degree0_2 + diffX1 / 5;
  
      var mouseY = canvas.height - event.clientY;
      var diffY2 = mouseY - prevMouseY;
      prevMouseY = mouseY;
      degree1_2 = degree1_2 - diffY2 / 5;
  
      drawScene();
    }
    else if (
      event.layerX <= canvas.width &&
      event.layerX >= 2*canvas.width/3 &&
      event.layerY <= canvas.height &&
      event.layerY >= 0
    ) {
      var mouseX = event.clientX;
      var diffX1 = mouseX - prevMouseX;
      prevMouseX = mouseX;
      degree0_3 = degree0_3 + diffX1 / 5;
  
      var mouseY = canvas.height - event.clientY;
      var diffY2 = mouseY - prevMouseY;
      prevMouseY = mouseY;
      degree1_3 = degree1_3 - diffY2 / 5;
  
      drawScene();
    }
  }
  
  function onMouseUp(event) {
    document.removeEventListener("mousemove", onMouseMove, false);
    document.removeEventListener("mouseup", onMouseUp, false);
    document.removeEventListener("mouseout", onMouseOut, false);
  }
  
  function onMouseOut(event) {
    document.removeEventListener("mousemove", onMouseMove, false);
    document.removeEventListener("mouseup", onMouseUp, false);
    document.removeEventListener("mouseout", onMouseOut, false);
  }

/////////////////////////////////////////////////////////////////////////

function webGLStart() {
    canvas = document.getElementById("Assignment_2");
    document.addEventListener("mousedown", onMouseDown, false);

    initGL(canvas);

    shaderProgram1 = initShaders(vertexShaderSetup(flatVertexShaderCode), fragmentShaderSetup(flatFragShaderCode));

    shaderProgram2 = initShaders(vertexShaderSetup(perVertexVertexShaderCode), fragmentShaderSetup(perVertexFragShaderCode));

    shaderProgram3 = initShaders(vertexShaderSetup(perFragmentVertexShaderCode), fragmentShaderSetup(perFragmentFragShaderCode));

    gl.enable(gl.DEPTH_TEST);

    initCubeBuffer();
    initSphereBuffer();

    drawScene();
}

////////////////////////////////////////////////////////////////////////

//Light position set value
function sliderval1() {
  var y_div = document.getElementById('light_slider');
  y = y_div.value;
  drawScene();
}

//Camera zoom set value
function sliderval2() {
  var x_div = document.getElementById('camera_slider');
  x = x_div.value;
  drawScene();
}

////////////////////////////////////////////////////////////////////////

//List of colors used:

//Background - Section 1: rgba(211,211,238,255) = (0.827, 0.827, 0.933, 1.0)
//Background - Section 2: rgba(238,211,211,255) = (0.933, 0.827, 0.827, 1.0)
//Background - Section 3: rgba(211,238,211,255) = (0.827, 0.933, 0.827, 1.0)
//Cuboid - Section 1: rgba(172,173,116,255) = (0.674, 0.678, 0.455, 1.0)
//Sphere - Section 1: rgba(0,91,134,255) = (0, 0.357, 0.526, 1.0)
//Cubes - Section 2: rgba(0,149,0,255) = (0, 0.584, 0, 1.0)
//Spheres - Section 2: rgba(119,119,119,255) = (0.467, 0.467, 0.467, 1.0)
//Mid left plate - Section 3: rgba(201,201,0,255) = (0.788, 0.788, 0, 1.0)
//Mid right plate - Section 3: rgba(54,193,151,255) = (0.212, 0.757, 0.592, 1.0)
//Top, bottom plates - Section 3: rgba(107,39,13,255) = (0.420, 0.153, 0.051, 1.0)
//Third left sphere - Section 3: rgba(74,73,157,255) = (0.29, 0.286, 0.616, 1.0)
//Third right sphere - Section 3: rgba(38,128,150,255) = (0.149, 0.502, 0.588, 1.0)
//Second left sphere - Section 3: rgba(172,1,172,255) = (0.674, 0.004, 0.674, 1.0)
//Second right sphere - Section 3: rgba(152,106,31,255) = (0.596, 0.416, 0.122, 1.0)
//First top sphere - Section 3: rgba(137,138,177,255) = (0.537, 0.541, 0.694, 1.0)
//Fourth bottom sphere - Section 3: rgba(0,149,30,255) = (0, 0.584, 0.118, 1.0)

////////////////////////////////////////////////////////////////////////