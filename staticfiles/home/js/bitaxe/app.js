// app.js — Boot principal BitAxe VR

import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

import { initRenderer, onResize }          from './renderer.js';
import { initScene, initLighting }         from './scene.js';
import { initCamera, animateCameraTo }     from './camera.js';
import { buildEnvironment, updateEnvironment } from './environment.js';
import { buildBitAxePlaceholder, updateBitAxe } from './bitaxe_model.js';
import { InteractionManager }              from './interaction.js';
import { HotspotManager }                 from './hotspots.js';
import { setState, getState, onStateChange } from './state.js';
import { CONFIG }                          from './config.js';
import { simulateProgress }               from './loader.js';
import { TutorialManager }               from './tutorial_manager.js';
import { FanAnimation }                  from './fan_animation.js';
import { InspectionMode }               from './inspection_mode.js';
import { AxeOSScreen }                  from './axeos_screen.js';

export function init(canvas) {
  // ── 1. Renderer ──
  const renderer = initRenderer(canvas);

  // ── 2. Scene + lighting ──
  const scene = initScene();
  initLighting(scene);

  // ── 3. Camera + controls ──
  const { camera, controls } = initCamera(renderer);

  // ── 4. Environment ──
  const { particles } = buildEnvironment(scene);

  // ── 5. BitAxe placeholder ──
  const bitaxeGroup = buildBitAxePlaceholder(scene);

  // ── 5b. AxeOS virtual screen (separate from device) ──
  const axeosScreen = new AxeOSScreen(scene);

  // ── 6. Interaction manager ──
  const interaction = new InteractionManager(renderer, scene);

  // Register BitAxe group
  interaction.register(bitaxeGroup, {
    onHover: () => {},
    onBlur:  () => {},
    onClick: () => {
      if (getState() === 'intro') setState('inspect');
    },
  });

  // Register AxeOS screen for click interaction
  interaction.register(axeosScreen.getMesh(), {
    onHover: () => { renderer.domElement.style.cursor = 'pointer'; },
    onBlur:  () => { renderer.domElement.style.cursor = ''; },
    onClick: () => {
      const modes = ['dashboard', 'settings', 'off'];
      const current = axeosScreen._mode;
      const next = modes[(modes.indexOf(current) + 1) % modes.length];
      axeosScreen.setMode(next);
    },
  });

  // ── 7. Hotspot manager ──
  const hotspots = new HotspotManager(scene);
  hotspots.getObjects().forEach(obj => {
    interaction.register(obj, {
      onHover: (o) => hotspots.onHover(o),
      onBlur:  (o) => hotspots.onBlur(o),
      onClick: (o) => hotspots.onClick(o),
    });
  });

  // ── 8. State machine ──
  onStateChange((newState, prevState) => {
    const pos = CONFIG.cameraPositions[newState];
    if (pos) animateCameraTo(pos.position, pos.target);

    if (newState === 'inspect') {
      hotspots.show();
    } else {
      hotspots.hide();
    }

    // Update toolbar active state
    document.querySelectorAll('.tb-btn').forEach(btn => btn.classList.remove('active'));
    const btnMap = {
      inspect:         'btnInspect',
      setup_tutorial:  'btnTutorial',
      mining_dashboard:'btnMining',
    };
    if (btnMap[newState]) {
      document.getElementById(btnMap[newState])?.classList.add('active');
    }

    // Update HUD
    const hudEl = document.getElementById('hudMode');
    if (hudEl) {
      const labels = {
        intro:            '🌐 Intro',
        inspect:          '🔍 Inspect',
        setup_tutorial:   '📋 Tutorial',
        mining_dashboard: '⛏ Mining',
      };
      hudEl.textContent = labels[newState] || newState;
    }
  });

  setState('intro');

  // ── Tutorial Manager ──
  const tutorial = new TutorialManager(scene, camera, interaction);

  // ── Fan Animation ──
  const fanAnim = new FanAnimation(bitaxeGroup);
  fanAnim.setSpeed(3000); // 3000 RPM default

  // ── Inspection Mode ──
  const inspection = new InspectionMode(renderer, scene, camera, controls);

  // Wire Inspect button
  document.getElementById('btnInspect')?.addEventListener('click', () => {
    inspection.toggle();
    setState('inspect');
  });

  // Keyboard: 'i' toggle inspection
  window.addEventListener('keydown', e => {
    if (e.key === 'i' || e.key === 'I') inspection.toggle();
  });

  // Expose for debug
  window._inspection = inspection;

  // Tutorial: step → camera hint + hotspot highlight
  window.addEventListener('tutorial:step', e => {
    const { step } = e.detail;
    if (step.hotspot) {
      hotspots.highlightHotspot(step.hotspot);
    } else {
      hotspots.clearHighlight();
    }
  });

  // Tutorial: complete
  window.addEventListener('tutorial:complete', () => {
    console.log('[BitAxe] Tutorial completed!');
    // TODO: call API to mark tutorial as completed
  });

  // Wire tutorial start events
  window.addEventListener('umbrel:startTutorial', () => tutorial.start());
  window._bitaxeTutorial = tutorial;

  // Wire toolbar Tutorial button
  document.getElementById('btnTutorial')?.addEventListener('click', () => {
    tutorial.start();
    setState('setup_tutorial');
  });

  // ── 9. Clock ──
  const clock = new THREE.Clock();
  let idleRotating = true;

  // Stop idle rotation on inspect
  onStateChange(s => { idleRotating = (s === 'intro'); });

  // ── 10. VR Button ──
  const vrBtn = document.getElementById('btnVR');
  if (navigator.xr) {
    navigator.xr.isSessionSupported('immersive-vr').then(supported => {
      if (supported) {
        const vrDomBtn = VRButton.createButton(renderer);
        // Hide default VRButton DOM element, wire our own button
        vrDomBtn.style.display = 'none';
        document.body.appendChild(vrDomBtn);
        if (vrBtn) {
          vrBtn.addEventListener('click', () => vrDomBtn.click());
        }
      } else {
        if (vrBtn) {
          vrBtn.disabled = true;
          vrBtn.title    = 'WebXR not supported';
        }
      }
    });
  } else {
    if (vrBtn) { vrBtn.disabled = true; vrBtn.title = 'WebXR not available'; }
  }

  // ── Wire toolbar buttons ──
  window.setMode = (mode) => setState(mode);

  // ── Resize ──
  window.addEventListener('resize', () => onResize(camera));

  // ── Loading simulation ──
  simulateProgress(
    pct => {
      const fill = document.getElementById('baLoadFill');
      const pctEl = document.getElementById('baLoadPct');
      if (fill)  fill.style.width = pct + '%';
      if (pctEl) pctEl.textContent = pct + '%';
    },
    () => {
      const loading = document.getElementById('bitaxe-loading');
      if (loading) {
        loading.style.opacity    = '0';
        loading.style.transition = 'opacity 0.6s ease';
        setTimeout(() => { loading.style.display = 'none'; }, 700);
      }
    }
  );

  // ── Animate loop ──
  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();

    controls.update();
    updateEnvironment(particles, clock);
    updateBitAxe(bitaxeGroup, clock, idleRotating);
    axeosScreen.update(delta, clock);
    fanAnim.update(delta);
    hotspots.update(clock);
    interaction.update(camera);

    if (inspection && inspection.isActive() && inspection.getViewMode() !== 'perspective') {
      inspection.render(camera);
    } else {
      renderer.render(scene, camera);
    }
  });
}
