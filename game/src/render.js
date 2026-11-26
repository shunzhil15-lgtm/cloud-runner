// Drawing: sky, terrain, runway, rings, clouds, plane, HUD and overlay screens.
(function () {
  'use strict';
  const C = CR.CFG, W = CR.world, clamp = W.clamp;
  const R = CR.render = {};
  const UI = '"Trebuchet MS","Segoe UI",Verdana,sans-serif', SERIF = 'Georgia,"Times New Roman",serif';
  const NR = 46, NC = 33, NEAR = 1.5, SX0 = C.W / 2, SY0 = C.H * 0.48;
  const rowD = []; for (let i = 0; i < NR; i++) rowD.push(12 + i * 16 + i * i * 1.15);
  const N = NR * NC;
  const VX = new Float32Array(N), VY = new Float32Array(N), VZ = new Float32Array(N), VH = new Float32Array(N);
  const SX = new Float32Array(N), SY = new Float32Array(N), SZ = new Float32Array(N);
  const HAZE = [238, 226, 192];
  const GR1 = [110, 184, 84], GR2 = [74, 148, 70], FIELD = [200, 204, 104], FOREST = [52, 118, 58], SAND = [226, 208, 150], WATER = [66, 160, 204], ROCK = [158, 156, 138];
  let cv, ctx, F, cam, T = 0, sY, cY, sP, cP, CX, CU, CZ, PX, PY, PZ;
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgb = c => 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
  const hash2 = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

  R.init = function (canvas) {
    cv = canvas; ctx = cv.getContext('2d'); F = C.H / 2 / Math.tan(C.FOV * Math.PI / 360);
  };
  function cs(wx, wy, wz) {
    const dx = wx - cam.x, dy = wy - cam.y, dz = wz - cam.z;
    CX = dx * cY - dz * sY; const fz = dx * sY + dz * cY;
    CU = dy * cP - fz * sP; CZ = fz * cP + dy * sP;
  }
  function proj(wx, wy, wz) { cs(wx, wy, wz); PZ = CZ; PX = SX0 + CX * F / CZ; PY = SY0 - CU * F / CZ; }
  // Fill a world-space polygon, clipped against the near plane.
  function poly(pts, fill) {
    const c = [], q = [], n = pts.length;
    for (const p of pts) { cs(p[0], p[1], p[2]); c.push([CX, CU, CZ]); }
    for (let i = 0; i < n; i++) {
      const a = c[i], b = c[(i + 1) % n], ai = a[2] >= NEAR, bi = b[2] >= NEAR;
      if (ai) q.push(a);
      if (ai !== bi) { const t = (NEAR - a[2]) / (b[2] - a[2]); q.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]); }
    }
    if (q.length < 3) return;
    ctx.fillStyle = fill; ctx.beginPath();
    q.forEach((p, i) => { const x = SX0 + p[0] * F / p[2], y = SY0 - p[1] * F / p[2]; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.closePath(); ctx.fill();
  }
  const rect = (x0, z0, x1, z1, y, fill) => poly([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], fill);
  const ell = (x, y, rx, ry) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); };
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function txt(s, x, y, size, col, al, font, wt) { ctx.font = (wt || '600') + ' ' + size + 'px ' + (font || UI); ctx.fillStyle = col; ctx.textAlign = al || 'left'; ctx.fillText(s, x, y); }
  function panel(x, y, w, h) { ctx.fillStyle = 'rgba(10,26,46,0.72)'; rr(x, y, w, h, 14); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5; ctx.stroke(); }

  function sky() {
    const hy = SY0 + Math.tan(cam.pitch) * F;
    ctx.fillStyle = rgb(HAZE); ctx.fillRect(-C.W, -C.H, 3 * C.W, 3 * C.H);
    const g = ctx.createLinearGradient(0, hy - 760, 0, hy);
    g.addColorStop(0, '#3d8cdc'); g.addColorStop(0.55, '#86c3ee'); g.addColorStop(1, rgb(HAZE));
    ctx.fillStyle = g; ctx.fillRect(-C.W, -C.H, 3 * C.W, C.H + hy);
    const az = 0.55, el = 0.42;
    proj(cam.x + Math.sin(az) * Math.cos(el) * 5000, cam.y + Math.sin(el) * 5000, cam.z + Math.cos(az) * Math.cos(el) * 5000);
    if (PZ > 0) {
      const rg = ctx.createRadialGradient(PX, PY, 0, PX, PY, 280);
      rg.addColorStop(0, 'rgba(255,250,225,0.95)'); rg.addColorStop(0.12, 'rgba(255,240,190,0.55)'); rg.addColorStop(1, 'rgba(255,240,190,0)');
      ctx.fillStyle = rg; ctx.fillRect(PX - 300, PY - 300, 600, 600);
    }
  }
  function cellColor(h, cx, cz, shade, d) {
    let c;
    if (h < 0.9) { c = WATER; shade = 1 + 0.05 * Math.sin(cx * .03 + cz * .04 + T * 1.2); }
    else if (h < 3.4) c = SAND;
    else {
      c = mix(GR1, GR2, clamp((h - 8) / 60, 0, 1));
      c = mix(c, ROCK, clamp((h - 95) / 50, 0, 1) * 0.6);
      const hv = hash2(Math.floor(cx / 150), Math.floor(cz / 150));
      if (h < 85) { if (hv > 0.7 && hv < 0.86) c = mix(c, FIELD, 0.8); else if (hv >= 0.86) c = mix(c, FOREST, 0.75); }
    }
    const fog = Math.pow(clamp((d - 250) / 2300, 0, 1), 1.3);
    return rgb(mix([c[0] * shade, c[1] * shade, c[2] * shade], HAZE, fog));
  }
  function terrain() {
    for (let i = 0; i < NR; i++) {
      const d = rowD[i], half = d * 1.3 + 90;
      for (let j = 0; j < NC; j++) {
        const lat = (j / (NC - 1) * 2 - 1) * half, k = i * NC + j;
        const wx = cam.x + sY * d + cY * lat, wz = cam.z + cY * d - sY * lat, h = W.height(wx, wz), y = h < 0 ? 0 : h;
        VX[k] = wx; VY[k] = y; VZ[k] = wz; VH[k] = h;
        proj(wx, y, wz); SX[k] = PX; SY[k] = PY; SZ[k] = PZ;
      }
    }
    const L = [-0.42, 0.78, 0.46], ll = Math.hypot(L[0], L[1], L[2]);
    ctx.lineWidth = 1; ctx.lineJoin = 'round';
    for (let i = NR - 2; i >= 0; i--) {
      for (let j = 0; j < NC - 1; j++) {
        const a = i * NC + j, b = a + 1, c = a + NC, e = c + 1;
        if (SZ[a] < NEAR || SZ[b] < NEAR || SZ[c] < NEAR || SZ[e] < NEAR) continue;
        const ax = VX[b] - VX[a], ay = VY[b] - VY[a], az = VZ[b] - VZ[a], bx = VX[c] - VX[a], by = VY[c] - VY[a], bz = VZ[c] - VZ[a];
        let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
        if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
        const nl = Math.hypot(nx, ny, nz) || 1;
        const shade = clamp(0.78 + 0.32 * ((nx * L[0] + ny * L[1] + nz * L[2]) / (nl * ll)), 0.62, 1.1);
        const h = (VH[a] + VH[b] + VH[c] + VH[e]) / 4;
        const col = cellColor(h, (VX[a] + VX[e]) / 2, (VZ[a] + VZ[e]) / 2, shade, rowD[i]);
        ctx.fillStyle = col; ctx.strokeStyle = col;
        ctx.beginPath(); ctx.moveTo(SX[a], SY[a]); ctx.lineTo(SX[b], SY[b]); ctx.lineTo(SX[e], SY[e]); ctx.lineTo(SX[c], SY[c]); ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
    }
  }
  function runway() {
    const r = C.RUNWAY, y = C.GROUND_Y + 0.15;
    rect(r.x0, r.z0, r.x1, r.z1, y, '#3c3f47');
    rect(r.x0 + 0.6, r.z0, r.x0 + 1.4, r.z1, y + .02, '#f1ead2'); rect(r.x1 - 1.4, r.z0, r.x1 - 0.6, r.z1, y + .02, '#f1ead2');
    for (let z = r.z0 + 20; z < r.z1 - 20; z += 40) rect(-0.6, z, 0.6, z + 18, y + .02, '#f1ead2');
    for (let k = 0; k < 8; k++) {
      const x = -11.5 + k * 3.2;
      rect(x, r.z0 + 4, x + 1.5, r.z0 + 16, y + .02, '#f1ead2'); rect(x, r.z1 - 16, x + 1.5, r.z1 - 4, y + .02, '#f1ead2');
    }
  }
  function ringPath(r, rad) {
    const sx = r.nz, sz = -r.nx; let pen = false; ctx.beginPath();
    for (let k = 0; k <= 36; k++) {
      const a = k / 36 * Math.PI * 2;
      proj(r.x + sx * Math.cos(a) * rad, r.y + Math.sin(a) * rad, r.z + sz * Math.cos(a) * rad);
      if (PZ < 1) { pen = false; continue; }
      pen ? ctx.lineTo(PX, PY) : ctx.moveTo(PX, PY); pen = true;
    }
  }
  function ring(r, isNext) {
    cs(r.x, r.y, r.z); const z = CZ; if (z < 2) return;
    let rad = C.RING_RADIUS, lw = Math.max(2, 3 * F / z), a = 1;
    ctx.lineCap = 'round';
    if (r.got) { rad *= 1 + (1 - r.flash) * 0.7; a = r.flash; }
    if (r.got) { ringPath(r, rad); ctx.strokeStyle = 'rgba(190,255,200,' + (0.7 * a) + ')'; ctx.lineWidth = lw * 1.4; ctx.stroke(); return; }
    ringPath(r, rad); ctx.strokeStyle = 'rgba(255,196,60,' + (isNext ? 0.22 + 0.12 * Math.sin(T * 6) : 0.16) + ')'; ctx.lineWidth = lw * 3; ctx.stroke();
    ctx.strokeStyle = '#f7b928'; ctx.lineWidth = lw; ctx.stroke();
    ctx.strokeStyle = '#fff1b0'; ctx.lineWidth = Math.max(1, lw * 0.3); ctx.stroke();
  }
  function cloud(it) {
    const c = it.c, z = it.d, X = SX0 + it.cx * F / z, Y = SY0 - it.cu * F / z, k = F / z;
    const al = clamp((z - 250) / 700, 0, 1) * (1 - clamp((z - 2500) / 2500, 0, 0.6)) * 0.95;
    if (al <= 0.01) return;
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? 'rgba(255,255,255,' + al + ')' : 'rgba(176,196,222,' + al + ')';
      for (let j = 0; j < c.k; j++) {
        const ox = Math.sin(c.seed * 100 + j * 2.1) * c.s * 1.3, oy = Math.cos(j * 1.7 + c.seed * 50) * c.s * 0.22;
        const pr = c.s * (0.55 + 0.35 * Math.abs(Math.sin(j * 3.3 + c.seed * 20))) * k;
        ctx.beginPath(); ctx.arc(X + ox * k, Y - oy * k + (pass ? 0 : pr * 0.2), pr, 0, 7); ctx.fill();
      }
    }
  }
  function shadow(g) {
    const p = g.p, gy = W.groundAt(p.x, p.z), agl = p.y - gy; if (agl > 450) return;
    const pts = [], a = 0.3 * clamp(1 - agl / 320, 0.15, 1), y = Math.max(gy, C.GROUND_Y * (W.onRunway(p.x, p.z) ? 1 : 0)) + 0.3;
    for (let k = 0; k < 14; k++) { const t = k / 14 * 6.2832; pts.push([p.x + (Math.sin(p.h) * Math.sin(t) * 7 + Math.cos(p.h) * Math.cos(t) * 5), y, p.z + (Math.cos(p.h) * Math.sin(t) * 7 - Math.sin(p.h) * Math.cos(t) * 5)]); }
    poly(pts, 'rgba(10,30,20,' + a + ')');
  }
  function plane(g, sx, sy, s) {
    const p = g.p; ctx.save(); ctx.translate(sx, sy); ctx.rotate(p.roll); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ell(0, 0.1, 1.3, 1.3);
    ctx.save(); ctx.translate(0, 0.1); ctx.rotate(p.prop); ctx.fillStyle = 'rgba(40,40,40,0.5)'; ctx.fillRect(-1.3, -0.09, 2.6, 0.18); ctx.fillRect(-0.09, -1.3, 0.18, 2.6); ctx.restore();
    for (const sg of [-1, 1]) {
      ctx.save(); ctx.scale(sg, 1);
      ctx.fillStyle = '#f6ecd2'; ctx.beginPath(); ctx.moveTo(0.5, 0.05); ctx.lineTo(4.7, -0.28); ctx.lineTo(4.7, 0.12); ctx.lineTo(0.5, 0.62); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8452c'; ctx.beginPath(); ctx.moveTo(3.6, -0.2); ctx.lineTo(4.7, -0.28); ctx.lineTo(4.7, 0.12); ctx.lineTo(3.55, 0.12); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#e8452c'; ell(0, 0.12, 0.8, 0.74);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ell(-0.15, -0.12, 0.4, 0.28);
    ctx.fillStyle = '#9fd3f0'; ell(0, -0.5, 0.4, 0.32);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ell(-0.1, -0.58, 0.14, 0.1);
    ctx.fillStyle = '#c7351f'; ctx.beginPath(); ctx.moveTo(-1.9, 0.3); ctx.lineTo(-0.2, 0.18); ctx.lineTo(0.2, 0.18); ctx.lineTo(1.9, 0.3); ctx.lineTo(1.9, 0.52); ctx.lineTo(-1.9, 0.52); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f6ecd2'; ctx.beginPath(); ctx.moveTo(-0.15, 0.45); ctx.lineTo(0.15, 0.45); ctx.lineTo(0.1, -1.45); ctx.lineTo(-0.1, -1.45); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1f3a5f'; ctx.fillRect(-0.12, -1.45, 0.24, 0.5);
    ctx.restore();
  }
  function scene(g) {
    cam = g.cam; T = g.t; sY = Math.sin(cam.yaw); cY = Math.cos(cam.yaw); sP = Math.sin(cam.pitch); cP = Math.cos(cam.pitch);
    ctx.save(); ctx.translate(C.W / 2, C.H / 2); ctx.rotate(-cam.roll); ctx.translate(-C.W / 2, -C.H / 2);
    sky(); terrain(); runway(); shadow(g);
    const items = [], p = g.p;
    for (const c of g.clouds) {
      const wx = cam.x + (((c.x - cam.x) % 9000) + 13500) % 9000 - 4500, wz = cam.z + (((c.z - cam.z) % 9000) + 13500) % 9000 - 4500;
      cs(wx, c.y, wz); if (CZ < 200 || CZ > 5200 || Math.abs(CX) - c.s * 2 > CZ * 1.7) continue;
      items.push({ d: CZ, t: 0, c, cx: CX, cu: CU });
    }
    let next = null;
    for (const r of g.rings) { if (!r.got && !next && (r.x - p.x) * Math.sin(p.h) + (r.z - p.z) * Math.cos(p.h) > 0) next = r; }
    for (const r of g.rings) { if (r.got && r.flash <= 0) continue; cs(r.x, r.y, r.z); if (CZ > 2 && CZ < 3500) items.push({ d: CZ, t: 1, r }); }
    proj(p.x, p.y, p.z); const ps = F / PZ, ppx = PX, ppy = PY; items.push({ d: PZ, t: 2 });
    items.sort((a, b) => b.d - a.d);
    for (const it of items) { if (it.t === 0) cloud(it); else if (it.t === 1) ring(it.r, it.r === next); else plane(g, ppx, ppy, ps); }
    ctx.restore();
    g.next = next;
  }
  const fmtD = d => d < 1000 ? Math.round(d / 10) * 10 + ' m' : (d / 1000).toFixed(1) + ' km';
  function chip(x, y, label, ang, col) {
    panel(x, y, 150, 34);
    ctx.save(); ctx.translate(x + 20, y + 17); ctx.rotate(ang); ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(8, 8); ctx.lineTo(0, 4); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill(); ctx.restore();
    txt(label, x + 38, y + 23, 15, '#f3ead4', 'left');
  }
  function bearing(p, x, z) { let d = Math.atan2(x - p.x, z - p.z) - p.h; while (d > Math.PI) d -= 6.2832; while (d < -Math.PI) d += 6.2832; return d; }
  function valUnit(v, unit, x, y) {
    txt(v, x, y, 38, '#fff3d6', 'left'); ctx.font = '600 38px ' + UI; const w = ctx.measureText(v).width; txt(unit, x + w + 6, y, 16, 'rgba(243,234,212,0.7)', 'left');
  }
  function hud(g) {
    const p = g.p, lab = 'rgba(243,234,212,0.68)';
    const alt = Math.max(0, Math.round(p.y - C.GROUND_Y - C.GEAR)), kmh = Math.round(p.speed * 3.6);
    const deg = ((p.h * 180 / Math.PI) % 360 + 360) % 360, hd = Math.round(deg) % 360;
    panel(28, 596, 330, 106);
    txt('Altitude', 48, 622, 15, lab); valUnit(String(alt), 'm', 48, 656);
    txt('Speed', 200, 622, 15, lab); valUnit(String(kmh), 'km/h', 200, 656);
    txt('Throttle', 48, 690, 13, lab);
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; rr(120, 681, 218, 8, 4); ctx.fill();
    ctx.fillStyle = '#ffc83d'; rr(120, 681, Math.max(8, 218 * p.throttle), 8, 4); ctx.fill();
    panel(440, 606, 400, 96);
    txt(String(hd).padStart(3, '0') + '\u00b0', 640, 640, 30, '#ffc83d', 'center');
    txt('Heading', 520, 640, 15, lab, 'center');
    ctx.save(); rr(440, 606, 400, 96, 14); ctx.clip();
    for (let a = Math.floor((deg - 50) / 5) * 5; a <= deg + 50; a += 5) {
      const x = 640 + (a - deg) * 4, m = ((a % 360) + 360) % 360, big = m % 10 === 0;
      ctx.strokeStyle = 'rgba(243,234,212,0.8)'; ctx.lineWidth = big ? 2 : 1; ctx.beginPath(); ctx.moveTo(x, 658); ctx.lineTo(x, big ? 672 : 666); ctx.stroke();
      if (m % 30 === 0 && x > 470 && x < 810) txt(m === 0 ? 'N' : m === 90 ? 'E' : m === 180 ? 'S' : m === 270 ? 'W' : String(m), x, 692, 14, m % 90 === 0 ? '#ffc83d' : lab, 'center');
    }
    ctx.restore();
    ctx.fillStyle = '#ffc83d'; ctx.beginPath(); ctx.moveTo(634, 648); ctx.lineTo(646, 648); ctx.lineTo(640, 657); ctx.closePath(); ctx.fill();
    panel(922, 596, 330, 106);
    txt('Score', 942, 622, 15, lab); txt(g.score.toLocaleString('en-US'), 942, 656, 38, '#ffc83d', 'left');
    txt('Rings', 1110, 622, 15, lab); txt(String(g.ringCount), 1110, 656, 38, '#fff3d6', 'left');
    const tl = Math.max(0, Math.ceil(g.time));
    panel(580, 16, 120, 36); txt(Math.floor(tl / 60) + ':' + String(tl % 60).padStart(2, '0'), 640, 42, 22, g.time < 10 ? '#ffc83d' : '#fff3d6', 'center');
    if (g.next) { const n = g.next; chip(480, 60, 'Ring ' + fmtD(Math.hypot(n.x - p.x, n.z - p.z)), bearing(p, n.x, n.z), '#ffc83d'); }
    chip(650, 60, 'Runway ' + fmtD(Math.hypot(p.x, 200 - p.z)), bearing(p, 0, 200), '#f3ead4');
    for (const u of g.popups) { ctx.globalAlpha = clamp(1 - u.t / 1.4, 0, 1); txt(u.text, 640, 300 - u.t * 60, 46, '#ffd35a', 'center', UI, '700'); ctx.globalAlpha = 1; }
  }
  function key(label, x, y) {
    ctx.font = '600 17px ' + UI; const w = ctx.measureText(label).width + 22;
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; rr(x, y - 22, w, 30, 7); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.stroke();
    txt(label, x + w / 2, y, 17, '#fff3d6', 'center'); return w + 8;
  }
  function dim(a) { ctx.fillStyle = 'rgba(8,20,36,' + a + ')'; ctx.fillRect(0, 0, C.W, C.H); }
  function startScreen(g) {
    dim(0.28); panel(300, 70, 680, 560);
    txt('Cloud Runner', 640, 170, 78, '#fff3d6', 'center', SERIF, 'italic 700');
    txt('A small propeller plane, a winding river and a lot of sky.', 640, 212, 20, 'rgba(243,234,212,0.8)', 'center');
    const rows = [[['\u2190', '\u2192', 'A', 'D'], 'bank and turn'], [['\u2191', '\u2193'], 'climb and dive'], [['W', 'S', 'Shift', 'Ctrl'], 'throttle up and down'], [['P', 'R', 'M'], 'pause, restart, sound']];
    rows.forEach((r, i) => { let x = 372; const y = 290 + i * 46; for (const k of r[0]) x += key(k, x, y); txt(r[1], 640, y, 19, '#f3ead4', 'left'); });
    txt('Fly through golden rings for +100 and a speed boost.', 640, 500, 19, '#f3ead4', 'center');
    txt('Land softly on the runway for +250, or enjoy all 90 seconds.', 640, 532, 19, '#f3ead4', 'center');
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(g.t * 4); txt('Press Enter to take off', 640, 598, 28, '#ffc83d', 'center', UI, '700'); ctx.globalAlpha = 1;
  }
  function endScreen(g) {
    const a = clamp(g.endT * 2, 0, 1); ctx.globalAlpha = a; dim(0.35); panel(340, 130, 600, 380);
    const t = g.reason === 'crash' ? 'You crashed \u2014 press R to try again' : g.reason === 'landed' ? 'Smooth landing!' : 'Flight complete';
    txt(t, 640, 200, g.reason === 'crash' ? 34 : 52, '#fff3d6', 'center', SERIF, 'italic 700');
    if (g.reason === 'crash') txt('No harm done. The plane is fine.', 640, 236, 18, 'rgba(243,234,212,0.8)', 'center');
    if (g.reason === 'landed') txt('Landing bonus +' + C.LAND_BONUS, 640, 236, 18, '#ffd35a', 'center');
    [['Score', g.score.toLocaleString('en-US')], ['Rings collected', String(g.ringCount)], ['Best score', g.best.toLocaleString('en-US')]].forEach((s, i) => {
      const x = 440 + i * 200; txt(s[0], x, 300, 15, 'rgba(243,234,212,0.7)', 'center'); txt(s[1], x, 350, 42, i === 2 ? '#ffc83d' : '#fff3d6', 'center');
    });
    if (g.newBest) txt('New best score!', 640, 400, 20, '#ffd35a', 'center');
    txt(g.reason === 'crash' ? 'Press R to try again' : 'Press R to fly again', 640, 468, 26, '#ffc83d', 'center', UI, '700');
    ctx.globalAlpha = 1;
  }
  R.draw = function (g) {
    scene(g);
    if (g.state !== 'start') hud(g);
    if (g.state === 'start') startScreen(g);
    else if (g.state === 'end') endScreen(g);
    else if (g.state === 'paused') { dim(0.4); txt('Paused', 640, 340, 64, '#fff3d6', 'center', SERIF, 'italic 700'); txt('Press P to continue', 640, 390, 24, '#ffc83d', 'center'); }
  };
})();
