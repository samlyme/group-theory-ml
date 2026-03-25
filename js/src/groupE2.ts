import {
  CanvasTexture,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
  RepeatWrapping,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";

const app = document.querySelector("#group-e2")!;

const viewerDim = { width: 800, height: 600 };
const viewer = document.createElement("div");
viewer.style.position = "relative";
viewer.style.width = viewerDim.width + "px";
viewer.style.height = viewerDim.height + "px";
viewer.style.overflow = "hidden";
app.appendChild(viewer);

// 1. Scene Setup
const scene = new Scene();
scene.background = new Color("black");

const aspect = viewerDim.width / viewerDim.height;
const frustumSize = 40;
const camera = new OrthographicCamera(
  -frustumSize * aspect / 2,
  frustumSize * aspect / 2,
  frustumSize / 2,
  -frustumSize / 2,
  0.1,
  100
);

camera.position.set(0, 0, 10);

class GroupE4 {
  geometry: PlaneGeometry;
  material: MeshBasicMaterial;
  mesh: Mesh;

  targetPosition: Vector3;
  animating = false;
  slideSpeed = 0.15;

  constructor() {
    const texture = makeCheckerboardTexture();
    this.material = new MeshBasicMaterial({ 
      map: texture, 
      side: DoubleSide 
    });
    
    // Large plane that extends beyond the view
    this.geometry = new PlaneGeometry(120, 120);
    this.mesh = new Mesh(this.geometry, this.material);
    
    this.targetPosition = new Vector3(0, 0, 0);
  }

  slideRight() {
    if (this.animating) return;
    this.targetPosition.copy(this.mesh.position).add(new Vector3(6, 0, 0));
    this.animating = true;
  }

  slideLeft() {
    if (this.animating) return;
    this.targetPosition.copy(this.mesh.position).add(new Vector3(-6, 0, 0));
    this.animating = true;
  }

  slideUp() {
    if (this.animating) return;
    this.targetPosition.copy(this.mesh.position).add(new Vector3(0, 6, 0));
    this.animating = true;
  }

  slideDown() {
    if (this.animating) return;
    this.targetPosition.copy(this.mesh.position).add(new Vector3(0, -6, 0));
    this.animating = true;
  }

  animate() {
    if (!this.animating) return;
    
    // Lerp towards target position
    this.mesh.position.lerp(this.targetPosition, this.slideSpeed);
    
    // Stop animating when close enough
    if (this.mesh.position.distanceTo(this.targetPosition) < 0.01) {
      this.mesh.position.copy(this.targetPosition);
      this.animating = false;
    }
  }
}

// 2. Object Creation
const e4Plane = new GroupE4();
scene.add(e4Plane.mesh);

const renderer = new WebGLRenderer();
renderer.setSize(viewerDim.width, viewerDim.height);
renderer.setPixelRatio(window.devicePixelRatio);

viewer.appendChild(renderer.domElement);
renderer.render(scene, camera);

// UI Buttons
const slideRightButton = document.createElement("button");
slideRightButton.innerText = "(+X)";
slideRightButton.style.cssText =
  "position:absolute; top:20px; left:20px; padding:10px; cursor:pointer;";
slideRightButton.addEventListener("click", () => {
  e4Plane.slideRight();
});
viewer.appendChild(slideRightButton);

const slideLeftButton = document.createElement("button");
slideLeftButton.innerText = "(-X)";
slideLeftButton.style.cssText =
  "position:absolute; top:70px; left:20px; padding:10px; cursor:pointer;";
slideLeftButton.addEventListener("click", () => {
  e4Plane.slideLeft();
});
viewer.appendChild(slideLeftButton);

const slideUpButton = document.createElement("button");
slideUpButton.innerText = "(+Y)";
slideUpButton.style.cssText =
  "position:absolute; top:120px; left:20px; padding:10px; cursor:pointer;";
slideUpButton.addEventListener("click", () => {
  e4Plane.slideUp();
});
viewer.appendChild(slideUpButton);

const slideDownButton = document.createElement("button");
slideDownButton.innerText = "(-Y)";
slideDownButton.style.cssText =
  "position:absolute; top:170px; left:20px; padding:10px; cursor:pointer;";
slideDownButton.addEventListener("click", () => {
  e4Plane.slideDown();
});
viewer.appendChild(slideDownButton);

function animate() {
  requestAnimationFrame(animate);

  e4Plane.animate();

  renderer.render(scene, camera);
}

animate();

function makeCheckerboardTexture() {
  const size = 2048;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d")!;

  // Create checkerboard pattern - 20x20 to match larger plane while keeping square size
  const divisions = 20;
  const step = size / divisions;

  for (let i = 0; i < divisions; i++) {
    for (let j = 0; j < divisions; j++) {
      ctx.fillStyle = (i + j) % 2 === 0 ? "#ffffff" : "#333333";
      ctx.fillRect(i * step, j * step, step, step);
    }
  }

  // Draw X axis indicator (Red) - one per repeat, centered
  ctx.strokeStyle = "#ff4444";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(size / 2, size / 2);
  ctx.lineTo(size, size / 2);
  ctx.stroke();

  // Draw Y axis indicator (Blue)
  ctx.strokeStyle = "#4444ff";
  ctx.beginPath();
  ctx.moveTo(size / 2, size / 2);
  ctx.lineTo(size / 2, 0);
  ctx.stroke();

  // Draw orientation marker
  ctx.fillStyle = "#ff8800";
  ctx.font = "bold 120px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("F", size / 2 + step / 2, size / 2 - step / 2);

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}
