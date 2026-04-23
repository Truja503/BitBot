// inspection_mode.js — Debug inspection panel and orthographic views

import * as THREE from 'three';
import { OrthographicCamera } from 'three';

export class InspectionMode {
  constructor(renderer, scene, mainCamera, controls) {
    this._renderer    = renderer;
    this._scene       = scene;
    this._mainCamera  = mainCamera;
    this._controls    = controls;
    this._active      = false;
    this._wireframe   = false;
    this._bboxes      = false;
    this._hotspots    = true;
    this._viewMode    = 'perspective'; // 'perspective' | 'top' | 'front' | 'side' | 'quad'
    this._bboxHelpers = [];

    // Orthographic cameras
    const aspect = window.innerWidth / window.innerHeight;
    const orthoSize = 1.2;
    this._orthoTop   = new OrthographicCamera(-orthoSize * aspect, orthoSize * aspect, orthoSize, -orthoSize, 0.01, 50);
    this._orthoFront = new OrthographicCamera(-orthoSize * aspect, orthoSize * aspect, orthoSize, -orthoSize, 0.01, 50);
    this._orthoSide  = new OrthographicCamera(-orthoSize * aspect, orthoSize * aspect, orthoSize, -orthoSize, 0.01, 50);

    // Top: looking down Y
    this._orthoTop.position.set(0, 3, 0);
    this._orthoTop.lookAt(0, -0.43, 0);

    // Front: looking from +Z
    this._orthoFront.position.set(0, -0.43, 3);
    this._orthoFront.lookAt(0, -0.43, 0);

    // Side: looking from +X
    this._orthoSide.position.set(3, -0.43, 0);
    this._orthoSide.lookAt(0, -0.43, 0);

    this._buildPanel();
  }

  _buildPanel() {
    const el = document.createElement('div');
    el.id = 'inspection-panel';
    el.style.cssText = `
      position: fixed; top: 4.5rem; right: 1rem; z-index: 450;
      background: rgba(8,6,20,0.92); border: 1px solid rgba(110,91,255,0.3);
      border-radius: 12px; padding: 0.75rem; display: none;
      font-family: 'Fragment Mono', monospace; font-size: 0.7rem; color: #a0a0c0;
      min-width: 180px; backdrop-filter: blur(16px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    `;
    el.innerHTML = `
      <div style="color:#6E5BFF;font-weight:700;font-size:0.68rem;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.6rem">
        🔬 Inspection
      </div>
      <div style="display:flex;flex-direction:column;gap:0.35rem">
        <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer">
          <input type="checkbox" id="chkWireframe"> Wireframe
        </label>
        <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer">
          <input type="checkbox" id="chkBBox"> Bounding Boxes
        </label>
        <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer">
          <input type="checkbox" id="chkHotspots" checked> Hotspots
        </label>
      </div>
      <div style="margin-top:0.7rem;color:#6E5BFF;font-weight:700;font-size:0.68rem;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.4rem">
        📐 Camera View
      </div>
      <div style="display:flex;flex-direction:column;gap:0.25rem">
        <button class="iv-btn active" data-view="perspective">Perspective</button>
        <button class="iv-btn" data-view="top">Top (Y↓)</button>
        <button class="iv-btn" data-view="front">Front (Z+)</button>
        <button class="iv-btn" data-view="side">Side (X+)</button>
        <button class="iv-btn" data-view="quad">Quad Split</button>
      </div>
      <div style="margin-top:0.7rem;border-top:1px solid rgba(110,91,255,0.15);padding-top:0.5rem">
        <div style="font-size:0.62rem;color:#4d4a68">
          Scroll: zoom · Drag: orbit<br>
          R: reset camera · W: wireframe
        </div>
      </div>
    `;

    // Button styles
    const style = document.createElement('style');
    style.textContent = `
      .iv-btn {
        background: rgba(110,91,255,0.1); border: 1px solid rgba(110,91,255,0.2);
        color: #a0a0c0; border-radius: 6px; padding: 0.28rem 0.5rem;
        font-family: 'Fragment Mono', monospace; font-size: 0.68rem;
        cursor: pointer; text-align: left; transition: all 0.15s;
      }
      .iv-btn:hover { background: rgba(110,91,255,0.2); color: #f0eeff; }
      .iv-btn.active { background: rgba(110,91,255,0.3); border-color: #6E5BFF; color: #f0eeff; }
      #quad-overlay {
        position: fixed; inset: 0; z-index: 200; pointer-events: none;
        display: none;
      }
      #quad-overlay.active { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
      .quad-label {
        position: absolute; top: 4px; left: 6px;
        font-family: 'Fragment Mono', monospace; font-size: 0.6rem; color: rgba(110,91,255,0.6);
      }
      .quad-border { border: 1px solid rgba(110,91,255,0.12); position: relative; }
    `;
    document.head.appendChild(style);
    document.body.appendChild(el);
    this._panel = el;

    // Quad overlay (labels only — actual rendering done in render loop)
    const quad = document.createElement('div');
    quad.id = 'quad-overlay';
    quad.innerHTML = `
      <div class="quad-border"><div class="quad-label">TOP (Y↓)</div></div>
      <div class="quad-border"><div class="quad-label">FRONT (Z+)</div></div>
      <div class="quad-border"><div class="quad-label">SIDE (X+)</div></div>
      <div class="quad-border"><div class="quad-label">PERSPECTIVE</div></div>
    `;
    document.body.appendChild(quad);
    this._quadOverlay = quad;

    // Wire events
    el.querySelector('#chkWireframe').addEventListener('change', e => this.setWireframe(e.target.checked));
    el.querySelector('#chkBBox').addEventListener('change', e => this.setBBoxes(e.target.checked));
    el.querySelector('#chkHotspots').addEventListener('change', e => {
      window.dispatchEvent(new CustomEvent('inspection:hotspots', { detail: { visible: e.target.checked } }));
    });

    el.querySelectorAll('.iv-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.iv-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setView(btn.dataset.view);
      });
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', e => {
      if (!this._active) return;
      if (e.key === 'w' || e.key === 'W') {
        const chk = document.getElementById('chkWireframe');
        chk.checked = !chk.checked;
        this.setWireframe(chk.checked);
      }
      if (e.key === 'r' || e.key === 'R') {
        this.setView('perspective');
        el.querySelectorAll('.iv-btn').forEach(b => b.classList.remove('active'));
        el.querySelector('[data-view="perspective"]').classList.add('active');
      }
    });
  }

  toggle() {
    this._active = !this._active;
    this._panel.style.display = this._active ? 'block' : 'none';
    if (!this._active) {
      this.setWireframe(false);
      this.setBBoxes(false);
      this.setView('perspective');
    }
  }

  show() { this._active = true; this._panel.style.display = 'block'; }
  hide() { this._active = false; this._panel.style.display = 'none'; }

  setWireframe(on) {
    this._wireframe = on;
    this._scene.traverse(obj => {
      if (obj.isMesh && obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.wireframe = on);
        } else {
          obj.material.wireframe = on;
        }
      }
    });
  }

  setBBoxes(on) {
    this._bboxes = on;
    // Remove existing
    this._bboxHelpers.forEach(h => this._scene.remove(h));
    this._bboxHelpers = [];
    if (!on) return;

    const targets = ['BitAxeGroup', 'Case', 'PCB', 'ASIC_Assembly', 'Heatsink', 'Fan_Assembly', 'OLED_Module'];
    this._scene.traverse(obj => {
      if (targets.includes(obj.name)) {
        const helper = new THREE.BoxHelper(obj, 0x6E5BFF);
        this._scene.add(helper);
        this._bboxHelpers.push(helper);
      }
    });
  }

  setView(view) {
    this._viewMode = view;
    this._controls.enabled = (view === 'perspective');
    this._quadOverlay.classList.toggle('active', view === 'quad');
  }

  // Call this in the render loop instead of renderer.render(scene, camera)
  render(mainCamera) {
    const r = this._renderer;
    const s = this._scene;

    if (this._viewMode === 'quad') {
      const w = r.domElement.clientWidth;
      const h = r.domElement.clientHeight;
      const hw = Math.floor(w / 2);
      const hh = Math.floor(h / 2);

      r.setScissorTest(true);

      // Top-left: top view
      r.setViewport(0, hh, hw, hh);
      r.setScissor(0, hh, hw, hh);
      r.render(s, this._orthoTop);

      // Top-right: front view
      r.setViewport(hw, hh, hw, hh);
      r.setScissor(hw, hh, hw, hh);
      r.render(s, this._orthoFront);

      // Bottom-left: side view
      r.setViewport(0, 0, hw, hh);
      r.setScissor(0, 0, hw, hh);
      r.render(s, this._orthoSide);

      // Bottom-right: perspective
      r.setViewport(hw, 0, hw, hh);
      r.setScissor(hw, 0, hw, hh);
      r.render(s, mainCamera);

      r.setScissorTest(false);
      r.setViewport(0, 0, w, h);
      r.setScissor(0, 0, w, h);

    } else if (this._viewMode === 'top') {
      r.render(s, this._orthoTop);
    } else if (this._viewMode === 'front') {
      r.render(s, this._orthoFront);
    } else if (this._viewMode === 'side') {
      r.render(s, this._orthoSide);
    } else {
      r.render(s, mainCamera);
    }
  }

  isActive() { return this._active; }
  getViewMode() { return this._viewMode; }
}
