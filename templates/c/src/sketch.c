#include "phyllo.h"

// Change this to PHYLLO_CAP_AUDIO, PHYLLO_CAP_INPUT, or their bitwise OR.
#define CAPABILITIES PHYLLO_CAP_NONE

uint8_t phyllo_input[PHYLLO_INPUT_BYTES];
uint8_t phyllo_frame[PHYLLO_FRAME_BYTES];

PHYLLO_EXPORT("abi_version") uint32_t abi_version(void) { return PHYLLO_ABI_VERSION; }
PHYLLO_EXPORT("caps") uint32_t caps(void) { return CAPABILITIES; }
PHYLLO_EXPORT("input_ptr") uint32_t input_ptr(void) { return (uint32_t)(uintptr_t)phyllo_input; }
PHYLLO_EXPORT("frame_ptr") uint32_t frame_ptr(void) { return (uint32_t)(uintptr_t)phyllo_frame; }

static void draw(float time) {
    for (int led = 0; led < PHYLLO_LED_COUNT; led++) {
        phyllo_point point = phyllo_position(led);
        float radius2 = point.x * point.x + point.y * point.y;
        float wave = time * 2.0f + radius2 * 1.7f;
        wave -= (float)((int)wave);
        float pulse = 0.25f + 0.65f * (wave < 0.5f ? wave * 2.0f : (1.0f - wave) * 2.0f);
        phyllo_set(led, phyllo_hsv(time + radius2 * 0.35f + point.y * 0.08f, 0.85f, pulse));
    }
}

PHYLLO_EXPORT("render") void render(void) { draw(phyllo_phase(8000000)); }
PHYLLO_EXPORT("preview") void preview(void) { draw(phyllo_phase(8000000)); }

