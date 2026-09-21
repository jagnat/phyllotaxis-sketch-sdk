# Rust sketch starter

Edit `src/sketch.rs`; `phyllo.rs` is the safe SDK and `lib.rs` is ABI glue.
From the SDK root run `./phyllo build rust`, or after scaffolding this template
with `./phyllo new rust my-sketch`, run `./phyllo build .` inside it.

Set `CAPABILITIES` to `NONE`, `AUDIO`, `INPUT`, or `AUDIO | INPUT`. Keep the
crate `no_std`, avoid allocation in the frame loop, and use an optimized build.

