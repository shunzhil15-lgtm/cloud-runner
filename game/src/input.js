// Keyboard controls. Arrows/A/D bank, Up/Down pitch, W/S or Shift/Ctrl throttle.
(function () {
  const keys = {}, hit = {};
  const block = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter']);
  window.addEventListener('keydown', e => {
    if (block.has(e.code) || (e.ctrlKey && (e.code === 'KeyS' || e.code === 'KeyP'))) e.preventDefault();
    if (!e.repeat) hit[e.code] = true;
    keys[e.code] = true;
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  const any = (...c) => c.some(k => keys[k]);
  CR.input = {
    read() {
      return {
        roll: (any('ArrowRight', 'KeyD') ? 1 : 0) - (any('ArrowLeft', 'KeyA') ? 1 : 0),
        pitch: (any('ArrowUp') ? 1 : 0) - (any('ArrowDown') ? 1 : 0),
        thr: (any('KeyW', 'ShiftLeft', 'ShiftRight') ? 1 : 0) - (any('KeyS', 'ControlLeft', 'ControlRight') ? 1 : 0)
      };
    },
    consume(code) { const v = !!hit[code]; hit[code] = false; return v; }
  };
})();
