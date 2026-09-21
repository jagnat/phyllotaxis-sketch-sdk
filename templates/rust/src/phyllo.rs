#![allow(dead_code)]

pub const ABI_VERSION: u32 = 1;
pub const LED_COUNT: usize = 90;
pub(crate) const INPUT_BYTES: usize = 132;
pub(crate) const FRAME_BYTES: usize = LED_COUNT * 3;

pub mod capabilities {
    pub const NONE: u32 = 0;
    pub const AUDIO: u32 = 1;
    pub const INPUT: u32 = 4;
}

#[derive(Clone, Copy, Default)]
pub struct Rgb { pub r: u8, pub g: u8, pub b: u8 }

impl Rgb {
    pub const BLACK: Self = Self::new(0, 0, 0);
    pub const fn new(r: u8, g: u8, b: u8) -> Self { Self { r, g, b } }
    pub fn scale(self, amount: f32) -> Self {
        let amount = clamp01(amount);
        Self::new((self.r as f32 * amount) as u8, (self.g as f32 * amount) as u8, (self.b as f32 * amount) as u8)
    }
}

#[derive(Clone, Copy, Default)]
pub struct Point { pub x: f32, pub y: f32 }

pub struct Frame<'a> { bytes: &'a mut [u8; FRAME_BYTES] }

impl<'a> Frame<'a> {
    pub(crate) fn new(bytes: &'a mut [u8; FRAME_BYTES]) -> Self { Self { bytes } }
    pub fn set(&mut self, index: usize, color: Rgb) {
        if index < LED_COUNT {
            self.bytes[index * 3..index * 3 + 3].copy_from_slice(&[color.r, color.g, color.b]);
        }
    }
    pub fn fill(&mut self, color: Rgb) { for index in 0..LED_COUNT { self.set(index, color); } }
}

#[derive(Clone, Copy, Default)]
pub struct Audio {
    pub bands: [f32; 6],
    pub transients: [f32; 6],
    pub sustain: [f32; 6],
    pub super_sustain: [f32; 6],
}

pub struct Input<'a> { bytes: &'a [u8; INPUT_BYTES] }

impl<'a> Input<'a> {
    pub(crate) fn new(bytes: &'a [u8; INPUT_BYTES]) -> Self { Self { bytes } }
    pub fn dt_us(&self) -> u32 { self.u32(4) }
    pub fn dt_seconds(&self) -> f32 { self.dt_us() as f32 / 1_000_000.0 }
    pub fn elapsed_us(&self) -> u64 { self.u64(8) }
    pub fn frame_index(&self) -> u64 { self.u64(16) }
    pub fn phase(&self, period_us: u64) -> f32 {
        if period_us == 0 { 0.0 } else { (self.elapsed_us() % period_us) as f32 / period_us as f32 }
    }
    pub fn encoder_position(&self) -> i32 { self.i32(24) }
    pub fn encoder_delta(&self) -> i32 { self.i32(28) }
    pub fn button_held(&self) -> bool { self.bytes[32] & 1 != 0 }
    pub fn button_released(&self) -> bool { self.bytes[32] & 2 != 0 }
    pub fn audio(&self) -> Audio {
        Audio { bands: self.f32x6(36), transients: self.f32x6(60), sustain: self.f32x6(84), super_sustain: self.f32x6(108) }
    }
    fn u32(&self, offset: usize) -> u32 { u32::from_le_bytes(self.bytes[offset..offset + 4].try_into().unwrap()) }
    fn i32(&self, offset: usize) -> i32 { i32::from_le_bytes(self.bytes[offset..offset + 4].try_into().unwrap()) }
    fn u64(&self, offset: usize) -> u64 { u64::from_le_bytes(self.bytes[offset..offset + 8].try_into().unwrap()) }
    fn f32x6(&self, offset: usize) -> [f32; 6] {
        core::array::from_fn(|i| f32::from_le_bytes(self.bytes[offset + i * 4..offset + i * 4 + 4].try_into().unwrap()))
    }
}

#[link(wasm_import_module = "phyllo")]
unsafe extern "C" {
    #[link_name = "led_x"] fn host_led_x(index: i32) -> f32;
    #[link_name = "led_y"] fn host_led_y(index: i32) -> f32;
    #[link_name = "agc"] fn host_agc(channel: i32, energy: f32) -> f32;
    #[link_name = "rand"] fn host_rand() -> f32;
    #[link_name = "return_to_main"] fn host_return_to_main();
}

pub fn position(index: usize) -> Point {
    if index >= LED_COUNT { return Point::default(); }
    Point { x: unsafe { host_led_x(index as i32) }, y: unsafe { host_led_y(index as i32) } }
}
pub fn agc(channel: usize, energy: f32) -> f32 { if channel < 16 { unsafe { host_agc(channel as i32, energy) } } else { 0.0 } }
pub fn random() -> f32 { unsafe { host_rand() } }
pub fn return_to_main() { unsafe { host_return_to_main() } }
pub fn clamp01(value: f32) -> f32 { value.clamp(0.0, 1.0) }

pub fn hsv(hue: f32, saturation: f32, value: f32) -> Rgb {
    let h = (hue - libm::floorf(hue)) * 6.0;
    let i = h as i32;
    let f = h - i as f32;
    let p = value * (1.0 - saturation);
    let q = value * (1.0 - saturation * f);
    let t = value * (1.0 - saturation * (1.0 - f));
    let (r, g, b) = match i { 0 => (value,t,p), 1 => (q,value,p), 2 => (p,value,t), 3 => (p,q,value), 4 => (t,p,value), _ => (value,p,q) };
    Rgb::new((clamp01(r)*255.0) as u8, (clamp01(g)*255.0) as u8, (clamp01(b)*255.0) as u8)
}

