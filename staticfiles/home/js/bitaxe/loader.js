// loader.js — LoadingManager with progress callbacks

import * as THREE from 'three';

let _manager = null;

export function createLoadingManager(onProgress, onLoad) {
  _manager = new THREE.LoadingManager(
    // onLoad
    () => {
      if (onLoad) onLoad();
    },
    // onProgress
    (url, loaded, total) => {
      const pct = Math.round((loaded / total) * 100);
      if (onProgress) onProgress(pct, url);
    },
    // onError
    (url) => {
      console.warn('[loader] Error loading:', url);
    }
  );
  return _manager;
}

export function getLoadingManager() {
  return _manager;
}

// Simulate progress for scenes that don't load external assets
export function simulateProgress(onProgress, onLoad) {
  let pct = 0;
  const interval = setInterval(() => {
    pct = Math.min(pct + Math.random() * 15, 99);
    if (onProgress) onProgress(Math.floor(pct));
    if (pct >= 99) {
      clearInterval(interval);
      setTimeout(() => {
        if (onProgress) onProgress(100);
        setTimeout(() => { if (onLoad) onLoad(); }, 300);
      }, 200);
    }
  }, 80);
}
