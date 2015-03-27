var renderer, camera;
var scene, element;
var ambient, point;
var aspectRatio, windowHalf;
var mouse, time;
var orbit;

var controls;
var clock;

var useRift = false;

var riftCam;

var boxes = [];
var core = [];
var dataPackets = [];

var ground, groundGeometry, groundMaterial;

var bodyAngle;
var bodyAxis;
var bodyPosition;
var viewAngle;

var velocity;
var oculusBridge;

// Map for key states
var keys = [];
for(var i = 0; i < 130; i++){
  keys.push(false);
}

function initScene() {
  clock = new THREE.Clock();
  mouse = new THREE.Vector2(0, 0);

  windowHalf = new THREE.Vector2(window.innerWidth/2, window.innerHeight/2);
  aspectRatio = window.innerWidth/window.innerHeight;
  
  scene = new THREE.Scene();  

  camera = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 100000);

  orbit = new THREE.OrbitControls(camera);

  camera.position.x = 0;
  camera.position.y = 5;
  camera.position.z = 33;
  camera.lookAt(scene.position);

  // Initialize the renderer
  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setClearColor(0xdbf7ff);
  renderer.setSize(window.innerWidth, window.innerHeight);

  element = document.getElementById('viewport');
  element.appendChild(renderer.domElement);
}

function initGeometry(){
  var path = 'textures/cubemap/plant/';

    var format = '.jpg';
    var sides = [
        path + 'posx' + format, path + 'negx' + format,
        path + 'posy' + format, path + 'negy' + format,
        path + 'posz' + format, path + 'negz' + format
    ];

    // load images

    var scCube = THREE.ImageUtils.loadTextureCube(sides);

    scCube.format = THREE.RGBFormat;

    // prepare skybox material (shader)

    var skyShader = THREE.ShaderLib["cube"];

    skyShader.uniforms["tCube"].value = scCube;

    var skyMaterial = new THREE.ShaderMaterial( {

      fragmentShader: skyShader.fragmentShader, vertexShader: skyShader.vertexShader,

      uniforms: skyShader.uniforms, depthWrite: false, side: THREE.BackSide

    });

    var skyBox = new THREE.Mesh(new THREE.CubeGeometry(500, 500, 500), skyMaterial);

    skyMaterial.needsUpdate = true;

    this.scene.add(skyBox);
}

function init(){
  document.addEventListener('keydown', onKeyDown, false);
  document.addEventListener('keyup', onKeyUp, false);
  document.addEventListener('mousedown', onMouseDown, false);
  document.addEventListener('mousemove', onMouseMove, false);

  document.getElementById("toggle-render").addEventListener("click", function(){
    useRift = !useRift;
    onResize();
  });

  window.addEventListener('resize', onResize, false);

  time          = Date.now();
  bodyAngle     = 0;
  bodyAxis      = new THREE.Vector3(0, 1, 0);
  bodyPosition  = new THREE.Vector3(0, 15, 0);
  velocity      = new THREE.Vector3();

  initScene();
  initGeometry();

  oculusBridge = new OculusBridge({
    "debug" : true,
    "onOrientationUpdate" : bridgeOrientationUpdated,
    "onConfigUpdate"      : bridgeConfigUpdated,
    "onConnect"           : bridgeConnected,
    "onDisconnect"        : bridgeDisconnected
  });
  oculusBridge.connect();

  riftCam = new THREE.OculusRiftEffect(renderer);
}

function onResize() {
  if(!useRift){
    windowHalf = new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2);
    aspectRatio = window.innerWidth / window.innerHeight;
   
    camera.aspect = aspectRatio;
    camera.updateProjectionMatrix();
   
    renderer.setSize(window.innerWidth, window.innerHeight);
  } else {
    riftCam.setSize(window.innerWidth, window.innerHeight);
  }
}

function bridgeConnected(){
  
}

function bridgeDisconnected(){
  
}

function bridgeConfigUpdated(config){
  console.log("Oculus config updated.");
  riftCam.setHMD(config);      
}

function bridgeOrientationUpdated(quatValues) {
  // make a quaternion for the the body angle rotated about the Y axis.
  var quat = new THREE.Quaternion();
  quat.setFromAxisAngle(bodyAxis, bodyAngle);

  // make a quaternion for the current orientation of the Rift
  var quatCam = new THREE.Quaternion(quatValues.x, quatValues.y, quatValues.z, quatValues.w);

  // multiply the body rotation by the Rift rotation.
  quat.multiply(quatCam);


  // Make a vector pointing along the Z axis and rotate it accoring to the combined look/body angle.
  var xzVector = new THREE.Vector3(0, 0, 1);
  xzVector.applyQuaternion(quat);

  // Compute the X/Z angle based on the combined look/body angle.  This will be used for FPS style movement controls
  // so you can steer with a combination of the keyboard and by moving your head.
  viewAngle = Math.atan2(xzVector.z, xzVector.x) + Math.PI;

  // Apply the combined look/body angle to the camera.
  camera.quaternion.copy(quat);
}


function onMouseMove(event) {
  mouse.set( (event.clientX / window.innerWidth - 0.5) * 2, (event.clientY / window.innerHeight - 0.5) * 2);
}


function onMouseDown(event) {
  console.log("update.");
}


function onKeyDown(event) {
  if(event.keyCode == 48){ 
    useRift = !useRift;
    onResize();
  }

  // prevent repeat keystrokes.
  if(!keys[32] && (event.keyCode == 32)){ // Spacebar to jump
    velocity.y += 1.9;
  }

  keys[event.keyCode] = true;
}


function onKeyUp(event) {
  keys[event.keyCode] = false;
}


function updateInput(delta) {
  
  var step        = 25 * delta;
  var turn_speed  = (55 * delta) * Math.PI / 180;

  // Forward/backward

  if(keys[87] || keys[38]){ // W or UP
      bodyPosition.x += Math.cos(viewAngle) * step;
      bodyPosition.z += Math.sin(viewAngle) * step;
  }

  if(keys[83] || keys[40]){ // S or DOWN
      bodyPosition.x -= Math.cos(viewAngle) * step;
      bodyPosition.z -= Math.sin(viewAngle) * step;
  }

  // Turn

  if(keys[81]){ // E
      bodyAngle += turn_speed;
  }   
  
  if(keys[69]){ // Q
       bodyAngle -= turn_speed;
  }

  // Straif

  if(keys[65] || keys[37]){ // A or LEFT
      bodyPosition.x -= Math.cos(viewAngle + Math.PI/2) * step;
      bodyPosition.z -= Math.sin(viewAngle + Math.PI/2) * step;
  }   
  
  if(keys[68] || keys[39]){ // D or RIGHT
      bodyPosition.x += Math.cos(viewAngle+Math.PI/2) * step;
      bodyPosition.z += Math.sin(viewAngle+Math.PI/2) * step;
  }
  
  // VERY simple gravity/ground plane physics for jumping.
  
  velocity.y -= 0.15;
  
  bodyPosition.y += velocity.y;
  
  if(bodyPosition.y < 15){
    velocity.y *= -0.12;
    bodyPosition.y = 15;
  }

  // update the camera position when rendering to the oculus rift.
  if(useRift) {
    camera.position.set(bodyPosition.x, bodyPosition.y, bodyPosition.z);
  }
}

function animate() {
  if(render()){
    requestAnimationFrame(animate);  
  }
}

function crashSecurity(e){
  oculusBridge.disconnect();
  document.getElementById("viewport").style.display = "none";
  document.getElementById("security_error").style.display = "block";
}

function crashOther(e){
  oculusBridge.disconnect();
  document.getElementById("viewport").style.display = "none";
  document.getElementById("generic_error").style.display = "block";
  document.getElementById("exception_message").innerHTML = e.message;
}

function render() { 
  try{
    if(useRift){
      riftCam.render(scene, camera);
    }else{
      renderer.render(scene, camera);
      orbit.update();

      
    }  
  } catch(e){
    console.log(e);
    if(e.name == "SecurityError"){
      crashSecurity(e);
    } else {
      crashOther(e);
    }
    return false;
  }
  return true;
}


window.onload = function() {
  init();
  animate();
}