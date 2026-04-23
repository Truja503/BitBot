// bitaxe_ratios.js — Ratio-based dimensions for BitAxe Ultra 204
// All dimensions relative to BASE = 0.86 (PCB width = 86mm)
// Edit these constants to adjust proportions without touching geometry code

export const B = 0.86; // base unit = PCB width

export const BITAXE_DIMS = {
  // Case outer dimensions
  case: {
    w: B * 1.047,     // 90mm — slightly wider than PCB
    h: B * 0.116,     // 10mm — THIN slab
    d: B * 0.674,     // 58mm depth
  },

  // PCB inner board
  pcb: {
    w: B,             // 86mm
    h: B * 0.029,     // 2.5mm
    d: B * 0.558,     // 48mm
    yOffset: -B * 0.023,  // sits near bottom of case
  },

  // ASIC BM1366
  asic: {
    w: B * 0.163,     // 14mm
    h: B * 0.033,     // 2.8mm package height
    d: B * 0.163,     // 14mm (square)
    x: 0,            // centered on PCB X
    y: B * 0.031,    // above PCB
    z: 0,            // centered on PCB Z (approximately)
  },

  // Heatsink
  heatsink: {
    baseW: B * 0.163, // same as ASIC footprint
    baseH: B * 0.017, // 1.5mm
    baseD: B * 0.163,
    finH:  B * 0.081, // 7mm fins
    finCount: 7,
    finSpacing: B * 0.016,
    y: B * 0.064,    // above ASIC
  },

  // Fan (front face, square)
  fan: {
    size:  B * 0.535, // 46mm square
    depth: B * 0.058, // 5mm depth
    hubR:  B * 0.035, // 3mm hub radius
    bladeCount: 7,
    bladeL: B * 0.099, // blade length
    zPos:  B * 0.314,  // at the front face of case
  },

  // OLED — SSD1306 0.91" physical display (24mm × 13mm)
  oled: {
    w:  B * 0.279,   // 24mm — SSD1306 0.91" module width
    h:  B * 0.009,   // bezel height (thin)
    d:  B * 0.151,   // 13mm module depth
    screenW: B * 0.256,  // screen area slightly smaller
    screenD: B * 0.128,
    x:  B * 0.279,   // right side of board
    y:  B * 0.047,   // just above PCB surface
    z:  B * 0.151,   // near front of device
  },

  // Connectors (back face, Z-)
  connectors: {
    usbcX:   -B * 0.500,
    barrelX: -B * 0.500,
    ethX:    -B * 0.500,
    usbcZ:    B * 0.116,
    barrelZ:  0,
    ethZ:    -B * 0.174,
    y:       -B * 0.023,
  },

  // Screws (4 corners of case top)
  screws: {
    xOffset: B * 0.512,  // from center X
    zOffset: B * 0.314,  // from center Z
    headR:   B * 0.008,
    y:       B * 0.058,  // top of case
  },

  // LEDs (front-right)
  leds: {
    x:  B * 0.442,
    y:  B * 0.047,
    zSpacing: B * 0.023,
    zStart:   B * 0.233,
    r:  B * 0.006,
  },
};
