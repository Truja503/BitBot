// config.js — Constantes globales para BitAxe VR

export const CONFIG = {
  debug: false,

  worldScale: 1.0, // 1 unit = 10 cm

  cameraPositions: {
    intro: {
      position: [1.2, 0.5, 1.5],   // 3/4 front angle, closer
      target:   [0, -0.43, 0],
    },
    inspect: {
      position: [0, 0.3, 1.0],     // straight front, close
      target:   [0, -0.43, 0],
    },
    setup_tutorial: {
      position: [0.8, 0.3, 1.2],   // lateral-front to see OLED and ports
      target:   [0, -0.43, 0],
    },
    mining_dashboard: {
      position: [-0.8, 0.6, 1.4],  // opposite angle, slightly higher
      target:   [0, -0.43, 0],
    },
  },

  animation: {
    idleRotationSpeed: 0.003,
    hotspotPulseSpeed: 2.0,
  },

  colors: {
    bg:         0x0A0911,
    panel:      0x1A1626,
    accent:     0x6E5BFF,
    accentBlue: 0x3DA4FF,
    text:       0xF3EFFA,
  },
};
