// scene.js — Scene + lighting

import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

let scene;

export function initScene() {
  RectAreaLightUniformsLib.init();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0A0911);
  scene.fog = new THREE.FogExp2(0x0A0911, 0.035);

  return scene;
}

export function initLighting(scene) {
  RectAreaLightUniformsLib.init();

  // Soft ambient — warm tint
  const ambient = new THREE.AmbientLight(0xfff0e0, 0.35);
  scene.add(ambient);

  // Key light — upper-left-front
  const keyLight = new THREE.DirectionalLight(0xfffef5, 2.5);
  keyLight.position.set(-2, 5, 3);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width  = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near   = 0.1;
  keyLight.shadow.camera.far    = 20;
  keyLight.shadow.camera.left   = -2;
  keyLight.shadow.camera.right  =  2;
  keyLight.shadow.camera.top    =  2;
  keyLight.shadow.camera.bottom = -2;
  keyLight.shadow.bias          = -0.0005;
  keyLight.shadow.normalBias    =  0.02;
  scene.add(keyLight);

  // Rim — cool blue from behind
  const rimLight = new THREE.DirectionalLight(0x88aaf8, 0.9);
  rimLight.position.set(3, 2, -4);
  scene.add(rimLight);

  // Fill — warm orange from below-front
  const fillLight = new THREE.PointLight(0xff8844, 0.5, 6);
  fillLight.position.set(0.5, -0.2, 1.5);
  scene.add(fillLight);

  // ASIC heat glow — orange close to chip position (world Y = -0.46 + 0.04 = -0.42)
  const asicGlow = new THREE.PointLight(0xff5500, 0.4, 0.8);
  asicGlow.position.set(0, -0.38, 0);
  scene.add(asicGlow);

  // OLED glow — subtle blue (world pos: 0.28, -0.46+0.04, 0.25)
  const oledGlow = new THREE.PointLight(0x0088ff, 0.3, 0.5);
  oledGlow.position.set(0.28, -0.42, 0.25);
  scene.add(oledGlow);

  // RectAreaLight for tabletop reflection
  const rectLight = new THREE.RectAreaLight(0x5533ff, 1.2, 2.5, 0.4);
  rectLight.position.set(0, -0.44, 0.9);
  rectLight.lookAt(0, -0.47, 0);
  scene.add(rectLight);

  return { ambient, keyLight, rimLight, fillLight, asicGlow, oledGlow, rectLight };
}

export { scene };
