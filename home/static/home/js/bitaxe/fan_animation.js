// fan_animation.js — Fan blade rotation animation for BitAxe model

export class FanAnimation {
  constructor(bitaxeGroup) {
    this._blades      = [];
    this._hub         = null;
    this._speed       = 0;
    this._targetSpeed = 0;
    this._angle       = 0;

    // Search by exact name first, then fallback to name includes 'blade' or 'fan'
    bitaxeGroup.traverse(obj => {
      if (obj.name === 'fan_blades_group') {
        this._blades.push(obj);
      } else if (obj.name === 'fan_blade_hub') {
        this._hub = obj;
      } else if (!this._blades.length && obj.name && obj.name.toLowerCase().includes('blade')) {
        this._blades.push(obj);
      } else if (!this._hub && obj.name && obj.name.toLowerCase().includes('fan') && obj.isMesh) {
        this._hub = obj;
      }
    });
  }

  setSpeed(rpm) {
    // Convert RPM → rad/s, then divide by 60 for per-frame at ~60fps
    this._targetSpeed = (rpm / 60) * (Math.PI * 2) / 60;
  }

  update(delta) {
    // Smooth speed transition
    this._speed += (this._targetSpeed - this._speed) * 0.05;
    this._angle += this._speed * (delta || 0.016);

    this._blades.forEach(b => { b.rotation.y = this._angle; });
    if (this._hub) this._hub.rotation.y = this._angle;
  }

  getAngle() { return this._angle; }
  isSpinning() { return this._speed > 0.001; }
}
