// bitaxe_model.js — BitAxe Ultra 204 procedural 3D model (v3 — ratio-based dimensions)
// Real dimensions: 86×52×14mm → Three.js (1u=10cm): 0.86 × 0.52 × 0.14
// Case is THIN (0.10 tall), not a fat block
// All geometry dimensions sourced from data/bitaxe_ratios.js

import * as THREE from 'three';
import { BITAXE_DIMS as D } from './data/bitaxe_ratios.js';

// ── Exported materials for animation ──────────────────────────────────────────
export const BITAXE_MATS = {
  oledScreen:  null,  // emissiveIntensity flicker
  ledActivity: null,  // orange blink
  ledWifi:     null,  // blue pulse
};

// ── OLED canvas texture cycling ───────────────────────────────────────────────
export let OLED_MESH = null;
export let OLED_PAGE = 0;

const OLED_PAGES = [
  ['Hashrate', '483 GH/s', 'Eff: 28.4 J/TH'],
  ['Temp: 57°C', 'Fan: 2980 RPM', 'Power: 13.7W'],
  ['Shares: 12', 'Best: 234.5K', 'Pool: OK'],
  ['Uptime: 2h14m', 'IP: 192.168.1.x', 'AxeOS v2.4'],
];

function buildOLEDTexture(page) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(page[0], 4, 14);
  ctx.font = '10px monospace';
  ctx.fillText(page[1], 4, 30);
  ctx.fillText(page[2], 4, 44);
  return new THREE.CanvasTexture(c);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function mat(color, roughness = 0.5, metalness = 0.0, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...opts });
}

function box(w, h, d, material, name) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.name = name;
  return mesh;
}

function cyl(rt, rb, h, seg, material, name) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  mesh.name = name;
  return mesh;
}

function sphere(r, material, name) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 12), material);
  mesh.name = name;
  return mesh;
}

// ── Case sub-group ─────────────────────────────────────────────────────────────
// Real case: 90mm wide × 10mm tall × 58mm deep — THIN slab
function buildCase() {
  const group = new THREE.Group();
  group.name = 'Case';

  // 3D-printed plastic — matte white/grey
  const caseMat = new THREE.MeshStandardMaterial({
    color: 0xdad6ce,
    roughness: 0.88,
    metalness: 0.0,
  });

  const body = box(D.case.w, D.case.h, D.case.d, caseMat, 'case_body');
  body.castShadow    = true;
  body.receiveShadow = true;
  group.add(body);

  // FDM layer lines — 8 very thin boxes spaced along Y
  const layerMat = new THREE.MeshStandardMaterial({
    color: 0xccc8c0,
    roughness: 0.90,
    metalness: 0.0,
  });
  for (let i = 0; i < 8; i++) {
    const line = box(0.90, 0.001, 0.58, layerMat, `layer_line_${i}`);
    line.position.y = -0.045 + i * 0.009;
    group.add(line);
  }

  // Fan opening frame — deeper bars for more pronounced front opening
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xbbb8b0,
    roughness: 0.85,
    metalness: 0.0,
  });
  // top bar
  const ftop = box(0.48, 0.018, 0.018, frameMat, 'fan_frame_top');
  ftop.position.set(0, 0.033, 0.284);
  group.add(ftop);
  // bottom bar
  const fbot = box(0.48, 0.018, 0.018, frameMat, 'fan_frame_bot');
  fbot.position.set(0, -0.033, 0.284);
  group.add(fbot);
  // left bar
  const flft = box(0.018, 0.08, 0.018, frameMat, 'fan_frame_lft');
  flft.position.set(-0.237, 0, 0.284);
  group.add(flft);
  // right bar
  const frgt = box(0.018, 0.08, 0.018, frameMat, 'fan_frame_rgt');
  frgt.position.set(0.237, 0, 0.284);
  group.add(frgt);
  // Dark inset — visible opening depth
  const openingMat = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.9, metalness: 0.0 });
  const opening = box(0.44, 0.062, 0.006, openingMat, 'fan_opening_inset');
  opening.position.set(0, 0, 0.293);
  group.add(opening);

  // Port cutouts — rear face (Z-) 3 small recessed slots
  const cutMat = new THREE.MeshStandardMaterial({
    color: 0x888880,
    roughness: 0.9,
    metalness: 0.0,
  });
  const portOffsets = [-0.12, -0.05, 0.05];
  portOffsets.forEach((z, i) => {
    const slot = box(0.022, 0.018, 0.005, cutMat, `port_cutout_${i}`);
    slot.position.set(-0.44, -0.01, z);
    group.add(slot);
  });

  // Branding "bitaxe"
  const brandMat = mat(0x333330, 0.7, 0.0);
  const brand = box(0.12, 0.003, 0.018, brandMat, 'case_branding');
  brand.position.set(0.10, 0.051, 0.10);
  group.add(brand);

  // Bevel corner cylinders — height matches case 0.10
  const bevelMat = mat(0xd0ccC4, 0.86, 0.0);
  const bevelCorners = [[-0.44, 0.28], [-0.44, -0.28], [0.44, 0.28], [0.44, -0.28]];
  bevelCorners.forEach(([x, z], i) => {
    const c = cyl(0.008, 0.008, 0.10, 8, bevelMat, `bevel_${i}`);
    c.position.set(x, 0, z);
    group.add(c);
  });

  // ── Heatsink cover hump — most recognizable BitAxe silhouette feature ──
  // The case rises over the ASIC/heatsink zone
  const hump = box(D.heatsink.baseW * 1.4, D.case.h * 0.6, D.heatsink.baseD * 1.4, caseMat, 'case_heatsink_hump');
  hump.position.set(D.asic.x, D.case.h * 0.55, D.asic.z);
  group.add(hump);

  // ── Side ribs — 3 vertical nervaduras on each lateral face ──
  const ribMat = new THREE.MeshStandardMaterial({ color: 0xc8c4bc, roughness: 0.85, metalness: 0.0 });
  for (let i = 0; i < 3; i++) {
    const rib = box(0.006, D.case.h * 0.85, D.case.d * 0.15, ribMat, `rib_left_${i}`);
    rib.position.set(-D.case.w / 2 - 0.003, 0, -D.case.d * 0.25 + i * D.case.d * 0.25);
    group.add(rib);
    const ribR = rib.clone();
    ribR.name = `rib_right_${i}`;
    ribR.position.x = D.case.w / 2 + 0.003;
    group.add(ribR);
  }

  // ── OLED window — small dark cutout on top where OLED peeks through ──
  const oledWindowMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.3, metalness: 0.5 });
  const oledWindow = box(D.oled.w * 1.05, D.case.h * 0.25, D.oled.d * 1.05, oledWindowMat, 'oled_window');
  oledWindow.position.set(D.oled.x, D.case.h * 0.38, D.oled.z);
  group.add(oledWindow);

  return group;
}

// ── PCB sub-group ─────────────────────────────────────────────────────────────
function buildPCB() {
  const group = new THREE.Group();
  group.name = 'PCB';

  // FR4 dark green — slightly metallic from copper layers
  const pcbMat = new THREE.MeshStandardMaterial({
    color: 0x1f4025,
    roughness: 0.48,
    metalness: 0.18,
  });
  const board = box(D.pcb.w, D.pcb.h, D.pcb.d, pcbMat, 'pcb_board');
  board.position.y = D.pcb.yOffset;
  board.castShadow    = true;
  board.receiveShadow = true;
  group.add(board);

  // Gold traces
  const traceMat = new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.25, metalness: 0.85 });
  const traces = [
    { w: 0.30, x: -0.10, z: 0.00 },
    { w: 0.20, x:  0.15, z: 0.06 },
    { w: 0.25, x:  0.00, z: -0.06 },
    { w: 0.18, x: -0.05, z: 0.12 },
  ];
  traces.forEach((t, i) => {
    const trace = box(t.w, 0.001, 0.003, traceMat, `pcb_trace_${i}`);
    trace.position.set(t.x, 0.013, t.z);
    group.add(trace);
  });

  // Silkscreen zone
  const silkMat = mat(0xffffff, 0.9, 0.0, { transparent: true, opacity: 0.6 });
  const silk = box(0.10, 0.0005, 0.07, silkMat, 'pcb_silkscreen');
  silk.position.set(0.25, 0.013, 0.12);
  group.add(silk);

  return group;
}

// ── ASIC Assembly ─────────────────────────────────────────────────────────────
// Sits at center of PCB, visible from above through top gap
function buildASIC() {
  const group = new THREE.Group();
  group.name = 'ASIC_Assembly';
  // ASIC center: rises above the case top, visible from above
  group.position.set(D.asic.x, D.asic.y, D.asic.z);

  const pkgMat = new THREE.MeshStandardMaterial({
    color: 0x080808,
    roughness: 0.04,
    metalness: 0.96,
    envMapIntensity: 1.5,
  });
  const pkg = box(D.asic.w, D.asic.h, D.asic.d, pkgMat, 'bm1366_package');
  group.add(pkg);

  const lidMat = mat(0x1a1a1a, 0.02, 0.98);
  const lid = box(0.12, 0.004, 0.12, lidMat, 'bm1366_lid');
  lid.position.y = 0.016;
  group.add(lid);

  // Thermal pad
  const tpadMat = mat(0x3a3a4a, 0.9, 0.0);
  const tpad = box(0.13, 0.003, 0.13, tpadMat, 'thermal_pad');
  tpad.position.y = 0.020;
  group.add(tpad);

  // Solder bumps
  const solderMat = mat(0xc0c0c0, 0.3, 0.8);
  for (let xi = 0; xi < 3; xi++) {
    for (let zi = 0; zi < 3; zi++) {
      const bump = sphere(0.004, solderMat, `bump_${xi}_${zi}`);
      bump.position.set(-0.04 + xi * 0.04, -0.018, -0.04 + zi * 0.04);
      group.add(bump);
    }
  }

  return group;
}

// ── Heatsink ──────────────────────────────────────────────────────────────────
// Above ASIC — aluminum brushed
function buildHeatsink() {
  const group = new THREE.Group();
  group.name = 'Heatsink';
  group.position.set(0, D.heatsink.y, 0);

  const hsMat = new THREE.MeshStandardMaterial({
    color: 0xa8a8b8,
    roughness: 0.22,
    metalness: 0.88,
  });

  const base = box(D.heatsink.baseW, D.heatsink.baseH, D.heatsink.baseD, hsMat, 'heatsink_base');
  base.castShadow = true;
  group.add(base);

  // Taller fins protruding above the hump — more visible
  const finH = D.heatsink.finH * 1.3;
  for (let i = 0; i < D.heatsink.finCount; i++) {
    const fin = box(D.heatsink.baseW, finH, 0.004, hsMat, `fin_${i}`);
    fin.castShadow = true;
    fin.position.set(
      0,
      D.heatsink.baseH / 2 + finH / 2,
      -D.heatsink.baseD / 2 + i * D.heatsink.finSpacing + D.heatsink.finSpacing / 2
    );
    group.add(fin);
  }

  // Corner mounting screws
  const screwMat = new THREE.MeshStandardMaterial({ color: 0x909098, roughness: 0.15, metalness: 0.92 });
  [[-0.06, -0.06], [-0.06, 0.06], [0.06, -0.06], [0.06, 0.06]].forEach(([x, z], i) => {
    const screw = cyl(0.004, 0.004, 0.012, 8, screwMat, `hs_screw_${i}`);
    screw.position.set(x, -0.012, z);
    group.add(screw);
  });

  return group;
}

// ── Fan Assembly ──────────────────────────────────────────────────────────────
// Positioned at Z+ front face of case
function buildFan() {
  const fanGroup = new THREE.Group();
  fanGroup.name = 'Fan_Assembly';
  fanGroup.position.set(0, 0, D.fan.zPos);  // front face of case

  const housingMat = new THREE.MeshStandardMaterial({
    color: 0xc8c4bc,
    roughness: 0.78,
    metalness: 0.0,
  });

  // Housing walls — square frame: top, bottom, left, right
  const hwTop = box(0.46, 0.010, 0.040, housingMat, 'fan_wall_top');
  hwTop.position.set(0, 0.04, 0);
  hwTop.castShadow = true;
  fanGroup.add(hwTop);

  const hwBot = box(0.46, 0.010, 0.040, housingMat, 'fan_wall_bot');
  hwBot.position.set(0, -0.04, 0);
  fanGroup.add(hwBot);

  const hwLft = box(0.010, 0.090, 0.040, housingMat, 'fan_wall_lft');
  hwLft.position.set(-0.225, 0, 0);
  fanGroup.add(hwLft);

  const hwRgt = box(0.010, 0.090, 0.040, housingMat, 'fan_wall_rgt');
  hwRgt.name = 'fan_housing';
  hwRgt.position.set(0.225, 0, 0);
  fanGroup.add(hwRgt);

  // Back plate (thin)
  const backPlateMat = new THREE.MeshStandardMaterial({ color: 0xb8b4ac, roughness: 0.82, metalness: 0.0 });
  const backPlate = box(0.44, 0.08, 0.005, backPlateMat, 'fan_back_plate');
  backPlate.position.set(0, 0, -0.020);
  fanGroup.add(backPlate);

  // Hub
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6, metalness: 0.3 });
  const hub = cyl(0.022, 0.022, 0.030, 16, hubMat, 'fan_blade_hub');
  hub.rotation.x = Math.PI / 2;
  fanGroup.add(hub);

  // Fan blade group — name MUST be 'fan_blades_group' for fan_animation.js
  const fanBladeGroup = new THREE.Group();
  fanBladeGroup.name = 'fan_blades_group';

  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0xc0bcb4,
    roughness: 0.72,
    metalness: 0.0,
  });

  for (let i = 0; i < 7; i++) {
    const blade = box(0.085, 0.016, 0.010, bladeMat, `fan_blade_${i}`);
    const angle = (i / 7) * Math.PI * 2;
    blade.position.set(Math.cos(angle) * 0.10, Math.sin(angle) * 0.10, 0);
    blade.rotation.z = angle;
    fanBladeGroup.add(blade);
  }
  fanBladeGroup.position.set(0, 0, 0);
  fanGroup.add(fanBladeGroup);

  // Guard ring
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.3 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.007, 8, 24), ringMat);
  ring.name = 'fan_guard_ring';
  ring.rotation.x = Math.PI / 2;
  ring.position.z = 0.015;
  fanGroup.add(ring);

  return fanGroup;
}

// ── OLED Module ───────────────────────────────────────────────────────────────
// SSD1306 0.91" physical display: 24mm × 13mm soldered on PCB
function buildOLED() {
  const group = new THREE.Group();
  group.name = 'OLED_Module';
  group.position.set(D.oled.x, D.oled.y, D.oled.z);

  // Bezel — real 24mm × 13mm footprint
  const bezelMat = mat(0x111111, 0.2, 0.5);
  const bezel = box(D.oled.w, D.oled.h, D.oled.d, bezelMat, 'oled_bezel');
  group.add(bezel);

  // Screen with canvas texture
  const initTex = buildOLEDTexture(OLED_PAGES[0]);
  const oledMat = new THREE.MeshStandardMaterial({
    map: initTex,
    emissiveMap: initTex,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.8,
    roughness: 0.05,
    metalness: 0.0,
  });
  BITAXE_MATS.oledScreen = oledMat;

  const screen = box(D.oled.screenW, D.oled.h * 0.5, D.oled.screenD, oledMat, 'oled_screen');
  screen.position.y = D.oled.h * 0.3;
  group.add(screen);
  OLED_MESH = screen;

  // Glass overlay
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xaaccff, transparent: true, opacity: 0.10,
    roughness: 0.0, metalness: 0.0,
  });
  const glass = box(D.oled.screenW + 0.002, D.oled.h * 0.3, D.oled.screenD + 0.002, glassMat, 'oled_glass');
  glass.position.y = D.oled.h * 0.4;
  group.add(glass);

  return group;
}

// ── Connectors ────────────────────────────────────────────────────────────────
// All on rear face (Z-)
function buildConnectors() {
  const group = new THREE.Group();
  group.name = 'Connectors';

  const connMat = new THREE.MeshStandardMaterial({ color: 0x282828, roughness: 0.3, metalness: 0.85 });
  const innerMat = mat(0x444444, 0.5, 0.6);

  // USB-C — position: left rear
  const usbcG = new THREE.Group();
  usbcG.name = 'usbc';
  const usbcHousing = box(0.018, 0.010, 0.008, connMat, 'usbc_housing');
  const usbcInner = box(0.014, 0.006, 0.004, innerMat, 'usbc_port_inner');
  usbcInner.position.z = 0.002;
  usbcG.add(usbcHousing, usbcInner);
  usbcG.position.set(-0.44, -0.01, -0.12);
  group.add(usbcG);

  // Barrel jack
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.9 });
  const barrel = cyl(0.006, 0.006, 0.016, 12, barrelMat, 'barrel_jack');
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(-0.44, -0.01, -0.05);
  group.add(barrel);

  // Ethernet
  const eth = box(0.022, 0.016, 0.012, connMat, 'ethernet_port');
  eth.position.set(-0.44, -0.01, 0.05);
  group.add(eth);

  return group;
}

// ── Screws ────────────────────────────────────────────────────────────────────
// 4 corner screws, head slightly above case top Y=0.051
function buildScrews() {
  const group = new THREE.Group();
  group.name = 'Screws';

  const screwMat = new THREE.MeshStandardMaterial({ color: 0x909098, roughness: 0.15, metalness: 0.92 });

  const xO = D.screws.xOffset;
  const zO = D.screws.zOffset;
  const corners = { NW: [-xO, zO], NE: [xO, zO], SW: [-xO, -zO], SE: [xO, -zO] };
  Object.entries(corners).forEach(([label, [x, z]]) => {
    const g = new THREE.Group();
    g.name = `screw_${label}`;
    const shaft = cyl(0.004, 0.004, 0.012, 8, screwMat, 'shaft');
    const head  = cyl(D.screws.headR, D.screws.headR, 0.003, 8, screwMat, 'head');
    head.position.y = 0.0075;
    g.add(shaft, head);
    g.position.set(x, D.screws.y, z);
    group.add(g);
  });

  return group;
}

// ── Status LEDs ───────────────────────────────────────────────────────────────
// Frontal-right edge
function buildLEDs() {
  const group = new THREE.Group();
  group.name = 'StatusLEDs';

  const ledDefs = [
    { name: 'led_power',    color: 0x22ff44, emissive: 0x22ff44, intensity: 2.5, matKey: null,          z: D.leds.zStart },
    { name: 'led_activity', color: 0xff6600, emissive: 0xff6600, intensity: 1.8, matKey: 'ledActivity',  z: D.leds.zStart - D.leds.zSpacing },
    { name: 'led_wifi',     color: 0x0066ff, emissive: 0x0066ff, intensity: 1.5, matKey: 'ledWifi',      z: D.leds.zStart - 2 * D.leds.zSpacing },
  ];

  ledDefs.forEach(def => {
    const ledMat = new THREE.MeshStandardMaterial({
      color: def.color,
      emissive: new THREE.Color(def.emissive),
      emissiveIntensity: def.intensity,
      roughness: 0.1,
      metalness: 0.0,
      transparent: true,
      opacity: 0.95,
    });
    if (def.matKey) BITAXE_MATS[def.matKey] = ledMat;

    const led = sphere(D.leds.r, ledMat, def.name);
    led.position.set(D.leds.x, D.leds.y, def.z);
    group.add(led);
  });

  return group;
}

// ── Hotspot Anchors ───────────────────────────────────────────────────────────
function buildAnchors() {
  const group = new THREE.Group();
  group.name = 'HotspotAnchors';

  const anchors = [
    { name: 'anchor_asic',  pos: [0,     0.08,  0.00] },
    { name: 'anchor_fan',   pos: [0,     0.00,  0.27] },
    { name: 'anchor_power', pos: [-0.44, 0.00, -0.05] },
    { name: 'anchor_oled',  pos: [0.28,  0.04,  0.25] },
    { name: 'anchor_board', pos: [0,     0.01,  0.00] },
  ];

  anchors.forEach(a => {
    const obj = new THREE.Object3D();
    obj.name = a.name;
    obj.position.set(...a.pos);
    obj.userData.isAnchor = true;
    group.add(obj);
  });

  return group;
}

// ── Main builder ──────────────────────────────────────────────────────────────
export function buildBitAxePlaceholder(scene) {
  const group = new THREE.Group();
  group.name = 'BitAxeGroup';
  group.userData.isBitAxe = true;

  group.add(buildCase());
  group.add(buildPCB());
  group.add(buildASIC());
  group.add(buildHeatsink());
  group.add(buildFan());
  group.add(buildOLED());
  group.add(buildConnectors());
  group.add(buildScrews());
  group.add(buildLEDs());
  group.add(buildAnchors());

  // Position: sitting on the tabletop/pedestal
  group.position.set(0, -0.46, 0);

  scene.add(group);
  return group;
}

// ── Animation update ──────────────────────────────────────────────────────────
export function updateBitAxe(group, clock, isIdleRotating) {
  if (isIdleRotating) {
    group.rotation.y = Math.sin(clock.getElapsedTime() * 0.4) * 0.3;
  }

  if (BITAXE_MATS.ledActivity) {
    BITAXE_MATS.ledActivity.emissiveIntensity =
      1.0 + 1.5 * Math.abs(Math.sin(clock.getElapsedTime() * 3.0));
  }

  if (BITAXE_MATS.ledWifi) {
    BITAXE_MATS.ledWifi.emissiveIntensity =
      0.8 + 0.8 * Math.abs(Math.sin(clock.getElapsedTime() * 1.2));
  }

  if (BITAXE_MATS.oledScreen) {
    // Subtle flicker
    BITAXE_MATS.oledScreen.emissiveIntensity =
      0.8 + 0.05 * Math.sin(clock.getElapsedTime() * 7.0);

    // Page cycling every 3 seconds
    const pageInterval = 3.0;
    const page = Math.floor(clock.getElapsedTime() / pageInterval) % OLED_PAGES.length;
    if (page !== OLED_PAGE) {
      OLED_PAGE = page;
      if (OLED_MESH) {
        const newTex = buildOLEDTexture(OLED_PAGES[page]);
        OLED_MESH.material.map = newTex;
        OLED_MESH.material.emissiveMap = newTex;
        OLED_MESH.material.map.needsUpdate = true;
        OLED_MESH.material.needsUpdate = true;
      }
    }
  }
}
