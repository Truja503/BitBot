/**
 * landing.js — Scroll-driven video scrub + text stage animations
 * for the BitBot landing page.
 *
 * No external deps. Designed to live alongside a future Three.js
 * scene: when scene-prep.js initialises the 3D canvas, this module
 * will keep running independently on the 2D layer.
 */

'use strict';

// ── DOM ──────────────────────────────────────────────────────────
const scene       = document.getElementById('scrollScene');
const video1      = document.getElementById('video1');
const video2      = document.getElementById('video2');
const veil        = document.getElementById('veil');
const s1Text      = document.getElementById('s1Text');
const eyebrow     = document.getElementById('eyebrow');
const wordmark    = document.getElementById('wordmark');
const heroRight   = document.getElementById('heroRight');
const sMidText    = document.getElementById('sMidText');
const s2Text      = document.getElementById('s2Text');
const hint        = document.getElementById('scrollHint');
const progressBar = document.getElementById('progressBar');
const loader      = document.getElementById('videoLoader');

// ── State ─────────────────────────────────────────────────────────
let dur1 = 0, dur2 = 0;
let ready1 = false, ready2 = false;
let lastT1 = -1, lastT2 = -1;
let raf1 = null, raf2 = null;

// ── Config ────────────────────────────────────────────────────────
const CFG = {
  videoSpeed1: 1.5,
  videoSpeed2: 1.25,
  xfadeStart:  0.44,
  xfadeMid:    0.48,
  xfadeEnd:    0.52,
  rpEnd:       0.36,   // right panel fully gone
  midInStart:  0.20,
  midInEnd:    0.38,
  midOutStart: 0.62,
  midOutEnd:   0.65,
  t2EnterStart: 0.75,
  t2EnterEnd:   0.85,
};

// ── Helpers ───────────────────────────────────────────────────────
const clamp   = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const norm    = (v, lo, hi) => clamp((v - lo) / (hi - lo), 0, 1);
const easeOut3 = t => 1 - Math.pow(1 - t, 3);

// ── Loader ────────────────────────────────────────────────────────
function hideLoader() {
  loader.classList.add('hidden');
  setTimeout(() => { loader.style.display = 'none'; }, 700);
}
video1.addEventListener('canplay', () => { ready1 = true; if (ready2) hideLoader(); });
video2.addEventListener('canplay', () => { ready2 = true; if (ready1) hideLoader(); });
setTimeout(hideLoader, 3500);   // fallback

// ── Metadata ──────────────────────────────────────────────────────
video1.addEventListener('loadedmetadata', () => { dur1 = video1.duration; });
video2.addEventListener('loadedmetadata', () => { dur2 = video2.duration; video2.currentTime = 0; });

// ── Video scrub ───────────────────────────────────────────────────
function scrub(vid, t) {
  if (vid.readyState < 1 || Math.abs(vid.currentTime - t) < 0.016) return;
  vid.currentTime = t;
}

// ── Main scroll handler ───────────────────────────────────────────
function onScroll() {
  const scrollable = scene.offsetHeight - window.innerHeight;
  const gp = clamp((window.scrollY - scene.offsetTop) / scrollable, 0, 1);

  const p1 = norm(gp, 0, 0.50);
  const p2 = norm(gp, 0.50, 1.00);
  const isMobile  = window.innerWidth <= 768;
  const dropScale = isMobile ? 0.5 : 1;

  // Progress bar
  progressBar.style.width = `${gp * 100}%`;

  // Scroll hint
  hint.style.opacity = gp > 0.03 ? '0' : '0.42';

  // Video scrub
  if (dur1 && ready1) {
    const t1 = Math.min(dur1, p1 * dur1 * CFG.videoSpeed1);
    if (Math.abs(t1 - lastT1) > 0.01) { scrub(video1, t1); lastT1 = t1; }
  }
  if (dur2 && ready2 && gp >= 0.50) {
    const t2 = Math.min(dur2, p2 * dur2 * CFG.videoSpeed2);
    if (Math.abs(t2 - lastT2) > 0.01) { scrub(video2, t2); lastT2 = t2; }
  }

  // Crossfade
  if (gp < CFG.xfadeStart) {
    video1.style.opacity = '1'; video2.style.opacity = '0'; veil.style.opacity = '0';
  } else if (gp > CFG.xfadeEnd) {
    video1.style.opacity = '0'; video2.style.opacity = '1'; veil.style.opacity = '0';
  } else {
    const xT    = norm(gp, CFG.xfadeStart, CFG.xfadeEnd);
    const vIn   = norm(gp, CFG.xfadeStart, CFG.xfadeMid);
    const veilO = vIn < 1
      ? vIn * 0.80
      : (1 - norm(gp, CFG.xfadeMid, CFG.xfadeEnd)) * 0.80;
    veil.style.opacity   = String(veilO);
    video1.style.opacity = String(1 - xT);
    video2.style.opacity = String(xT);
  }

  // Stage 1 — wordmark drop
  wordmark.style.transform = `translateY(${p1 * 360 * dropScale}px)`;
  wordmark.style.opacity   = String(clamp(1 - p1 * 3.5, 0, 1));
  eyebrow.style.opacity    = String(clamp(1 - p1 * 5, 0, 1));

  // Stage 1 — right panel
  const rpT = easeOut3(norm(gp, 0, CFG.rpEnd));
  heroRight.style.opacity   = String(clamp(1 - rpT, 0, 1));
  heroRight.style.transform = `translateY(${rpT * 60 * dropScale}px)`;

  s1Text.style.opacity = gp >= CFG.xfadeEnd ? '0' : null;

  // Stage mid text
  let midT = 0;
  if      (gp < CFG.midInStart)  midT = 0;
  else if (gp <= CFG.midInEnd)   midT = easeOut3(norm(gp, CFG.midInStart, CFG.midInEnd));
  else if (gp < CFG.midOutStart) midT = 1;
  else                           midT = clamp(1 - easeOut3(norm(gp, CFG.midOutStart, CFG.midOutEnd)), 0, 1);

  const midShift = (1 - midT) * 40;
  sMidText.style.opacity       = String(midT);
  sMidText.style.pointerEvents = midT > 0.05 ? 'auto' : 'none';
  sMidText.style.transform     = isMobile
    ? `translateY(${midShift}px)`
    : `translateY(calc(-50% + ${midShift}px))`;

  // Stage 2 text
  const t2T     = easeOut3(norm(gp, CFG.t2EnterStart, CFG.t2EnterEnd));
  const t2Shift = (1 - t2T) * 40;
  s2Text.style.opacity       = String(t2T);
  s2Text.style.pointerEvents = t2T > 0.05 ? 'auto' : 'none';
  s2Text.style.transform     = isMobile
    ? `translateY(${t2Shift}px)`
    : `translateY(calc(-50% + ${t2Shift}px))`;
}

// ── Init ──────────────────────────────────────────────────────────
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();
