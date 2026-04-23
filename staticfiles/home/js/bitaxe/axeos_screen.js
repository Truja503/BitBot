// axeos_screen.js — Virtual onboarding screen for BitAxe experience
import * as THREE from 'three';
import { METRICS } from './data/metrics_data.js';

const SCREEN = {
  W: 512, H: 384,
  physW: 0.72, physH: 0.54,
  x: 1.05, y: -0.18, z: -0.10,
  rotY: -0.30,
};

const STEPS = [
  {
    id: 'intro',
    title: 'BitAxe Ultra 204',
    sub: 'Open-source Bitcoin ASIC Miner',
    body: 'The BitAxe is the world\'s first\nopen-source single-ASIC Bitcoin\nminer. Uses BM1366 from Antminer\nS19 XP. ~400-500 GH/s at 5-15W.',
  },
  {
    id: 'identify',
    title: 'Identify the Hardware',
    sub: 'What you see on the device',
    body: 'Front: fan opening + OLED display\nTop: heatsink fins + ASIC below\nSide: barrel jack (5V power)\nBack: USB debug + ethernet (opt)',
  },
  {
    id: 'first_boot',
    title: 'First Boot',
    sub: 'Power on via barrel jack 5V/4A',
    body: 'Plug in the 5.5×2.5mm barrel\njack. Blue LED lights up. Device\ncreates a Wi-Fi hotspot named\n"Bitaxe_XXXX" (no password).',
  },
  {
    id: 'connect_wifi',
    title: 'Connect to Hotspot',
    sub: 'Join Bitaxe_XXXX network',
    body: 'On your phone or laptop,\ngo to Wi-Fi settings and join\n"Bitaxe_XXXX". No password.\nYou\'ll see a captive portal.',
  },
  {
    id: 'open_portal',
    title: 'Open AxeOS',
    sub: 'Navigate to 192.168.4.1',
    body: 'Open a browser and go to:\nhttp://192.168.4.1\n\nYou\'ll see the AxeOS dashboard\nwith live stats and menu.',
  },
  {
    id: 'configure_wifi',
    title: 'Wi-Fi Settings',
    sub: 'Connect BitAxe to your network',
    body: 'Tap ☰ → Settings → Wi-Fi\nEnter your home network SSID\nand password. This lets the\nBitAxe reach the mining pool.',
    hasForm: 'wifi',
  },
  {
    id: 'configure_pool',
    title: 'Pool Configuration',
    sub: 'Connect to a mining pool',
    body: 'Enter your pool stratum URL,\nport, worker name and password.\nUse your Bitcoin address as\nthe worker username.',
    hasForm: 'pool',
  },
  {
    id: 'pool_parsing',
    title: 'Parsing Pool URLs',
    sub: 'Understanding stratum strings',
    body: 'stratum+tcp://eu.stratum.braiins.com:3333\n→ Host: eu.stratum.braiins.com\n→ Port: 3333\nWorker: bc1q...address.worker1',
  },
  {
    id: 'save_restart',
    title: 'Save & Restart',
    sub: 'Apply configuration',
    body: 'Click Save. BitAxe restarts\nin ~10s, connects to Wi-Fi,\nthen establishes pool stratum\nconnection. OLED shows status.',
  },
  {
    id: 'read_oled',
    title: 'Reading the OLED',
    sub: 'Onboard display cycles stats',
    body: 'The small OLED on the device\ncycles every 3 seconds:\n• Hashrate + Efficiency\n• Temp + Fan RPM\n• Shares + Best Diff\n• Uptime + Pool status',
  },
  {
    id: 'dashboard',
    title: null,
    sub: null,
    body: null,
    isDashboard: true,
  },
];

export class AxeOSScreen {
  constructor(scene) {
    this._scene      = scene;
    this._stepIndex  = 0;
    this._canvas     = document.createElement('canvas');
    this._canvas.width  = SCREEN.W;
    this._canvas.height = SCREEN.H;
    this._ctx        = this._canvas.getContext('2d');
    this._tex        = new THREE.CanvasTexture(this._canvas);
    this._metrics    = {};
    this._chartData  = Array.from({ length: 30 }, () => 400 + Math.random() * 100);
    this._time       = 0;

    METRICS.forEach(m => { this._metrics[m.id] = m.sim(); });

    this._build3DScreen(scene);
    this._buildNavDOM();
    this._draw();
  }

  _build3DScreen(scene) {
    // Bezel
    const bezelMat = new THREE.MeshStandardMaterial({ color: 0x0c0a18, roughness: 0.45, metalness: 0.65 });
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(SCREEN.physW + 0.04, SCREEN.physH + 0.04, 0.022), bezelMat);
    bezel.position.set(SCREEN.x, SCREEN.y, SCREEN.z);
    bezel.rotation.y = SCREEN.rotY;
    bezel.castShadow = true;
    scene.add(bezel);

    // Screen plane
    this._screenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(SCREEN.physW, SCREEN.physH),
      new THREE.MeshBasicMaterial({ map: this._tex })
    );
    this._screenMesh.position.set(SCREEN.x, SCREEN.y, SCREEN.z + 0.012);
    this._screenMesh.rotation.y = SCREEN.rotY;
    this._screenMesh.userData.isAxeOSScreen = true;
    scene.add(this._screenMesh);

    // Stand pole
    const standMat = new THREE.MeshStandardMaterial({ color: 0x09080f, roughness: 0.5, metalness: 0.8 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.28, 8), standMat);
    pole.position.set(SCREEN.x, SCREEN.y - SCREEN.physH / 2 - 0.14, SCREEN.z);
    scene.add(pole);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.014, 16), standMat);
    base.position.set(SCREEN.x, SCREEN.y - SCREEN.physH / 2 - 0.28, SCREEN.z);
    scene.add(base);

    // Subtle screen glow
    this._glow = new THREE.PointLight(0x4466ff, 0.25, 0.9);
    this._glow.position.set(SCREEN.x, SCREEN.y, SCREEN.z + 0.12);
    scene.add(this._glow);
  }

  _buildNavDOM() {
    const nav = document.createElement('div');
    nav.id = 'axeos-nav';
    nav.style.cssText = `
      position: fixed; bottom: 5.5rem; right: 1rem; z-index: 420;
      display: flex; flex-direction: column; gap: 0.3rem; align-items: flex-end;
    `;
    nav.innerHTML = `
      <div id="axeos-step-label" style="font-family:'Fragment Mono',monospace;font-size:0.65rem;color:#6E5BFF;margin-bottom:0.1rem">
        Step 1 / ${STEPS.length}
      </div>
      <div style="display:flex;gap:0.4rem">
        <button id="axeos-prev" class="axeos-nav-btn">← Prev</button>
        <button id="axeos-next" class="axeos-nav-btn">Next →</button>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .axeos-nav-btn {
        background: rgba(10,9,17,0.90); border: 1px solid rgba(110,91,255,0.3);
        color: #a0a0c0; border-radius: 8px; padding: 0.35rem 0.8rem;
        font-family: 'Fragment Mono',monospace; font-size: 0.7rem;
        cursor: pointer; transition: all 0.15s;
      }
      .axeos-nav-btn:hover:not(:disabled) { background: rgba(110,91,255,0.22); color: #f0eeff; border-color:#6E5BFF; }
      .axeos-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
      #axeos-next.final { background: linear-gradient(135deg,#7c3aed,#6366f1); border-color:transparent; color:#fff; }
    `;
    document.head.appendChild(style);
    document.body.appendChild(nav);

    document.getElementById('axeos-prev').addEventListener('click', () => this.prev());
    document.getElementById('axeos-next').addEventListener('click', () => this.next());

    window.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') this.next();
      if (e.key === 'ArrowLeft')  this.prev();
    });

    this._updateNavDOM();
  }

  _updateNavDOM() {
    const label = document.getElementById('axeos-step-label');
    const prev  = document.getElementById('axeos-prev');
    const next  = document.getElementById('axeos-next');
    if (!label || !prev || !next) return;

    label.textContent = `Step ${this._stepIndex + 1} / ${STEPS.length}`;
    prev.disabled = this._stepIndex === 0;
    const isLast = this._stepIndex === STEPS.length - 1;
    next.textContent = isLast ? 'Finish ✓' : 'Next →';
    next.classList.toggle('final', isLast);
  }

  next() {
    if (this._stepIndex < STEPS.length - 1) {
      this._stepIndex++;
      this._draw();
      this._updateNavDOM();
      window.dispatchEvent(new CustomEvent('axeos:step', {
        detail: { index: this._stepIndex, step: STEPS[this._stepIndex] }
      }));
    }
  }

  prev() {
    if (this._stepIndex > 0) {
      this._stepIndex--;
      this._draw();
      this._updateNavDOM();
    }
  }

  goTo(id) {
    const idx = STEPS.findIndex(s => s.id === id);
    if (idx !== -1) { this._stepIndex = idx; this._draw(); this._updateNavDOM(); }
  }

  _draw() {
    const step = STEPS[this._stepIndex];
    const ctx  = this._ctx;
    const W = SCREEN.W, H = SCREEN.H;

    ctx.fillStyle = '#080714';
    ctx.fillRect(0, 0, W, H);

    if (step.isDashboard) {
      this._drawDashboard(ctx, W, H);
    } else {
      this._drawTutorialStep(ctx, W, H, step);
    }

    this._tex.needsUpdate = true;
  }

  _drawTutorialStep(ctx, W, H, step) {
    // ── Header ──
    ctx.fillStyle = '#0d0b1e';
    ctx.fillRect(0, 0, W, 38);
    ctx.fillStyle = '#6E5BFF';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('⬡ AxeOS', 12, 24);

    // Progress bar
    const pct = this._stepIndex / (STEPS.length - 1);
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(90, 16, W - 100, 6);
    ctx.fillStyle = '#6E5BFF';
    ctx.fillRect(90, 16, (W - 100) * pct, 6);

    // Step counter
    ctx.fillStyle = '#4a4870';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${this._stepIndex + 1}/${STEPS.length}`, W - 8, 24);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#1a1830';
    ctx.fillRect(0, 38, W, 1);

    // ── Subtitle ──
    ctx.fillStyle = '#6E5BFF';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(step.sub.toUpperCase(), 16, 60);

    // ── Title ──
    ctx.fillStyle = '#f0eeff';
    ctx.font = 'bold 22px system-ui';
    ctx.fillText(step.title, 16, 88);

    // Separator
    ctx.fillStyle = '#f97316';
    ctx.fillRect(16, 96, 40, 2);

    // ── Body text ──
    if (step.body) {
      ctx.fillStyle = '#9898b8';
      ctx.font = '13px monospace';
      const lines = step.body.split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, 16, 122 + i * 22);
      });
    }

    // ── Extra forms ──
    if (step.hasForm === 'wifi') {
      this._drawWifiForm(ctx, W, 230);
    } else if (step.hasForm === 'pool') {
      this._drawPoolForm(ctx, W, 220);
    }

    if (step.id === 'pool_parsing') {
      this._drawPoolParsing(ctx, W, 240);
    }

    if (step.id === 'read_oled') {
      this._drawOLEDExplanation(ctx, W, 250);
    }

    // ── Bottom hint ──
    ctx.fillStyle = '#2a2848';
    ctx.fillRect(0, H - 30, W, 30);
    ctx.fillStyle = '#3a3860';
    ctx.font = '10px monospace';
    ctx.fillText('← → arrow keys or Prev/Next buttons to navigate', 16, H - 11);
  }

  _drawWifiForm(ctx, W, startY) {
    const fields = [
      { label: 'Wi-Fi SSID',     val: 'YourNetwork' },
      { label: 'Wi-Fi Password', val: '••••••••••' },
    ];
    fields.forEach((f, i) => {
      const y = startY + i * 46;
      ctx.fillStyle = '#0d0b1e';
      ctx.strokeStyle = '#2a2848';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(14, y, W - 28, 38, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#4a4870';
      ctx.font = '9px monospace';
      ctx.fillText(f.label.toUpperCase(), 22, y + 14);
      ctx.fillStyle = '#c8c4e0';
      ctx.font = '13px monospace';
      ctx.fillText(f.val, 22, y + 30);
    });
  }

  _drawPoolForm(ctx, W, startY) {
    const fields = [
      { label: 'Stratum URL', val: 'eu.stratum.braiins.com' },
      { label: 'Port',        val: '3333' },
      { label: 'Worker',      val: 'bc1q...wallet.worker1' },
      { label: 'Frequency',   val: '490 MHz' },
    ];
    fields.forEach((f, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const fw = (W - 32) / 2;
      const x  = 14 + col * (fw + 4);
      const y  = startY + row * 46;
      ctx.fillStyle = '#0d0b1e';
      ctx.strokeStyle = '#2a2848';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, fw, 38, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#4a4870';
      ctx.font = '9px monospace';
      ctx.fillText(f.label.toUpperCase(), x + 8, y + 14);
      ctx.fillStyle = '#c8c4e0';
      ctx.font = '12px monospace';
      ctx.fillText(f.val, x + 8, y + 30);
    });
  }

  _drawPoolParsing(ctx, W, startY) {
    ctx.fillStyle = '#0d0b1e';
    ctx.strokeStyle = '#2a2848';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(14, startY, W - 28, 90, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#9898b8';
    ctx.font = '11px monospace';
    ctx.fillText('stratum+tcp://eu.stratum.braiins.com:3333', 22, startY + 20);

    ctx.fillStyle = '#2a2848';
    ctx.fillRect(14, startY + 28, W - 28, 1);

    ctx.fillStyle = '#22c55e';
    ctx.font = '11px monospace';
    ctx.fillText('→ Host:  eu.stratum.braiins.com', 22, startY + 48);
    ctx.fillStyle = '#f97316';
    ctx.fillText('→ Port:  3333', 22, startY + 68);
  }

  _drawOLEDExplanation(ctx, W, startY) {
    // Mini OLED mockup
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#555566';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(14, startY, 140, 78, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('Hashrate: 483 GH/s', 20, startY + 18);
    ctx.fillText('Eff: 28.4 J/TH', 20, startY + 32);
    ctx.fillStyle = '#888888';
    ctx.font = '8px monospace';
    ctx.fillText('(page 1/4 — cycles q3s)', 20, startY + 50);
    ctx.fillText('Temp: 57°C  Fan: 2980', 20, startY + 64);

    // Labels beside
    ctx.fillStyle = '#6E5BFF';
    ctx.font = '10px monospace';
    ctx.fillText('SSD1306 0.91"', 164, startY + 20);
    ctx.fillStyle = '#4a4870';
    ctx.font = '10px monospace';
    ctx.fillText('128×64 mono OLED', 164, startY + 36);
    ctx.fillText('4 rotating pages', 164, startY + 52);
    ctx.fillText('Updates: 1Hz', 164, startY + 68);
  }

  _drawDashboard(ctx, W, H) {
    // Header
    ctx.fillStyle = '#0d0b1e';
    ctx.fillRect(0, 0, W, 36);
    ctx.fillStyle = '#6E5BFF';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('⬡ AxeOS', 12, 23);
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(W - 20, 18, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a4870';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('● MINING', W - 30, 23);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1a1830';
    ctx.fillRect(0, 36, W, 1);

    const m = this._metrics;

    // Big hashrate
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 34px monospace';
    ctx.fillText(m.hashrate || '483.2', 16, 88);
    ctx.fillStyle = '#4a4870';
    ctx.font = '11px monospace';
    ctx.fillText('GH/s', 16, 104);

    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(m.efficiency || '28.4', W / 2, 85);
    ctx.fillStyle = '#4a4870';
    ctx.font = '10px monospace';
    ctx.fillText('J/TH', W / 2, 100);

    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(m.shares || '12', W * 0.75, 85);
    ctx.fillStyle = '#4a4870';
    ctx.font = '10px monospace';
    ctx.fillText('shares', W * 0.75, 100);

    ctx.fillStyle = '#1a1830';
    ctx.fillRect(0, 112, W, 1);

    // Chart
    ctx.fillStyle = '#4a4870';
    ctx.font = '9px monospace';
    ctx.fillText('HASHRATE HISTORY', 12, 128);

    const cx = 12, cy = 134, cw = W - 24, ch = 70;
    ctx.fillStyle = '#0a0814';
    ctx.fillRect(cx, cy, cw, ch);

    const data = this._chartData;
    const mn = 300, mx = 600;
    ctx.beginPath();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.5;
    data.forEach((v, i) => {
      const x = cx + (i / (data.length - 1)) * cw;
      const y = cy + ch - ((v - mn) / (mx - mn)) * ch;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.lineTo(cx + cw, cy + ch);
    ctx.lineTo(cx, cy + ch);
    ctx.closePath();
    ctx.fillStyle = 'rgba(249,115,22,0.08)';
    ctx.fill();

    // Bottom stats row
    const row = [
      { l: 'TEMP',  v: (m.temp  || '57')   + '°C',     c: '#ef4444' },
      { l: 'FAN',   v: (m.fan   || '2980') + ' RPM',   c: '#3b82f6' },
      { l: 'POWER', v: (m.power || '13.7') + 'W',      c: '#eab308' },
      { l: 'BEST',  v: m.bestdiff || '234K',            c: '#6366f1' },
    ];
    const rowY = 216;
    row.forEach((r, i) => {
      const x = 12 + i * (W / 4);
      ctx.fillStyle = '#0a0814';
      ctx.fillRect(x, rowY, W / 4 - 4, 48);
      ctx.fillStyle = r.c;
      ctx.font = 'bold 9px monospace';
      ctx.fillText(r.l, x + 6, rowY + 13);
      ctx.fillStyle = '#f0eeff';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(r.v, x + 6, rowY + 30);
    });

    ctx.fillStyle = '#2a2848';
    ctx.fillRect(0, 272, W, 1);
    ctx.fillStyle = '#4a4870';
    ctx.font = '9px monospace';
    ctx.fillText(`Freq: ${m.frequency || '490'} MHz  Volt: ${m.voltage || '1200'} mV  Uptime: ${m.uptime || '2h14m'}`, 12, 290);
    ctx.fillText('stratum+tcp://eu.stratum.braiins.com:3333', 12, 306);
    ctx.fillText('bc1q...wallet.worker1', 12, 322);

    // Restart btn
    ctx.fillStyle = '#1a0d00';
    ctx.fillRect(W - 112, H - 34, 100, 22);
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1;
    ctx.strokeRect(W - 112, H - 34, 100, 22);
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('⟳ Restart', W - 90, H - 19);
  }

  update(delta, clock) {
    this._time += delta;
    const step = STEPS[this._stepIndex];
    if (step.isDashboard) {
      if (Math.floor(this._time * 0.5) !== Math.floor((this._time - delta) * 0.5)) {
        METRICS.forEach(m => { this._metrics[m.id] = m.sim(); });
        this._chartData.shift();
        this._chartData.push(400 + Math.random() * 100);
        this._draw();
      }
    }
  }

  getMesh()        { return this._screenMesh; }
  getCurrentStep() { return STEPS[this._stepIndex]; }
}
