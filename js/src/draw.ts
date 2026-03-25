import * as ort from "onnxruntime-web";

const canvas = document.getElementById("draw") as HTMLCanvasElement;
const output = document.getElementById("output")!;
const probsContainer = document.getElementById("probabilities")!;
const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

// Fill background black
ctx.fillStyle = "black";
ctx.fillRect(0, 0, 28, 28);

let drawing = false;
let session: ort.InferenceSession | null = null;

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

function getCanvasPos(event: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

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

async function predictOutput() {
  const imageData = ctx.getImageData(0, 0, 28, 28);
  const data = imageData.data;
  const arr = new Float32Array(28 * 28);

  for (let i = 0; i < 28 * 28; i++) {
    const r = data[i * 4];
    arr[i] = r / 255;
  }

  const modelOutput = await runModel(arr);
  if (!modelOutput) return null;

  const probabilities = softmax(modelOutput);

  let champ = 0;
  for (let i = 1; i < probabilities.length; i++) {
    if (probabilities[i] > probabilities[champ]) champ = i;
  }

  updateProbabilityUI(probabilities, champ);

  console.log("Prediction:", champ);
  console.log("Probabilities:", probabilities);

  return champ;
}

canvas.addEventListener("mousedown", (event) => {
  drawing = true;
  const { x, y } = getCanvasPos(event);
  drawAt(x, y);
});

canvas.addEventListener("mousemove", (event) => {
  if (!drawing) return;
  const { x, y } = getCanvasPos(event);
  drawAt(x, y);
});

window.addEventListener("mouseup", async () => {
  if (!drawing) return;
  drawing = false;

  const pred = await predictOutput();
  if (pred === null) return;

  output.textContent = String(pred);
});

canvas.addEventListener("mouseleave", () => {
  if (!drawing) return;
  drawing = false;
});

document.getElementById("clearBtn")!.addEventListener("click", () => {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, 28, 28);

  output.textContent = "-";

  for (let i = 0; i < 10; i++) {
    const row = probabilityRows[i];
    const valueEl = row.children[1] as HTMLSpanElement;
    valueEl.textContent = "0.0000";
    row.style.fontWeight = "400";
    row.style.color = "black";
  }
});

async function getSession() {
  if (session) return session;

  session = await ort.InferenceSession.create("public/mnist_simple_mlp.onnx", {
    executionProviders: ["webgpu", "wasm"],
  });

  console.log("inputs:", session.inputNames);
  console.log("outputs:", session.outputNames);

  return session;
}

async function runModel(float32Data: Float32Array) {
  try {
    const session = await getSession();

    const input = new ort.Tensor("float32", float32Data, [1, 28 * 28]);
    const results = await session.run({ input });

    const outputData = results.output as ort.Tensor;
    console.log("Inference successful. Output:", outputData);

    return outputData.data as Float32Array;
  } catch (e) {
    console.error(`Inference failed: ${e}`);
    return null;
  }
}