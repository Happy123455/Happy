'use strict';
// Chorus (restrained beam, no LTB) and verse 2 (section classification on a blueprint) (83.8 – 132.3 s)
const C = require('./core');
const { W, H, clamp, lerp, inv, E, rnd, srnd, noise1, TAU, P, env, pop, WT, COL, text, tw, writeOn, eqn, mathText, mathW, line, arrow, rrect, circle,
  dimLine, pinSupport, rollerSupport, beamElev, udl, iSection, iPoly, beam3D, beamWire, project, stamp, burst, check, cross, rays, speedLines, emoji,
  shake, flash, punch, glitch, beatPulse, feS, ink, ISMB } = C;

const S = [];
// ===================================================================== CHORUS
const K = {
  comp: WT(20, 'compression'), flange: WT(20, 'flange'), lat: WT(20, 'laterally'), restr: WT(20, 'restrained'), through: WT(20, 'throughout'), length: WT(20, 'length'),
  means: WT(21, 'means'), no: WT(21, 'no'), lateral: WT(21, 'lateral'), tors: WT(21, 'torsional'), buck: WT(21, 'buckling'), ruin: WT(21, 'ruin'), strength: WT(21, 'strength'),
  beam: WT(22, 'beam'), fully: WT(22, 'fully'), supp: WT(22, 'supported'), not: WT(22, 'not'), twist: WT(22, 'twisting'), away: WT(22, 'away'),
  bypass: WT(23, 'bypass'), bucklingEq: WT(23, 'buckling'), equations: WT(23, 'equations'), save: WT(23, 'save'), day: WT(23, 'day'),
  designing: WT(24, 'designing'), pure: WT(24, 'pure'), yielding: WT(24, 'yielding'), keeping: WT(24, 'keeping'), intact: WT(24, 'intact'),
  lat2: WT(25, 'laterally'), restr2: WT(25, 'restrained'), end1: WT(25, 'end'), end2: WT(25, 'end', 1), fact: WT(25, 'fact'),
};
const CH_A = 83.79, CH_B = 105.24, LEN = 4600, NBR = 9;
const brZ = (i) => -LEN / 2 + 300 + i * (LEN - 600) / (NBR - 1);
function camAt(t) {
  // gentle orbit; sweep end-to-end in the last line
  const sweep = P(t, K.lat2 - 0.1, K.fact - K.lat2 + 0.1, E.ioS);
  let yaw = 1.2 + 0.07 * Math.sin((t - CH_A) * 0.35);
  yaw = lerp(yaw, 1.94, sweep);
  const pitch = -0.4 - 0.05 * Math.sin((t - CH_A) * 0.27);
  return { cx: W / 2, cy: 470, sc: 0.36, yaw, pitch, dist: 6500, len: LEN };
}
function p3(o, x, y, z) { return project([x, y, z], o); }
S.push({
  a: CH_A, b: CH_B, draw(ctx, t) {
    const o = camAt(t), bp = beatPulse(t);
    const panelOn = Math.min(P(t, K.designing - 0.45, 0.3), 1 - P(t, K.lat2 - 0.5, 0.35));
    const eqOn = t >= K.bypass - 0.5 && t < K.save + 0.2;
    // ---- twisting attempt (held by braces)
    const twistAmt = t >= K.not - 0.3 && t < K.away + 0.6 ? 0.035 * Math.sin((t - K.not) * 34) * env(t, K.not - 0.3, K.away + 0.6, 0.1, 0.3) : 0;
    ctx.save(); ctx.globalAlpha *= 1 - 0.75 * panelOn;
    // ---- braces behind/beside the beam (draw anchors first)
    const nBr = t < K.lat ? 0 : Math.min(NBR, Math.floor((t - K.lat) / ((K.through - K.lat) / NBR)) + 1);
    const flashI = t >= K.lat2 ? Math.floor(inv(K.lat2, K.fact - 0.2, t) * NBR) : -1;
    for (let i = 0; i < nBr; i++) {
      const z = brZ(i), ti = K.lat + i * ((K.through - K.lat) / NBR), k = P(t, ti, 0.18, E.outBack);
      const a = p3(o, -70, 150, z), b = p3(o, -70 - 900 * k, 150, z);
      const hot = i === flashI;
      ctx.save(); ctx.strokeStyle = hot ? '#fff' : COL.yellow; ctx.lineWidth = hot ? 9 : 6; ctx.lineCap = 'round'; if (hot) { ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 30; }
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.restore();
      // anchor (hatched)
      const c1 = p3(o, -970 * k, 60, z - 120), c2 = p3(o, -970 * k, 240, z - 120), c3 = p3(o, -970 * k, 240, z + 120), c4 = p3(o, -970 * k, 60, z + 120);
      ctx.beginPath(); [c1, c2, c3, c4].forEach((p, j) => (j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fillStyle = 'rgba(255,210,63,0.25)'; ctx.fill(); ctx.strokeStyle = COL.yellow; ctx.lineWidth = 3; ctx.stroke();
      if (t >= K.supp + i * 0.05 && t < K.bypass) emoji(ctx, '🔒', b[0] - 10, b[1] - 40, 40, { scale: pop(t, K.supp + i * 0.05, 0.2) });
      if (k < 1) burst(ctx, a[0], a[1], t, ti + 0.1, { n: 12, vmin: 80, vmax: 300, size: 3, life: 0.4, color: '#ffd23f', seed: i * 7, g: 0 });
    }
    // ---- the beam
    const hlTop = t >= K.comp - 0.05;
    const glow = hlTop ? 0.5 + 0.5 * Math.sin(t * 8) : 0;
    beam3D(ctx, Object.assign({}, o, {
      roll: twistAmt, base: [190, 202, 216], edge: 'rgba(255,255,255,0.5)', capFill: '#e6edf3',
      hl: (f) => (hlTop && [0, 1, 2, 10, 11].includes(f.i) ? [80 + 60 * glow, 200 + 30 * glow, 255] : null),
    }));
    // compression / tension arrows along flanges
    if (t >= K.flange) {
      const a = P(t, K.flange, 0.3);
      for (let i = 0; i < 4; i++) {
        const z = -LEN / 2 + 500 + i * 400, zR = LEN / 2 - 500 - i * 400;
        const p1 = p3(o, 0, 260, z), p2 = p3(o, 0, 260, z + 300), q1 = p3(o, 0, 260, zR), q2 = p3(o, 0, 260, zR - 300);
        arrow(ctx, p1[0], p1[1], p2[0], p2[1], { color: COL.cyan, lw: 5, head: 16, alpha: a * (1 - P(t, K.means, 0.3)) });
        arrow(ctx, q1[0], q1[1], q2[0], q2[1], { color: COL.cyan, lw: 5, head: 16, alpha: a * (1 - P(t, K.means, 0.3)) });
      }
      const lp = p3(o, 70, 150, -LEN * 0.22);
      ctx.save(); ctx.globalAlpha *= a * (1 - P(t, K.means - 0.2, 0.3));
      arrow(ctx, lp[0] + 120, lp[1] - 160, lp[0] + 10, lp[1] - 20, { color: COL.cyan, lw: 5, head: 18 });
      text(ctx, 'COMPRESSION FLANGE', lp[0] + 140, lp[1] - 190, { size: 50, fam: 'anton', color: COL.cyan, align: 'left', stroke: '#000', strokeW: 8, scale: pop(t, K.flange, 0.2) });
      ctx.restore();
    }
    if (t >= K.restr && t < K.means) text(ctx, 'LATERAL RESTRAINT', 380, 640, { size: 46, fam: 'anton', color: COL.yellow, stroke: '#000', strokeW: 8, scale: pop(t, K.restr, 0.2), alpha: 1 - P(t, K.means - 0.2, 0.2) });
    if (t >= K.through && t < K.means + 0.1) {
      const sw = P(t, K.through, 0.55, E.ioC), z = lerp(-LEN / 2, LEN / 2, sw), sp = p3(o, 0, 160, z);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(sp[0], sp[1], 5, sp[0], sp[1], 160); g.addColorStop(0, 'rgba(255,230,140,0.9)'); g.addColorStop(1, 'rgba(255,200,60,0)'); ctx.fillStyle = g; ctx.fillRect(sp[0] - 160, sp[1] - 160, 320, 320); ctx.restore();
      text(ctx, 'FULL LENGTH ✓', 1500, 640, { size: 46, fam: 'anton', color: COL.green, stroke: '#000', strokeW: 8, scale: pop(t, K.length, 0.2), alpha: P(t, K.length, 0.1) * (1 - P(t, K.means - 0.1, 0.2)) });
    }
    // ---- LTB ghost (what would have happened)
    if (t >= K.means - 0.1 && t < K.strength + 0.6) {
      const a = Math.min(P(t, K.means - 0.1, 0.3), 1 - P(t, K.buck + 0.6, 0.6));
      const amp = 0.55 + 0.45 * Math.sin((t - K.means) * 5.5);
      beamWire(ctx, Object.assign({}, o, { deform: (zf) => ({ u: 520 * amp * Math.sin(Math.PI * zf), v: -60 * amp * Math.sin(Math.PI * zf), phi: 0.75 * amp * Math.sin(Math.PI * zf) }), color: '#ff4d4d', lw: 3, alpha: 0.9 * a, glow: 'rgba(255,60,60,0.7)', every: 3 }));
      const mp = p3(o, 520, 300, 0);
      ctx.save(); ctx.globalAlpha *= a;
      text(ctx, 'LATERAL TORSIONAL BUCKLING', W / 2, 115, { size: 64, fam: 'anton', color: COL.red, stroke: '#000', strokeW: 8, scale: pop(t, K.lateral, 0.2) });
      if (t >= K.buck) { line(ctx, [[W / 2 - 430, 118], [W / 2 + 430, 112]], { color: '#fff', lw: 10, prog: P(t, K.buck, 0.2) }); cross(ctx, mp[0], mp[1] - 40, 220, P(t, K.buck + 0.1, 0.3), { lw: 26, color: 'red', glow: 'rgba(255,0,0,0.8)' }); }
      ctx.restore();
      if (t >= K.no) stamp(ctx, 'NO LTB', 1560, 230, t, K.no, { size: 70, color: COL.red, rot: 0.1, hole: '#0a0a0a', alpha: 1 - P(t, K.strength + 0.2, 0.3) });
    }
    if (t >= K.ruin && t < K.beam) {
      const a = Math.min(P(t, K.ruin, 0.2), 1 - P(t, K.beam - 0.3, 0.3));
      ctx.save(); ctx.globalAlpha *= a;
      text(ctx, 'STRENGTH', 300, 205, { size: 40, fam: 'anton', color: '#fff', align: 'left' });
      rrect(ctx, 300, 235, 420, 34, 8); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
      rrect(ctx, 304, 239, 412 * (0.98 + 0.02 * Math.sin(t * 20)), 26, 6); ctx.fillStyle = COL.green; ctx.fill();
      text(ctx, '100% INTACT', 735, 252, { size: 34, fam: 'mono', color: COL.green, align: 'left' });
      ctx.restore();
    }
    if (t >= K.not && t < K.bypass - 0.3) {
      const a = Math.min(P(t, K.not, 0.2), 1 - P(t, K.bypass - 0.5, 0.2));
      text(ctx, 'θ = 0°  (TWIST LOCKED)', W / 2, 115, { size: 60, fam: 'anton', color: COL.yellow, stroke: '#000', strokeW: 8, alpha: a, scale: pop(t, K.not, 0.2) });
    }
    ctx.restore();
    // ---- the buckling equations get bypassed
    if (eqOn) {
      const eqs = ['M_{cr} = (π²EI_{y}h_{f} / 2L_{LT}²)·[1 + (1/20)(…)²]^{0.5}', 'λ_{LT} = √(β_{b}Z_{p}f_{y} / M_{cr})', 'φ_{LT} = 0.5[1 + α_{LT}(λ_{LT} − 0.2) + λ_{LT}²]', 'χ_{LT} = 1 / [φ_{LT} + √(φ_{LT}² − λ_{LT}²)]', 'f_{bd} = χ_{LT} f_{y} / γ_{m0}', 'M_{d} = β_{b} Z_{p} f_{bd}'];
      const pos = [[560, 190], [1360, 250], [470, 430], [1430, 470], [650, 640], [1300, 680]];
      eqs.forEach((s, i) => {
        const ti = K.bypass - 0.45 + i * 0.05; if (t < ti) return;
        const fly = t >= K.bypass ? (t - K.bypass) : 0, dir = [pos[i][0] - W / 2, pos[i][1] - 420], dl = Math.hypot(...dir);
        const x = pos[i][0] + dir[0] / dl * fly * fly * 4200, y = pos[i][1] + dir[1] / dl * fly * fly * 4200;
        ctx.save(); ctx.translate(x, y); ctx.rotate(fly * (i % 2 ? 3 : -3)); const k = pop(t, ti, 0.15); ctx.scale(k, k); ctx.globalAlpha *= 1 - clamp(fly / 0.7);
        const ww = mathW(ctx, s, 40, 'mono') + 40;
        rrect(ctx, -ww / 2, -40, ww, 80, 12); ctx.fillStyle = 'rgba(20,0,0,0.85)'; ctx.fill(); ctx.strokeStyle = COL.red; ctx.lineWidth = 3; ctx.stroke();
        mathText(ctx, s, 0, 2, { size: 40, fam: 'mono', color: '#ffd0d0', align: 'center' });
        ctx.restore();
      });
      if (t >= K.equations) stamp(ctx, 'BYPASSED', W / 2, 330, t, K.equations, { size: 120, color: COL.green, rot: -0.08, hole: '#060608', glow: true });
      if (t >= K.save) { rays(ctx, 1500, 300, t, { alpha: 0.2 * (1 - P(t, K.save + 0.4, 0.3)), color: '#ffd23f', n: 16 }); emoji(ctx, '🦸', 1500, 300, 170, { scale: pop(t, K.save, 0.2), alpha: 1 - P(t, K.save + 0.4, 0.3) }); }
    }
    // ---- stress block panel: elastic -> fully plastic
    if (panelOn > 0) {
      ctx.save(); ctx.globalAlpha *= panelOn;
      const cx = W / 2, cy = 400, k0 = lerp(0.85, 1, panelOn);
      ctx.translate(cx, cy); ctx.scale(k0, k0); ctx.translate(-cx, -cy);
      rrect(ctx, cx - 640, cy - 300, 1280, 600, 24); ctx.fillStyle = 'rgba(5,6,10,0.88)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; ctx.stroke();
      const sx = cx - 360, sc = 1.45;
      iSection(ctx, sx, cy + 10, sc, { color: '#ffffff', lw: 4, fill: 'rgba(180,200,220,0.18)' });
      line(ctx, [[sx - 160, cy + 10], [cx + 520, cy + 10]], { color: 'chalk', lw: 2, dash: [10, 10], alpha: 0.6 });
      text(ctx, 'N.A.', sx - 200, cy + 10, { size: 30, fam: 'mono', color: 'rgba(255,255,255,0.7)' });
      const p = P(t, K.pure - 0.15, K.yielding - K.pure + 0.5, E.ioC), h = 150 * sc, bx = cx + 120, sw = 260;
      // stress profile polygon (compression top, tension bottom)
      const pts = []; for (let i = 0; i <= 60; i++) { const yf = 1 - 2 * i / 60, s = clamp(yf / Math.max(0.0001, 1 - p), -1, 1); pts.push([bx + s * sw * (yf >= 0 ? -1 : -1) * -1, cy + 10 - yf * h]); }
      ctx.beginPath(); ctx.moveTo(bx, cy + 10 - h); pts.forEach((q) => ctx.lineTo(q[0], q[1])); ctx.lineTo(bx, cy + 10 + h); ctx.closePath();
      const g = ctx.createLinearGradient(0, cy - h, 0, cy + h); g.addColorStop(0, 'rgba(255,159,28,0.75)'); g.addColorStop(0.5, 'rgba(255,255,255,0.1)'); g.addColorStop(1, 'rgba(63,224,255,0.75)'); ctx.fillStyle = g; ctx.fill();
      line(ctx, pts, { color: '#ffffff', lw: 4 });
      line(ctx, [[bx, cy + 10 - h], [bx, cy + 10 + h]], { color: 'chalk', lw: 3 });
      text(ctx, 'f', bx + sw + 40, cy + 10 - h, { size: 50, fam: 'hand', color: COL.orange }); text(ctx, 'y', bx + sw + 62, cy + 10 - h + 14, { size: 30, fam: 'hand', color: COL.orange });
      text(ctx, 'f', bx - sw - 60, cy + 10 + h, { size: 50, fam: 'hand', color: COL.cyan }); text(ctx, 'y', bx - sw - 38, cy + 10 + h + 14, { size: 30, fam: 'hand', color: COL.cyan });
      text(ctx, p < 0.5 ? 'ELASTIC' : 'FULLY PLASTIC', cx + 150, cy - 245, { size: 58, fam: 'anton', color: p < 0.5 ? '#fff' : COL.orange, scale: p >= 1 ? pop(t, K.yielding + 0.3, 0.2) : 1 });
      if (t >= K.yielding) text(ctx, 'PURE YIELDING ✓', cx + 150, cy + 250, { size: 52, fam: 'anton', color: COL.green, scale: pop(t, K.yielding, 0.2) });
      if (t >= K.intact) { text(ctx, 'INTACT', sx, cy + 255, { size: 46, fam: 'stamp', color: COL.green, scale: pop(t, K.intact, 0.2) }); }
      ctx.restore();
    }
    if (t >= K.fact) stamp(ctx, 'FACT.', W / 2, 400, t, K.fact, { size: 190, color: '#ffffff', rot: -0.07, hole: '#060608', bg: 'rgba(0,0,0,0.5)', alpha: 1 - P(t, CH_B - 0.15, 0.15) });
  },
});
flash(K.comp, 0.25, 0.2, '#3fe0ff'); shake(K.lat, 10, 0.2); punch(K.no, 0.06, 0.25); shake(K.buck, 22, 0.3); flash(K.buck, 0.3, 0.2, '#ff3b30');
punch(K.bypass, 0.07, 0.3); shake(K.bypass, 18, 0.25); punch(K.yielding, 0.05, 0.25); shake(K.fact, 30, 0.35); flash(K.fact, 0.6, 0.25); punch(K.fact, 0.1, 0.3);

// ===================================================================== VERSE 2: BLUEPRINT
const B = {
  now: WT(26, 'now'), open: WT(26, 'open'), I: WT(26, 'i'), eight: WT(26, 'eight'), page: WT(26, 'page'), eighteen: WT(26, 'eighteen'), go: WT(26, 'go'),
  classify: WT(27, 'classify'), section: WT(27, 'section'), capacity: WT(27, 'capacity'), flow: WT(27, 'flow'),
  flange: WT(28, 'flange'), width: WT(28, 'width'), outstand: WT(28, 'outstand'), b: WT(28, 'b'), over: WT(28, 'over'), thick: WT(28, 'thickness'), T: WT(28, 't'), F: WT(28, 'f'),
  seventy: WT(29, 'seventy'), over2: WT(29, 'over'), twelve: WT(29, 'twelve'), point: WT(29, 'point'), four: WT(29, 'four'), deaf: WT(29, 'deaf'), suddenly: WT(29, 'suddenly'),
  five: WT(30, 'five'), point2: WT(30, 'point'), six: WT(30, 'six'), four2: WT(30, 'four'), less: WT(30, 'less'), nine: WT(30, 'nine'), eps: WT(30, 'epsilon'),
  fl: WT(31, 'flange'), cls: WT(31, 'class'), plastic: WT(31, 'plastic'), come: WT(31, 'come'), move: WT(31, 'move'),
  check: WT(32, 'check'), web: WT(32, 'web'), depth: WT(32, 'depth'), D: WT(32, 'd'), over3: WT(32, 'over'), T2: WT(32, 't'), W2: WT(32, 'w'),
  thirty: WT(33, 'thirty'), nine2: WT(33, 'nine'), under: WT(33, 'under'), eighty: WT(33, 'eighty'), telling: WT(33, 'telling'),
  whole: WT(34, 'whole'), plastic2: WT(34, 'plastic'), beta: WT(34, 'beta'), bb: WT(34, 'b'), equals: WT(34, 'equals'), one: WT(34, 'one'),
  form: WT(35, 'form'), plastic3: WT(35, 'plastic'), hinge: WT(35, 'hinge'), before: WT(35, 'before'), failure: WT(35, 'failure'), begun: WT(35, 'begun'),
};
const V2_A = 105.2, V2_B = 132.3, BP = '#e8f2ff';
function gauge(ctx, x, y, w, val, maxv, marks, prog, t, o = {}) {
  if (prog <= 0) return;
  const zones = [[0, marks[0], '#2ee59d'], [marks[0], marks[1], '#ffd23f'], [marks[1], marks[2], '#ff9f1c'], [marks[2], maxv, '#ff4d4d']];
  const X = (v) => x + (v / maxv) * w;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  zones.forEach(([a, b, c], i) => { const k = clamp(prog * 4 - i); if (k <= 0) return; ctx.fillStyle = c; ctx.globalAlpha *= 1; ctx.fillRect(X(a), y - 18, (X(b) - X(a)) * k, 36); });
  ctx.strokeStyle = BP; ctx.lineWidth = 2; ctx.strokeRect(x, y - 18, w, 36);
  text(ctx, 'PLASTIC', (X(0) + X(marks[0])) / 2, y + 2, { size: 22, fam: 'mono', color: '#06331f', alpha: clamp(prog * 2 - 0.6) });
  text(ctx, 'SLENDER', (X(marks[2]) + X(maxv)) / 2, y + 2, { size: 22, fam: 'mono', color: '#3a0606', alpha: clamp(prog * 2 - 0.6) });
  marks.forEach((m, i) => { if (prog > 0.5) { line(ctx, [[X(m), y - 24], [X(m), y + 30]], { color: '#ffffff', lw: 3 }); mathText(ctx, o.markLabels[i], X(m) + (i === 1 ? 26 : i === 0 ? -26 : 0), y + 50, { size: 24, fam: 'mono', color: BP, align: 'center' }); } });
  if (o.needleT != null && t >= o.needleT) {
    const v = val * E.outBack(P(t, o.needleT, 0.5, E.lin)), nx = X(v);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(nx, y - 26); ctx.lineTo(nx - 16, y - 58); ctx.lineTo(nx + 16, y - 58); ctx.closePath(); ctx.fill();
    line(ctx, [[nx, y - 26], [nx, y + 22]], { color: '#ffffff', lw: 5 });
    text(ctx, v.toFixed(2), nx, y - 82, { size: 34, fam: 'mono', color: '#ffffff' });
  }
  ctx.restore();
}
S.push({
  a: V2_A, b: V2_B + 0.8, draw(ctx, t) {
    // ---------------- IS 800 book
    if (t < B.go + 0.45) {
      const a = Math.min(P(t, V2_A, 0.2), 1 - P(t, B.go + 0.1, 0.35));
      const zoom = 1 + 6 * P(t, B.go - 0.05, 0.5, E.inExpo);
      ctx.save(); ctx.globalAlpha *= a;
      ctx.translate(W / 2 + 120 * (zoom - 1) * 0.1, 470); ctx.scale(zoom * pop(t, B.open - 0.25, 0.25, 0.5), zoom * pop(t, B.open - 0.25, 0.25, 0.5)); ctx.translate(-W / 2, -470);
      const bx = W / 2, by = 470, bw = 460, bh = 640;
      const opn = P(t, B.page - 0.05, 0.35, E.ioC);
      // pages (right side)
      rrect(ctx, bx - bw / 2 + 6, by - bh / 2 + 6, bw, bh, 8); ctx.fillStyle = '#e9e4d4'; ctx.fill();
      if (opn > 0) {
        // left page appears as cover swings
        ctx.save(); ctx.globalAlpha *= opn; rrect(ctx, bx - bw / 2 - bw, by - bh / 2 + 6, bw, bh, 8); ctx.fillStyle = '#f2eee0'; ctx.fill(); ctx.restore();
        // flipping page counter
        const pg = t < B.eighteen ? Math.max(1, Math.floor(1 + 17 * P(t, B.page, B.eighteen - B.page, E.lin))) : 18;
        text(ctx, String(pg), bx + bw / 2 - 40, by + bh / 2 - 30, { size: 30, fam: 'type', color: '#333' });
        text(ctx, String(pg - 1 < 1 ? '' : pg - 1), bx - bw / 2 - bw + 40, by + bh / 2 - 30, { size: 30, fam: 'type', color: '#333', alpha: opn });
        if (t >= B.eighteen - 0.05) {
          const ta = P(t, B.eighteen - 0.05, 0.2);
          ctx.save(); ctx.globalAlpha *= ta;
          text(ctx, '3.7.2 Classification', bx - bw / 2 + 30, by - bh / 2 + 60, { size: 28, fam: 'type', color: '#222', align: 'left' });
          text(ctx, 'TABLE 2  LIMITING WIDTH', bx - bw / 2 + 30, by - bh / 2 + 110, { size: 26, fam: 'type', color: '#8a1c1c', align: 'left' });
          text(ctx, 'TO THICKNESS RATIO', bx - bw / 2 + 30, by - bh / 2 + 142, { size: 26, fam: 'type', color: '#8a1c1c', align: 'left' });
          const rows = [['Element', 'Cl.1', 'Cl.2', 'Cl.3'], ['Outstand b/t_f', '9.4ε', '10.5ε', '15.7ε'], ['Web d/t_w', '84ε', '105ε', '126ε']];
          rows.forEach((r, i) => r.forEach((c, j) => text(ctx, c.replace('_f', 'f').replace('_w', 'w'), bx - bw / 2 + 30 + [0, 230, 310, 390][j], by - bh / 2 + 220 + i * 60, { size: 24, fam: 'type', color: i === 0 ? '#555' : '#111', align: 'left' })));
          ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(bx - bw / 2 + 24, by - bh / 2 + 190 + i * 60); ctx.lineTo(bx + bw / 2 - 20, by - bh / 2 + 190 + i * 60); ctx.stroke(); }
          ctx.restore();
          // highlight
          line(ctx, [[bx - bw / 2 + 250, by - bh / 2 + 300], [bx - bw / 2 + 300, by - bh / 2 + 300]], { color: '#e0b100', lw: 26, alpha: 0.4, prog: P(t, B.eighteen + 0.1, 0.2) });
        }
      }
      // cover swings open around the spine (left edge)
      if (opn < 1) {
        const sx = Math.cos(opn * Math.PI);
        ctx.save(); ctx.translate(bx - bw / 2, by); ctx.scale(sx, 1);
        rrect(ctx, 0, -bh / 2, bw, bh, 10);
        const g = ctx.createLinearGradient(0, -bh / 2, bw, bh / 2); g.addColorStop(0, sx > 0 ? '#7b1d1d' : '#d9d3c0'); g.addColorStop(1, sx > 0 ? '#4a0f0f' : '#c9c2ad'); ctx.fillStyle = g; ctx.fill();
        if (sx > 0) {
          ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 3; ctx.strokeRect(24, -bh / 2 + 24, bw - 48, bh - 48);
          const hot = t >= B.I ? 1 : 0;
          text(ctx, 'IS 800 : 2007', bw / 2, -140, { size: 64, fam: 'archivo', color: '#f1d27a', glow: hot ? 'rgba(255,220,120,0.9)' : null, glowR: 30, scale: t >= B.I ? pop(t, B.I, 0.2) : 1 });
          text(ctx, 'INDIAN STANDARD', bw / 2, -40, { size: 30, fam: 'type', color: '#f1d27a' });
          text(ctx, 'GENERAL CONSTRUCTION', bw / 2, 40, { size: 30, fam: 'type', color: '#f1d27a' });
          text(ctx, 'IN STEEL', bw / 2, 82, { size: 30, fam: 'type', color: '#f1d27a' });
          text(ctx, '— CODE OF PRACTICE —', bw / 2, 140, { size: 26, fam: 'type', color: '#f1d27a' });
        }
        ctx.restore();
      }
      ctx.restore();
      if (t >= B.page && t < B.go) text(ctx, `PAGE ${t >= B.eighteen ? 18 : Math.max(1, Math.floor(1 + 17 * P(t, B.page, B.eighteen - B.page, E.lin)))}`, 330, 220, { size: 90, fam: 'anton', color: COL.yellow, stroke: '#000', strokeW: 10, scale: pop(t, B.page, 0.2) });
    }
    if (t < B.go + 0.2) return;
    const a2 = Math.min(P(t, B.go + 0.2, 0.3), 1 - P(t, V2_B - 0.2, 0.6));
    ctx.globalAlpha = a2;
    // ---------------- header + class ribbon
    writeOn(ctx, 'SECTION CLASSIFICATION', 160, 130, P(t, B.classify - 0.1, 0.6, E.lin), { size: 64, fam: 'anton', color: BP, ls: 4 });
    const cls = [['CLASS 1 · PLASTIC', '#2ee59d'], ['CLASS 2 · COMPACT', '#ffd23f'], ['CLASS 3 · SEMI-COMPACT', '#ff9f1c'], ['CLASS 4 · SLENDER', '#ff4d4d']];
    const ribA = 1 - P(t, B.come - 0.1, 0.35);
    if (ribA > 0) cls.forEach(([s, c], i) => {
      const ti = B.section + i * 0.12; if (t < ti) return;
      const x = 160 + i * 350, k = pop(t, ti, 0.2);
      ctx.save(); ctx.globalAlpha *= ribA; ctx.translate(x + 165, 205); ctx.scale(k, k);
      rrect(ctx, -165, -26, 330, 52, 26); ctx.fillStyle = c + '33'; ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.stroke();
      text(ctx, s, 0, 2, { size: 24, fam: 'mono', color: c });
      ctx.restore();
    });
    if (t >= B.capacity) { const f = (t * 1.6) % 1; ctx.save(); ctx.globalAlpha *= 0.6 * (1 - P(t, B.flange, 0.3)); for (let i = 0; i < 6; i++) { const x = 160 + ((f + i / 6) % 1) * 1390; circle(ctx, x, 245, 6); ctx.fillStyle = '#9fd6ff'; ctx.fill(); } ctx.restore(); }
    // ---------------- cross-section blueprint
    const cx = 450, cy = 590, sc = 1.38;
    const webHi = t >= B.web ? P(t, B.web, 0.3) : 0, flHi = t >= B.outstand ? P(t, B.outstand, 0.3) * (1 - P(t, B.check, 0.3)) : 0;
    const pts = iPoly().map((p) => [cx + p[0] * sc, cy - p[1] * sc]);
    if (flHi > 0) { ctx.save(); ctx.globalAlpha *= flHi; ctx.fillStyle = 'rgba(255,210,63,0.45)'; ctx.fillRect(cx + 3.75 * sc, cy - 150 * sc, 66.25 * sc, 12.4 * sc); ctx.restore(); }
    if (webHi > 0) { ctx.save(); ctx.globalAlpha *= webHi; ctx.fillStyle = 'rgba(63,224,255,0.45)'; ctx.fillRect(cx - 3.75 * sc, cy - 137.6 * sc, 7.5 * sc, 275.2 * sc); ctx.restore(); }
    iSection(ctx, cx, cy, sc, { color: '#ffffff', lw: 3, prog: P(t, B.classify, 1.2, E.ioC), glow: 'rgba(160,210,255,0.8)' });
    // root fillets hint
    const dimA = P(t, B.flow - 0.3, 0.6);
    if (dimA > 0) {
      ctx.save(); ctx.globalAlpha *= dimA;
      dimLine(ctx, cx - 70 * sc, cx + 70 * sc, cy - 150 * sc - 50, 'B = 140', 1, { color: BP, fam: 'mono', size: 28, labelDy: -26 });
      ctx.save(); ctx.translate(cx - 70 * sc - 70, cy); ctx.rotate(-Math.PI / 2); dimLine(ctx, -150 * sc, 150 * sc, 0, 'D = 300', 1, { color: BP, fam: 'mono', size: 28, labelDy: -26 }); ctx.restore();
      ctx.restore();
    }
    if (t >= B.outstand) dimLine(ctx, cx, cx + 70 * sc, cy - 150 * sc - 110, 'b = 70', P(t, B.outstand, 0.4), { color: 'yellow', fam: 'mono', size: 30, labelDy: -26 });
    if (t >= B.T) { ctx.save(); ctx.translate(cx + 70 * sc + 50, cy - 143.8 * sc); ctx.rotate(-Math.PI / 2); dimLine(ctx, -6.2 * sc - 14, 6.2 * sc + 14, 0, '', P(t, B.T, 0.3), { color: 'yellow' }); ctx.restore(); mathText(ctx, 't_{f} = 12.4', cx + 70 * sc + 80, cy - 143.8 * sc, { size: 30, fam: 'mono', color: COL.yellow, alpha: P(t, B.F, 0.2) }); }
    if (t >= B.D) { ctx.save(); ctx.translate(cx + 40, cy); ctx.rotate(-Math.PI / 2); dimLine(ctx, -123.6 * sc, 123.6 * sc, 0, '', P(t, B.D, 0.4), { color: 'cyan' }); ctx.restore(); mathText(ctx, 'd = 247.2', cx + 62, cy + 40, { size: 30, fam: 'mono', color: COL.cyan, alpha: P(t, B.D + 0.2, 0.2) }); }
    if (t >= B.T2) mathText(ctx, 't_{w} = 7.5', cx + 62, cy - 20, { size: 30, fam: 'mono', color: COL.cyan, alpha: P(t, B.T2, 0.2) });
    // ---------------- flange check (right)
    const RX = 860;
    const flOut = P(t, B.come, 0.5, E.ioC); // shrink to chip
    const rightOut = 1 - P(t, B.form - 0.55, 0.3);
    if (t >= B.b - 0.1 && rightOut > 0) {
      ctx.save(); ctx.globalAlpha *= rightOut;
      const chipY = lerp(0, -120, flOut), chipS = lerp(1, 0.55, flOut);
      ctx.translate(RX, 330 + chipY); ctx.scale(chipS, chipS); ctx.translate(-RX, -330);
      text(ctx, 'FLANGE', RX, 330, { size: 44, fam: 'anton', color: COL.yellow, align: 'left', alpha: P(t, B.b - 0.1, 0.2) });
      eqn(ctx, [{ s: 'b', t: B.b }, { s: '/', t: B.over }, { s: 't_{f}', t: B.T }, { s: '=', t: B.seventy - 0.05 }, { s: '70', t: B.seventy, c: COL.yellow }, { s: '/', t: B.over2 }, { s: '12.4', t: B.twelve, c: COL.yellow }], RX + 190, 330, t, { size: 60, fam: 'mono', align: 'left', color: '#ffffff' });
      if (t >= B.five) {
        const digits = [['5', B.five], ['.', B.point2], ['6', B.six], ['4', B.four2]];
        let s = ''; for (const [d, ti] of digits) if (t >= ti) s += d;
        text(ctx, '= ' + s, RX + 190, 440, { size: 96, fam: 'anton', color: '#ffffff', align: 'left', scale: pop(t, B.five, 0.15, 1.5), glow: 'rgba(160,210,255,0.8)' });
        if (t >= B.less) eqn(ctx, [{ s: '<', t: B.less }, { s: '9.4', t: B.nine, c: COL.green }, { s: 'ε', t: B.eps, c: COL.green }], RX + 520, 442, t, { size: 84, fam: 'anton', align: 'left' });
      }
      if (t >= B.plastic) { stamp(ctx, 'FLANGE: CLASS 1 ✓', RX + 340, 700, t, B.plastic, { size: 56, color: COL.green, rot: -0.06, hole: '#0c3a63', fam: 'stamp' }); }
      ctx.restore();
      if (flOut < 0.5) gauge(ctx, RX, 570, 680, 5.64, 20, [9.4, 10.5, 15.7], P(t, B.less - 0.2, 0.6), t, { needleT: B.nine, markLabels: ['9.4ε', '10.5ε', '15.7ε'], alpha: 1 - clamp(flOut * 2) });
    }
    if (t >= B.suddenly - 0.1 && t < B.five + 0.3) {
      const a = Math.min(P(t, B.suddenly - 0.1, 0.15), 1 - P(t, B.five, 0.3));
      emoji(ctx, '📢', 1430, 600, 140, { alpha: a, scale: pop(t, B.suddenly - 0.1, 0.2), rot: -0.2 });
      text(ctx, 'HELLO?!', 1430, 720, { size: 70, fam: 'marker', color: COL.red, alpha: a, scale: pop(t, B.deaf, 0.15, 2), rot: 0.08 });
      for (let i = 0; i < 3; i++) { const r = 60 + ((t * 2.2 + i / 3) % 1) * 120; ctx.save(); ctx.globalAlpha *= a * (1 - ((t * 2.2 + i / 3) % 1)); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(1490, 590, r, -0.7, 0.5); ctx.stroke(); ctx.restore(); }
    }
    // ---------------- web check
    if (t >= B.D - 0.1) {
      const wOut = P(t, B.whole - 0.2, 0.4, E.ioC);
      ctx.save(); ctx.globalAlpha *= rightOut;
      text(ctx, 'WEB', RX, 400, { size: 44, fam: 'anton', color: COL.cyan, align: 'left', alpha: P(t, B.D - 0.1, 0.2) });
      eqn(ctx, [{ s: 'd', t: B.D }, { s: '/', t: B.over3 }, { s: 't_{w}', t: B.T2 }, { s: '=', t: B.thirty - 0.1 }, { s: '247.2 / 7.5', t: B.thirty - 0.05, c: COL.cyan }], RX + 190, 400, t, { size: 60, fam: 'mono', align: 'left', color: '#ffffff' });
      if (t >= B.thirty) {
        const v = 32.96 * P(t, B.thirty, B.nine2 - B.thirty + 0.1, E.outC);
        text(ctx, '= ' + v.toFixed(2), RX + 190, 500, { size: 96, fam: 'anton', color: '#ffffff', align: 'left', scale: pop(t, B.thirty, 0.15, 1.5), glow: 'rgba(160,210,255,0.8)' });
        if (t >= B.under) eqn(ctx, [{ s: '<', t: B.under }, { s: '84', t: B.eighty, c: COL.green }, { s: 'ε', t: B.eighty + 0.1, c: COL.green }], RX + 560, 502, t, { size: 84, fam: 'anton', align: 'left' });
        if (t >= B.telling && t < B.telling + 0.6) { const g = Math.sin((t - B.telling) * Math.PI / 0.6); circle(ctx, RX + 650, 500, 80 + 10 * g); ctx.strokeStyle = `rgba(46,229,157,${g})`; ctx.lineWidth = 6; ctx.stroke(); }
      }
      gauge(ctx, RX, 680, 680, 32.96, 150, [84, 105, 126], P(t, B.under - 0.3, 0.6), t, { needleT: B.under + 0.1, markLabels: ['84ε', '105ε', '126ε'], alpha: 1 - wOut });
      ctx.restore();
    }
    // ---------------- whole section plastic, beta_b = 1
    if (t >= B.plastic2 - 0.05) {
      stamp(ctx, 'SECTION: PLASTIC', cx + 60, cy + 10, t, B.plastic2, { size: 58, color: COL.green, rot: -0.18, hole: '#0c3a63', bg: 'rgba(7,37,64,0.75)', alpha: 1 - P(t, B.form - 0.3, 0.3) });
      if (t >= B.beta) {
        const a = 1 - P(t, B.form - 0.3, 0.3);
        eqn(ctx, [{ s: 'β_{b}', t: B.beta, c: COL.yellow }, { s: '=', t: B.equals }, { s: '1.0', t: B.one, c: COL.yellow, glow: 'rgba(255,210,63,0.8)' }], RX + 340, 640, t, { size: 120, fam: 'anton', alpha: a });
      }
    }
    // ---------------- plastic hinge
    if (t >= B.form - 0.4) {
      const a = P(t, B.form - 0.4, 0.3);
      ctx.save(); ctx.globalAlpha *= a;
      const x0 = 820, x1 = 1560, y = 560, xm = (x0 + x1) / 2;
      const yz = P(t, B.plastic3 - 0.2, B.hinge - B.plastic3 + 0.2, E.lin), rot = P(t, B.hinge, 0.8, E.outC) * 26;
      // yield zones grow from midspan
      if (yz > 0) {
        for (const sgn of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(xm - 260 * yz, y + sgn * 32 + rot * 0.0); ctx.quadraticCurveTo(xm, y + sgn * (32 - 26 * yz), xm + 260 * yz, y + sgn * 32); ctx.lineTo(xm + 260 * yz, y + sgn * 32); ctx.closePath();
          ctx.fillStyle = 'rgba(255,159,28,0.7)'; ctx.fill();
          ctx.beginPath(); ctx.moveTo(xm - 260 * yz, y + sgn * 32); ctx.quadraticCurveTo(xm, y + sgn * (32 - 30 * yz), xm + 260 * yz, y + sgn * 32); ctx.lineTo(xm + 260 * yz, y + sgn * 32); ctx.lineTo(xm - 260 * yz, y + sgn * 32); ctx.fill();
        }
      }
      beamElev(ctx, x0, x1, y, 64, { color: '#ffffff', hinge: rot, lw: 4 });
      pinSupport(ctx, x0, y + 32, 40, { color: '#ffffff' }); rollerSupport(ctx, x1, y + 32 + rot * 0, 40, { color: '#ffffff' });
      if (t >= B.hinge) {
        const hy = y + rot, k = pop(t, B.hinge, 0.2, 2);
        ctx.save(); ctx.translate(xm, hy); ctx.scale(k, k); circle(ctx, 0, 0, 26); ctx.fillStyle = '#0c3a63'; ctx.fill(); ctx.strokeStyle = COL.orange; ctx.lineWidth = 7; ctx.shadowColor = COL.orange; ctx.shadowBlur = 30; ctx.stroke(); ctx.restore();
        text(ctx, 'PLASTIC HINGE', xm, hy + 120, { size: 64, fam: 'anton', color: COL.orange, scale: pop(t, B.hinge + 0.05, 0.2), stroke: '#000', strokeW: 8 });
        mathText(ctx, 'M = M_{p} at L/2', xm, hy - 110, { size: 44, fam: 'mono', color: '#ffffff', align: 'center', alpha: P(t, B.before, 0.2) });
        // curved moment arrows
        for (const sgn of [-1, 1]) { ctx.save(); ctx.globalAlpha *= P(t, B.hinge + 0.2, 0.3); ctx.strokeStyle = COL.orange; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(xm + sgn * 90, hy, 50, sgn > 0 ? -2.2 : -0.9, sgn > 0 ? 0.9 : 2.2); ctx.stroke(); ctx.restore(); }
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },
});
punch(B.open, 0.05, 0.25); punch(B.eighteen, 0.06, 0.25); flash(B.go + 0.15, 0.5, 0.25, '#9fd6ff'); glitch(B.go + 0.1, 0.12, 0.7);
shake(B.five, 14, 0.2); shake(B.deaf, 20, 0.22); shake(B.plastic, 14, 0.2); punch(B.plastic2, 0.06, 0.25); shake(B.plastic2, 18, 0.25); punch(B.one, 0.06, 0.25); shake(B.hinge, 20, 0.3); flash(B.hinge, 0.25, 0.2, '#ff9f1c');

module.exports = { S };
