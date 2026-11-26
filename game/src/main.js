// Game loop, flight model, scoring, state machine and WebAudio sound.
(function () {
  'use strict';
  const C = CR.CFG, W = CR.world, R = CR.render, I = CR.input, clamp = W.clamp;
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
  let best = 0; try { best = +localStorage.getItem('cloudrunner.best') || 0; } catch (e) {}
  const g = CR.game = { state: 'start', t: 0, best, clouds: W.makeClouds(), popups: [] };

  // ---- sound (all synthesized, optional) ----
  const A = {
    ctx: null, muted: false,
    start() {
      try {
        if (this.ctx) { this.ctx.resume(); return; }
        const c = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 460;
        this.gain = c.createGain(); this.gain.gain.value = 0; f.connect(this.gain); this.gain.connect(c.destination);
        this.o = [0, 7].map(det => { const o = c.createOscillator(); o.type = 'sawtooth'; o.detune.value = det; o.frequency.value = 60; o.connect(f); o.start(); return o; });
      } catch (e) { this.ctx = null; }
    },
    update(speedFrac, on) {
      if (!this.ctx || !this.gain) return; const t = this.ctx.currentTime;
      this.o.forEach(o => o.frequency.setTargetAtTime(52 + speedFrac * 44, t, 0.1));
      this.gain.gain.setTargetAtTime(on && !this.muted ? 0.05 : 0, t, 0.1);
    },
    chime() {
      if (!this.ctx || this.muted) return;
      try {
        const c = this.ctx, t = c.currentTime;
        [880, 1318.5].forEach((fr, i) => {
          const o = c.createOscillator(), gn = c.createGain(); o.type = 'sine'; o.frequency.value = fr;
          gn.gain.setValueAtTime(0.0001, t + i * 0.09); gn.gain.exponentialRampToValueAtTime(0.18, t + i * 0.09 + 0.02); gn.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.5);
          o.connect(gn); gn.connect(c.destination); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.55);
        });
      } catch (e) {}
    }
  };

  // ---- state ----
  function reset() {
    g.rings = W.makeRings(); g.score = 0; g.ringCount = 0; g.time = C.FLIGHT_TIME; g.airborne = false;
    g.reason = ''; g.newBest = false; g.endT = 0; g.popups = []; g.next = null;
    g.p = { x: C.START.x, y: W.groundAt(C.START.x, C.START.z) + C.GEAR, z: C.START.z, h: 0, pitch: 0, roll: 0, speed: C.START_SPEED, boost: 0, throttle: 0.5, vy: 0, prop: 0 };
    g.cam = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0 };
    updateCam(0, true);
  }
  function begin() { reset(); g.state = 'fly'; A.start(); }
  function end(reason) {
    g.state = 'end'; g.reason = reason; g.endT = 0;
    if (reason === 'landed') { g.score += C.LAND_BONUS; g.p.speed = 0; }
    if (g.score > g.best) { g.best = g.score; g.newBest = g.score > 0; try { localStorage.setItem('cloudrunner.best', String(g.best)); } catch (e) {} }
  }
  function updateCam(dt, snap) {
    const p = g.p, c = g.cam, k = v => snap ? 1 : Math.min(1, v * dt);
    c.yaw += angDiff(p.h, c.yaw) * k(2.6);
    c.x = p.x - Math.sin(c.yaw) * C.CAM_DIST; c.z = p.z - Math.cos(c.yaw) * C.CAM_DIST;
    c.y += (p.y + C.CAM_UP - c.y) * k(5); if (snap) c.y = p.y + C.CAM_UP;
    c.y = Math.max(c.y, W.groundAt(c.x, c.z) + 3);
    const pt = Math.atan2(p.y + Math.sin(p.pitch) * 60 - c.y, C.CAM_DIST + 60 * Math.cos(p.pitch));
    c.pitch += (pt - c.pitch) * k(3);
    c.roll += (p.roll * 0.25 - c.roll) * k(4);
  }
  function fly(dt) {
    const p = g.p, inp = I.read(), gnd0 = W.groundAt(p.x, p.z);
    const onGround = !g.airborne && p.y <= gnd0 + C.GEAR + 0.05;
    p.throttle = clamp(p.throttle + inp.thr * 0.55 * dt, 0, 1);
    p.boost = Math.max(0, p.boost - 8 * dt);
    let rollT = onGround ? 0 : inp.roll * C.MAX_ROLL;
    let pitchT = inp.pitch > 0 ? C.MAX_PITCH_UP : inp.pitch < 0 ? -C.MAX_PITCH_DOWN : 0;
    if (onGround && (p.speed < C.LIFTOFF_SPEED || pitchT < 0)) pitchT = 0;
    p.roll += (rollT - p.roll) * Math.min(1, 3.2 * dt);
    p.pitch += (pitchT - p.pitch) * Math.min(1, 2.2 * dt);
    const target = C.SPEED_MIN + p.throttle * C.SPEED_RANGE + p.boost;
    p.speed += (target - p.speed) * Math.min(1, (onGround ? 0.6 : 0.9) * dt);
    if (!onGround) p.h += Math.tan(p.roll) * 9.8 / Math.max(p.speed, 30) * C.TURN_K * dt;
    const sink = Math.max(0, 45 - p.speed) * 0.35;
    p.vy = Math.sin(p.pitch) * p.speed - sink;
    const hv = Math.cos(p.pitch) * p.speed, ox = p.x, oy = p.y, oz = p.z;
    p.x += Math.sin(p.h) * hv * dt; p.z += Math.cos(p.h) * hv * dt; p.y = Math.min(C.CEILING, p.y + p.vy * dt);
    p.prop += (30 + p.throttle * 40) * dt;
    const gnd = W.groundAt(p.x, p.z);
    if (p.y - gnd > 8) g.airborne = true;
    if (p.y < gnd + C.GEAR) {
      if (!g.airborne) { p.y = gnd + C.GEAR; p.vy = 0; }
      else if (W.onRunway(p.x, p.z) && -p.vy <= C.LAND_MAX_SINK && Math.abs(p.pitch) < C.LAND_MAX_PITCH && Math.abs(p.roll) < C.LAND_MAX_ROLL) { p.y = gnd + C.GEAR; end('landed'); return; }
      else { p.y = Math.max(p.y, gnd + 0.5); end('crash'); return; }
    }
    // ring crossing (segment vs ring plane)
    for (const r of g.rings) {
      if (r.got) continue;
      const s0 = (ox - r.x) * r.nx + (oz - r.z) * r.nz, s1 = (p.x - r.x) * r.nx + (p.z - r.z) * r.nz;
      if (s0 === s1 || (s0 < 0) === (s1 < 0)) continue;
      const t = s0 / (s0 - s1);
      if (Math.hypot(ox + (p.x - ox) * t - r.x, oy + (p.y - oy) * t - r.y, oz + (p.z - oz) * t - r.z) < C.RING_RADIUS) {
        r.got = true; g.score += C.RING_SCORE; g.ringCount++; p.boost = Math.min(p.boost + C.RING_BOOST, C.RING_BOOST_MAX);
        g.popups.push({ text: '+' + C.RING_SCORE, t: 0 }); A.chime();
      }
    }
    g.time -= dt; if (g.time <= 0) { g.time = 0; end('time'); }
  }
  function step(dt) {
    g.t += dt;
    if (I.consume('KeyM')) A.muted = !A.muted;
    if (I.consume('KeyR')) begin();
    else if (I.consume('Enter') && (g.state === 'start' || g.state === 'end')) begin();
    if (I.consume('KeyP')) { if (g.state === 'fly') g.state = 'paused'; else if (g.state === 'paused') g.state = 'fly'; }
    if (g.state === 'fly') fly(dt);
    else if (g.state === 'end') g.endT += dt;
    else if (g.state === 'start') g.p.prop += 8 * dt;
    for (const r of g.rings) if (r.got && r.flash > 0) r.flash = Math.max(0, r.flash - dt * 1.6);
    for (const u of g.popups) u.t += dt; g.popups = g.popups.filter(u => u.t < 1.4);
    if (g.state !== 'paused') updateCam(dt, false);
    A.update((g.p.speed - C.SPEED_MIN) / (C.SPEED_RANGE + 20), g.state === 'fly');
  }
  CR.api = { begin, end, step, snapCam: () => updateCam(0, true) };
  const canvas = document.getElementById('game'); R.init(canvas); canvas.focus();
  reset();
  const q = new URLSearchParams(location.search).get('shot'); if (q) CR.shots.apply(g, q, CR.api);
  let last = performance.now();
  function frame(ts) { const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000)); last = ts; step(dt); R.draw(g); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
})();
