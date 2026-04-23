// interaction.js — Mouse picking + XR controller interaction

import * as THREE from 'three';

export class InteractionManager {
  constructor(renderer, scene) {
    this._renderer    = renderer;
    this._scene       = scene;
    this._raycaster   = new THREE.Raycaster();
    this._mouse       = new THREE.Vector2(-9999, -9999);
    this._registered  = new Map(); // object3d → { onHover, onBlur, onClick }
    this._hovered     = null;
    this._controllers = [];

    // Mouse events
    renderer.domElement.addEventListener('mousemove', e => this._onMouseMove(e));
    renderer.domElement.addEventListener('click',     e => this._onClick(e));

    // XR controllers
    this._setupXRControllers();
  }

  _setupXRControllers() {
    for (let i = 0; i < 2; i++) {
      const ctrl = this._renderer.xr.getController(i);
      this._scene.add(ctrl);

      // Visual ray
      const rayGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -2),
      ]);
      const rayMat  = new THREE.LineBasicMaterial({ color: 0x6E5BFF, transparent: true, opacity: 0.5 });
      const rayLine = new THREE.Line(rayGeo, rayMat);
      ctrl.add(rayLine);

      ctrl.addEventListener('selectstart', () => {
        // Find intersection from controller direction
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(ctrl.matrixWorld);
        const ray = new THREE.Raycaster();
        ray.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
        ray.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

        const objects   = [...this._registered.keys()];
        const intersects = ray.intersectObjects(objects, true);
        if (intersects.length > 0) {
          const hit = this._findRegistered(intersects[0].object);
          if (hit) {
            const cbs = this._registered.get(hit);
            window.dispatchEvent(new CustomEvent('xr:select', { detail: { object: hit } }));
            if (cbs?.onClick) cbs.onClick(hit);
          }
        }
      });

      this._controllers.push(ctrl);
    }
  }

  _findRegistered(obj) {
    // Walk up hierarchy to find registered object
    let o = obj;
    while (o) {
      if (this._registered.has(o)) return o;
      o = o.parent;
    }
    return null;
  }

  _onMouseMove(e) {
    const rect = this._renderer.domElement.getBoundingClientRect();
    this._mouse.set(
      ((e.clientX - rect.left) / rect.width)  *  2 - 1,
      ((e.clientY - rect.top)  / rect.height) * -2 + 1
    );
  }

  _onClick(e) {
    const rect   = this._renderer.domElement.getBoundingClientRect();
    const mouse  = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width)  *  2 - 1,
      ((e.clientY - rect.top)  / rect.height) * -2 + 1
    );
    this._raycaster.setFromCamera(mouse, this._camera);

    const objects    = [...this._registered.keys()];
    const intersects = this._raycaster.intersectObjects(objects, true);
    if (intersects.length > 0) {
      const hit = this._findRegistered(intersects[0].object);
      if (hit) {
        const cbs = this._registered.get(hit);
        if (cbs?.onClick) cbs.onClick(hit);
      }
    }
  }

  register(object3d, callbacks = {}) {
    this._registered.set(object3d, callbacks);
  }

  unregister(object3d) {
    this._registered.delete(object3d);
    if (this._hovered === object3d) this._hovered = null;
  }

  update(camera) {
    this._camera = camera;
    this._raycaster.setFromCamera(this._mouse, camera);

    const objects    = [...this._registered.keys()];
    const intersects = this._raycaster.intersectObjects(objects, true);

    let newHovered = null;
    if (intersects.length > 0) {
      newHovered = this._findRegistered(intersects[0].object);
    }

    // Hover state transitions
    if (newHovered !== this._hovered) {
      if (this._hovered) {
        const cbs = this._registered.get(this._hovered);
        if (cbs?.onBlur) cbs.onBlur(this._hovered);
      }
      if (newHovered) {
        const cbs = this._registered.get(newHovered);
        if (cbs?.onHover) cbs.onHover(newHovered);
      }
      this._hovered = newHovered;
    }

    // Cursor
    this._renderer.domElement.style.cursor = newHovered ? 'pointer' : 'default';
  }
}
