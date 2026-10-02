'use strict';
// Verse 1 (problem + demand) and pre-chorus roast (41 – 83.8 s)
const C = require('./core');
const { W, H, clamp, lerp, inv, E, rnd, srnd, noise1, TAU, P, env, pop, WT, COL, text, tw, writeOn, eqn, mathText, mathW, line, arrow, rrect, circle,
  dimLine, pinSupport, rollerSupport, beamElev, udl, iSection, beam3D, stamp, burst, check, cross, rays, speedLines, emoji, shake, flash, punch, glitch,
  beatPulse, feS, ink, sag } = C;
const { student, eye } = require('./scenes1');

const S = [];
// ===================================================================== VERSE 1: the problem on the board
const X0 = 150, X1 = 1150, BY = 360, BD = 44;
const T = {
  check: WT(5, 'check'), problem: WT(5, 'problem'), screen: WT(5, 'screen'), weep: WT(5, 'weep'),
  I: WT(6, 'i'), S: WT(6, 's'), M: WT(6, 'm'), B: WT(6, 'b'), three: WT(6, 'three'), sleep: WT(6, 'sleep'), donot: WT(6, 'do'),
  simply: WT(7, 'simply'), supported: WT(7, 'supported'), beam: WT(7, 'beam'), span: WT(7, 'span'), five: WT(7, 'five'),
  factored: WT(8, 'factored'), load: WT(8, 'load'), attention: WT(8, 'attention'), cheaters: WT(8, 'cheaters'),
  forty: WT(9, 'forty'), kilo: WT(9, 'kilo'), pushing: WT(9, 'pushing'), down: WT(9, 'down'),
  F: WT(10, 'f'), four: WT(10, 'four'), ten: WT(10, 'ten'), steel: WT(10, 'steel'), strongest: WT(10, 'strongest'),
  step: WT(11, 'step'), moment: WT(11, 'moment'), w: WT(11, 'w'), l: WT(11, 'l'), squared: WT(11, 'squared'), over: WT(11, 'over'), eight: WT(11, 'eight'),
  forty2: WT(12, 'forty'), times: WT(12, 'times'), twenty: WT(12, 'twenty'), over2: WT(12, 'over'), eight2: WT(12, 'eight'), hesitate: WT(12, 'hesitate'),
  one: WT(13, 'one'), kn: WT(13, 'kilo'), demand: WT(13, 'demand'),
  now: WT(14, 'now'), shear: WT(14, 'shear'), get: WT(14, 'get'), cls: WT(14, 'class'), understand: WT(14, 'understand'),
  w2: WT(15, 'w'), l2: WT(15, 'l'), over3: WT(15, 'over'), two: WT(15, 'two'), exactly: WT(15, 'exactly'), hundred: WT(15, 'one'), kn2: WT(15, 'kilo'),
  even: WT(16, 'even'), first: WT(16, 'first'), student: WT(16, 'student'), conclusions: WT(16, 'conclusions'),
};
const V1_END = 73.45;
S.push({
  a: 41.2, b: V1_END, draw(ctx, t) {
    const out = 1 - P(t, V1_END - 0.3, 0.3, E.inC);
    ctx.globalAlpha = out;
    // ---------------- problem card (big, then folds away)
    const cardOut = P(t, T.simply - 0.35, 0.35, E.inC);
    if (t < T.simply) {
      const k = pop(t, T.check - 0.08, 0.25, 0.6), y = 470 - cardOut * 700;
      ctx.save(); ctx.translate(W / 2, y); ctx.scale(k, k); ctx.rotate(-0.012);
      rrect(ctx, -620, -300, 1240, 600, 18); ctx.fillStyle = 'rgba(250,248,238,0.96)'; ctx.fill();
      ctx.lineWidth = 6; ctx.strokeStyle = '#d64545'; ctx.stroke();
      text(ctx, 'PROBLEM 7.1', -580, -238, { size: 54, fam: 'stamp', color: '#c62f2f', align: 'left' });
      text(ctx, '[10 marks]', 580, -238, { size: 34, fam: 'type', color: '#555', align: 'right' });
      const rows = [
        ['Check the adequacy of a', T.problem], ['simply supported ISMB 300 beam,', T.screen], ['span L = 5 m, factored UDL w = 40 kN/m,', T.screen + 0.25],
        ['steel Fe 410 (f  = 250 MPa).', T.screen + 0.5], ['Compression flange laterally restrained.', T.screen + 0.75],
      ];
      rows.forEach(([s, ti], i) => { const a = P(t, ti, 0.25, E.lin); if (a <= 0) return; ctx.save(); ctx.beginPath(); ctx.rect(-600, -160 + i * 80 - 40, 1200 * a, 80); ctx.clip(); text(ctx, s, -580, -160 + i * 80, { size: 44, fam: 'type', color: '#1d1d1d', align: 'left' }); ctx.restore(); });
      if (t >= T.screen + 0.5) text(ctx, 'y', -580 + tw(ctx, 'steel Fe 410 (f', 44, 'type') + 2, -160 + 3 * 80 + 14, { size: 26, fam: 'type', color: '#1d1d1d', align: 'left' });
      // ISMB 300 letters stamped + circled
      if (t >= T.I) {
        const lx = 230, ly = 230; const lets = [['I', T.I], ['S', T.S], ['M', T.M], ['B', T.B], [' 300', T.three]];
        let xx = lx; for (const [ch, ti] of lets) { if (t >= ti) text(ctx, ch, xx, ly, { size: 74, fam: 'stamp', color: '#c62f2f', align: 'left', scale: pop(t, ti, 0.12, 2) }); xx += tw(ctx, ch, 74, 'stamp'); }
        line(ctx, Array.from({ length: 26 }, (_, i) => { const a2 = -0.4 + (i / 25) * TAU * 1.05; return [lx + 170 + Math.cos(a2) * 250, ly + Math.sin(a2) * 62]; }), { color: '#d63a3a', lw: 6, prog: P(t, T.three + 0.25, 0.35) }, t);
        iSection(ctx, 500, -40, 0.62, { color: '#1d1d1d', lw: 4, prog: P(t, T.I, 0.5), fill: 'rgba(0,0,0,0.08)' });
      }
      ctx.restore();
      if (t >= T.weep - 0.05 && t < T.I) emoji(ctx, '😭', 1640, 250, 150, { scale: pop(t, T.weep - 0.05, 0.2), rot: 0.2 });
      // Zzz crossed
      if (t >= T.donot - 0.2 && t < T.simply) {
        const za = env(t, T.donot - 0.2, T.simply, 0.1, 0.2);
        ctx.globalAlpha = out * za;
        ['Z', 'z', 'z'].forEach((z, i) => text(ctx, z, 1610 + i * 60, 200 - i * 50 - (t - T.donot) * 30, { size: 90 - i * 18, fam: 'chalk', color: 'cyan' }));
        cross(ctx, 1680, 160, 170, P(t, T.sleep, 0.2), { lw: 12 });
        ctx.globalAlpha = out;
      }
    }
    // ---------------- the beam diagram
    const bt = Math.max(41.2, T.simply - 0.3);
    const defl = 24 * E.outElastic(P(t, T.pushing, 0.9, E.lin)) * (t >= T.pushing ? 1 : 0) * (1 + 0.15 * beatPulse(t) * (t > T.pushing ? 1 : 0));
    const showBeam = t < 41.3 ? 1 : P(t, T.simply - 0.35, 0.3);
    ctx.globalAlpha = out * showBeam;
    const yy = beamElev(ctx, X0, X1, BY, BD, { prog: 1, defl, fill: t >= T.beam ? 'rgba(170,185,200,0.22)' : null });
    ctx.globalAlpha = out;
    if (t >= T.beam) { const g = Math.exp(-(t - T.beam) / 0.3); if (g > 0.02) { ctx.save(); ctx.globalAlpha *= g; beamElev(ctx, X0, X1, BY, BD, { defl, color: 'yellow', lw: 7 }); ctx.restore(); } }
    pinSupport(ctx, X0, BY + BD / 2 + defl * 0, 46, { prog: P(t, T.simply - 0.05, 0.3) });
    rollerSupport(ctx, X1, BY + BD / 2, 46, { prog: P(t, T.supported - 0.05, 0.3) });
    if (t >= T.simply && t < 66) { text(ctx, 'PIN', X0, BY + 135, { size: 34, fam: 'hand', color: 'cyan', alpha: P(t, T.simply, 0.2) * (1 - P(t, 62, 0.4)) }); text(ctx, 'ROLLER', X1, BY + 135, { size: 34, fam: 'hand', color: 'cyan', alpha: P(t, T.supported, 0.2) * (1 - P(t, 62, 0.4)) }); }
    dimLine(ctx, X0, X1, 520, 'L = 5 m', P(t, T.span, 0.6), { size: 46, labelDy: -32 });
    // UDL
    const pulse = t > T.forty ? 10 * feS('low', t, 2) : 0;
    udl(ctx, X0, X1, 200, (x) => yy(x) - BD / 2 - 4, 21, t, { t0: T.load - 0.25, stagger: 0.022, color: 'yellow', pulse });
    if (t >= T.factored) text(ctx, 'factored ×1.5', 1010, 140, { size: 34, fam: 'hand', color: 'red', alpha: P(t, T.factored, 0.2), rot: -0.05 });
    if (t >= T.load) {
      const ws = [{ s: 'w_{u}', t: T.load }, { s: '=', t: T.load + 0.1 }, { s: '40', t: T.forty, c: 'yellow', size: 64 }, { s: 'kN/m', t: T.kilo, c: 'yellow' }];
      eqn(ctx, ws, 330, 140, t, { size: 52, align: 'left' });
    }
    if (t >= T.pushing) { text(ctx, 'δ', 700, BY + BD / 2 + defl + 26, { size: 40, fam: 'dejavu', color: 'chalk', alpha: P(t, T.pushing + 0.2, 0.2) }); line(ctx, [[X0, BY + BD / 2], [X1, BY + BD / 2]], { color: 'chalk', lw: 2, dash: [6, 10], alpha: 0.45 * P(t, T.pushing, 0.3) }); }
    // cheaters
    if (t >= T.cheaters - 0.15 && t < T.F + 0.6) {
      ctx.globalAlpha = out * (1 - P(t, T.F + 0.3, 0.3));
      text(ctx, 'CHEATERS', 1560, 230, { size: 92, fam: 'marker', color: COL.red, rot: -0.12, scale: pop(t, T.cheaters - 0.15, 0.2, 2) });
      emoji(ctx, '👀', 1560, 360, 110, { scale: pop(t, T.attention, 0.2) });
      ctx.globalAlpha = out;
    }
    // material tag
    if (t >= T.F - 0.1) {
      const k = P(t, T.step - 0.3, 0.5, E.ioC);
      const tx = lerp(650, 1560, k), ty = lerp(680, 150, k), sc = lerp(1, 0.62, k);
      ctx.save(); ctx.translate(tx, ty); ctx.scale(sc * pop(t, T.F - 0.1, 0.2, 0.3), sc * pop(t, T.F - 0.1, 0.2, 0.3)); ctx.rotate(-0.03);
      rrect(ctx, -330, -70, 790, 140, 16); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = ink(ctx, 'chalk'); ctx.stroke();
      text(ctx, 'Fe', -240, -4, { size: 84, fam: 'chalk', color: 'chalk' });
      if (t >= T.four) text(ctx, '410', -60, -4, { size: 96, fam: 'chalk', color: 'yellow', scale: pop(t, T.four, 0.18) });
      if (t >= T.steel) mathText(ctx, 'f_{y} = 250 MPa', 120, 0, { size: 44, fam: 'hand', color: 'chalk' });
      ctx.restore();
      if (t >= T.strongest) { const ck = P(t, T.strongest, 0.35, E.outBack); emoji(ctx, '👑', tx - 240 * sc, ty - 110 * sc - (1 - ck) * 200, 110 * sc, { alpha: clamp(ck * 2), rot: -0.2 }); }
    }
    // ---------------- calc panel
    const PX = 1250;
    if (t >= T.step) {
      writeOn(ctx, 'STEP 1 · BENDING MOMENT', PX, 300, P(t, T.step, 0.6, E.lin), { size: 44, fam: 'chalk', color: 'yellow' });
      eqn(ctx, [{ s: 'M_{u}', t: T.moment }, { s: '=', t: T.moment + 0.1 }, { s: 'w', t: T.w, c: 'yellow' }, { s: 'L^{2}', t: T.l, c: 'yellow' }, { s: '/', t: T.over }, { s: '8', t: T.eight }], PX, 385, t, { size: 66, align: 'left' });
      eqn(ctx, [{ s: '=', t: T.forty2 - 0.05 }, { s: '40', t: T.forty2, c: 'yellow' }, { s: '×', t: T.times }, { s: '25', t: T.twenty, c: 'yellow' }, { s: '/', t: T.over2 }, { s: '8', t: T.eight2 }], PX, 470, t, { size: 66, align: 'left' });
      if (t >= T.one) {
        const v = Math.round(125 * P(t, T.one, 0.55, E.outC));
        text(ctx, `= ${v} kNm`, PX, 575, { size: 84, fam: 'anton', color: COL.red, align: 'left', scale: pop(t, T.one, 0.16, 1.6), glow: 'rgba(255,77,77,0.6)', glowR: 26 });
        stamp(ctx, 'DEMAND', 1780, 560, t, T.demand, { size: 40, color: COL.red, rot: -0.12, hole: '#1a2723' });
      }
    }
    // BMD under the beam
    if (t >= T.one) {
      const pr = P(t, T.one + 0.1, 0.8, E.ioC), y0 = 575, h = 100;
      const pts = []; for (let i = 0; i <= 50; i++) { const xi = i / 50; pts.push([lerp(X0, X1, xi), y0 + h * 4 * xi * (1 - xi)]); }
      ctx.save(); ctx.beginPath(); ctx.rect(X0 - 10, y0 - 10, (X1 - X0 + 20) * pr, h + 30); ctx.clip();
      ctx.beginPath(); ctx.moveTo(X0, y0); pts.forEach((p) => ctx.lineTo(p[0], p[1])); ctx.lineTo(X1, y0); ctx.closePath(); ctx.fillStyle = 'rgba(255,77,77,0.28)'; ctx.fill();
      line(ctx, pts, { color: 'red', lw: 5 });
      ctx.restore();
      line(ctx, [[X0, y0], [X1, y0]], { color: 'chalk', lw: 2.5, alpha: 0.7, prog: pr });
      text(ctx, 'BMD', X0 - 70, y0 + 30, { size: 34, fam: 'hand', color: 'red', alpha: pr });
      if (pr > 0.9) { text(ctx, '125 kNm', (X0 + X1) / 2, y0 + h + 34, { size: 40, fam: 'hand', color: 'red', scale: pop(t, T.one + 0.85) }); line(ctx, [[(X0 + X1) / 2, y0], [(X0 + X1) / 2, y0 + h]], { color: 'red', lw: 2, dash: [8, 8], alpha: 0.8 }); }
    }
    // STEP 2 shear
    if (t >= T.now) {
      writeOn(ctx, 'STEP 2 · SHEAR FORCE', PX, 680, P(t, T.now + 0.1, 0.6, E.lin), { size: 44, fam: 'chalk', color: 'yellow' });
      eqn(ctx, [{ s: 'V_{u}', t: T.w2 - 0.15 }, { s: '=', t: T.w2 - 0.05 }, { s: 'w', t: T.w2, c: 'yellow' }, { s: 'L', t: T.l2, c: 'yellow' }, { s: '/', t: T.over3 }, { s: '2', t: T.two }], PX, 765, t, { size: 66, align: 'left' });
      if (t >= T.hundred) { const v = Math.round(100 * P(t, T.hundred, 0.5)); text(ctx, `= ${v} kN`, PX, 850, { size: 80, fam: 'anton', color: COL.cyan, align: 'left', scale: pop(t, T.hundred, 0.16, 1.6), glow: 'rgba(63,224,255,0.6)', glowR: 24 }); }
    }
    // exit sign gag (centre)
    if (t >= T.get - 0.08 && t < T.w2 - 0.05) {
      const ga = Math.min(P(t, T.get - 0.08, 0.12), 1 - P(t, T.w2 - 0.25, 0.2));
      const blink = Math.floor((t - T.get) * 7) % 2 ? 1 : 0.6;
      ctx.save(); ctx.globalAlpha *= ga;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(-50, -50, W + 100, H + 100);
      const k = pop(t, T.get - 0.08, 0.2, 2);
      ctx.translate(W / 2 + 80, 450); ctx.scale(k, k); ctx.rotate(-0.04);
      ctx.globalAlpha *= blink;
      rrect(ctx, -330, -110, 660, 220, 18); ctx.fillStyle = '#0d7a3a'; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#d9ffe6'; ctx.stroke();
      text(ctx, 'EXIT  →', 0, 8, { size: 150, fam: 'anton', color: '#eafff0', glow: '#5dff9a', glowR: 30 });
      ctx.restore();
      emoji(ctx, '🚪', W / 2 - 400, 450, 200, { alpha: ga, scale: pop(t, T.cls, 0.2) });
    }
    // SFD + reactions
    if (t >= T.hundred) {
      const pr = P(t, T.hundred + 0.05, 0.6, E.ioC), y0 = 795, h = 58;
      ctx.save(); ctx.beginPath(); ctx.rect(X0 - 10, y0 - h - 10, (X1 - X0 + 20) * pr, 2 * h + 20); ctx.clip();
      const xm = (X0 + X1) / 2;
      ctx.beginPath(); ctx.moveTo(X0, y0); ctx.lineTo(X0, y0 - h); ctx.lineTo(xm, y0); ctx.closePath(); ctx.fillStyle = 'rgba(63,224,255,0.28)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(xm, y0); ctx.lineTo(X1, y0 + h); ctx.lineTo(X1, y0); ctx.closePath(); ctx.fill();
      line(ctx, [[X0, y0], [X0, y0 - h], [X1, y0 + h], [X1, y0]], { color: 'cyan', lw: 5 });
      ctx.restore();
      line(ctx, [[X0, y0], [X1, y0]], { color: 'chalk', lw: 2.5, alpha: 0.7, prog: pr });
      text(ctx, 'SFD', X0 - 70, y0, { size: 34, fam: 'hand', color: 'cyan', alpha: pr });
      if (pr > 0.5) { text(ctx, '+100', X0 + 60, y0 - h - 22, { size: 34, fam: 'hand', color: 'cyan' }); }
      if (pr > 0.95) { text(ctx, '−100', X1 - 60, y0 + h + 24, { size: 34, fam: 'hand', color: 'cyan' }); }
    }
    // first-year punchline
    if (t >= T.first - 0.1) {
      const a = 1 - P(t, V1_END - 0.4, 0.3);
      ctx.save(); ctx.globalAlpha *= a;
      ctx.fillStyle = `rgba(0,0,0,${0.55 * P(t, T.first - 0.1, 0.2)})`; ctx.fillRect(-50, -50, W + 100, H + 100);
      const k = pop(t, T.first - 0.1, 0.22, 2.2);
      ctx.translate(W / 2, 470); ctx.rotate(-0.06); ctx.scale(k, k);
      rrect(ctx, -560, -190, 1120, 380, 26); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.lineWidth = 10; ctx.strokeStyle = '#111'; ctx.stroke();
      text(ctx, 'DIFFICULTY', 0, -100, { size: 70, fam: 'stamp', color: '#111', ls: 6 });
      const stars = '★☆☆☆☆'; for (let i = 0; i < 5; i++) if (t >= T.first + i * 0.06) text(ctx, stars[i], -240 + i * 120, 20, { size: 120, fam: 'dejavu', color: i === 0 ? '#c62f2f' : '#111', scale: pop(t, T.first + i * 0.06, 0.15, 2) });
      if (t >= T.student) text(ctx, 'FIRST-YEAR LEVEL', 0, 135, { size: 66, fam: 'anton', color: '#111', scale: pop(t, T.student, 0.18), ls: 3 });
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },
});
shake(T.one, 22, 0.25); punch(T.one, 0.05, 0.25); shake(T.hundred, 18, 0.22); punch(T.hundred, 0.04, 0.2); shake(T.first, 20, 0.25); flash(T.first - 0.1, 0.25, 0.15, '#ffd23f');
shake(T.load + 0.25, 10, 0.25); shake(T.cheaters, 10, 0.2); punch(T.check, 0.05, 0.25); punch(T.forty, 0.04, 0.2);

// ===================================================================== PRE-CHORUS: the roast
const R = {
  are: WT(17, 'are'), writing: WT(17, 'writing'), down: WT(17, 'down'), or: WT(17, 'or'), staring: WT(17, 'staring'), space: WT(17, 'space'),
  because: WT(18, 'because'), building: WT(18, 'building'), inspector: WT(18, 'inspector'), me: WT(18, 'me'), chase: WT(18, 'chase'),
  read: WT(19, 'read'), boundary: WT(19, 'boundary'), conditions: WT(19, 'conditions'), open: WT(19, 'open'), eyes: WT(19, 'eyes'),
};
function runner(ctx, x, y, s, t, o = {}) {
  const ph = t * (o.speed || 14), c = o.color || 'chalk';
  const L = (a, len) => [Math.sin(a) * len, Math.cos(a) * len];
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= o.alpha ?? 1;
  const hip = [0, -s * 0.9], neck = [s * 0.12, -s * 1.55];
  const lw = 6;
  line(ctx, [hip, neck], { color: c, lw });
  circle(ctx, neck[0] + s * 0.06, neck[1] - s * 0.24, s * 0.22); ctx.lineWidth = lw; ctx.strokeStyle = ink(ctx, c); ctx.stroke();
  for (const sgn of [1, -1]) {
    const a1 = sgn * 0.8 * Math.sin(ph), k1 = L(a1, s * 0.48), knee = [hip[0] + k1[0], hip[1] + k1[1]];
    const a2 = a1 - 0.6 - 0.5 * Math.max(0, Math.sin(ph * sgn)), k2 = L(a2, s * 0.45), foot = [knee[0] + k2[0], knee[1] + k2[1]];
    line(ctx, [hip, knee, foot], { color: c, lw });
    const b1 = -sgn * 0.9 * Math.sin(ph), e1 = L(b1 + Math.PI, -s * 0.36), elbow = [neck[0] + e1[0] * -1, neck[1] + s * 0.36 * Math.cos(b1) * 0.9];
    line(ctx, [[neck[0], neck[1] + s * 0.1], [neck[0] + Math.sin(b1) * s * 0.35, neck[1] + s * 0.42], [neck[0] + Math.sin(b1) * s * 0.35 + s * 0.25, neck[1] + s * 0.25]], { color: c, lw });
  }
  if (o.hat) { ctx.beginPath(); ctx.arc(neck[0] + s * 0.06, neck[1] - s * 0.3, s * 0.28, Math.PI, 0); ctx.fillStyle = COL.yellow; ctx.fill(); ctx.fillRect(neck[0] + s * 0.06 - s * 0.36, neck[1] - s * 0.32, s * 0.72, s * 0.07); }
  if (o.glasses) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; circle(ctx, neck[0] + s * 0.14, neck[1] - s * 0.25, s * 0.07); ctx.stroke(); }
  if (o.clip) { ctx.fillStyle = '#c9a26b'; ctx.fillRect(neck[0] + s * 0.45, neck[1] + s * 0.15, s * 0.32, s * 0.42); ctx.fillStyle = '#fff'; ctx.fillRect(neck[0] + s * 0.49, neck[1] + s * 0.22, s * 0.24, s * 0.3); }
  ctx.restore();
}
S.push({
  a: 73.45, b: 83.79, draw(ctx, t) {
    // ---- notebook
    if (t < R.or + 0.3) {
      const a = 1 - P(t, R.or, 0.3), k = P(t, 73.45, 0.35, E.outBack);
      ctx.save(); ctx.globalAlpha *= a; ctx.translate(W / 2, 520 + (1 - k) * 600); ctx.rotate(-0.04);
      rrect(ctx, -430, -300, 860, 600, 14); ctx.fillStyle = '#f7f5ec'; ctx.fill();
      ctx.strokeStyle = 'rgba(60,120,200,0.35)'; ctx.lineWidth = 2; for (let i = 0; i < 11; i++) { ctx.beginPath(); ctx.moveTo(-430, -220 + i * 50); ctx.lineTo(430, -220 + i * 50); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(220,60,60,0.5)'; ctx.beginPath(); ctx.moveTo(-330, -300); ctx.lineTo(-330, 300); ctx.stroke();
      text(ctx, 'NOTES — LEC 07', -310, -255, { size: 40, fam: 'gochi', color: '#223', align: 'left' });
      const pr = P(t, R.writing, 0.9, E.lin);
      for (let i = 0; i < 6; i++) { const lp = clamp(pr * 6 - i); if (lp <= 0) continue; const pts = []; for (let k2 = 0; k2 <= 30; k2++) pts.push([-310 + k2 * 21 * lp, -190 + i * 50 + Math.sin(k2 * 1.7 + i) * 6]); line(ctx, pts, { color: '#1b2a6b', lw: 3 }); }
      ctx.restore();
      if (t >= R.down) text(ctx, 'ARE YOU WRITING THIS DOWN?', W / 2, 140, { size: 66, fam: 'marker', color: COL.red, scale: pop(t, R.writing, 0.2), alpha: a });
      if (t >= R.down - 0.1) emoji(ctx, '📝', 1300 + Math.sin(t * 30) * 10, 560 - (1 - k) * 600, 120, { alpha: a });
    }
    // ---- staring into space
    if (t >= R.or - 0.05 && t < R.because + 0.25) {
      const a = Math.min(P(t, R.or - 0.05, 0.25), 1 - P(t, R.because - 0.05, 0.3));
      ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = '#02030a'; ctx.fillRect(-60, -60, W + 120, H + 120);
      const sp = 0.4 + 2.6 * P(t, R.staring, 0.6);
      for (let i = 0; i < 160; i++) {
        const ang = rnd(i * 1.3) * TAU, z = ((rnd(i * 2.7) + (t - R.or) * 0.35 * sp) % 1), r = Math.pow(z, 2.2) * 1300;
        const x = W / 2 + Math.cos(ang) * r, y = H / 2 + Math.sin(ang) * r, len = 6 + 60 * z * sp;
        ctx.strokeStyle = `rgba(255,255,255,${0.2 + 0.8 * z})`; ctx.lineWidth = 1 + 2 * z;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); ctx.stroke();
      }
      emoji(ctx, '🪐', 600 + (t - R.or) * 60, 360, 170, { rot: (t - R.or) * 0.3 });
      emoji(ctx, '🚀', 1350 - (t - R.or) * 120, 650 - (t - R.or) * 140, 130, { rot: -0.6 });
      text(ctx, 'STARING INTO SPACE?', W / 2, 540, { size: 120, fam: 'anton', color: '#fff', scale: pop(t, R.staring, 0.25) * (1 + 0.15 * P(t, R.space, 0.4)), alpha: P(t, R.staring, 0.2), stroke: '#000', strokeW: 10, glow: 'rgba(130,160,255,0.8)', glowR: 40 });
      ctx.restore();
    }
    // ---- the chase
    if (t >= R.because - 0.1 && t < R.read + 0.2) {
      const a = Math.min(P(t, R.because - 0.1, 0.2), 1 - P(t, R.read - 0.1, 0.3));
      ctx.save(); ctx.globalAlpha *= a;
      speedLines(ctx, t, { n: 40, alpha: 0.25, cy: 560 });
      const k = (t - R.because) / (R.read - R.because);
      const gy = 700; line(ctx, [[0, gy], [W, gy]], { lw: 4, alpha: 0.6 });
      for (let i = 0; i < 12; i++) { const x = ((i * 190 - (t * 900)) % (W + 200) + W + 200) % (W + 200) - 100; line(ctx, [[x, gy + 18], [x - 40, gy + 18]], { lw: 3, alpha: 0.4 }); }
      const profX = lerp(500, 1500, k) + Math.sin(t * 3) * 30, inspX = profX - 420 + Math.sin(t * 2.2) * 50 * (1 + k);
      runner(ctx, profX, gy, 200, t, { speed: 17, glasses: true });
      runner(ctx, inspX, gy, 200, t + 0.13, { speed: 17, hat: true, clip: true, color: 'yellow' });
      text(ctx, 'ME', profX + 20, gy - 430, { size: 54, fam: 'marker', color: 'chalk', alpha: P(t, R.me, 0.2) });
      text(ctx, 'BUILDING INSPECTOR', inspX, gy - 430, { size: 54, fam: 'marker', color: COL.yellow, alpha: P(t, R.inspector, 0.2), scale: pop(t, R.inspector, 0.2) });
      if (t >= R.chase) { text(ctx, '!!', profX + 140, gy - 380, { size: 90, fam: 'anton', color: COL.red, scale: pop(t, R.chase, 0.15, 2) }); emoji(ctx, '💦', profX + 130, gy - 290, 60); }
      ctx.restore();
    }
    // ---- boundary conditions + the eye
    if (t >= R.read - 0.1) {
      const a = P(t, R.read - 0.1, 0.25);
      const zoom = P(t, 82.6, 1.15, E.inExpo);
      ctx.save(); ctx.globalAlpha *= a;
      const bx0 = 460, bx1 = 1460, by = 300;
      ctx.globalAlpha *= 1 - P(t, R.open - 0.1, 0.3);
      beamElev(ctx, bx0, bx1, by, 40, { prog: P(t, R.read, 0.4) });
      pinSupport(ctx, bx0, by + 20, 42, { prog: P(t, R.read + 0.2, 0.3) });
      rollerSupport(ctx, bx1, by + 20, 42, { prog: P(t, R.read + 0.3, 0.3) });
      if (t >= R.boundary) {
        for (const [x, ti] of [[bx0, R.boundary], [bx1, R.boundary + 0.15]]) {
          const pu = 1 + 0.15 * Math.sin((t - ti) * 12);
          circle(ctx, x, by + 40, 90 * pu * pop(t, ti, 0.2)); ctx.strokeStyle = ink(ctx, 'yellow'); ctx.lineWidth = 5; ctx.stroke();
        }
        mathText(ctx, 'y = 0,  M = 0', bx0, by + 190, { size: 46, align: 'center', color: 'yellow', alpha: P(t, R.conditions, 0.2) });
        mathText(ctx, 'y = 0,  M = 0', bx1, by + 190, { size: 46, align: 'center', color: 'yellow', alpha: P(t, R.conditions + 0.15, 0.2) });
        text(ctx, 'BOUNDARY CONDITIONS', W / 2, 150, { size: 76, fam: 'chalk', color: 'chalk', scale: pop(t, R.boundary, 0.2), alpha: P(t, R.boundary, 0.15) });
      }
      ctx.restore();
      if (t >= R.open - 0.15) {
        const op = E.outBack(P(t, R.open - 0.1, 0.5, E.lin));
        ctx.save(); ctx.translate(W / 2, 520); const zs = 1 + zoom * 18; ctx.scale(zs, zs); ctx.translate(-W / 2, -520);
        eye(ctx, W / 2, 520, 420, op, 0, 0, { iris: '#ffb703', pupil: lerp(0.75, 0.35, P(t, R.eyes, 0.4)) });
        ctx.restore();
        if (zoom > 0.7) { ctx.fillStyle = `rgba(0,0,0,${(zoom - 0.7) / 0.3})`; ctx.fillRect(-60, -60, W + 120, H + 120); }
      }
    }
  },
});
punch(R.space - 0.1, 0.05, 0.25); shake(R.chase, 16, 0.2); punch(R.open, 0.06, 0.3); flash(83.79, 0.9, 0.25); glitch(83.7, 0.14, 1);

module.exports = { S, runner };
