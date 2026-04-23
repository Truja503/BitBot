// state.js — App state machine

// Estados posibles: 'intro' | 'inspect' | 'setup_tutorial' | 'mining_dashboard'

let _state = 'intro';
const _listeners = [];

export function getState() {
  return _state;
}

export function setState(newState, data = {}) {
  if (newState === _state) return;
  const prev = _state;
  _state = newState;
  _listeners.forEach(fn => fn(newState, prev, data));
}

export function onStateChange(fn) {
  _listeners.push(fn);
  return () => {
    const i = _listeners.indexOf(fn);
    if (i !== -1) _listeners.splice(i, 1);
  };
}

// Debug: teclas 1-4 para cambiar de estado
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', e => {
    const map = { '1': 'intro', '2': 'inspect', '3': 'setup_tutorial', '4': 'mining_dashboard' };
    if (map[e.key]) {
      setState(map[e.key]);
      console.log('[state] →', map[e.key]);
    }
  });
}
