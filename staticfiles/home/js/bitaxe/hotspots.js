// hotspots.js — Hotspot system with labels for BitAxe

import * as THREE from 'three';

const HOTSPOTS = [
  { id: 'asic',     label: 'BM1366 ASIC',  position: [0,     -0.375, -0.48], color: '#f97316' },
  { id: 'heatsink', label: 'Heatsink',      position: [0,     -0.31,  -0.48], color: '#3b82f6' },
  { id: 'usbc',     label: 'USB-C Power',   position: [-0.46, -0.45,  -0.33], color: '#22c55e' },
  { id: 'oled',     label: 'OLED Display',  position: [0.30,  -0.37,  -0.25], color: '#a855f7' },
  { id: 'fan',      label: 'Cooling Fan',   position: [0,     -0.41,  -0.65], color: '#6366f1' },
];

function makeLabel(text, color) {
  const canvas  = document.createElement('canvas');
  canvas.width  = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = 'rgba(10,9,17,0.82)';
  ctx.beginPath();
  ctx.roundRect(4, 4, 248, 56, 12);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(4, 4, 248, 56, 12);
  ctx.stroke();

  ctx.fillStyle = '#F3EFFA';
  ctx.font = 'bold 22px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const mat     = new THREE.SpriteMaterial({
    map:         texture,
    transparent: true,
    depthTest:   false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.28, 0.07, 1);
  return sprite;
}

export class HotspotManager {
  constructor(scene) {
    this._scene    = scene;
    this._hotspots = [];
    this._visible  = false;

    HOTSPOTS.forEach(def => {
      const threeColor = new THREE.Color(def.color);

      // Sphere
      const geo = new THREE.SphereGeometry(0.012, 12, 12);
      const mat = new THREE.MeshStandardMaterial({
        color:             threeColor,
        emissive:          threeColor,
        emissiveIntensity: 1.0,
        roughness:         0.0,
        metalness:         0.0,
        transparent:       true,
        opacity:           0.9,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...def.position);
      mesh.userData.hotspotId    = def.id;
      mesh.userData.interactive  = true;
      scene.add(mesh);

      // Label sprite
      const label = makeLabel(def.label, def.color);
      label.position.set(def.position[0], def.position[1] + 0.08, def.position[2]);
      label.visible = false;
      scene.add(label);

      this._hotspots.push({ def, mesh, mat, label, hovered: false, baseScale: 1 });
    });
  }

  show() {
    this._visible = true;
    this._hotspots.forEach(h => { h.mesh.visible = true; });
  }

  hide() {
    this._visible = false;
    this._hotspots.forEach(h => {
      h.mesh.visible  = false;
      h.label.visible = false;
    });
  }

  getObjects() {
    return this._hotspots.map(h => h.mesh);
  }

  onHover(obj) {
    const h = this._hotspots.find(x => x.mesh === obj);
    if (!h || h.hovered) return;
    h.hovered = true;
    h.label.visible = true;
    h.mesh.scale.setScalar(1.2);
    h.mat.emissiveIntensity = 2.0;
  }

  onBlur(obj) {
    const h = this._hotspots.find(x => x.mesh === obj);
    if (!h || !h.hovered) return;
    h.hovered = false;
    h.label.visible = false;
    h.mesh.scale.setScalar(1.0);
    h.mat.emissiveIntensity = 1.0;
  }

  highlightHotspot(id) {
    this._hotspots.forEach(h => {
      const isTarget = h.def.id === id;
      h.mat.emissiveIntensity = isTarget ? 3.0 : 0.3;
      h.label.visible = isTarget;
      h.mesh.scale.setScalar(isTarget ? 1.5 : 0.8);
    });
    this.show();
  }

  clearHighlight() {
    this._hotspots.forEach(h => {
      h.mat.emissiveIntensity = 1.0;
      h.label.visible = false;
      h.mesh.scale.setScalar(1.0);
    });
  }

  onClick(obj) {
    const h = this._hotspots.find(x => x.mesh === obj);
    if (!h) return;
    window.dispatchEvent(new CustomEvent('hotspot:select', { detail: { id: h.def.id, label: h.def.label } }));
  }

  update(clock) {
    if (!this._visible) return;
    const t = clock.getElapsedTime();
    this._hotspots.forEach((h, i) => {
      // Pulse emissive
      const pulse = 0.8 + 0.5 * Math.sin(t * 2.5 + i * 1.2);
      h.mat.emissiveIntensity = h.hovered ? 2.0 : pulse;
    });
  }
}
