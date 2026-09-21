# Contributing

Keep ABI changes synchronized across `docs/ABI.md`, all wrappers, the checker,
and simulator. A template change should pass:

```sh
./phyllo doctor
./phyllo build rust
./phyllo build c
./phyllo build assemblyscript
./phyllo check dist/rust.wasm
./phyllo check dist/c.wasm
./phyllo check dist/assemblyscript.wasm
```

Do not commit build output or dependencies. Hardware-test new language templates
for module size, load time, frame time, and fuel before calling them supported.

