
import * as ort from 'onnxruntime-web';

const canvas = document.getElementById("draw")!;
const ctx = canvas.getContext("2d", { willReadFrequently: true });

// Fill background black
ctx.fillStyle = "black";
ctx.fillRect(0, 0, 28, 28);

let drawing = false;
let savedData = new Float32Array(28 * 28);

function getCanvasPos(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function drawAt(x, y) {
  // Draw a small soft-ish brush in white
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(x, y, 1.2, 0, Math.PI * 2);
  ctx.fill();
}

async function predictOutput() {
  const imageData = ctx.getImageData(0, 0, 28, 28);
  const data = imageData.data;
  const arr = new Float32Array(28 * 28);

  for (let i = 0; i < 28 * 28; i++) {
    const r = data[i * 4]; // red channel
    arr[i] = r / 255; // normalize to 0..1
  }

  savedData = arr;
  const output = await runModel(arr);
  // pick highest output.
  let champ = 0;
  for (let i = 0; i < output.length; i++) {
    if (output[i] > output[champ]) champ = i;
  }
  console.log("Saved Float32Array:", savedData);

  console.log("Prediction:", champ);
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

window.addEventListener("mouseup", () => {
  if (!drawing) return;
  drawing = false;
  predictOutput();
});

canvas.addEventListener("mouseleave", () => {
  if (!drawing) return;
  drawing = false;
  {
    {
      /*  predictOutput();  */
    }
  }
});

document.getElementById("clearBtn").addEventListener("click", () => {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, 28, 28);
  {
    {
      /*  predictOutput();  */
    }
  }
});

document.getElementById("printBtn").addEventListener("click", () => {
  console.log(savedData);
  predictOutput();
});

async function runModel(float32Data: Float32Array) {
  try {
    const session = await ort.InferenceSession.create(
      "public/mnist_simple_mlp.onnx",
      { executionProviders: ["webgpu", "wasm"] },
    );

    console.log("inputs:", session.inputNames);
    console.log("outputs:", session.outputNames);

    const input = new ort.Tensor("float32", float32Data, [1, 28 * 28]);
    const results = await session.run({ input: input });

    const outputData = results.ouput;
    console.log("Inference successful. Output:", outputData);
    return outputData;
  } catch (e) {
    console.error(`Inference failed: ${e}`);
  }
}
