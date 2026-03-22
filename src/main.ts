import {
  BoxGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";

const app = document.querySelector("#app")!;

const viewerDim = { width: 800, height: 600 };
const viewer = document.createElement("div");
viewer.style.position = "relative";
viewer.style.width = viewerDim.width + "px";
viewer.style.height = viewerDim.height + "px";
viewer.style.overflow = "hidden";
// viewer.style.border = "1px solid #ccc";
app.appendChild(viewer);

// 1. Scene Setup
const scene = new Scene();
scene.background = new Color("black");

const fov = 35;
// Aligned aspect ratio calculation with the renderer's output dimensions
const aspect = viewerDim.width / viewerDim.height;
const near = 0.1;
const far = 100;
const camera = new PerspectiveCamera(fov, aspect, near, far);

camera.position.set(0, 0, 10);

// 2. Object Creation
const geometry = new BoxGeometry(2, 2, 0.1);
const material = new MeshBasicMaterial(); // Defaults to white
const cube = new Mesh(geometry, material);
scene.add(cube);

const renderer = new WebGLRenderer();
renderer.setSize(viewerDim.width, viewerDim.height);
renderer.setPixelRatio(window.devicePixelRatio);

viewer.appendChild(renderer.domElement);
renderer.render(scene, camera);

const xAxis = new Vector3(1, 0, 0);
const yAxis = new Vector3(0, 1, 0);
const zAxis = new Vector3(0, 0, 1);

let remainingAngle = 0;
let activeAxis = zAxis.clone();

const rotateSpeed = 0.1; // radians per frame

const rotateButton = document.createElement("button");
rotateButton.innerText = "Rotate 90° CCW";
rotateButton.style.cssText = "position:absolute; top:20px; left:20px; padding:10px; cursor:pointer;";
rotateButton.addEventListener("click", () => {
  if (remainingAngle === 0) {
    activeAxis.copy(zAxis);          // rotate about world Z
    remainingAngle += Math.PI / 2;   // positive = CCW by right-hand rule
  }
});
viewer.appendChild(rotateButton);

const flipButton = document.createElement("button");
flipButton.innerText = "Flip Vert. Axis";
flipButton.style.cssText = "position:absolute; top:80px; left:20px; padding:10px; cursor:pointer;";
flipButton.addEventListener("click", () => {
  if (remainingAngle === 0) {
    activeAxis.copy(yAxis);          // rotate about world Y
    remainingAngle += Math.PI;       // exact 180°, forced CCW
  }
});
viewer.appendChild(flipButton);

function animate() {
  requestAnimationFrame(animate);

  if (remainingAngle > 0) {
    const step = remainingAngle < rotateSpeed / 5 ? remainingAngle : remainingAngle * rotateSpeed;
    cube.rotateOnWorldAxis(activeAxis, step);
    remainingAngle -= step;
  }

  renderer.render(scene, camera);
}

animate();

// function onResize() {
//   const width = app.clientWidth;
//   const height = app.clientHeight;

//   renderer.setSize(width, height);
//   camera.aspect = width / height;
//   camera.updateProjectionMatrix();
// }

// window.addEventListener("resize", onResize);

// // call once initially
// onResize();