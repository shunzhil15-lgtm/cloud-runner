// Terrain, river, runway, rings and clouds. Heading 0 = +z (north), x = east.
(function () {
  const C = CR.CFG, RW = C.RUNWAY;
  const W = CR.world = {};
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function rng(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  W.clamp = clamp; W.sm = sm; W.rng = rng;
  W.riverX = z => 300 + 130 * Math.sin(z / 650) + 50 * Math.sin(z / 230 + 1);

  function hills(x, z) {
    const v = 55 + 34 * Math.sin(x * .0042 + 1.3) * Math.cos(z * .0036) + 22 * Math.sin(x * .0095 + z * .0068 + 2) +
      11 * Math.sin(x * .021 - z * .017) + 5 * Math.sin(z * .04 + x * .03);
    return 12 + Math.pow(Math.max(0, v + 10) / 110, 1.25) * 72;
  }
  // Raw height; below 0 means river bed (water surface is at 0).
  W.height = function (x, z) {
    let h = hills(x, z);
    const dx = Math.max(RW.x0 - x, 0, x - RW.x1), dz = Math.max(RW.z0 - z, 0, z - RW.z1);
    h = C.GROUND_Y + (h - C.GROUND_Y) * sm(60, 380, Math.hypot(dx, dz));
    const c = sm(95, 25, Math.abs(x - W.riverX(z)));
    return h * (1 - c) - 6 * c;
  };
  W.groundAt = (x, z) => Math.max(0, W.height(x, z));
  W.onRunway = (x, z) => x >= RW.x0 && x <= RW.x1 && z >= RW.z0 && z <= RW.z1;

  // Golden rings follow a gentle S-curve ahead of the runway.
  W.makeRings = function () {
    const out = []; let x = 0, z = 420, py = 0;
    for (let i = 0; i < C.RING_COUNT; i++) {
      const th = 0.55 * Math.sin(i * 0.5) + 0.1 * Math.sin(i * 1.3);
      x += Math.sin(th) * C.RING_SPACING; z += Math.cos(th) * C.RING_SPACING;
      const gr = Math.max(W.groundAt(x, z), W.groundAt(x + 40, z), W.groundAt(x - 40, z), W.groundAt(x, z + 40));
      let y = gr + 45 + 40 * (0.5 + 0.5 * Math.sin(i * 0.9));
      if (i) y = clamp(y, py - 70, py + 70);
      y = Math.max(y, gr + 40); py = y;
      out.push({ x, y, z, nx: Math.sin(th), nz: Math.cos(th), h: th, got: false, flash: 1 });
    }
    return out;
  };
  W.makeClouds = function () {
    const r = rng(7), a = [];
    for (let i = 0; i < 48; i++) a.push({ x: (r() - .5) * 9000, z: (r() - .5) * 9000, y: 260 + r() * 260, s: 45 + r() * 75, k: 4 + (r() * 3 | 0), seed: r() });
    return a;
  };
})();
