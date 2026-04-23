// environment.js — Tech lab tabletop environment

import * as THREE from 'three';

export function buildEnvironment(scene) {
  // ── Grid canvas texture ──
  const gridCanvas = document.createElement('canvas');
  gridCanvas.width = gridCanvas.height = 256;
  const gctx = gridCanvas.getContext('2d');
  gctx.fillStyle = '#1a1628';
  gctx.fillRect(0, 0, 256, 256);
  gctx.strokeStyle = 'rgba(110,91,255,0.06)';
  gctx.lineWidth = 1;
  for (let i = 0; i <= 256; i += 16) {
    gctx.beginPath(); gctx.moveTo(i, 0); gctx.lineTo(i, 256); gctx.stroke();
    gctx.beginPath(); gctx.moveTo(0, i); gctx.lineTo(256, i); gctx.stroke();
  }
  const gridTex = new THREE.CanvasTexture(gridCanvas);
  gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping;
  gridTex.repeat.set(6, 4);

  // ── Tabletop ──
  const tableGeo  = new THREE.BoxGeometry(3, 0.06, 2);
  const tableMat  = new THREE.MeshStandardMaterial({
    color:     0x1a1628,
    roughness: 0.3,
    metalness: 0.6,
    map:       gridTex,
  });
  const tabletop = new THREE.Mesh(tableGeo, tableMat);
  tabletop.position.set(0, -0.5, 0);
  tabletop.receiveShadow = true;
  scene.add(tabletop);

  // ── Edge glow strip (front) ──
  const edgeGeo = new THREE.BoxGeometry(3, 0.02, 0.01);
  const edgeMat = new THREE.MeshStandardMaterial({
    color:            0x6E5BFF,
    emissive:         new THREE.Color(0x6E5BFF),
    emissiveIntensity: 0.8,
    roughness:        0.2,
    metalness:        0.0,
  });
  const edgeGlow = new THREE.Mesh(edgeGeo, edgeMat);
  edgeGlow.position.set(0, -0.48, 1.005);
  scene.add(edgeGlow);

  // ── Pedestal para BitAxe — bigger than the device (0.90×0.58) ──
  const pedestalGeo = new THREE.BoxGeometry(1.10, 0.025, 0.70);
  const pedestalMat = new THREE.MeshStandardMaterial({
    color:     0x0e0c1a,
    roughness: 0.15,
    metalness: 0.92,
  });
  const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
  pedestal.position.set(0, -0.465, 0);
  pedestal.receiveShadow = true;
  pedestal.castShadow    = true;
  scene.add(pedestal);

  // Pedestal edge glow — front edge orange accent
  const pedEdgeMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: new THREE.Color(0xf97316),
    emissiveIntensity: 0.5,
  });
  const pedEdge = new THREE.Mesh(new THREE.BoxGeometry(1.10, 0.003, 0.01), pedEdgeMat);
  pedEdge.position.set(0, -0.452, 0.355);
  scene.add(pedEdge);

  // ── Back wall — prevents dark void ──
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x0d0b16,
    roughness: 0.95,
    metalness: 0.0,
  });
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), wallMat);
  backWall.position.set(0, 0.5, -2.5);
  backWall.receiveShadow = true;
  scene.add(backWall);

  // Side walls
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), wallMat.clone());
  leftWall.position.set(-3, 0.5, -0.5);
  leftWall.rotation.y = Math.PI / 2;
  scene.add(leftWall);

  // ── Shadow-catching plane bajo el tabletop ──
  const shadowGeo  = new THREE.PlaneGeometry(8, 8);
  const shadowMat  = new THREE.ShadowMaterial({ opacity: 0.45 });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -0.54;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  // ── Partículas flotantes ──
  const particleCount = 30;
  const particleGeo   = new THREE.BufferGeometry();
  const positions      = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 4;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 3;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color:       0x6E5BFF,
    size:        0.012,
    transparent: true,
    opacity:     0.08,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // Animar partículas (devolvemos referencia para el loop)
  return { tabletop, pedestal, edgeGlow, particles };
}

export function updateEnvironment(particles, clock) {
  const t = clock.getElapsedTime();
  const pos = particles.geometry.attributes.position.array;
  for (let i = 0; i < pos.length / 3; i++) {
    pos[i * 3 + 1] += Math.sin(t * 0.4 + i * 0.7) * 0.00015;
  }
  particles.geometry.attributes.position.needsUpdate = true;
}
