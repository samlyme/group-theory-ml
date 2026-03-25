import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  Material,
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

// const xAxis = new Vector3(1, 0, 0);
const yAxis = new Vector3(0, 1, 0);
const zAxis = new Vector3(0, 0, 1);

class DihedralGroup4 {
  geometry: BufferGeometry;
  material: Material[] | Material;
  mesh: Mesh;

  remainingAngle = 0;
  activeAxis = new Vector3(1, 0, 0);
  rotateSpeed = 0.1;

  constructor() {
    const frontTexture = makeFaceTexture({
      bgColor: "#d94b4b",
      symbol: "▲",
    });

    const backTexture = makeFaceTexture({
      bgColor: "#4b7bd9",
      symbol: "▲",
    });
    const edgeMaterial = new MeshBasicMaterial({ color: 0x222222 });
    this.geometry = new BoxGeometry(2, 2, 0.1);

    this.material = [
      edgeMaterial, // right
      edgeMaterial, // left
      edgeMaterial, // top
      edgeMaterial, // bottom
      new MeshBasicMaterial({ map: frontTexture }), // front
      new MeshBasicMaterial({ map: backTexture }), // back
    ];
    this.mesh = new Mesh(this.geometry, this.material);
  }

  rotate() {
    if (this.remainingAngle !== 0) return;
    this.activeAxis.copy(zAxis);
    this.remainingAngle = Math.PI / 2;
  }

  flip() {
    if (this.remainingAngle !== 0) return;

    this.activeAxis.copy(yAxis);
    this.remainingAngle = Math.PI;
  }

  animate() {
    if (this.remainingAngle > 0) {
      const step =
        this.remainingAngle < this.rotateSpeed / 5
          ? this.remainingAngle
          : this.remainingAngle * this.rotateSpeed;
      this.mesh.rotateOnWorldAxis(this.activeAxis, step);
      this.remainingAngle -= step;
    }
  }
}

// 2. Object Creation
// const geometry = new BoxGeometry(2, 2, 0.1);
// const material = new MeshBasicMaterial(); // Defaults to white
// const cube = new Mesh(geometry, material);
const d4 = new DihedralGroup4();
scene.add(d4.mesh);

const renderer = new WebGLRenderer();
renderer.setSize(viewerDim.width, viewerDim.height);
renderer.setPixelRatio(window.devicePixelRatio);

viewer.appendChild(renderer.domElement);
renderer.render(scene, camera);

const rotateButton = document.createElement("button");
rotateButton.innerText = "Rotate";
rotateButton.style.cssText =
  "position:absolute; top:20px; left:20px; padding:10px; cursor:pointer;";
rotateButton.addEventListener("click", () => {
  d4.rotate();
});
viewer.appendChild(rotateButton);

const flipButton = document.createElement("button");
flipButton.innerText = "Flip";
flipButton.style.cssText =
  "position:absolute; top:80px; left:20px; padding:10px; cursor:pointer;";
flipButton.addEventListener("click", () => {
  d4.flip();
});
viewer.appendChild(flipButton);

function animate() {
  requestAnimationFrame(animate);

  d4.animate();

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
function makeFaceTexture({
  bgColor = "#ffffff",
  symbol = "*",
  symbolColor = "#ffffff",
  width = 256,
  height = 256,
}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d")!;

  // background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // border to make the face easier to read
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // orientation symbol
  ctx.fillStyle = symbolColor;
  ctx.font = "bold 140px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(symbol, width / 2, height / 2);

  const texture = new CanvasTexture(canvas);
  return texture;
}