/**
 * landing.js — Scroll-driven video scrub + text stage animations
 * for the BitBot landing page.
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
let lastT1 = -1, lastT2 = -1;
let video2Loaded = false;
let loaderHidden = false;

// ── Config ────────────────────────────────────────────────────────
const CFG = {
  videoSpeed1:  1.5,
  videoSpeed2:  1.25,
  xfadeStart:   0.44,
  xfadeMid:     0.48,
  xfadeEnd:     0.52,
  rpEnd:        0.36,
  midInStart:   0.20,
  midInEnd:     0.38,
  midOutStart:  0.62,
  midOutEnd:    0.65,
  t2EnterStart: 0.75,
  t2EnterEnd:   0.85,
};

// ── Helpers ───────────────────────────────────────────────────────
const clamp    = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const norm     = (v, lo, hi) => clamp((v - lo) / (hi - lo), 0, 1);
const easeOut3 = t => 1 - Math.pow(1 - t, 3);

// ── Loader ────────────────────────────────────────────────────────
function hideLoader() {
  if (loaderHidden || !loader) return;
  loaderHidden = true;
  loader.classList.add('hidden');
  setTimeout(() => { loader.style.display = 'none'; }, 700);
}

// Hide loader as soon as video1 can play — don't wait for video2
video1.addEventListener('canplay', hideLoader, { once: true });
setTimeout(hideLoader, 4000); // hard fallback

// ── Pause videos — we drive them via currentTime only ─────────────
// Must happen before any play() the browser might trigger
function ensurePaused() {
  if (!video1.paused) video1.pause();
  if (!video2.paused) video2.pause();
}
video1.addEventListener('play', () => video1.pause());
video2.addEventListener('play', () => video2.pause());

// ── Video scrub ───────────────────────────────────────────────────
function getDuration(vid) {
  // vid.duration may be available even before loadedmetadata fires
  const d = vid.duration;
  return (d && isFinite(d) && d > 0) ? d : 0;
}

function scrub(vid, targetTime) {
  if (!vid || vid.readyState < 1) return false;
  const dur = getDuration(vid);
  if (!dur) return false;
  const t = Math.max(0, Math.min(dur - 0.05, targetTime));
  if (Math.abs(vid.currentTime - t) < 0.016) return true;
  try {
    vid.currentTime = t;
  } catch (_) { /* ignore race conditions */ }
  return true;
}

// ── Lazy-load video2 ─────────────────────────────────────────────
function loadVideo2() {
  if (video2Loaded) return;
  video2Loaded = true;
  video2.preload = 'auto';
  video2.load();
}

// ── Main scroll handler ───────────────────────────────────────────
function onScroll() {
  if (!scene) return;
  const scrollable = scene.offsetHeight - window.innerHeight;
  const rawScroll  = window.scrollY - scene.offsetTop;
  const gp = clamp(rawScroll / scrollable, 0, 1);

  const p1 = norm(gp, 0, 0.50);
  const p2 = norm(gp, 0.50, 1.00);
  const isMobile  = window.innerWidth <= 768;
  const dropScale = isMobile ? 0.5 : 1;

  // Start loading video2 early so it's ready at the crossfade
  if (gp >= 0.35) loadVideo2();

  // Progress bar
  if (progressBar) progressBar.style.width = `${gp * 100}%`;

  // Scroll hint
  if (hint) hint.style.opacity = gp > 0.03 ? '0' : '0.42';

  // ── Video 1 scrub ──────────────────────────────────────────────
  // Always try to scrub video1, reading duration live each frame
  {
    const dur1 = getDuration(video1);
    if (dur1) {
      const t1 = Math.min(dur1 - 0.05, p1 * dur1 * CFG.videoSpeed1);
      if (Math.abs(t1 - lastT1) > 0.01) {
        scrub(video1, t1);
        lastT1 = t1;
      }
    }
  }

  // ── Video 2 scrub ──────────────────────────────────────────────
  {
    const dur2 = getDuration(video2);
    if (gp >= 0.50 && dur2) {
      const t2 = Math.min(dur2 - 0.05, p2 * dur2 * CFG.videoSpeed2);
      if (Math.abs(t2 - lastT2) > 0.01) {
        scrub(video2, t2);
        lastT2 = t2;
      }
    } else if (gp < 0.50 && lastT2 > 0 && dur2) {
      scrub(video2, 0);
      lastT2 = 0;
    }
  }

  // ── Crossfade ──────────────────────────────────────────────────
  if (gp < CFG.xfadeStart) {
    video1.style.opacity = '1';
    video2.style.opacity = '0';
    veil.style.opacity   = '0';
  } else if (gp > CFG.xfadeEnd) {
    video1.style.opacity = '0';
    video2.style.opacity = '1';
    veil.style.opacity   = '0';
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

  // ── Stage 1 — wordmark drop ────────────────────────────────────
  if (wordmark) {
    wordmark.style.transform = `translateY(${p1 * 360 * dropScale}px)`;
    wordmark.style.opacity   = String(clamp(1 - p1 * 3.5, 0, 1));
  }
  if (eyebrow) {
    eyebrow.style.opacity = String(clamp(1 - p1 * 5, 0, 1));
  }

  // ── Stage 1 — right panel ──────────────────────────────────────
  if (heroRight) {
    const rpT = easeOut3(norm(gp, 0, CFG.rpEnd));
    heroRight.style.opacity   = String(clamp(1 - rpT, 0, 1));
    heroRight.style.transform = `translateY(${rpT * 60 * dropScale}px)`;
  }
  if (s1Text) {
    s1Text.style.opacity = gp >= CFG.xfadeEnd ? '0' : '';
  }

  // ── Stage mid text ─────────────────────────────────────────────
  if (sMidText) {
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
  }

  // ── Stage 2 text ───────────────────────────────────────────────
  if (s2Text) {
    const t2T     = easeOut3(norm(gp, CFG.t2EnterStart, CFG.t2EnterEnd));
    const t2Shift = (1 - t2T) * 40;
    s2Text.style.opacity       = String(t2T);
    s2Text.style.pointerEvents = t2T > 0.05 ? 'auto' : 'none';
    s2Text.style.transform     = isMobile
      ? `translateY(${t2Shift}px)`
      : `translateY(calc(-50% + ${t2Shift}px))`;
  }
}

// ── Re-run scroll when video1 metadata arrives ────────────────────
// This catches the case where the user already scrolled but dur1 was 0
video1.addEventListener('loadedmetadata', () => {
  video1.pause();
  onScroll(); // re-apply current scroll position now that we have duration
});
video2.addEventListener('loadedmetadata', () => {
  video2.pause();
  video2.currentTime = 0;
});

// ── Init ──────────────────────────────────────────────────────────
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

ensurePaused();

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll, { passive: true });
onScroll();
