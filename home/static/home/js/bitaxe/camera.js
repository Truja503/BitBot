// camera.js — Camera + OrbitControls

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG } from './config.js';

let camera, controls;

export function initCamera(renderer) {
  camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.01,
    100
  );

  const pos = CONFIG.cameraPositions.intro;
  camera.position.set(...pos.position);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...pos.target);
  controls.enableDamping    = true;
  controls.dampingFactor    = 0.08;
  controls.minDistance      = 0.4;
  controls.maxDistance      = 4.0;
  controls.minPolarAngle    = 0.2;
  controls.maxPolarAngle    = Math.PI * 0.75;
  controls.update();

  return { camera, controls };
}

export function animateCameraTo(targetPos, targetLook, duration = 1200) {
  const startPos    = camera.position.clone();
  const startTarget = controls.target.clone();
  const endPos      = new THREE.Vector3(...targetPos);
  const endTarget   = new THREE.Vector3(...targetLook);

  const start = performance.now();

  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOut

    camera.position.lerpVectors(startPos, endPos, ease);
    controls.target.lerpVectors(startTarget, endTarget, ease);
    controls.update();

    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export { camera, controls };
