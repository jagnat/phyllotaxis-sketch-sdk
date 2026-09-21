#ifndef PHYLLO_H
#define PHYLLO_H

#include <stdint.h>

#define PHYLLO_ABI_VERSION 1u
#define PHYLLO_LED_COUNT 90
#define PHYLLO_INPUT_BYTES 132
#define PHYLLO_FRAME_BYTES (PHYLLO_LED_COUNT * 3)
#define PHYLLO_CAP_NONE 0u
#define PHYLLO_CAP_AUDIO 1u
#define PHYLLO_CAP_INPUT 4u

#define PHYLLO_IMPORT(name) __attribute__((import_module("phyllo"), import_name(name)))
#define PHYLLO_EXPORT(name) __attribute__((export_name(name)))

PHYLLO_IMPORT("led_x") float phyllo_led_x(int32_t index);
PHYLLO_IMPORT("led_y") float phyllo_led_y(int32_t index);
PHYLLO_IMPORT("agc") float phyllo_agc(int32_t channel, float energy);
PHYLLO_IMPORT("rand") float phyllo_random(void);
PHYLLO_IMPORT("return_to_main") void phyllo_return_to_main(void);

typedef struct { uint8_t r, g, b; } phyllo_rgb;
typedef struct { float x, y; } phyllo_point;

extern uint8_t phyllo_input[PHYLLO_INPUT_BYTES];
extern uint8_t phyllo_frame[PHYLLO_FRAME_BYTES];

static inline uint32_t phyllo_read_u32(int offset) {
    return (uint32_t)phyllo_input[offset] | (uint32_t)phyllo_input[offset+1] << 8 |
           (uint32_t)phyllo_input[offset+2] << 16 | (uint32_t)phyllo_input[offset+3] << 24;
}
static inline int32_t phyllo_read_i32(int offset) { return (int32_t)phyllo_read_u32(offset); }
static inline uint64_t phyllo_read_u64(int offset) {
    return (uint64_t)phyllo_read_u32(offset) | (uint64_t)phyllo_read_u32(offset + 4) << 32;
}
static inline float phyllo_read_f32(int offset) {
    union { uint32_t u; float f; } value = { .u = phyllo_read_u32(offset) };
    return value.f;
}
static inline uint32_t phyllo_dt_us(void) { return phyllo_read_u32(4); }
static inline float phyllo_dt_seconds(void) { return (float)phyllo_dt_us() / 1000000.0f; }
static inline uint64_t phyllo_elapsed_us(void) { return phyllo_read_u64(8); }
static inline uint64_t phyllo_frame_index(void) { return phyllo_read_u64(16); }
static inline float phyllo_phase(uint64_t period_us) { return period_us ? (float)(phyllo_elapsed_us() % period_us) / (float)period_us : 0.0f; }
static inline int32_t phyllo_encoder_position(void) { return phyllo_read_i32(24); }
static inline int32_t phyllo_encoder_delta(void) { return phyllo_read_i32(28); }
static inline int phyllo_button_held(void) { return (phyllo_input[32] & 1) != 0; }
static inline int phyllo_button_released(void) { return (phyllo_input[32] & 2) != 0; }
static inline float phyllo_band(int index) { return index >= 0 && index < 6 ? phyllo_read_f32(36 + index * 4) : 0.0f; }
static inline float phyllo_transient(int index) { return index >= 0 && index < 6 ? phyllo_read_f32(60 + index * 4) : 0.0f; }
static inline float phyllo_sustain(int index) { return index >= 0 && index < 6 ? phyllo_read_f32(84 + index * 4) : 0.0f; }
static inline float phyllo_super_sustain(int index) { return index >= 0 && index < 6 ? phyllo_read_f32(108 + index * 4) : 0.0f; }
static inline phyllo_point phyllo_position(int index) { return (phyllo_point){ phyllo_led_x(index), phyllo_led_y(index) }; }
static inline void phyllo_set(int index, phyllo_rgb color) {
    if (index >= 0 && index < PHYLLO_LED_COUNT) {
        phyllo_frame[index*3] = color.r; phyllo_frame[index*3+1] = color.g; phyllo_frame[index*3+2] = color.b;
    }
}
static inline float phyllo_clamp01(float value) { return value < 0 ? 0 : value > 1 ? 1 : value; }
static inline phyllo_rgb phyllo_hsv(float hue, float saturation, float value) {
    int whole = (int)hue;
    float wrapped = hue - (float)whole;
    if (wrapped < 0) wrapped += 1.0f;
    float h = wrapped * 6.0f, f = h - (float)((int)h), p = value*(1-saturation);
    float q = value*(1-saturation*f), t = value*(1-saturation*(1-f));
    float r, g, b;
    switch ((int)h) {
        case 0: r=value; g=t; b=p; break; case 1: r=q; g=value; b=p; break;
        case 2: r=p; g=value; b=t; break; case 3: r=p; g=q; b=value; break;
        case 4: r=t; g=p; b=value; break; default: r=value; g=p; b=q; break;
    }
    return (phyllo_rgb){ (uint8_t)(255*phyllo_clamp01(r)), (uint8_t)(255*phyllo_clamp01(g)), (uint8_t)(255*phyllo_clamp01(b)) };
}

#endif

