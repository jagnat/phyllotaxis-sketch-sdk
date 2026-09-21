#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { LED_POSITIONS } from "./positions.mjs";

const MAX_BYTES = 32704;
const INPUT_BYTES = 132;
const FRAME_BYTES = 270;
const KNOWN_CAPS = 1 | 4;
const file = process.argv[2];
if (!file) {
  console.error("usage: node tools/check-wasm.mjs <sketch.wasm>");
  process.exit(2);
}

function fail(message) {
  throw new Error(message);
}

const bytes = await readFile(file);
if (bytes.byteLength > MAX_BYTES) fail(`${bytes.byteLength} bytes exceeds ${MAX_BYTES}`);

const module = await WebAssembly.compile(bytes);
const allowedImports = new Set(["led_x", "led_y", "agc", "rand", "return_to_main"]);
for (const item of WebAssembly.Module.imports(module)) {
  if (item.module !== "phyllo" || item.kind !== "function" || !allowedImports.has(item.name)) {
    fail(`unsupported import ${item.module}.${item.name} (${item.kind})`);
  }
}

const agc = Array.from({ length: 16 }, () => ({ floor: 0, max: 0.01 }));
let randomState = 0x51a7cafe;
const imports = { phyllo: {
  led_x: (i) => LED_POSITIONS[i]?.[0] ?? 0,
  led_y: (i) => LED_POSITIONS[i]?.[1] ?? 0,
  agc: (channel, energy) => {
    if (channel < 0 || channel >= 16 || !Number.isFinite(energy) || energy < 0) return 0;
    const state = agc[channel];
    state.floor = energy < state.floor ? energy : Math.min(0.1, state.floor + 0.0016);
    let value = energy;
    if (value <= state.floor) value = 0;
    else if (state.floor > 0 && value < state.floor * 2) {
      const t = (value - state.floor) / state.floor;
      value *= t * t * (3 - 2 * t);
    }
    state.max = Math.max(value, state.max * 0.9999, 0.01);
    return Math.min(1, value / state.max);
  },
  rand: () => {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return (randomState >>> 8) / 0x1000000;
  },
  return_to_main: () => {},
} };

const { exports } = await WebAssembly.instantiate(module, imports);
if (!(exports.memory instanceof WebAssembly.Memory)) fail("missing exported memory");
for (const name of ["abi_version", "render", "input_ptr", "frame_ptr"]) {
  if (typeof exports[name] !== "function") fail(`missing function export ${name}`);
}
if (exports.abi_version() !== 1) fail("abi_version() must return 1");
const caps = typeof exports.caps === "function" ? exports.caps() >>> 0 : 0;
if (caps & ~KNOWN_CAPS) fail(`unknown capability bits 0x${(caps & ~KNOWN_CAPS).toString(16)}`);

const inputPtr = exports.input_ptr() >>> 0;
const framePtr = exports.frame_ptr() >>> 0;
const memoryBytes = exports.memory.buffer.byteLength;
if (memoryBytes > 1024 * 1024) fail(`initial memory ${memoryBytes} exceeds 1 MiB`);
if (inputPtr + INPUT_BYTES > memoryBytes) fail("input buffer is outside exported memory");
if (framePtr + FRAME_BYTES > memoryBytes) fail("frame buffer is outside exported memory");
if (inputPtr < framePtr + FRAME_BYTES && framePtr < inputPtr + INPUT_BYTES) fail("input and frame buffers overlap");

const view = new DataView(exports.memory.buffer);
view.setUint32(inputPtr, 1, true);
view.setUint32(inputPtr + 4, 16667, true);
view.setBigUint64(inputPtr + 8, 16667n, true);
view.setBigUint64(inputPtr + 16, 1n, true);
exports.render();
if (typeof exports.preview === "function") exports.preview();

console.log(`ok: ${file}`);
console.log(`  ${bytes.byteLength}/${MAX_BYTES} bytes, ${memoryBytes} memory bytes, caps 0x${caps.toString(16)}`);
console.log("  exports, imports, pointers, render, and preview passed local checks");
console.log("  note: only the board can enforce wasmi fuel and declared memory/table maxima");
