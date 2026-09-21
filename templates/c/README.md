# C sketch starter

Edit `src/sketch.c`; `src/phyllo.h` contains the complete ABI wrapper. Build
from the SDK root with `./phyllo build c`. You need LLVM Clang with the wasm32
backend plus LLD. On macOS, Apple's `/usr/bin/clang` does not include the backend;
install LLVM and put its `bin` directory on `PATH`, or run
`make CLANG=/path/to/llvm/clang`. The Makefile can use `wasm-ld` or Rust's
bundled `rust-lld`.

The build is freestanding: there is no libc, allocator, WASI, RTTI, or exception
runtime. Keep sketch code within that small environment.
