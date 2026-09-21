import { LED_POSITIONS } from "../tools/positions.mjs";

const INPUT_BYTES = 132;
const FRAME_BYTES = 270;
const canvas = document.querySelector("#board");
const context = canvas.getContext("2d");
const status = document.querySelector("#status");
const bandRoot = document.querySelector("#bands");
const bandInputs = Array.from({ length: 6 }, (_, index) => {
  const label = document.createElement("label");
  label.textContent = String(index + 1);
  const input = document.createElement("input");
  input.type = "range";
  input.min = "0";
  input.max = "1";
  input.step = "0.01";
  input.value = "0";
  label.append(input);
  bandRoot.append(label);
  return input;
});

let selectedBytes = null;
let sketch = null;
let startedAt = 0;
let previousAt = 0;
let frameIndex = 0n;
let encoderPosition = 0;
let encoderDelta = 0;
let buttonHeld = false;
let buttonReleased = false;
let animation = 0;
let randomState = 0x51a7cafe;
const agcState = Array.from({ length: 16 }, () => ({ floor: 0, max: 0.01 }));
const smoothAudio = new Float32Array(6);
const slowAudio = new Float32Array(6);

function setStatus(message, error = false) {
  status.textContent = message;
  status.style.color = error ? "#ff9b9b" : "#aef5bb";
}

function hostImports() {
  return { phyllo: {
    led_x: (i) => LED_POSITIONS[i]?.[0] ?? 0,
    led_y: (i) => LED_POSITIONS[i]?.[1] ?? 0,
    agc: (channel, energy) => {
      if (channel < 0 || channel >= 16 || !Number.isFinite(energy) || energy < 0) return 0;
      const state = agcState[channel];
      state.floor = energy < state.floor ? energy : Math.min(.1, state.floor + .0016);
      let value = energy <= state.floor ? 0 : energy;
      state.max = Math.max(value, state.max * .9999, .01);
      return Math.min(1, value / state.max);
    },
    rand: () => {
      randomState ^= randomState << 13;
      randomState ^= randomState >>> 17;
      randomState ^= randomState << 5;
      return (randomState >>> 8) / 0x1000000;
    },
    return_to_main: () => {
      cancelAnimationFrame(animation);
      setStatus("Sketch called return_to_main(). Reset to run it again.");
    },
  } };
}

async function loadSketch(bytes) {
  cancelAnimationFrame(animation);
  try {
    const result = await WebAssembly.instantiate(bytes, hostImports());
    const exports = result.instance.exports;
    if (!(exports.memory instanceof WebAssembly.Memory)) throw new Error("missing exported memory");
    for (const name of ["abi_version", "render", "input_ptr", "frame_ptr"]) {
      if (typeof exports[name] !== "function") throw new Error(`missing ${name} export`);
    }
    if (exports.abi_version() !== 1) throw new Error("this simulator supports ABI 1");
    const input = exports.input_ptr() >>> 0;
    const frame = exports.frame_ptr() >>> 0;
    if (input + INPUT_BYTES > exports.memory.buffer.byteLength || frame + FRAME_BYTES > exports.memory.buffer.byteLength) {
      throw new Error("guest buffers are outside memory");
    }
    const caps = typeof exports.caps === "function" ? exports.caps() >>> 0 : 0;
    sketch = { exports, input, frame, caps };
    startedAt = performance.now();
    previousAt = startedAt;
    frameIndex = 0n;
    setStatus(`Running ABI 1, caps 0x${caps.toString(16)}`);
    animation = requestAnimationFrame(render);
  } catch (error) {
    sketch = null;
    setStatus(error.message, true);
  }
}

function writeAudio(view, offset, values) {
  values.forEach((value, index) => view.setFloat32(offset + index * 4, value, true));
}

function render(now) {
  if (!sketch) return;
  try {
    const elapsedUs = BigInt(Math.floor((now - startedAt) * 1000));
    const dtUs = Math.min(50000, Math.max(0, Math.floor((now - previousAt) * 1000)));
    previousAt = now;
    const view = new DataView(sketch.exports.memory.buffer);
    view.setUint32(sketch.input, 1, true);
    view.setUint32(sketch.input + 4, dtUs, true);
    view.setBigUint64(sketch.input + 8, elapsedUs, true);
    view.setBigUint64(sketch.input + 16, frameIndex++, true);
    view.setInt32(sketch.input + 24, encoderPosition, true);
    view.setInt32(sketch.input + 28, encoderDelta, true);
    view.setUint8(sketch.input + 32, (buttonHeld ? 1 : 0) | (buttonReleased ? 2 : 0));
    encoderDelta = 0;
    buttonReleased = false;

    const bands = bandInputs.map((input) => sketch.caps & 1 ? Number(input.value) : 0);
    const transients = bands.map((value, i) => Math.max(0, value - smoothAudio[i]));
    bands.forEach((value, i) => {
      smoothAudio[i] += (value - smoothAudio[i]) * .08;
      slowAudio[i] += (value - slowAudio[i]) * .012;
    });
    writeAudio(view, sketch.input + 36, bands);
    writeAudio(view, sketch.input + 60, transients);
    writeAudio(view, sketch.input + 84, smoothAudio);
    writeAudio(view, sketch.input + 108, slowAudio);
    sketch.exports.render();

    const frame = new Uint8Array(sketch.exports.memory.buffer, sketch.frame, FRAME_BYTES);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#070609";
    context.beginPath(); context.arc(400, 400, 372, 0, Math.PI * 2); context.fill();
    LED_POSITIONS.forEach(([x, y], index) => {
      const r = frame[index * 3];
      const g = frame[index * 3 + 1];
      const b = frame[index * 3 + 2];
      const px = 400 + x * 345;
      const py = 400 - y * 345;
      context.shadowBlur = 18;
      context.shadowColor = `rgb(${r} ${g} ${b})`;
      context.fillStyle = `rgb(${r} ${g} ${b})`;
      context.beginPath(); context.arc(px, py, 10, 0, Math.PI * 2); context.fill();
    });
    context.shadowBlur = 0;
    animation = requestAnimationFrame(render);
  } catch (error) {
    sketch = null;
    setStatus(`Render trapped: ${error.message}`, true);
  }
}

document.querySelector("#wasm").addEventListener("change", async (event) => {
  selectedBytes = await event.target.files[0]?.arrayBuffer();
  if (selectedBytes) loadSketch(selectedBytes);
});
document.querySelector("#reload").addEventListener("click", () => selectedBytes && loadSketch(selectedBytes));
document.querySelector("#left").addEventListener("click", () => {
  encoderPosition -= 1; encoderDelta -= 1; document.querySelector("#position").textContent = encoderPosition;
});
document.querySelector("#right").addEventListener("click", () => {
  encoderPosition += 1; encoderDelta += 1; document.querySelector("#position").textContent = encoderPosition;
});
const button = document.querySelector("#button");
button.addEventListener("pointerdown", () => { buttonHeld = true; });
function releaseButton() { if (buttonHeld) { buttonHeld = false; buttonReleased = true; } }
button.addEventListener("pointerup", releaseButton);
button.addEventListener("pointercancel", releaseButton);
button.addEventListener("pointerleave", (event) => { if (event.buttons === 0) releaseButton(); });
