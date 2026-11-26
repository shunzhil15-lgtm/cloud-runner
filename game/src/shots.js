// Optional camera/state presets for screenshots: open game/index.html?shot=fly (or end, crash).
CR.shots = {
  apply(g, name, api) {
    if (name === 'fly' || name === 'end' || name === 'crash') {
      api.begin(); const r = g.rings[3], p = g.p;
      for (let i = 0; i < 3; i++) { g.rings[i].got = true; g.rings[i].flash = 0; }
      Object.assign(p, { x: r.x - r.nx * 170 + r.nz * 25, z: r.z - r.nz * 170 - r.nx * 25, y: r.y - 6, h: r.h - 0.08, roll: 0.2, speed: 66 });
      g.airborne = true; g.score = 300; g.ringCount = 3; g.time = 61; api.snapCam();
      if (name === 'end') { g.score = 650; g.ringCount = 6; g.best = Math.max(g.best, 650); g.newBest = true; api.end('time'); }
      if (name === 'crash') { g.score = 400; g.ringCount = 4; api.end('crash'); }
    }
  }
};
