LLVM_CLANG := $(shell if [ -x /opt/homebrew/opt/llvm/bin/clang ]; then printf /opt/homebrew/opt/llvm/bin/clang; elif [ -x /usr/local/opt/llvm/bin/clang ]; then printf /usr/local/opt/llvm/bin/clang; else command -v clang; fi)
CLANG ?= $(LLVM_CLANG)
OUTPUT ?= build/sketch.wasm
OBJECT := build/sketch.o
SYSTEM_WASM_LD := $(shell command -v wasm-ld 2>/dev/null)
RUST_LLD := $(shell if command -v rustc >/dev/null 2>&1; then find "$$(rustc --print sysroot)" -name rust-lld -type f 2>/dev/null | head -1; fi)
ifeq ($(SYSTEM_WASM_LD),)
WASM_LD ?= $(RUST_LLD) -flavor wasm
else
WASM_LD ?= $(SYSTEM_WASM_LD)
endif
CFLAGS := --target=wasm32 -std=c11 -Oz -ffreestanding -fno-builtin -fvisibility=hidden
LDFLAGS := --no-entry --export-memory --initial-memory=65536 --max-memory=1048576 -z stack-size=16384 --strip-all

.PHONY: all clean
all: $(OUTPUT)

$(OUTPUT): src/sketch.c src/phyllo.h
	@mkdir -p "$(dir $(OUTPUT))"
	@mkdir -p build
	$(CLANG) $(CFLAGS) -c src/sketch.c -o "$(OBJECT)"
	$(WASM_LD) $(LDFLAGS) "$(OBJECT)" -o "$@"

clean:
	rm -f "$(OUTPUT)" "$(OBJECT)"
