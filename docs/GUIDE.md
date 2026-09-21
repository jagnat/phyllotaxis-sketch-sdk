# Creating a sketch

## The programming model

The host writes a 132-byte input snapshot, calls `render()`, and reads a
270-byte RGB frame. Rendering has no arguments so the ABI works across small
freestanding language toolchains. The template wrappers turn those raw buffers
into ordinary input and frame helpers.

Use physical `x, y` positions rather than assuming LED index order. The points
fill an irregular unit disk; spatial effects written against coordinates look
the same in the simulator and on the board.

## Pick a starting point

- Rust: edit `templates/rust/src/sketch.rs`. The unsafe ABI boundary is already
  contained in `lib.rs` and `phyllo.rs`.
- C: edit `templates/c/src/sketch.c`. `phyllo.h` contains the complete wrapper.
- AssemblyScript: edit `templates/assemblyscript/assembly/index.ts`. It uses
  direct memory access and has no managed runtime.

Each starter renders the same radial color wave and exports `preview()`. A
preview is shown while browsing the physical gallery and should be cheap,
deterministic, and should not consume game state.

## Time and state

`elapsed_us` and `frame_index` are monotonic. Reduce 64-bit time modulo a period
before converting to a float; converting long uptime directly to `f32` causes
visible jitter. Use `dt_us` for simulations and games, capped at 50 ms by the
host so a delayed frame does not make state jump dramatically.

Guest globals persist while the sketch stays loaded. Initialize state lazily on
the first render. There is currently no persistent storage across reloads or
power cycles.

## Input and games

Declare the INPUT capability before relying on the controls. `encoder_delta`
is the signed movement during this frame; `encoder_position` is absolute.
`button_held` is a level and `button_released` is a one-frame edge. Interactive
sketches reserve ordinary clicks, so the firmware requires a five-second hold
to return to the menu. A game can call `return_to_main()` itself after a round.

Use cases that fit well:

- timing, memory, reaction, and knob-controlled arcade games;
- particle fields and generative geometry;
- spectrum, beat, and ambience visualizers;
- gallery previews and short interactive installations;
- deterministic procedural art seeded with `rand()` at load time.

The current API is less suited to networked games, sampled audio synthesis,
long-term scores, or exact raw-spectrum analysis. See the firmware audit for
the additions those use cases need.

## Audio

Declare AUDIO only when used; it keeps the FFT pipeline running. The six bands
are ordered low to high. `transients` reacts quickly, `sustain` is smoother,
and `super_sustain` is the slowest. The values are features rather than raw FFT
bins. Use host `agc(channel, value)` when normalizing your own combined signal;
give unrelated signals different channels (0 through 15) and call each active
channel once per frame.

## Performance checklist

- Build release/optimized WASM and keep it at or below 32,704 bytes.
- Avoid allocation and large tables in the render loop.
- Cache coordinate-derived values if the language makes that cheap.
- Use `preview()` for a cheaper gallery frame when `render()` is stateful.
- Fill every pixel each frame; stale bytes otherwise remain visible.
- Test on hardware. The simulator cannot reproduce wasmi's fuel accounting,
  microphone input, gamma curve, power limiting, or exact frame scheduling.

## Sharing a sketch

A distributable sketch can be the `.wasm` alone, but source plus build metadata
is much easier to trust and remix. Record the expected ABI (`1`), capabilities,
toolchain version, menu color, and license. Do not rely on WASI: the host exposes
only the imports documented in `ABI.md`.

