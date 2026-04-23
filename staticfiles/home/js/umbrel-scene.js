/**
 * umbrel-scene.js  –  Umbrel Home 3D model + fully-interactive screen
 * Three.js r165
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const SCREEN_W     = 640;
const SCREEN_H     = 400;
const BLOCK_HEIGHT = 945689;

const BOOT_LINES = [
  'UmbrelOS 1.2.3  –  Raspberry Pi 5',
  'EFI stub: Booting the kernel...',
  'Mounting /dev/mmcblk0p2 on /...',
  'Starting Docker Engine...',
  'Loading Umbrel app manager...',
  'Starting installed services...',
  'Network: umbrel.local (192.168.1.42)',
  '✓  UmbrelOS ready. Welcome back.',
];

const INSTALL_LINES = [
  'Pulling image bitcoin/bitcoin:27.0...',
  'Verifying GPG signature... OK',
  'Extracting application files...',
  'Configuring bitcoin.conf...',
  'Starting container...',
  'Waiting for daemon...',
  '✓ Bitcoin Core is running',
];

// ─────────────────────────────────────────────────────────────────────────────
// MUTABLE STATE  (module-level so draw functions can read it)
// ─────────────────────────────────────────────────────────────────────────────

let _screenStep   = 'off';   // 'off'|'boot'|'home'|'appstore'|'installing'|'syncing'|'live'
let _syncProgress = 0;
let _installPhase = 0;       // index into INSTALL_LINES
let _bootFrame    = 0;
let _powered      = false;
let _ethConnected = false;
let _elapsedTime  = 0;       // updated each frame

// ── Live node state ───────────────────────────────────────────────────────────
// Simulated mempool transactions and incoming blocks for the live view
const _mempool = [];          // { id, fee, size, age, x, y, vx, vy, r, opacity, color }
let   _liveBlocks = [];       // last 5 confirmed blocks { height, txCount, size, time, x }
let   _liveBlock  = BLOCK_HEIGHT;
let   _liveInitDone = false;

function _initLiveState() {
  if (_liveInitDone) return;
  _liveInitDone = true;
  _liveBlock    = BLOCK_HEIGHT;
  _liveBlocks   = [];
  _mempool.length = 0;

  // Seed mempool with ~40 pending txs
  for (let i = 0; i < 40; i++) _spawnTx();

  // Seed 4 recent blocks
  for (let i = 4; i >= 1; i--) {
    _liveBlocks.push({
      height:  BLOCK_HEIGHT - i,
      txCount: 1800 + Math.floor(Math.random() * 1400),
      size:    (1.1 + Math.random() * 0.8).toFixed(2),
      age:     i * 10,  // minutes ago
    });
  }
}

function _spawnTx() {
  // fee tiers: low=green, mid=yellow, high=orange, urgent=red
  const tier = Math.random();
  let color, fee;
  if      (tier < 0.35) { color = '#22c55e'; fee = 2  + Math.floor(Math.random() * 5);  }
  else if (tier < 0.65) { color = '#eab308'; fee = 8  + Math.floor(Math.random() * 12); }
  else if (tier < 0.88) { color = '#f97316'; fee = 22 + Math.floor(Math.random() * 30); }
  else                  { color = '#ef4444'; fee = 60 + Math.floor(Math.random() * 80); }

  const r = 3 + Math.random() * 4;
  _mempool.push({
    id:      Math.random().toString(36).slice(2, 10),
    fee,
    size:    Math.floor(140 + Math.random() * 400),
    age:     0,
    // position inside mempool arena (relative coords 0-1, drawn later)
    x:  0.08 + Math.random() * 0.84,
    y:  0.08 + Math.random() * 0.84,
    vx: (Math.random() - 0.5) * 0.0008,
    vy: (Math.random() - 0.5) * 0.0008,
    r,
    opacity: 0,
    color,
  });
}

let _lastBlockTime = 0;   // elapsed seconds when last block was mined
let _miningFlash   = 0;   // 0-1 flash intensity when new block arrives
let _miningBlock   = null; // { height, txCount, size } of the incoming block

// ─────────────────────────────────────────────────────────────────────────────
// HIT-ZONE SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

let _hitZones = [];  // { x, y, w, h, action }

function _hz(x, y, w, h, action) {
  _hitZones.push({ x, y, w, h, action });
}

function testHit(u, v) {
  const px = u * SCREEN_W;
  const py = v * SCREEN_H;
  for (const z of _hitZones) {
    if (px >= z.x && px <= z.x + z.w && py >= z.y && py <= z.y + z.h) {
      z.action();
      return true;
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// CANVAS  (off-screen, reused)
// ─────────────────────────────────────────────────────────────────────────────

let _screenCanvas = null;

function getScreenCanvas() {
  if (!_screenCanvas) {
    _screenCanvas = document.createElement('canvas');
    _screenCanvas.width  = SCREEN_W;
    _screenCanvas.height = SCREEN_H;
  }
  return _screenCanvas;
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAW HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function rr(ctx, x, y, w, h, r, fill, stroke, sw) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill)   { ctx.fillStyle   = fill;            ctx.fill();   }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw || 1; ctx.stroke(); }
}

function _scanlines(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let y = 0; y < SCREEN_H; y += 3) ctx.fillRect(0, y, SCREEN_W, 1);
}

function _vignette(ctx) {
  const v = ctx.createRadialGradient(SCREEN_W/2, SCREEN_H/2, SCREEN_H*0.25, SCREEN_W/2, SCREEN_H/2, SCREEN_H*0.8);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
}

// Shared top-bar (shown on every powered state except boot)
function _drawTopBar(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, 44);
  g.addColorStop(0, '#14111f');
  g.addColorStop(1, '#0a0814');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SCREEN_W, 44);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('⬡ umbrel', 14, 28);

  const t   = new Date();
  const hh  = String(t.getHours()).padStart(2,'0');
  const mm  = String(t.getMinutes()).padStart(2,'0');
  ctx.fillStyle = '#7a7890';
  ctx.font = '12px system-ui';
  ctx.textAlign = 'right';
  ctx.fillText(`${hh}:${mm}`, SCREEN_W - 14, 28);

  ctx.strokeStyle = 'rgba(110,91,255,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 44); ctx.lineTo(SCREEN_W, 44); ctx.stroke();
  ctx.textAlign = 'left';
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAW  OFF
// ─────────────────────────────────────────────────────────────────────────────

function _drawOff(ctx) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.fillStyle = '#1a1535';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('NO SIGNAL', SCREEN_W / 2, SCREEN_H / 2);
  ctx.textAlign = 'left';
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAW  BOOT
// ─────────────────────────────────────────────────────────────────────────────

function _drawBoot(ctx) {
  ctx.fillStyle = '#080810';
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

  // How many lines to show: one new line every ~7 frames (55 frames / 8 lines ≈ 6.9)
  const lineCount = Math.min(BOOT_LINES.length, Math.floor(_bootFrame / 7) + 1);

  ctx.font = '13px monospace';
  BOOT_LINES.slice(0, lineCount).forEach((line, i) => {
    ctx.fillStyle = i === lineCount - 1 ? '#7fff7f' : '#22c55e';
    ctx.fillText(line, 20, 48 + i * 26);
  });

  // Blinking cursor on last shown line
  if (lineCount < BOOT_LINES.length && Math.floor(_elapsedTime * 2) % 2 === 0) {
    ctx.fillStyle = '#22c55e';
    ctx.fillText('█', 20 + ctx.measureText(BOOT_LINES[lineCount - 1]).width + 4, 48 + (lineCount - 1) * 26);
  }

  if (lineCount >= BOOT_LINES.length) {
    ctx.fillStyle = 'rgba(110,91,255,0.18)';
    ctx.beginPath(); ctx.roundRect(16, SCREEN_H - 56, SCREEN_W - 32, 32, 6); ctx.fill();
    ctx.fillStyle = '#a5b4fc';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('▶  Loading dashboard...', SCREEN_W / 2, SCREEN_H - 34);
    ctx.textAlign = 'left';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAW  HOME
// ─────────────────────────────────────────────────────────────────────────────

function _drawHome(ctx) {
  // Background
  ctx.fillStyle = '#0a0818';
  ctx.fillRect(0, 44, SCREEN_W, SCREEN_H - 44 - 28);

  // Block height pill
  const bh = BLOCK_HEIGHT.toLocaleString();
  rr(ctx, SCREEN_W/2 - 90, 52, 180, 22, 11, 'rgba(249,115,22,0.13)', 'rgba(249,115,22,0.3)');
  ctx.fillStyle = '#f97316';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`Block ${bh}`, SCREEN_W / 2, 67);
  ctx.textAlign = 'left';

  // App grid  3 × 2
  const APPS = [
    { icon: '₿',  label: 'Bitcoin Node',   color: '#f97316', bg: '#1e0e00', action: () => { _screenStep = 'appstore'; } },
    { icon: '⚡', label: 'Lightning',       color: '#a855f7', bg: '#130820', action: null },
    { icon: '📊', label: 'Mempool',         color: '#14b8a6', bg: '#031210', action: null },
    { icon: '☁',  label: 'Nextcloud',       color: '#3b82f6', bg: '#030d1e', action: null },
    { icon: '🔒', label: 'Vaultwarden',     color: '#22c55e', bg: '#031209', action: null },
    { icon: '🌐', label: 'Tor',             color: '#6366f1', bg: '#08071c', action: null },
  ];

  const cW = 128, cH = 86, COLS = 3;
  const gx = Math.round((SCREEN_W - COLS * cW) / 2);
  const gy = 82;

  APPS.forEach((app, i) => {
    const cx = gx + (i % COLS) * cW;
    const cy = gy + Math.floor(i / COLS) * cH;

    // Register hit zone before drawing
    if (app.action) {
      _hz(cx + 4, cy + 2, cW - 8, cH - 6, app.action);
    }

    rr(ctx, cx + 4, cy + 2, cW - 8, cH - 6, 10, app.bg, app.color + '30');

    // Icon
    ctx.font = '22px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(app.icon, cx + cW / 2, cy + 34);

    // Label
    ctx.fillStyle = '#c0bcd8';
    ctx.font = '9px system-ui';
    ctx.fillText(app.label, cx + cW / 2, cy + 50);

    // Running indicator
    if (i === 0 && _syncProgress > 0) {
      ctx.fillStyle = '#22c55e';
      ctx.font = '8px monospace';
      ctx.fillText('● running', cx + cW / 2, cy + 66);
    }

    ctx.textAlign = 'left';
  });

  // Bottom bar
  ctx.fillStyle = 'rgba(5,4,16,0.95)';
  ctx.fillRect(0, SCREEN_H - 28, SCREEN_W, 28);
  ctx.strokeStyle = 'rgba(110,91,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, SCREEN_H - 28); ctx.lineTo(SCREEN_W, SCREEN_H - 28); ctx.stroke();
  ctx.fillStyle = '#3d3b55';
  ctx.font = '9px monospace';
  ctx.fillText('umbrel.local  •  UmbrelOS 1.2', 14, SCREEN_H - 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAW  APP STORE
// ─────────────────────────────────────────────────────────────────────────────

function _drawAppStore(ctx) {
  ctx.fillStyle = '#0a0818';
  ctx.fillRect(0, 44, SCREEN_W, SCREEN_H - 44 - 28);

  // ← Back
  _hz(8, 48, 36, 28, () => { _screenStep = 'home'; });
  rr(ctx, 8, 48, 36, 28, 6, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)');
  ctx.fillStyle = '#a5a4c0';
  ctx.font = 'bold 14px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('<', 26, 67);
  ctx.textAlign = 'left';

  // Store header
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px system-ui';
  ctx.fillText('App Store', 54, 67);

  // Featured card
  rr(ctx, 14, 84, SCREEN_W - 28, 140, 12, '#100d22', 'rgba(110,91,255,0.25)');

  // Orange ₿ circle
  ctx.fillStyle = '#f97316';
  ctx.beginPath(); ctx.arc(58, 138, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('₿', 58, 146);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px system-ui';
  ctx.fillText('Bitcoin Core', 96, 120);
  ctx.fillStyle = '#7a7890';
  ctx.font = '9px system-ui';

  // Word-wrap description
  const desc = 'Download and verify the entire Bitcoin blockchain. Run your own node. Be your own bank.';
  const words = desc.split(' ');
  let line = '', lineY = 138;
  for (const w of words) {
    const test = line + (line ? ' ' : '') + w;
    if (ctx.measureText(test).width > SCREEN_W - 28 - 96 - 14) {
      ctx.fillText(line, 96, lineY);
      line = w; lineY += 14;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, 96, lineY);

  ctx.fillStyle = '#3d3b55';
  ctx.font = '8px monospace';
  ctx.fillText('v27.0  •  Bitcoin Core developers  •  3.8 GB', 96, 206);

  // INSTALL button
  _hz(14, 232, SCREEN_W - 28, 36, () => {
    if (_powered) {
      _screenStep = 'installing';
      _installPhase = 0;
      _startInstall();
    }
  });

  const ig = ctx.createLinearGradient(14, 232, SCREEN_W - 14, 268);
  ig.addColorStop(0, '#7c3aed');
  ig.addColorStop(1, '#6366f1');
  rr(ctx, 14, 232, SCREEN_W - 28, 36, 10, ig, null);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('INSTALL', SCREEN_W / 2, 255);
  ctx.textAlign = 'left';

  // Smaller cards below
  const smCards = [
    { icon: '⚡', name: 'Electrs', sub: 'Electrum Server', color: '#a855f7' },
    { icon: '📊', name: 'Mempool',  sub: 'Blockchain explorer', color: '#14b8a6' },
  ];
  smCards.forEach((c, i) => {
    const x = 14 + i * (SCREEN_W / 2 - 10);
    const w = SCREEN_W / 2 - 24;
    rr(ctx, x, 278, w, 56, 8, '#100d22', c.color + '28');
    ctx.font = '16px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(c.icon, x + 24, 310);
    ctx.fillStyle = '#c0bcd8'; ctx.font = 'bold 10px system-ui';
    ctx.fillText(c.name, x + w / 2, 300);
    ctx.fillStyle = '#5a5878'; ctx.font = '8px system-ui';
    ctx.fillText(c.sub, x + w / 2, 314);
    ctx.textAlign = 'left';
  });

  // Bottom bar
  ctx.fillStyle = 'rgba(5,4,16,0.95)';
  ctx.fillRect(0, SCREEN_H - 28, SCREEN_W, 28);
  ctx.strokeStyle = 'rgba(110,91,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, SCREEN_H - 28); ctx.lineTo(SCREEN_W, SCREEN_H - 28); ctx.stroke();
  ctx.fillStyle = '#3d3b55'; ctx.font = '9px monospace';
  ctx.fillText('umbrel.local  •  UmbrelOS 1.2', 14, SCREEN_H - 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAW  INSTALLING
// ─────────────────────────────────────────────────────────────────────────────

function _drawInstalling(ctx) {
  ctx.fillStyle = '#0a0818';
  ctx.fillRect(0, 44, SCREEN_W, SCREEN_H - 44 - 28);

  ctx.fillStyle = '#f0eeff';
  ctx.font = 'bold 15px system-ui';
  ctx.fillText('Installing Bitcoin Core', 16, 76);
  ctx.fillStyle = '#5a5878';
  ctx.font = '11px system-ui';
  ctx.fillText('Bitcoin Core v27.0  •  Bitcoin Core developers', 16, 93);

  // Terminal box
  rr(ctx, 14, 102, SCREEN_W - 28, 196, 8, '#060410', '#1a1535');

  const shownLines = Math.min(_installPhase + 1, INSTALL_LINES.length);
  INSTALL_LINES.slice(0, shownLines).forEach((line, i) => {
    const done = i < _installPhase;
    ctx.fillStyle = done ? '#22c55e' : '#f0eeff';
    ctx.font = (done ? 'bold ' : '') + '11px monospace';
    ctx.fillText((done ? '✓ ' : '▶ ') + line, 24, 126 + i * 26);
    if (!done && i === _installPhase && Math.floor(_elapsedTime * 2) % 2 === 0) {
      ctx.fillStyle = '#6E5BFF';
      ctx.fillText('█', 24 + ctx.measureText('▶ ' + line).width + 4, 126 + i * 26);
    }
  });

  // Progress bar
  const pct = Math.min(1, _installPhase / (INSTALL_LINES.length - 1));
  rr(ctx, 14, 308, SCREEN_W - 28, 8, 4, '#0d0b20', null);
  if (pct > 0) {
    const pg = ctx.createLinearGradient(14, 0, SCREEN_W - 14, 0);
    pg.addColorStop(0, '#7c3aed'); pg.addColorStop(1, '#6366f1');
    ctx.fillStyle = pg;
    ctx.shadowColor = '#6366f1'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.roundRect(14, 308, (SCREEN_W - 28) * pct, 8, 4); ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.fillStyle = '#6366f1'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(pct * 100)}%`, SCREEN_W - 14, 305);
  ctx.textAlign = 'left';

  // Done banner
  if (_installPhase >= INSTALL_LINES.length - 1) {
    rr(ctx, 14, 324, SCREEN_W - 28, 40, 8, 'rgba(34,197,94,0.10)', 'rgba(34,197,94,0.3)');
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('✓ Bitcoin Core installed — syncing blockchain', SCREEN_W / 2, 349);
    ctx.textAlign = 'left';
  }

  // Bottom bar
  ctx.fillStyle = 'rgba(5,4,16,0.95)';
  ctx.fillRect(0, SCREEN_H - 28, SCREEN_W, 28);
  ctx.strokeStyle = 'rgba(110,91,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, SCREEN_H - 28); ctx.lineTo(SCREEN_W, SCREEN_H - 28); ctx.stroke();
  ctx.fillStyle = '#3d3b55'; ctx.font = '9px monospace';
  ctx.fillText('umbrel.local  •  UmbrelOS 1.2', 14, SCREEN_H - 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAW  SYNCING
// ─────────────────────────────────────────────────────────────────────────────

function _drawSyncing(ctx) {
  ctx.fillStyle = '#0a0818';
  ctx.fillRect(0, 44, SCREEN_W, SCREEN_H - 44 - 28);

  // ← Dashboard hit zone
  _hz(8, 48, 110, 26, () => { _screenStep = 'home'; });
  rr(ctx, 8, 48, 110, 26, 6, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)');
  ctx.fillStyle = '#a5a4c0'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('← Dashboard', 63, 65); ctx.textAlign = 'left';

  // Auto-transition to live when sync complete
  if (_syncProgress >= 100) {
    setTimeout(() => { _screenStep = 'live'; _initLiveState(); }, 1200);
    _syncProgress = 100; // clamp
  }

  // Status row
  const pulse = 0.55 + 0.45 * Math.abs(Math.sin(_elapsedTime * 2.5));
  ctx.fillStyle = `rgba(34,197,94,${pulse})`;
  ctx.beginPath(); ctx.arc(142, 61, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f0eeff'; ctx.font = 'bold 13px system-ui';
  ctx.fillText('Bitcoin Core — Syncing', 154, 65);

  // ── Circular progress arc ──────────────────────────────────────
  const cx = 88, cy = 196, R = 64;
  const pct = _syncProgress / 100;

  // Track
  ctx.strokeStyle = 'rgba(110,91,255,0.15)';
  ctx.lineWidth = 10; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI/2, Math.PI * 1.5); ctx.stroke();

  // Fill arc
  if (pct > 0) {
    const ag = ctx.createLinearGradient(cx - R, cy, cx + R, cy);
    ag.addColorStop(0, '#f97316'); ag.addColorStop(1, '#fb923c');
    ctx.strokeStyle = ag;
    ctx.shadowColor = '#f97316'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI/2, -Math.PI/2 + Math.PI * 2 * pct); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center';
  ctx.fillText(`${_syncProgress.toFixed(1)}%`, cx, cy + 7);
  ctx.fillStyle = '#5a5878'; ctx.font = '10px system-ui';
  ctx.fillText('synced', cx, cy + 24);
  ctx.textAlign = 'left';

  // ── Stats grid ─────────────────────────────────────────────────
  const synced = Math.floor(BLOCK_HEIGHT * pct);
  const stats = [
    ['Best block',  synced.toLocaleString()],
    ['Target',      BLOCK_HEIGHT.toLocaleString()],
    ['Peers',       '11'],
    ['Network',     'Mainnet'],
    ['Disk',        `${(600 * pct).toFixed(0)} / 600 GB`],
    ['Version',     'Bitcoin Core v27.0'],
  ];

  const sx = 180, sy = 82;
  stats.forEach(([k, v], i) => {
    const row = Math.floor(i / 2), col = i % 2;
    const x = sx + col * 228, y = sy + row * 50;
    rr(ctx, x, y, 210, 40, 6, 'rgba(14,10,32,0.9)', null);
    ctx.fillStyle = '#3d3b55'; ctx.font = '8px system-ui';
    ctx.fillText(k.toUpperCase(), x + 10, y + 14);
    ctx.fillStyle = '#c8c4e0'; ctx.font = 'bold 12px monospace';
    ctx.fillText(v, x + 10, y + 30);
  });

  // ── Terminal log ───────────────────────────────────────────────
  ctx.fillStyle = 'rgba(4,3,12,0.92)';
  ctx.fillRect(14, SCREEN_H - 84, SCREEN_W - 28, 56);
  ctx.strokeStyle = 'rgba(34,197,94,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(14, SCREEN_H - 84, SCREEN_W - 28, 56);

  ctx.fillStyle = '#22c55e'; ctx.font = '9px monospace';
  const bh2 = synced.toLocaleString();
  [
    `UpdateTip: height=${bh2} version=0x20000000`,
    `progress=${pct.toFixed(6)}  cache=24.1MiB(${Math.floor(192150 * pct)}txo)`,
    `Verification passed — chain=mainnet  peers=11`,
  ].forEach((l, i) => ctx.fillText(l, 22, SCREEN_H - 68 + i * 17));

  // Bottom bar
  ctx.fillStyle = 'rgba(5,4,16,0.95)';
  ctx.fillRect(0, SCREEN_H - 28, SCREEN_W, 28);
  ctx.strokeStyle = 'rgba(110,91,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, SCREEN_H - 28); ctx.lineTo(SCREEN_W, SCREEN_H - 28); ctx.stroke();
  ctx.fillStyle = '#3d3b55'; ctx.font = '9px monospace';
  ctx.fillText('umbrel.local  •  UmbrelOS 1.2', 14, SCREEN_H - 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAW  LIVE  (post-sync: mempool + block visualizer)
// ─────────────────────────────────────────────────────────────────────────────

function _drawLive(ctx) {
  const W = SCREEN_W, H = SCREEN_H;
  const t = _elapsedTime;

  // ← back hit zone
  _hz(8, 48, 80, 24, () => { _screenStep = 'home'; });
  rr(ctx, 8, 48, 80, 24, 6, 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)');
  ctx.fillStyle = '#6d6a90'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('← back', 48, 64); ctx.textAlign = 'left';

  // ── Status row ─────────────────────────────────────────────────
  const dotPulse = 0.6 + 0.4 * Math.abs(Math.sin(t * 2.2));
  ctx.fillStyle = `rgba(34,197,94,${dotPulse})`;
  ctx.beginPath(); ctx.arc(106, 61, 5, 0, Math.PI * 2); ctx.fill();
  // Outer ring
  ctx.strokeStyle = `rgba(34,197,94,${dotPulse * 0.4})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(106, 61, 9 + 3 * Math.abs(Math.sin(t * 2.2)), 0, Math.PI * 2); ctx.stroke();

  ctx.fillStyle = '#f0eeff'; ctx.font = 'bold 12px system-ui';
  ctx.fillText('Bitcoin Core — Synced & Live', 118, 65);

  // Block counter top-right
  ctx.fillStyle = '#f97316'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'right';
  ctx.fillText(`Block ${_liveBlock.toLocaleString()}`, W - 12, 65);
  ctx.textAlign = 'left';

  // ── Layout split: left=mempool arena, right=block chain ────────
  const SPLIT = 380;

  // ── LEFT — Mempool arena ───────────────────────────────────────
  const MX = 12, MY = 80, MW = SPLIT - MX - 6, MH = H - MY - 60;

  // Arena background with subtle grid
  ctx.fillStyle = 'rgba(8,5,22,0.85)';
  ctx.beginPath(); ctx.roundRect(MX, MY, MW, MH, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(110,91,255,0.12)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(MX, MY, MW, MH, 10); ctx.stroke();

  // Grid lines
  ctx.strokeStyle = 'rgba(110,91,255,0.05)'; ctx.lineWidth = 1;
  for (let gx = MX + 30; gx < MX + MW; gx += 30) {
    ctx.beginPath(); ctx.moveTo(gx, MY); ctx.lineTo(gx, MY + MH); ctx.stroke();
  }
  for (let gy = MY + 30; gy < MY + MH; gy += 30) {
    ctx.beginPath(); ctx.moveTo(MX, gy); ctx.lineTo(MX + MW, gy); ctx.stroke();
  }

  // Mempool label
  ctx.fillStyle = '#4d4a68'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
  ctx.fillText('MEMPOOL', MX + MW / 2, MY + 12);
  ctx.fillStyle = '#6d6a90'; ctx.font = '9px monospace';
  ctx.fillText(`${_mempool.length} unconfirmed txs`, MX + MW / 2, MY + 24);
  ctx.textAlign = 'left';

  // Animate + draw each tx bubble
  _mempool.forEach((tx, idx) => {
    // Fade in
    tx.opacity = Math.min(1, tx.opacity + 0.04);
    // Drift
    tx.x += tx.vx; tx.y += tx.vy;
    // Bounce off arena walls
    if (tx.x < 0.05 || tx.x > 0.95) tx.vx *= -1;
    if (tx.y < 0.05 || tx.y > 0.95) tx.vy *= -1;

    const px = MX + 4 + tx.x * (MW - 8);
    const py = MY + 30 + tx.y * (MH - 36);

    // Glow
    ctx.shadowColor  = tx.color;
    ctx.shadowBlur   = tx.r * 2.5;
    ctx.globalAlpha  = tx.opacity * 0.9;
    ctx.fillStyle    = tx.color;
    ctx.beginPath(); ctx.arc(px, py, tx.r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur   = 0;
    ctx.globalAlpha  = 1;
  });

  // Mining flash overlay (when new block arrives)
  if (_miningFlash > 0) {
    ctx.fillStyle = `rgba(249,115,22,${_miningFlash * 0.18})`;
    ctx.beginPath(); ctx.roundRect(MX, MY, MW, MH, 10); ctx.fill();
    // Flash ring
    ctx.strokeStyle = `rgba(249,115,22,${_miningFlash * 0.7})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(MX, MY, MW, MH, 10); ctx.stroke();
    _miningFlash = Math.max(0, _miningFlash - 0.03);
  }

  // Fee legend bottom of arena
  const legendItems = [
    { color: '#ef4444', label: 'High' },
    { color: '#f97316', label: 'Med' },
    { color: '#eab308', label: 'Low' },
    { color: '#22c55e', label: 'Min' },
  ];
  legendItems.forEach((li, i) => {
    const lx = MX + 6 + i * (MW / 4);
    const ly = MY + MH - 12;
    ctx.fillStyle = li.color; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.arc(lx + 4, ly - 2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#4d4a68'; ctx.font = '7px monospace';
    ctx.fillText(li.label, lx + 10, ly + 1);
  });

  // ── RIGHT — Block chain ────────────────────────────────────────
  const RX = SPLIT + 2, RY = MY, RW = W - RX - 12, RH = MH;

  ctx.fillStyle = 'rgba(8,5,22,0.85)';
  ctx.beginPath(); ctx.roundRect(RX, RY, RW, RH, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(110,91,255,0.12)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(RX, RY, RW, RH, 10); ctx.stroke();

  ctx.fillStyle = '#4d4a68'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
  ctx.fillText('CHAIN TIP', RX + RW / 2, RY + 12);
  ctx.textAlign = 'left';

  // Draw blocks stacked vertically (newest on top)
  const blockH = 44, blockW = RW - 16, blockX = RX + 8;
  const totalBlocks = _liveBlocks.length;

  _liveBlocks.forEach((blk, i) => {
    // Newest block at top
    const bi  = totalBlocks - 1 - i;
    const by  = RY + 20 + bi * (blockH + 6);
    const age = Math.floor((t - blk._arrivedAt) || blk.age || 0);
    const isNewest = i === totalBlocks - 1;

    // Block card bg
    const blockAlpha = isNewest ? 1 : 0.55 + (i / totalBlocks) * 0.35;
    ctx.globalAlpha = blockAlpha;

    const cardGrad = ctx.createLinearGradient(blockX, by, blockX + blockW, by);
    if (isNewest) {
      cardGrad.addColorStop(0, '#1a0d00');
      cardGrad.addColorStop(1, '#120a1e');
    } else {
      cardGrad.addColorStop(0, '#0e0a1a');
      cardGrad.addColorStop(1, '#0a0818');
    }
    rr(ctx, blockX, by, blockW, blockH - 2, 7, null, null);
    ctx.fillStyle = cardGrad; ctx.fill();

    // Border
    ctx.strokeStyle = isNewest ? 'rgba(249,115,22,0.6)' : 'rgba(110,91,255,0.18)';
    ctx.lineWidth = isNewest ? 1.5 : 1;
    ctx.beginPath(); ctx.roundRect(blockX, by, blockW, blockH - 2, 7); ctx.stroke();

    // Glow on newest
    if (isNewest) {
      ctx.shadowColor = '#f97316'; ctx.shadowBlur = 12;
      ctx.strokeStyle = 'rgba(249,115,22,0.3)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(blockX - 1, by - 1, blockW + 2, blockH, 8); ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = blockAlpha;

    // Block height
    ctx.fillStyle = isNewest ? '#f97316' : '#6d6a90';
    ctx.font = `bold ${isNewest ? 11 : 10}px monospace`;
    ctx.fillText(`#${blk.height.toLocaleString()}`, blockX + 8, by + 16);

    // TX count
    ctx.fillStyle = '#c8c4e0'; ctx.font = '9px system-ui';
    ctx.fillText(`${blk.txCount.toLocaleString()} txs`, blockX + 8, by + 29);

    // Size
    ctx.fillStyle = '#4d4a68'; ctx.font = '8px monospace';
    ctx.fillText(`${blk.size} MB`, blockX + 8, by + 40);

    // Age badge right side
    ctx.fillStyle = isNewest ? '#f97316' : '#3d3b55';
    ctx.font = '8px monospace'; ctx.textAlign = 'right';
    ctx.fillText(isNewest ? 'NEW' : `${Math.floor(blk.age)}m ago`, blockX + blockW - 6, by + 16);
    ctx.textAlign = 'left';

    ctx.globalAlpha = 1;
  });

  // Connector lines between blocks
  for (let i = 0; i < totalBlocks - 1; i++) {
    const by1 = RY + 20 + i * (blockH + 6) + blockH - 4;
    const by2 = by1 + 6;
    ctx.strokeStyle = 'rgba(110,91,255,0.22)'; ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(RX + RW / 2, by1); ctx.lineTo(RX + RW / 2, by2);
    ctx.stroke(); ctx.setLineDash([]);
  }

  // ── Bottom stats bar ───────────────────────────────────────────
  ctx.fillStyle = 'rgba(5,4,16,0.95)';
  ctx.fillRect(0, H - 60, W, 32);
  ctx.strokeStyle = 'rgba(110,91,255,0.15)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, H - 60); ctx.lineTo(W, H - 60); ctx.stroke();

  const stats2 = [
    { label: 'peers',     val: '11' },
    { label: 'mempool',   val: `${_mempool.length} txs` },
    { label: 'fee (sat/vB)', val: `${Math.floor(18 + 6 * Math.sin(t * 0.3))}` },
    { label: 'hashrate',  val: '620 EH/s' },
  ];
  const statW = W / stats2.length;
  stats2.forEach((s, i) => {
    const sx2 = i * statW + statW / 2;
    ctx.fillStyle = '#3d3b55'; ctx.font = '7px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(s.label.toUpperCase(), sx2, H - 47);
    ctx.fillStyle = '#c8c4e0'; ctx.font = 'bold 10px monospace';
    ctx.fillText(s.val, sx2, H - 35);
  });
  ctx.textAlign = 'left';

  // Bottom bar
  ctx.fillStyle = 'rgba(5,4,16,0.95)';
  ctx.fillRect(0, H - 28, W, 28);
  ctx.strokeStyle = 'rgba(110,91,255,0.15)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, H - 28); ctx.lineTo(W, H - 28); ctx.stroke();
  ctx.fillStyle = '#3d3b55'; ctx.font = '9px monospace';
  ctx.fillText('umbrel.local  •  Bitcoin Core v27.0  •  Mainnet', 14, H - 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DRAW DISPATCHER
// ─────────────────────────────────────────────────────────────────────────────

function drawScreen(canvas) {
  const ctx = canvas.getContext('2d');

  // Clear hit zones each frame
  _hitZones = [];

  // Base fill
  ctx.fillStyle = '#08080f';
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

  switch (_screenStep) {
    case 'off':
      _drawOff(ctx);
      break;
    case 'boot':
      _drawBoot(ctx);
      _scanlines(ctx);
      break;
    case 'home':
      _drawTopBar(ctx);
      _drawHome(ctx);
      _scanlines(ctx);
      _vignette(ctx);
      break;
    case 'appstore':
      _drawTopBar(ctx);
      _drawAppStore(ctx);
      _scanlines(ctx);
      _vignette(ctx);
      break;
    case 'installing':
      _drawTopBar(ctx);
      _drawInstalling(ctx);
      _scanlines(ctx);
      _vignette(ctx);
      break;
    case 'syncing':
      _drawTopBar(ctx);
      _drawSyncing(ctx);
      _scanlines(ctx);
      _vignette(ctx);
      break;
    case 'live':
      _drawTopBar(ctx);
      _drawLive(ctx);
      _scanlines(ctx);
      _vignette(ctx);
      break;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INSTALL PHASE TIMER
// ─────────────────────────────────────────────────────────────────────────────

function _startInstall() {
  const advance = () => {
    _installPhase++;
    if (_installPhase < INSTALL_LINES.length - 1) {
      setTimeout(advance, 400);
    } else {
      // All lines shown → transition to syncing
      setTimeout(() => {
        _screenStep = 'syncing';
        _syncProgress = 0;
        window.dispatchEvent(new CustomEvent('umbrel:startSync'));
      }, 800);
    }
  };
  setTimeout(advance, 500);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3D MODEL
// ─────────────────────────────────────────────────────────────────────────────

function _mat(color, rough = 0.4, metal = 0.5, extras = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extras });
}

function buildUmbrelHome(cableState) {
  const g = new THREE.Group();

  // ── Dimensions: wide flat puck with rounded edges ──
  // BH = 1.5 / 4 ≈ 0.38  →  thin slab like a Mac Mini / NUC
  const BW = 1.45;   // width  (X)
  const BH = 0.38;   // height (Y) — 1/4 of previous 1.5
  const BD = 1.45;   // depth  (Z)
  const R  = 0.07;   // corner radius
  const hw = BW / 2, hh = BH / 2, hd = BD / 2;

  // Body — RoundedBoxGeometry for soft edges
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x111114, roughness: 0.18, metalness: 0.82,
  });
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(BW, BH, BD, 4, R),
    bodyMat
  );
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);

  // Top Umbrel hex logo (⬡ embossed on top face)
  const logoRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.003, 32),
    _mat(0x1e1e26, 0.25, 0.5)
  );
  logoRing.position.set(0, hh + 0.001, 0);
  g.add(logoRing);

  const hexLogo = new THREE.Mesh(
    new THREE.CylinderGeometry(0.078, 0.078, 0.005, 6),
    _mat(0x2e2e38, 0.15, 0.75)
  );
  hexLogo.position.set(0, hh + 0.003, 0);
  g.add(hexLogo);

  // Vent slots — right side (3 slots, scaled to thin body)
  const ventMat = _mat(0x060608, 0.95, 0.05);
  for (let i = 0; i < 6; i++) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.012, BH * 0.55, 0.035), ventMat);
    v.position.set(hw + 0.001, 0, -0.35 + i * 0.14);
    g.add(v);
  }
  // Vent slots — left side
  for (let i = 0; i < 6; i++) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.012, BH * 0.55, 0.035), ventMat);
    v.position.set(-hw - 0.001, 0, -0.35 + i * 0.14);
    g.add(v);
  }

  // Front face — LED indicator strip (thin horizontal bar)
  const fStrip = new THREE.Mesh(
    new THREE.BoxGeometry(BW * 0.55, 0.018, 0.006),
    _mat(0x080810, 0.4, 0.6)
  );
  fStrip.position.set(0, -hh + 0.04, hd - 0.001);
  g.add(fStrip);

  // Power LED — blue dot, front-left
  const ledIntensity = _powered ? 2.2 : 0;
  const ledMat = _mat(0x3b82f6, 0.2, 0, { emissive: 0x3b82f6, emissiveIntensity: ledIntensity });
  const ledMesh = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), ledMat);
  ledMesh.position.set(-hw + 0.15, -hh + 0.04, hd + 0.002);
  g.add(ledMesh);

  // Activity LED — white blink
  const actInt = (_powered && _syncProgress > 0) ? 1.5 : 0;
  const actMat = _mat(0xffffff, 0.2, 0, { emissive: 0xffffff, emissiveIntensity: actInt });
  const actLed = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), actMat);
  actLed.position.set(-hw + 0.24, -hh + 0.04, hd + 0.002);
  g.add(actLed);

  // ── Back ports (all fit within BH = 0.38) ───────────────────
  const pH  = _mat(0x141418, 0.6, 0.4);
  const pIn = _mat(0x040406, 0.9, 0.1);
  const portY = 0;   // center height — ports fit in thin body

  // USB-C power (far left)
  const usbcOut = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.04), pH);
  usbcOut.position.set(-hw + 0.14, portY, -hd); g.add(usbcOut);
  const usbcIn = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.038, 0.02), pIn);
  usbcIn.position.set(-hw + 0.14, portY, -hd - 0.01); g.add(usbcIn);

  // USB-A (single, fits in thin profile)
  const uA = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.04), pH);
  uA.position.set(-hw + 0.36, portY, -hd); g.add(uA);
  const uI = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.038, 0.02), _mat(0x2563eb, 0.5, 0.3));
  uI.position.set(-hw + 0.36, portY, -hd - 0.01); g.add(uI);

  // Ethernet RJ-45
  const ethOut = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.13, 0.05), pH);
  ethOut.position.set(hw - 0.30, portY, -hd); g.add(ethOut);
  const ethIn = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.02), pIn);
  ethIn.position.set(hw - 0.30, portY, -hd - 0.01); g.add(ethIn);

  // Ethernet LEDs (tiny, on back face above port)
  [0xf59e0b, 0x22c55e].forEach((col, i) => {
    const el = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 6),
      _mat(col, 0.2, 0, { emissive: col, emissiveIntensity: _ethConnected ? 1.8 : 0 }));
    el.position.set(hw - 0.36 + i * 0.11, hh - 0.05, -hd - 0.01); g.add(el);
  });

  // HDMI (right side, single)
  const hdO = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.08, 0.04), pH);
  hdO.position.set(hw - 0.10, portY, -hd); g.add(hdO);
  const hdI = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.045, 0.02), pIn);
  hdI.position.set(hw - 0.10, portY, -hd - 0.01); g.add(hdI);

  // Rubber feet (4 corners, low profile)
  [[-hw + 0.14, -hd + 0.14], [hw - 0.14, -hd + 0.14],
   [-hw + 0.14,  hd - 0.14], [hw - 0.14,  hd - 0.14]].forEach(([fx, fz]) => {
    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.03, 10),
      _mat(0x050507, 1.0, 0.0)
    );
    foot.position.set(fx, -hh - 0.015, fz);
    g.add(foot);
  });

  // ── Cables ───────────────────────────────────────────────────

  // HDMI cable (always — goes to monitor)
  const hdmiCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(hw - 0.10, portY, -hd - 0.04),
    new THREE.Vector3(hw + 0.15, 0.15,  -hd - 0.45),
    new THREE.Vector3(hw - 0.10, 0.55,  -hd - 1.0),
    new THREE.Vector3(0,          0.95,  -hd - 1.6),
  ]);
  g.add(new THREE.Mesh(
    new THREE.TubeGeometry(hdmiCurve, 20, 0.020, 6, false),
    _mat(0x111114, 0.9, 0.05)
  ));

  // Ethernet cable
  if (cableState.ethernet) {
    const ec = new THREE.CatmullRomCurve3([
      new THREE.Vector3(hw - 0.30, portY,       -hd - 0.05),
      new THREE.Vector3(hw + 0.25, portY - 0.05, -hd - 0.5),
      new THREE.Vector3(hw + 0.8,  portY - 0.1,  -hd - 1.1),
      new THREE.Vector3(hw + 1.8,  portY - 0.2,  -hd - 1.8),
    ]);
    g.add(new THREE.Mesh(
      new THREE.TubeGeometry(ec, 22, 0.026, 8, false),
      _mat(0x1d4ed8, 0.8, 0.1)
    ));
    const plug = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.12, 0.07),
      _mat(0x1e40af, 0.5, 0.3)
    );
    plug.position.set(hw - 0.30, portY, -hd - 0.04);
    g.add(plug);
  }

  // Power cable (USB-C)
  if (cableState.power) {
    const pc = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-hw + 0.14, portY,        -hd - 0.04),
      new THREE.Vector3(-hw - 0.25, portY - 0.05, -hd - 0.45),
      new THREE.Vector3(-hw - 0.7,  portY - 0.35, -hd - 0.9),
      new THREE.Vector3(-hw - 1.3,  portY - 1.1,  -hd - 1.4),
      new THREE.Vector3(-hw - 1.6,  portY - 3.0,  -hd - 1.8),
    ]);
    g.add(new THREE.Mesh(
      new THREE.TubeGeometry(pc, 24, 0.030, 8, false),
      _mat(0x0d0d10, 0.9, 0.05)
    ));
    const uc = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.06, 0.08),
      _mat(0x1a1a22, 0.5, 0.5)
    );
    uc.position.set(-hw + 0.14, portY, -hd - 0.04);
    g.add(uc);
  }

  return g;
}

// ─────────────────────────────────────────────────────────────────────────────
// INIT  (exported)
// ─────────────────────────────────────────────────────────────────────────────

export function init(canvas) {

  const cableState = { ethernet: false, power: false };

  // Renderer — use window dimensions as fallback if canvas has no size yet
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const initW = canvas.clientWidth  || window.innerWidth;
  const initH = canvas.clientHeight || window.innerHeight;
  renderer.setSize(initW, initH, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0a0812');
  scene.fog = new THREE.FogExp2('#0a0812', 0.026);

  // Camera — adjusted for table height (table top at y=-0.5)
  const camera = new THREE.PerspectiveCamera(40, initW / initH, 0.1, 100);
  const HOME_POS  = new THREE.Vector3(4.5, 2.8, 6.0);   // slightly higher to see table
  const FOCUS_POS = new THREE.Vector3(0, 0.8, 2.4);     // focus on screen
  const HOME_TGT  = new THREE.Vector3(0, 0.1, 0);       // look at node on table
  const FOCUS_TGT = new THREE.Vector3(0, 1.1, -2.25);   // look at screen center
  camera.position.copy(HOME_POS);

  // Controls
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.maxPolarAngle = Math.PI / 1.85;
  controls.minDistance   = 2;
  controls.maxDistance   = 18;
  controls.target.copy(HOME_TGT);
  controls.minDistance = 2;
  controls.maxDistance = 20;
  controls.update();

  // ── Lights — bright, warm, airy ───────────────────────────────

  // Ambient — bright neutral-warm fill
  scene.add(new THREE.AmbientLight(0xfff8f0, 1.05));

  // Key light — strong overhead warm lamp
  const keyLight = new THREE.DirectionalLight(0xfff5e0, 3.2);
  keyLight.position.set(3, 9, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far  = 30;
  keyLight.shadow.camera.left = keyLight.shadow.camera.bottom = -9;
  keyLight.shadow.camera.right = keyLight.shadow.camera.top   =  9;
  keyLight.shadow.bias = -0.001;
  scene.add(keyLight);

  // Rim light — cool blue from behind-left (separation)
  const rimLight = new THREE.DirectionalLight(0xaac8ff, 1.4);
  rimLight.position.set(-6, 4, -6);
  scene.add(rimLight);

  // Warm point — strong desk lamp overhead
  const deskLamp = new THREE.PointLight(0xffe4a0, 4.5, 14);
  deskLamp.position.set(1, 5.5, 1);
  deskLamp.castShadow = true;
  deskLamp.shadow.mapSize.set(1024, 1024);
  scene.add(deskLamp);

  // Front fill — violet from camera side (lifts shadows on front face)
  const fillL = new THREE.PointLight(0x8888ff, 1.4, 16);
  fillL.position.set(-3, 2.5, 5); scene.add(fillL);

  // Right accent — warm gold from right
  const accentR = new THREE.PointLight(0xffd080, 1.2, 10);
  accentR.position.set(5, 2, 1); scene.add(accentR);

  // Top bounce — extra overhead to kill dark top faces
  const topBounce = new THREE.DirectionalLight(0xffffff, 1.1);
  topBounce.position.set(0, 12, 0);
  scene.add(topBounce);

  const pwrGlow = new THREE.PointLight(0x3b82f6, 0, 2);
  pwrGlow.position.set(0, 0.1, 1.5); scene.add(pwrGlow);

  const screenGlow = new THREE.PointLight(0x6366f1, 0.5, 7);
  screenGlow.position.set(0, 1.6, -1.4); scene.add(screenGlow);

  // ── Wooden desk / table ───────────────────────────────────────

  const TABLE_Y   = -0.5;   // top surface Y
  const TABLE_W   = 14;
  const TABLE_D   = 9;
  const TABLE_H   = 0.18;   // thickness of tabletop
  const LEG_H     = 3.2;    // leg height (goes down into floor)

  // Tabletop — procedural wood grain via canvas texture
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width  = 512;
  woodCanvas.height = 512;
  const wctx = woodCanvas.getContext('2d');

  // Base colour
  wctx.fillStyle = '#5c3a1e';
  wctx.fillRect(0, 0, 512, 512);

  // Grain lines
  for (let i = 0; i < 120; i++) {
    const x  = Math.random() * 512;
    const dy = (Math.random() - 0.5) * 6;
    wctx.strokeStyle = `rgba(${Math.random() > 0.5 ? '30,15,5' : '90,55,25'},${0.18 + Math.random() * 0.22})`;
    wctx.lineWidth   = 0.5 + Math.random() * 1.8;
    wctx.beginPath();
    wctx.moveTo(x, 0);
    wctx.bezierCurveTo(x + dy * 2, 128, x - dy * 3, 256, x + dy, 512);
    wctx.stroke();
  }
  // Darker vignette edges
  const woodVig = wctx.createRadialGradient(256,256,60,256,256,300);
  woodVig.addColorStop(0, 'rgba(0,0,0,0)');
  woodVig.addColorStop(1, 'rgba(0,0,0,0.28)');
  wctx.fillStyle = woodVig; wctx.fillRect(0,0,512,512);

  const woodTex = new THREE.CanvasTexture(woodCanvas);
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(3, 2);

  const tableTopMat = new THREE.MeshStandardMaterial({
    map:       woodTex,
    roughness: 0.55,
    metalness: 0.04,
    color:     0xb07840,   // warm walnut tint
  });

  // Tabletop slab
  const tableTop = new THREE.Mesh(
    new THREE.BoxGeometry(TABLE_W, TABLE_H, TABLE_D),
    tableTopMat
  );
  tableTop.position.set(0, TABLE_Y - TABLE_H / 2, -1);
  tableTop.receiveShadow = true;
  tableTop.castShadow    = false;
  scene.add(tableTop);

  // Subtle edge highlight (lighter strip along front edge)
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xc8924e, roughness: 0.4, metalness: 0.05 });
  const frontEdge = new THREE.Mesh(new THREE.BoxGeometry(TABLE_W, TABLE_H * 0.4, 0.04), edgeMat);
  frontEdge.position.set(0, TABLE_Y - TABLE_H * 0.3, -1 + TABLE_D / 2);
  scene.add(frontEdge);

  // 4 legs — dark walnut
  const legMat = new THREE.MeshStandardMaterial({ color: 0x3b2008, roughness: 0.7, metalness: 0.02 });
  const legW = 0.22;
  [
    [-TABLE_W/2 + 0.4,  -TABLE_D/2 + 0.4 - 1],
    [ TABLE_W/2 - 0.4,  -TABLE_D/2 + 0.4 - 1],
    [-TABLE_W/2 + 0.4,   TABLE_D/2 - 0.4 - 1],
    [ TABLE_W/2 - 0.4,   TABLE_D/2 - 0.4 - 1],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(legW, LEG_H, legW), legMat);
    leg.position.set(lx, TABLE_Y - TABLE_H - LEG_H / 2, lz);
    leg.castShadow = true;
    scene.add(leg);
  });

  // Floor — dark concrete/wall
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x0c0a14, roughness: 0.95, metalness: 0.0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y  = TABLE_Y - TABLE_H - LEG_H;
  floor.receiveShadow = true;
  scene.add(floor);

  // Subtle floor reflection plane (shadow catcher)
  const shadowFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShadowMaterial({ opacity: 0.35 })
  );
  shadowFloor.rotation.x = -Math.PI / 2;
  shadowFloor.position.y  = TABLE_Y - TABLE_H - LEG_H + 0.01;
  shadowFloor.receiveShadow = true;
  scene.add(shadowFloor);

  // Small decorative objects on desk ─────────────────────────────

  // Coffee mug (right side of desk)
  const mugMat = new THREE.MeshStandardMaterial({ color: 0xe8e0f0, roughness: 0.7, metalness: 0.05 });
  const mug = new THREE.Group();
  const mugCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.44, 20), mugMat);
  mugCyl.castShadow = true;
  mug.add(mugCyl);
  // Mug handle
  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.18, 0.10, 0),
    new THREE.Vector3(0.30, 0.12, 0),
    new THREE.Vector3(0.30,-0.08, 0),
    new THREE.Vector3(0.18,-0.10, 0),
  ]);
  mug.add(new THREE.Mesh(
    new THREE.TubeGeometry(handleCurve, 10, 0.025, 6, false),
    mugMat
  ));
  mug.position.set(3.8, TABLE_Y, 0.8);
  scene.add(mug);

  // Small notebook (left side)
  const notebookMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.85, metalness: 0.0 });
  const notebook = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 1.25), notebookMat);
  notebook.position.set(-4.0, TABLE_Y - 0.01, 0.4);
  notebook.castShadow = true;
  scene.add(notebook);
  // Notebook spine
  const spineMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.7, metalness: 0.0 });
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.065, 1.25), spineMat);
  spine.position.set(-4.42, TABLE_Y - 0.01, 0.4);
  scene.add(spine);

  // Y offset to place node on table surface
  // BH = 0.38 → hh = 0.19; feet bottom = -(0.19 + 0.015) = -0.205
  // We want feet to sit at TABLE_Y, so group.y = TABLE_Y + 0.205
  const ON_TABLE = TABLE_Y + 0.205;   // table top + offset to bottom of feet

  // Umbrel model
  let umbrelGroup = buildUmbrelHome(cableState);
  umbrelGroup.position.y = ON_TABLE;
  scene.add(umbrelGroup);

  function rebuild() {
    scene.remove(umbrelGroup);
    umbrelGroup = buildUmbrelHome(cableState);
    umbrelGroup.position.y = ON_TABLE;
    scene.add(umbrelGroup);
  }

  // Screen / monitor — also on the table
  const MON_BASE_Y = ON_TABLE;        // monitor base sits on table
  const MON_Y      = MON_BASE_Y + 1.6; // screen center height

  const screenCanvas = getScreenCanvas();
  drawScreen(screenCanvas);
  const screenTex = new THREE.CanvasTexture(screenCanvas);

  // Monitor body
  const monBody = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.0, 0.08), _mat(0x0a0a14, 0.3, 0.7));
  monBody.position.set(0, MON_Y, -2.3); monBody.rotation.x = -0.05; scene.add(monBody);

  // Bezel glow rim
  const bezelGlow = new THREE.Mesh(new THREE.BoxGeometry(3.05, 2.05, 0.07),
    _mat(0x6366f1, 0.5, 0.3, { transparent: true, opacity: 0.10 }));
  bezelGlow.position.set(0, MON_Y, -2.34); bezelGlow.rotation.x = -0.05; scene.add(bezelGlow);

  // Screen mesh — interactive
  const screenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.78, 1.82),
    new THREE.MeshBasicMaterial({ map: screenTex })
  );
  screenMesh.position.set(0, MON_Y, -2.25);
  screenMesh.rotation.x = -0.05;
  screenMesh.userData.isScreen = true;
  scene.add(screenMesh);

  // Update screen glow position
  screenGlow.position.set(0, MON_Y, -1.4);

  // Monitor stand pole + base (on table)
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.0, 10), _mat(0x0d0d1a, 0.4, 0.7));
  pole.position.set(0, MON_BASE_Y + 0.5, -2.3); scene.add(pole);
  const mBase = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.06, 20), _mat(0x0a0a14, 0.3, 0.8));
  mBase.position.set(0, MON_BASE_Y + 0.03, -2.3); scene.add(mBase);

  // Particles
  const PC = 160;
  const pPos = new Float32Array(PC * 3);
  for (let i = 0; i < PC * 3; i += 3) {
    pPos[i]   = (Math.random() - 0.5) * 16;
    pPos[i+1] = (Math.random() - 0.5) * 10;
    pPos[i+2] = (Math.random() - 0.5) * 16;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x9d99c0, size: 0.02, transparent: true, opacity: 0.28 })));

  // Raycaster + focus state
  let focusMode = false, rotating = true;
  const raycaster = new THREE.Raycaster();
  const mouseVec  = new THREE.Vector2();
  const curLookAt = HOME_TGT.clone();
  let tgtPos = HOME_POS.clone(), tgtLook = HOME_TGT.clone();

  function enterFocusMode() {
    if (focusMode) return;
    focusMode = true; rotating = false;
    tgtPos = FOCUS_POS.clone(); tgtLook = FOCUS_TGT.clone();
    controls.enabled = false;
    window.dispatchEvent(new CustomEvent('umbrel:focusmode', { detail: { active: true } }));
  }

  function exitFocusMode() {
    if (!focusMode) return;
    focusMode = false; rotating = true;
    tgtPos = HOME_POS.clone(); tgtLook = HOME_TGT.clone();
    controls.enabled = true;
    window.dispatchEvent(new CustomEvent('umbrel:focusmode', { detail: { active: false } }));
  }

  // Canvas click → UV hit test
  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    mouseVec.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    mouseVec.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseVec, camera);
    const hits = raycaster.intersectObject(screenMesh);
    if (hits.length > 0) {
      const uv = hits[0].uv;
      const hit = testHit(uv.x, 1 - uv.y);
      if (!hit && _powered) {
        if (!focusMode) enterFocusMode();
      }
    }
  });

  // ESC key
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') exitFocusMode();
  });

  // Programmatic focus camera
  window.addEventListener('umbrel:focusCamera', () => {
    if (_powered) enterFocusMode();
  });

  // External state events
  window.addEventListener('umbrel:connectEthernet', () => {
    _ethConnected = true; cableState.ethernet = true; rebuild();
    window.dispatchEvent(new CustomEvent('umbrel:stateUpdate', { detail: { ...cableState, powered: _powered } }));
  });
  window.addEventListener('umbrel:disconnectEthernet', () => {
    _ethConnected = false; cableState.ethernet = false; rebuild();
    window.dispatchEvent(new CustomEvent('umbrel:stateUpdate', { detail: { ...cableState, powered: _powered } }));
  });
  window.addEventListener('umbrel:connectPower', () => {
    _powered = true; cableState.power = true; rebuild();
    _screenStep = 'boot'; _bootFrame = 0;
    pwrGlow.intensity = 1.5;
    window.dispatchEvent(new CustomEvent('umbrel:stateUpdate', { detail: { ...cableState, powered: true } }));
  });
  window.addEventListener('umbrel:disconnectPower', () => {
    _powered = false; cableState.power = false; rebuild();
    _screenStep = 'off'; _syncProgress = 0; _installPhase = 0;
    pwrGlow.intensity = 0;
    window.dispatchEvent(new CustomEvent('umbrel:stateUpdate', { detail: { ...cableState, powered: false } }));
  });
  window.addEventListener('umbrel:installBitcoin', () => {
    if (!_powered) return;
    _screenStep = 'installing'; _installPhase = 0; _syncProgress = 0;
    _startInstall();
  });
  window.addEventListener('umbrel:setScreenStep', e => {
    if (e.detail && e.detail.step) _screenStep = e.detail.step;
  });

  // Resize
  window.addEventListener('resize', () => {
    const w = canvas.clientWidth  || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  });

  // Animate
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    _elapsedTime = clock.getElapsedTime();

    // Boot progression
    if (_screenStep === 'boot') {
      _bootFrame++;
      if (_bootFrame >= 55) _screenStep = 'home';
    }

    // Sync progression
    if (_screenStep === 'syncing') {
      _syncProgress = Math.min(100, _syncProgress + 0.15);
      window.dispatchEvent(new CustomEvent('umbrel:syncProgress', { detail: { pct: _syncProgress } }));
    }

    // Live node simulation
    if (_screenStep === 'live') {
      const el = _elapsedTime;

      // Spawn new mempool txs randomly (~2 per second)
      if (Math.random() < 0.033 && _mempool.length < 80) _spawnTx();

      // Simulate a new block every ~15s (compressed for demo)
      if (el - _lastBlockTime > 15) {
        _lastBlockTime = el;
        _liveBlock++;

        // Build the new block from mempool (pick highest-fee txs)
        const sorted  = [..._mempool].sort((a, b) => b.fee - a.fee);
        const inBlock = sorted.slice(0, Math.min(sorted.length, 25 + Math.floor(Math.random() * 15)));
        const txCount = 1600 + Math.floor(Math.random() * 1200);
        const size    = (0.9 + Math.random() * 0.9).toFixed(2);

        // Remove confirmed txs from mempool
        inBlock.forEach(tx => {
          const idx = _mempool.indexOf(tx);
          if (idx !== -1) _mempool.splice(idx, 1);
        });

        // Add new block to chain (keep last 4)
        const newBlk = { height: _liveBlock, txCount, size, age: 0, _arrivedAt: el };
        _liveBlocks.push(newBlk);
        if (_liveBlocks.length > 4) _liveBlocks.shift();

        // Age older blocks
        _liveBlocks.forEach((b, i) => {
          if (b !== newBlk) b.age = Math.round((el - (b._arrivedAt || 0)) / 60 * 10);
        });

        // Trigger mining flash
        _miningFlash  = 1.0;
        _miningBlock  = newBlk;

        // Dispatch event for HTML overlay
        window.dispatchEvent(new CustomEvent('umbrel:newBlock', {
          detail: { height: _liveBlock, txCount, size }
        }));
      }

      // Age older blocks every frame
      _liveBlocks.forEach(b => {
        if (b._arrivedAt) b.age = Math.round((el - b._arrivedAt) / 60);
      });
    }

    // Draw screen EVERY frame
    drawScreen(screenCanvas);
    screenTex.needsUpdate = true;

    // LED pulse
    if (_powered) {
      pwrGlow.intensity = 0.8 + 0.7 * Math.abs(Math.sin(_elapsedTime * 2));
    }
    screenGlow.intensity = _powered ? 0.45 + 0.08 * Math.sin(_elapsedTime * 4.3) : 0;

    // Particle drift
    const pa = pGeo.attributes.position.array;
    for (let i = 1; i < pa.length; i += 3) {
      pa[i] += 0.0012;
      if (pa[i] > 5) pa[i] = -5;
    }
    pGeo.attributes.position.needsUpdate = true;

    // Idle rotation
    if (rotating) umbrelGroup.rotation.y += 0.0005;

    // Camera lerp
    if (!controls.enabled) {
      camera.position.lerp(tgtPos, 0.055);
      curLookAt.lerp(tgtLook, 0.055);
      camera.lookAt(curLookAt);
    } else {
      controls.update();
    }

    renderer.render(scene, camera);
  }

  animate();
}

export default init;
