// renderer.js — WebGLRenderer + XR setup

import * as THREE from 'three';

let renderer;

export function initRenderer(canvas) {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Color + tone mapping
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping      = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // Physically correct lights (r155+ uses useLegacyLights = false)
  renderer.useLegacyLights = false;

  // Shadows
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;

  // WebXR
  renderer.xr.enabled = true;

  return renderer;
}

export function onResize(camera) {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

export { renderer };
