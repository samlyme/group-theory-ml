import * as ort from "onnxruntime-web";

const canvas = document.getElementById("draw-uniform") as HTMLCanvasElement;
const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

const dragCanvas = document.getElementById("drag-uniform") as HTMLCanvasElement;
const dragCtx = dragCanvas.getContext("2d", { willReadFrequently: true })!;

const output = document.getElementById("output-uniform")!;
const probsContainer = document.getElementById("probabilities-uniform")!;

let drawing = false;
let dragging = false;
let session: ort.InferenceSession | null = null;

// Top-left of 28x28 patch inside 56x56 canvas
let patchLeft = 14;
let patchTop = 14;

// Build the 10 prediction rows once
const probabilityRows: HTMLDivElement[] = [];
for (let i = 0; i < 10; i++) {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.justifyContent = "space-between";
  row.style.gap = "16px";
  row.style.width = "160px";
  row.style.fontFamily = "monospace";
  row.style.marginBottom = "6px";

  const label = document.createElement("span");
  label.textContent = `${i}:`;

  const value = document.createElement("span");
  value.textContent = "0.0000";

  row.appendChild(label);
  row.appendChild(value);
  probsContainer.appendChild(row);

  probabilityRows.push(row);
}

function resetDrawCanvas() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function resetDragCanvas() {
  dragCtx.fillStyle = "black";
  dragCtx.fillRect(0, 0, dragCanvas.width, dragCanvas.height);
}

function getCanvasPos(event: MouseEvent, target: HTMLCanvasElement) {
  const rect = target.getBoundingClientRect();
  const scaleX = target.width / rect.width;
  const scaleY = target.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function drawAt(x: number, y: number) {
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(x, y, 1.2, 0, Math.PI * 2);
  ctx.fill();
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function getDigit28(): Float32Array {
  const imageData = ctx.getImageData(0, 0, 28, 28);
  const data = imageData.data;
  const digit = new Float32Array(28 * 28);

  for (let i = 0; i < 28 * 28; i++) {
    digit[i] = data[i * 4] / 255; // red channel is enough for grayscale
  }

  return digit;
}

function compose56Input(): Float32Array {
  const digit = getDigit28();
  const arr = new Float32Array(56 * 56);

  for (let r = 0; r < 28; r++) {
    for (let c = 0; c < 28; c++) {
      const srcIdx = r * 28 + c;
      const dstRow = patchTop + r;
      const dstCol = patchLeft + c;
      const dstIdx = dstRow * 56 + dstCol;
      arr[dstIdx] = digit[srcIdx];
    }
  }

  return arr;
}

function renderDragPreview() {
  resetDragCanvas();

  const composed = compose56Input();

  // Draw the 56x56 logical image scaled to the visible drag canvas
  const img = dragCtx.createImageData(56, 56);
  for (let i = 0; i < 56 * 56; i++) {
    const v = Math.round(composed[i] * 255);
    img.data[i * 4 + 0] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }

  // Draw into an offscreen 56x56 canvas first
  const off = document.createElement("canvas");
  off.width = 56;
  off.height = 56;
  const offCtx = off.getContext("2d")!;
  offCtx.putImageData(img, 0, 0);

  dragCtx.imageSmoothingEnabled = false;
  dragCtx.drawImage(off, 0, 0, dragCanvas.width, dragCanvas.height);

  // Optional: draw a red bounding box where the 28x28 patch sits
  const scaleX = dragCanvas.width / 56;
  const scaleY = dragCanvas.height / 56;
  dragCtx.strokeStyle = "red";
  dragCtx.lineWidth = 1;
  dragCtx.strokeRect(
    patchLeft * scaleX,
    patchTop * scaleY,
    28 * scaleX,
    28 * scaleY
  );
}

function updatePatchFromMouse(event: MouseEvent) {
  const { x, y } = getCanvasPos(event, dragCanvas);

  // Convert visible drag canvas coords into 56x56 logical coords
  const logicalX = Math.floor((x / dragCanvas.width) * 56);
  const logicalY = Math.floor((y / dragCanvas.height) * 56);

  // Treat pointer as center of the 28x28 patch, then clamp top-left
  patchLeft = clamp(logicalX - 14, 0, 28);
  patchTop = clamp(logicalY - 14, 0, 28);

  renderDragPreview();
}

function softmax(logits: Float32Array | number[]) {
  let max = -Infinity;
  for (let i = 0; i < logits.length; i++) {
    if (logits[i] > max) max = logits[i];
  }

  const exps = new Float32Array(logits.length);
  let sum = 0;

  for (let i = 0; i < logits.length; i++) {
    const v = Math.exp(logits[i] - max);
    exps[i] = v;
    sum += v;
  }

  for (let i = 0; i < exps.length; i++) {
    exps[i] /= sum;
  }

  return exps;
}

function updateProbabilityUI(probabilities: Float32Array, predictedDigit: number) {
  for (let i = 0; i < 10; i++) {
    const row = probabilityRows[i];
    const valueEl = row.children[1] as HTMLSpanElement;

    valueEl.textContent = probabilities[i].toFixed(4);
    row.style.fontWeight = i === predictedDigit ? "700" : "400";
    row.style.color = i === predictedDigit ? "green" : "black";
  }
}

async function getSession() {
  if (session) return session;

  const modelUrl = new URL("./assets/mnist_uniform_mlp.onnx", import.meta.url).href;
  session = await ort.InferenceSession.create(modelUrl, {
    executionProviders: ["webgpu", "wasm"],
  });

  console.log("inputs:", session.inputNames);
  console.log("outputs:", session.outputNames);

  return session;
}

async function runModel(float32Data: Float32Array) {
  try {
    const session = await getSession();

    const inputName = session.inputNames[0];
    const outputName = session.outputNames[0];

    const inputTensor = new ort.Tensor("float32", float32Data, [1, 56 * 56]);
    const results = await session.run({ [inputName]: inputTensor });

    const outputTensor = results[outputName] as ort.Tensor;
    return outputTensor.data as Float32Array;
  } catch (e) {
    console.error(`Inference failed: ${e}`);
    return null;
  }
}

async function predictOutput() {
  const arr = compose56Input();
  const modelOutput = await runModel(arr);
  if (!modelOutput) return null;

  const probabilities = softmax(modelOutput);

  let champ = 0;
  for (let i = 1; i < probabilities.length; i++) {
    if (probabilities[i] > probabilities[champ]) champ = i;
  }

  updateProbabilityUI(probabilities, champ);
  return champ;
}

// Drawing events
canvas.addEventListener("mousedown", (event) => {
  drawing = true;
  const { x, y } = getCanvasPos(event, canvas);
  drawAt(x, y);
  renderDragPreview();
});

canvas.addEventListener("mousemove", (event) => {
  if (!drawing) return;
  const { x, y } = getCanvasPos(event, canvas);
  drawAt(x, y);
  renderDragPreview();
});

// Dragging events
dragCanvas.addEventListener("mousedown", (event) => {
  dragging = true;
  updatePatchFromMouse(event);
});

dragCanvas.addEventListener("mousemove", (event) => {
  if (!dragging) return;
  updatePatchFromMouse(event);
});

window.addEventListener("mouseup", async () => {
  const wasActive = drawing || dragging;
  drawing = false;
  dragging = false;

  if (!wasActive) return;

  const pred = await predictOutput();
  if (pred !== null) {
    output.textContent = String(pred);
  }
});

canvas.addEventListener("mouseleave", () => {
  drawing = false;
});

dragCanvas.addEventListener("mouseleave", () => {
  dragging = false;
});

document.getElementById("clearBtn-uniform")!.addEventListener("click", () => {
  resetDrawCanvas();
  // patchLeft = 14;
  // patchTop = 14;
  renderDragPreview();

  output.textContent = "-";

  for (let i = 0; i < 10; i++) {
    const row = probabilityRows[i];
    const valueEl = row.children[1] as HTMLSpanElement;
    valueEl.textContent = "0.0000";
    row.style.fontWeight = "400";
    row.style.color = "black";
  }
});

// Init
resetDrawCanvas();
resetDragCanvas();
renderDragPreview();