'use strict';

// ── Elements ─────────────────────────────────────────────────────
const wrapper       = document.getElementById('videoWrapper');
const video         = document.getElementById('nodeVideo');
const controls      = document.getElementById('controls');
const playBtn       = document.getElementById('playBtn');
const iconPlay      = document.getElementById('iconPlay');
const iconPause     = document.getElementById('iconPause');
const rewindBtn     = document.getElementById('rewindBtn');
const muteBtn       = document.getElementById('muteBtn');
const iconVol       = document.getElementById('iconVol');
const iconMute      = document.getElementById('iconMute');
const volSlider     = document.getElementById('volSlider');
const speedBtn      = document.getElementById('speedBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const iconFs        = document.getElementById('iconFs');
const iconFsExit    = document.getElementById('iconFsExit');
const progressTrack = document.getElementById('progressTrack');
const progressFill  = document.getElementById('progressFill');
const progressThumb = document.getElementById('progressThumb');
const timeElapsed   = document.getElementById('timeElapsed');
const timeDuration  = document.getElementById('timeDuration');
const completeOverlay = document.getElementById('completeOverlay');
const claimBtn       = document.getElementById('claimBtn');

// ── Data from server ──────────────────────────────────────────────
const D = window.NC_DATA || {};

// ── State ─────────────────────────────────────────────────────────
const SPEEDS       = [0.5, 0.75, 1, 1.25, 1.5, 2];
let   speedIdx     = 2; // default 1×
let   controlsTimer;
let   completed    = D.already_completed || false;
let   claimPending = false;

// ── Helpers ───────────────────────────────────────────────────────
function fmtTime(s) {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const ss = String(Math.floor(s % 60)).padStart(2, '0');
  return `${m}:${ss}`;
}

function showControls() {
  wrapper.classList.add('nc-controls--visible');
  clearTimeout(controlsTimer);
  controlsTimer = setTimeout(() => {
    if (!video.paused) wrapper.classList.remove('nc-controls--visible');
  }, 3000);
}

function updatePlayIcons() {
  if (video.paused) {
    iconPlay.style.display  = '';
    iconPause.style.display = 'none';
  } else {
    iconPlay.style.display  = 'none';
    iconPause.style.display = '';
  }
}

function updateProgress() {
  if (!video.duration) return;
  const pct = (video.currentTime / video.duration) * 100;
  progressFill.style.width = `${pct}%`;
  progressThumb.style.left = `${pct}%`;
  timeElapsed.textContent  = fmtTime(video.currentTime);
}

// ── Play / Pause ──────────────────────────────────────────────────
function togglePlay() {
  if (video.paused) video.play();
  else              video.pause();
}

wrapper.addEventListener('click', (e) => {
  // Only toggle if click is on the video/wrapper, not controls
  if (e.target.closest('.nc-controls') || e.target.closest('.nc-complete-overlay')) return;
  togglePlay();
});

playBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePlay(); });

video.addEventListener('play',  () => { updatePlayIcons(); showControls(); });
video.addEventListener('pause', () => { updatePlayIcons(); showControls(); });

// ── Rewind 10s ────────────────────────────────────────────────────
rewindBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  video.currentTime = Math.max(0, video.currentTime - 10);
  showControls();
});

// ── Volume / Mute ─────────────────────────────────────────────────
muteBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  video.muted = !video.muted;
  volSlider.value = video.muted ? 0 : video.volume;
  iconVol.style.display  = video.muted ? 'none' : '';
  iconMute.style.display = video.muted ? '' : 'none';
});

volSlider.addEventListener('input', (e) => {
  e.stopPropagation();
  video.volume = parseFloat(volSlider.value);
  video.muted  = video.volume === 0;
  iconVol.style.display  = video.muted ? 'none' : '';
  iconMute.style.display = video.muted ? '' : 'none';
});

// ── Playback speed ────────────────────────────────────────────────
speedBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  speedIdx = (speedIdx + 1) % SPEEDS.length;
  const spd = SPEEDS[speedIdx];
  video.playbackRate = spd;
  speedBtn.textContent = spd === 1 ? '1×' : `${spd}×`;
  showControls();
});

// ── Progress scrub ────────────────────────────────────────────────
let isScrubbing = false;

function scrubTo(e) {
  const rect = progressTrack.getBoundingClientRect();
  const pct  = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  video.currentTime = pct * (video.duration || 0);
  updateProgress();
}

progressTrack.addEventListener('mousedown', (e) => {
  e.stopPropagation();
  isScrubbing = true;
  scrubTo(e);
});
document.addEventListener('mousemove', (e) => { if (isScrubbing) scrubTo(e); });
document.addEventListener('mouseup',   ()  => { isScrubbing = false; });

// Touch support
progressTrack.addEventListener('touchstart', (e) => {
  e.stopPropagation();
  isScrubbing = true;
  scrubTo(e.touches[0]);
}, { passive: true });
document.addEventListener('touchmove',  (e) => { if (isScrubbing) scrubTo(e.touches[0]); }, { passive: true });
document.addEventListener('touchend',   ()  => { isScrubbing = false; });

// ── Fullscreen ────────────────────────────────────────────────────
fullscreenBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!document.fullscreenElement) {
    wrapper.requestFullscreen?.() || wrapper.webkitRequestFullscreen?.();
  } else {
    document.exitFullscreen?.() || document.webkitExitFullscreen?.();
  }
});

document.addEventListener('fullscreenchange', () => {
  const isFs = !!document.fullscreenElement;
  iconFs.style.display     = isFs ? 'none' : '';
  iconFsExit.style.display = isFs ? '' : 'none';
});

// ── Metadata / time update ────────────────────────────────────────
video.addEventListener('loadedmetadata', () => {
  timeDuration.textContent = fmtTime(video.duration);
});
video.addEventListener('timeupdate', updateProgress);

// ── Controls auto-show on mouse move ─────────────────────────────
wrapper.addEventListener('mousemove', showControls);
wrapper.addEventListener('touchstart', showControls, { passive: true });

// ── Keyboard shortcuts ────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  switch (e.code) {
    case 'Space':
    case 'KeyK':
      e.preventDefault();
      togglePlay();
      break;
    case 'ArrowLeft':
      video.currentTime = Math.max(0, video.currentTime - 5);
      showControls();
      break;
    case 'ArrowRight':
      video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
      showControls();
      break;
    case 'KeyM':
      muteBtn.click();
      break;
    case 'KeyF':
      fullscreenBtn.click();
      break;
  }
});

// ── Completion detection ──────────────────────────────────────────
video.addEventListener('ended', handleCompletion);

video.addEventListener('timeupdate', () => {
  if (!completed && video.duration && video.currentTime >= video.duration * 0.98) {
    handleCompletion();
  }
});

async function handleCompletion() {
  if (completed) return;
  completed = true;

  // Show overlay immediately
  completeOverlay.style.display = 'flex';

  // Award XP if authenticated
  if (D.authenticated && D.api_complete_url) {
    try {
      await fetch(D.api_complete_url, {
        method: 'POST',
        headers: {
          'X-CSRFToken': D.csrf_token,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      console.warn('Could not award XP:', err);
    }
  }
}

claimBtn.addEventListener('click', () => {
  if (claimPending) return;
  claimPending = true;
  window.location.href = D.dashboard_url || '/dashboard/';
});

// ── Init ──────────────────────────────────────────────────────────
// If already completed, don't show the overlay again on load but
// still let them watch without blocking.
showControls();
