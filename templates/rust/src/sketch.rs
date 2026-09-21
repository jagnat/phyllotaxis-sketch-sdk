use crate::phyllo::{self, Frame, Input, LED_COUNT};

/// Use NONE, AUDIO, INPUT, or AUDIO | INPUT.
pub const CAPABILITIES: u32 = phyllo::capabilities::NONE;

pub fn render(input: &Input<'_>, frame: &mut Frame<'_>) {
    draw(input.phase(8_000_000), frame);
}

/// Keep previews cheap and independent of mutable game state.
pub fn preview(input: &Input<'_>, frame: &mut Frame<'_>) {
    draw(input.phase(8_000_000), frame);
}

fn draw(time: f32, frame: &mut Frame<'_>) {
    for led in 0..LED_COUNT {
        let point = phyllo::position(led);
        let radius = libm::sqrtf(point.x * point.x + point.y * point.y);
        let hue = time + radius * 0.35 + point.y * 0.08;
        let pulse = 0.45 + 0.35 * libm::sinf((time - radius) * core::f32::consts::TAU);
        frame.set(led, phyllo::hsv(hue, 0.85, pulse));
    }
}

