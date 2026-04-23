/**
 * scene-prep.js — Preparation layer for future Three.js integration.
 *
 * PURPOSE:
 *   This module is intentionally minimal. It defines the contract
 *   that the 3D scene will satisfy so the rest of the app can call
 *   it without knowing the implementation.
 *
 * HOW TO ACTIVATE IN A FUTURE PHASE:
 *   1. npm install three  (or add via CDN in the template)
 *   2. Import Three.js at the top of this file:
 *        import * as THREE from 'three';
 *   3. Implement mount() below using the WebGLRenderer + Scene setup.
 *   4. The canvas container is already in the dashboard template:
 *        <div id="scene-canvas-container" ...></div>
 *
 * INTEGRATION POINT (dashboard.js):
 *   When a nivel is selected, dashboard.js will call:
 *        ScenePrep.mount(container, nivelData)
 *   When the user navigates away:
 *        ScenePrep.unmount()
 */

'use strict';

let _renderer = null;
let _animFrame = null;

const ScenePrep = {
  /**
   * Initialise and mount a Three.js scene inside `container`.
   * @param {HTMLElement} container  - DOM node to render into
   * @param {object}      nivelData  - nivel config from BITBOT_DATA
   */
  mount(container, nivelData) {
    if (!container) return;
    console.info('[ScenePrep] mount() called — Three.js not yet loaded.');
    // TODO Phase 2:
    //   const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    //   renderer.setSize(container.clientWidth, container.clientHeight);
    //   container.appendChild(renderer.domElement);
    //   _renderer = renderer;
    //   _animate();
  },

  /**
   * Tear down the renderer and release GPU resources.
   */
  unmount() {
    if (_animFrame) cancelAnimationFrame(_animFrame);
    if (_renderer) {
      _renderer.dispose();
      _renderer.domElement.remove();
      _renderer = null;
    }
  },

  /**
   * Handle container resize (call from ResizeObserver or window resize).
   * @param {number} w
   * @param {number} h
   */
  resize(w, h) {
    if (!_renderer) return;
    // TODO: _renderer.setSize(w, h); camera.aspect = w/h; camera.updateProjectionMatrix();
  },
};

// Internal animation loop (used once Three.js is active)
function _animate() {
  _animFrame = requestAnimationFrame(_animate);
  // TODO: _renderer.render(scene, camera);
}

export default ScenePrep;
