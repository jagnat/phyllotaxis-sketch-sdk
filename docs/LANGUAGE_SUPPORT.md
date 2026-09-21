# Language support

The ABI is language-neutral, but a practical toolchain must emit a small module,
export raw linear memory and C-like functions, and import functions from the
`phyllo` module without WASI.

| Language | Status | Notes |
| --- | --- | --- |
| Rust | supported template | `no_std`, excellent size and control |
| C | supported template | freestanding Clang build, smallest surface |
| AssemblyScript | supported template | familiar TypeScript syntax, runtime disabled |
| Zig | straightforward future template | good freestanding WASM, but toolchain is a large extra install |
| TinyGo | possible future template | pleasant Go subset; verify runtime size and fuel first |
| C++ | use C template carefully | exceptions, RTTI, allocation, and libc are intentionally absent |
| JavaScript | not direct | requires an interpreter/runtime and is not viable in a 32 KB slot |

Before accepting another first-class template, require a reproducible optimized
build, a module under the size cap, no WASI imports, a simulator smoke test, and
a hardware fuel measurement. More templates are not automatically better: each
wrapper becomes another copy of the ABI that must remain exact.

