# Firmware API surface audit

This audit compares the implemented ABI v1 host in `esp32_phyllotaxis/src/wasm.rs`
with the needs of art sketches and small games. No firmware changes are required
to use this SDK.

## What is already strong

- Coordinates, time, audio features, random numbers, input, and explicit exit
  cover the core visual/game loop with only five imports.
- Capability opt-in avoids paying for FFT or losing menu behavior unnecessarily.
- Fuel, memory/table limits, upload preflight, CRC storage, and atomic metadata
  commit make untrusted local modules fail closed.
- Optional `preview()` cleanly separates gallery presentation from game state.
- Integer microsecond time avoids the long-uptime precision bugs common in
  browser-style float timestamps.

One current documentation bug was found: the firmware implements the
`phyllo.return_to_main` import, but the firmware's `docs/WASM_ABI.md` host-import
list does not mention it. This SDK documents the implemented behavior.

## Recommended additions

### 1. Discoverable device/ABI metadata — high priority

Extend `GET /api/info` with ABI version, LED count, FPS target, maximum module
size, capability mask, and firmware version. The same facts are currently split
between `/api/sketches`, source, and documentation. Tooling could reject an
incompatible board before uploading.

Suggested response fields: `firmware_version`, `abi_versions`, `led_count`,
`target_fps`, `known_caps`, `max_module_size`, and `input_size`.

### 2. Bulk geometry access — medium priority

Ninety pairs of `led_x`/`led_y` imports cost 180 host calls every frame in a
naive spatial sketch. Add an optional ABI v2 function such as
`copy_led_positions(ptr, capacity) -> count`, called once during initialization,
or append immutable geometry to a host-written config block. Keep scalar imports
for compatibility. This should materially reduce fuel for coordinate-heavy art.

### 3. Explicit lifecycle/reset signal — medium priority

Add `init()` and/or a reason-coded `reset(reason)` optional export. Today guests
infer first render from zeroed globals, and preview/render may share state.
Lifecycle hooks would clarify load, gallery preview, activation, and resume.

### 4. Stable per-device/session seed — medium priority

`rand()` is useful, but art cannot deliberately choose between repeatable daily,
per-device, and fresh-session behavior. Put `session_seed` and `device_seed` in
an ABI v2 config block. Do not expose hardware identity directly.

### 5. Persistent key/value state — medium priority for games

Scores, calibration, and user preferences currently disappear on reload. A tiny
rate-limited API (for example, a few keys and 256 bytes per slot) would unlock
progression without giving guests raw flash access. Writes need quotas,
wear-leveling, and a clear failure model, so this should not be squeezed into
ABI v1 casually.

### 6. More input edges — low priority

Expose pressed edge, hold duration, and possibly encoder-button double-click as
data, not host callbacks. These are cheap and remove repeated debounce/game UI
logic. Keep raw held/released bits for compatibility.

### 7. Runtime diagnostics — low priority

Expose the last trap/overrun and measured max render time in `/api/health` or a
per-slot diagnostics endpoint. The local checker cannot model wasmi fuel; clear
hardware feedback would make performance tuning much easier.

### 8. Require disjoint guest buffers — low priority hardening

Upload validation proves that the input and frame ranges individually fit in
memory, but does not reject ranges that overlap. Overlap does not escape the
sandbox, though it makes the host/guest ownership rule ambiguous and can produce
surprising frames. Reject overlap during `SketchInstance::load`; this SDK's
checker already does so.

## Defer or avoid

- Raw FFT bins: expensive, easy to misuse, and the current four feature scales
  are more stable for artwork.
- Guest networking/filesystem/WASI: sharply expands security and resource risk.
- Direct LED transport control: bypasses host gamma and power safety.
- Arbitrary flash access: conflicts with gallery integrity and wear management.
- ABI v1 mutation: add optional exports/imports or version a new config block;
  do not change the 132-byte input layout under version 1.

## Suggested sequence

First fix the missing `return_to_main` documentation and enrich `/api/info`.
Then measure host-call fuel on representative spatial sketches before adding
bulk geometry. Add lifecycle hooks alongside any ABI v2 config block. Persistent
state should be a separately designed feature with power-loss and wear tests.
