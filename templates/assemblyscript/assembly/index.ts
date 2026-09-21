const ABI_VERSION: u32 = 1;
const LED_COUNT: i32 = 90;
const INPUT_BYTES: i32 = 132;
const FRAME_BYTES: i32 = LED_COUNT * 3;

export const CAP_NONE: u32 = 0;
export const CAP_AUDIO: u32 = 1;
export const CAP_INPUT: u32 = 4;
const CAPABILITIES: u32 = CAP_NONE;

const input = new StaticArray<u8>(INPUT_BYTES);
const frame = new StaticArray<u8>(FRAME_BYTES);

@external("phyllo", "led_x") declare function ledX(index: i32): f32;
@external("phyllo", "led_y") declare function ledY(index: i32): f32;
@external("phyllo", "agc") export declare function agc(channel: i32, energy: f32): f32;
@external("phyllo", "rand") export declare function random(): f32;
@external("phyllo", "return_to_main") export declare function returnToMain(): void;

// Replaces the default env.abort import. With assertions disabled this should
// only be reached by an accidental runtime failure.
export function phylloAbort(message: usize, file: usize, line: u32, column: u32): void {
  unreachable();
}

export function abi_version(): u32 { return ABI_VERSION; }
export function caps(): u32 { return CAPABILITIES; }
export function input_ptr(): usize { return changetype<usize>(input); }
export function frame_ptr(): usize { return changetype<usize>(frame); }

function elapsedUs(): u64 { return load<u64>(input_ptr() + 8); }
export function dtUs(): u32 { return load<u32>(input_ptr() + 4); }
export function dtSeconds(): f32 { return <f32>dtUs() / 1000000.0; }
export function frameIndex(): u64 { return load<u64>(input_ptr() + 16); }
export function phase(periodUs: u64): f32 { return periodUs == 0 ? 0 : <f32>(elapsedUs() % periodUs) / <f32>periodUs; }
export function encoderPosition(): i32 { return load<i32>(input_ptr() + 24); }
export function encoderDelta(): i32 { return load<i32>(input_ptr() + 28); }
export function buttonHeld(): bool { return (load<u8>(input_ptr() + 32) & 1) != 0; }
export function buttonReleased(): bool { return (load<u8>(input_ptr() + 32) & 2) != 0; }
export function band(index: i32): f32 { return index >= 0 && index < 6 ? load<f32>(input_ptr() + 36 + index * 4) : 0; }
export function transient(index: i32): f32 { return index >= 0 && index < 6 ? load<f32>(input_ptr() + 60 + index * 4) : 0; }
export function sustain(index: i32): f32 { return index >= 0 && index < 6 ? load<f32>(input_ptr() + 84 + index * 4) : 0; }
export function superSustain(index: i32): f32 { return index >= 0 && index < 6 ? load<f32>(input_ptr() + 108 + index * 4) : 0; }

function clamp01(value: f32): f32 { return value < 0 ? 0 : value > 1 ? 1 : value; }
function setPixel(index: i32, r: f32, g: f32, b: f32): void {
  if (index < 0 || index >= LED_COUNT) return;
  const address = frame_ptr() + index * 3;
  store<u8>(address, <u8>(clamp01(r) * 255));
  store<u8>(address + 1, <u8>(clamp01(g) * 255));
  store<u8>(address + 2, <u8>(clamp01(b) * 255));
}

function setHsv(index: i32, hue: f32, saturation: f32, value: f32): void {
  const h = (hue - Mathf.floor(hue)) * 6;
  const sector = <i32>h;
  const f = h - <f32>sector;
  const p = value * (1 - saturation);
  const q = value * (1 - saturation * f);
  const t = value * (1 - saturation * (1 - f));
  if (sector == 0) setPixel(index, value, t, p);
  else if (sector == 1) setPixel(index, q, value, p);
  else if (sector == 2) setPixel(index, p, value, t);
  else if (sector == 3) setPixel(index, p, q, value);
  else if (sector == 4) setPixel(index, t, p, value);
  else setPixel(index, value, p, q);
}

function draw(time: f32): void {
  for (let led: i32 = 0; led < LED_COUNT; led++) {
    const x = ledX(led), y = ledY(led);
    const radius = Mathf.sqrt(x * x + y * y);
    const hue = time + radius * 0.35 + y * 0.08;
    const pulse: f32 = <f32>0.45 + <f32>0.35 * Mathf.sin((time - radius) * <f32>6.283185307);
    setHsv(led, hue, 0.85, pulse);
  }
}

export function render(): void { draw(phase(8000000)); }
export function preview(): void { draw(phase(8000000)); }
