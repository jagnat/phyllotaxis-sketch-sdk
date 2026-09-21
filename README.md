# Phyllotaxis Sketch SDK

Build tiny WebAssembly animations, audio-reactive art, and knob-controlled
games for the 90-pixel Phyllotaxis LED board installed at Recurse Center. A sketch is sandboxed, has no
filesystem or network access, and can be written in any language that emits the [small ABI](docs/ABI.md).

Included starters:

| Template | Best for | Toolchain |
| --- | --- | --- |
| [Rust](templates/rust) | safety and richer sketches | stable Rust |
| [C](templates/c) | the smallest dependency-free build | LLVM/Clang |
| [AssemblyScript](templates/assemblyscript) | JavaScript/TypeScript developers | Node.js/npm |

AssemblyScript is the JavaScript-like option. JavaScript itself needs a runtime
that does not fit the board's 32 KB sketch slot.

## Five-minute start

```sh
cp .phyllo.env.example .phyllo.env
./phyllo doctor
./phyllo build rust
./phyllo check dist/rust.wasm
./phyllo simulate
```

Open `http://localhost:8000`, choose `dist/rust.wasm`, then edit
`templates/rust/src/sketch.rs`. To put it on a board:

```sh
./phyllo upload rust
./phyllo run
```

Change `rust` to `c` or `assemblyscript` to use another starter. Configuration
comes from `.phyllo.env` beside the `phyllo` script (or from exported environment
variables). If the file or a required value is missing, board commands prompt
for it; the hostname defaults to `phyllotaxis.local`. To recreate the file:

```sh
cp .phyllo.env.example .phyllo.env
```

The example contains:

```sh
PHYLLO_HOST=phyllotaxis.local
PHYLLO_SLOT=1
PHYLLO_NAME=my-sketch
PHYLLO_COLOR=#be28ff
```

Use an empty slot from `./phyllo list`. Before uploading, the command checks the
board and refuses to replace a slot whose existing sketch has a different name;
uploading the same name to the same slot remains supported. Prompted values
apply to the current command only; save them in `.phyllo.env` to reuse them.

## Commands

```text
./phyllo doctor                       check local build tools
./phyllo new <language> <directory>   copy a clean starter
./phyllo build <language|directory>   produce dist/<name>.wasm
./phyllo check <file.wasm>            run local ABI checks
./phyllo simulate [port]              start the browser simulator
./phyllo upload <language|directory>  build, check, and upload
./phyllo list | health | run | delete | main
```

`new` makes a standalone sketch directory with its own `phyllo` command and
checker. For example:

```sh
./phyllo new c work/my-game
cd work/my-game
./phyllo build .
```

## Choose a capability

- `NONE` — generative art; audio analysis is paused to leave more CPU for WASM.
- `AUDIO` — six frequency bands plus transient, sustain, and long-sustain data.
- `INPUT` — knob position/delta and button state; hold the button for five
  seconds to exit.
- `AUDIO | INPUT` — interactive, audio-reactive sketches and games.

Every frame should write all 90 RGB pixels. The board gamma-corrects and
power-limits the result. Target 60 fps and stay below 120,000 wasmi fuel per
frame; local simulation checks behavior, while the board remains authoritative
for fuel and module limits.

Read [Creating a sketch](docs/GUIDE.md), the exact [ABI reference](docs/ABI.md),
and the [firmware API audit](docs/FIRMWARE_API_AUDIT.md).
