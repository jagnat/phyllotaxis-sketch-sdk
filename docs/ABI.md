# Phyllotaxis WASM ABI v1

All integer fields are little-endian. The current board has 90 RGB LEDs and
targets 60 frames per second.

## Guest exports

| Name | WebAssembly type | Required | Meaning |
| --- | --- | --- | --- |
| `memory` | memory | yes | guest linear memory |
| `abi_version` | `() -> i32` | yes | return `1` |
| `render` | `() -> ()` | yes | write the next complete frame |
| `input_ptr` | `() -> i32` | yes | address of 132 writable input bytes |
| `frame_ptr` | `() -> i32` | yes | address of 270 readable frame bytes |
| `caps` | `() -> i32` | no | capability mask; defaults to `0` |
| `preview` | `() -> ()` | no | gallery frame; host falls back to `render` |

The input and frame ranges must fit exported memory. Keeping them disjoint is
strongly recommended. Unknown capability bits are rejected.

## Capabilities

| Bit | Name | Effect |
| --- | --- | --- |
| `1 << 0` (`1`) | `AUDIO_FEATURES` | populate all audio arrays and keep FFT active |
| `1 << 2` (`4`) | `WANTS_INPUT` | reserve knob/button for the sketch |

Without `WANTS_INPUT`, a click exits the sketch. With it, a five-second hold
exits. Bit 1 is intentionally unassigned in ABI v1.

## Input block

| Offset | Type | Field |
| ---: | --- | --- |
| 0 | `u32` | ABI version (`1`) |
| 4 | `u32` | delta since prior frame in microseconds, capped at 50,000 |
| 8 | `u64` | elapsed microseconds since host render start |
| 16 | `u64` | rendered frame index |
| 24 | `i32` | absolute encoder position |
| 28 | `i32` | signed encoder detents this frame |
| 32 | `u8` | buttons: bit 0 held, bit 1 released edge |
| 33 | `u8[3]` | zero padding |
| 36 | `f32[6]` | frequency bands, low to high |
| 60 | `f32[6]` | transients |
| 84 | `f32[6]` | sustain |
| 108 | `f32[6]` | super sustain |

Audio bytes are zero unless `AUDIO_FEATURES` is declared. The output buffer is
90 consecutive `[red, green, blue]` byte triplets. The host performs gamma
correction and power limiting after reading it.

## Host imports

All imports use module name `phyllo`.

| Name | WebAssembly type | Behavior |
| --- | --- | --- |
| `led_x` | `(i32) -> f32` | physical x coordinate; invalid index returns 0 |
| `led_y` | `(i32) -> f32` | physical y coordinate; invalid index returns 0 |
| `agc` | `(i32, f32) -> f32` | stateful automatic gain control; channels 0..15 |
| `rand` | `() -> f32` | pseudorandom value in `[0, 1)` |
| `return_to_main` | `() -> ()` | request the unattended main display |

No WASI functions are available.

## Runtime limits

- payload at most 32,704 bytes;
- one linear memory, growing to at most 1 MiB;
- at most one table with 1,024 elements;
- 120,000 wasmi fuel for each frame;
- 500,000 fuel for instantiation, start, and export preflight;
- roughly 120 consecutive over-budget frames disable the sketch.

A trap disables the sketch. An over-budget frame retains the prior guest frame;
after sustained overruns the board displays a red breathing error state.

## HTTP management API

```text
GET    /api/info
GET    /api/health
GET    /api/sketches
POST   /api/sketches/{slot}/{name}  Content-Type: application/wasm
                                     X-Phyllo-Color: #be28ff
POST   /api/run/{slot}
DELETE /api/sketches/{slot}
POST   /api/select/0
```

Slots are 0..99. Names are 1..32 ASCII letters, digits, `.`, `_`, or `-`.
Responses are JSON. Upload performs full firmware-side validation before an
atomic flash commit. The management API is intentionally open to the local
network and must not be exposed directly to the public Internet.

