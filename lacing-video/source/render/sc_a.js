'use strict';
// Intro, input data, verse 1 (geometry + slenderness), the break.
const X = require('./engine');
const Wd = require('./world');
const K = require('./kit');
const { W, H, clamp, lerp, inv, E, rnd, srnd, TAU, DEG, P, env, v3, text, tw, mathText, line, arrow, dim2, glassPanel, brackets, COL, LT, LEND, slotT, sparks, embers, flare, flash, shake, punch, chroma, feS, beatPulse } = X;
const { COLM } = Wd;

const S = [];
const T = { s1: slotT(1), s6: slotT(6), s14: slotT(14), s15: slotT(15) };

// ===================================================================== INTRO 0 → slot 1
S.push({
  a: 0, b: T.s1 + 0.6, draw(ctx, g, t) {
    const out = 1 - P(t, T.s1 - 0.25, 0.8, E.inQ);
    const cam = Wd.camera([1500 - t * 60, 260 + t * 40, 2300], [0, 2200, 0], 52, 0.18);
    K.stage(ctx, cam, { t, haze: P(t, 0.6, 3.2) * 0.75, floor: false, flareA: 0.2 });
    // the bare channels as dark silhouettes, faintly rim-lit
    if (t > 1.6) K.drawCol(ctx, g, cam, { chanH: 1, bars: 0, bolts: 0, tie: 0 }, { alpha: P(t, 1.6, 1.8) * 0.55 * out, chanGlow: 'rgba(79,209,255,0.35)', glow: 0.5 });
    embers(ctx, t, { n: 50, alpha: 0.5 + 0.3 * P(t, 0.7, 2) });
    // anamorphic ignition on the first vocal
    const ig = P(t, 0.72, 0.5, E.outExpo) * out;
    flare(ctx, W / 2, H * 0.45, lerp(0.4, 2.2, ig), ig * (1 - P(t, 2.0, 1.4)), '255,170,100');
    ctx.save(); ctx.globalAlpha = out;
    K.title(ctx, 'ડિઝાઇન સેફ છે', W / 2, H * 0.45, t, 1.0, { size: 150, fam: 'gu', weight: '700', ls0: 30, ls: 2, lsT: 1.8, blur: 18, blurT: 0.9, fade: 0.6 });
    K.title(ctx, 'THE  DESIGN  IS  SAFE', W / 2, H * 0.45 + 120, t, 1.7, { size: 40, fam: 'cond', weight: '600', ls0: 60, ls: 18, glow: null, color: 'rgba(255,255,255,0.78)' });
    K.title(ctx, 'IS 800:2007  ·  SINGLE LACING SYSTEM  ·  2 × ISMC 350', W / 2, H * 0.45 + 178, t, 2.3, { size: 24, fam: 'hud', weight: '600', ls0: 20, ls: 5, glow: null, color: 'rgba(255,190,120,0.85)' });
    ctx.restore();
    sparks(ctx, W / 2, H * 0.45, t, T.s1 - 0.15, { n: 90, vmin: 400, vmax: 1800, spread: Math.PI * 2, g: 600, life: 1.1, seed: 8 });
  },
});
flash(0.72, 0.25, 0.4, '#ffb36b');

// ===================================================================== INPUT DATA  slot 1 → slot 6  (L0–L4)
const D0 = T.s1, D1 = T.s6;
const dataKeys = [
  { t: D0 - 0.4, pos: [1500, 500, 2100], tgt: [0, 700, 0], fov: 50, roll: 0.16 },
  { t: LT(2) - 0.3, pos: [1900, 1700, 2500], tgt: [0, 2300, 0], fov: 46, roll: 0.1, ease: E.ioS },
  { t: LT(3) + 0.1, pos: [1900, 3900, 2700], tgt: [0, 4700, 0], fov: 46, roll: 0.05, ease: E.ioQuint },
  { t: LT(4) - 0.1, pos: [2100, 4300, 2900], tgt: [0, 4500, 0], fov: 46, roll: 0.02, ease: E.ioS },
  { t: LT(4) + 0.8, pos: [3300, 2500, 5600], tgt: [0, 2500, 0], fov: 50, roll: 0.0, ease: E.ioQuint },
  { t: D1 - 0.6, pos: [3000, 2700, 5100], tgt: [0, 2600, 0], fov: 50, roll: -0.02, ease: E.ioS },
  { t: D1 + 0.1, pos: [800, 5700, 1200], tgt: [0, 4700, 0], fov: 70, roll: -0.2, ease: E.inQ },
];
S.push({
  a: D0 - 0.4, b: D1 + 0.05, draw(ctx, g, t) {
    let cam = Wd.camPath(dataKeys, t);
    if (t < LT(2)) { // early: the camera target follows the growing channels
      const gh = 5000 * P(t, D0, LT(1) - D0 + 1.4, E.ioQ), ty = Math.max(500, gh - 350), k = P(t, D0 - 0.4, 1.2);
      cam = Wd.camera([lerp(900, 1500, k), Math.max(350, ty - 650), lerp(1300, 1900, k)], [0, ty, 0], 48, 0.14);
      if (t > LT(2) - 0.3) cam = Wd.camPath(dataKeys, t);
    }
    const build = P(t, LT(3), D1 - LT(3), E.inQ);
    K.stage(ctx, cam, { t, haze: 0.75 + 0.5 * build, flareA: 0.35 + 0.6 * build });
    const chanH = P(t, D0, LT(1) - D0 + 1.4, E.ioQ);
    const st = { chanH, bars: 0, bolts: 0, tie: P(t, LT(3) - 0.3, 0.9) };
    K.drawCol(ctx, g, cam, st, { chanGlow: `rgba(79,209,255,${0.45 + 0.35 * build})`, glow: 1 });
    embers(ctx, t, { n: 60 + Math.floor(60 * build), speed: 1 + 2 * build, alpha: 0.6 });
    // forging sparks at the growth front of both channels
    if (chanH > 0.01 && chanH < 0.995) for (const sd of [-1, 1]) { const p = Wd.project(cam, [sd * 170, 5000 * chanH, 0]); if (p) for (let j = 0; j < 4; j++) sparks(ctx, p[0], p[1], t, Math.floor(t * 12) / 12 - j / 48, { n: 10, vmin: 150, vmax: 700, life: 0.5, seed: Math.floor(t * 12) * 7 + j * 3 + sd, g: 1100 }); }
    if (chanH > 0.01 && chanH < 0.995) { const p = Wd.project(cam, [0, 5000 * chanH, 0]); if (p) X.flare(ctx, p[0], p[1], 0.9, 0.7, '255,170,100'); }
    // ISMC 350 callouts on both channels
    if (t >= LT(1)) {
      const a = env(t, LT(1), LT(3), 0.3, 0.4);
      K.callout(ctx, cam, [-COLM.s / 2 - COLM.bf, 2300, COLM.h / 2], 'ISMC 350', { dx: -170, dy: -90, alpha: a, prog: P(t, LT(1), 0.5), t, sub: 'CHANNEL  A' });
      K.callout(ctx, cam, [COLM.s / 2 + COLM.bf, 2600, COLM.h / 2], 'ISMC 350', { dx: 170, dy: -110, alpha: a, prog: P(t, LT(1) + 0.25, 0.5), t, sub: 'CHANNEL  B' });
      K.bigNum(ctx, '2 × ISMC 350', W * 0.27, H * 0.62, t, LT(1) + 0.1, { size: 104, alpha: env(t, LT(1), LT(2) - 0.05, 0.2, 0.3) * 0.95, glowR: 30 });
    }
    // clear spacing dimension between the web backs
    if (t >= LT(2)) {
      const a = env(t, LT(2), LT(4), 0.2, 0.4);
      K.dim3(ctx, cam, [-COLM.s / 2, 2900, 0], [COLM.s / 2, 2900, 0], 's = 240', P(t, LT(2) + 0.1, 0.6), { alpha: a, size: 30, glow: true, flat: true, off: -30 });
      K.title(ctx, 'LIMIT  STATE  METHOD', W * 0.27, H * 0.62, t, LT(2) + 0.4, { size: 64, alpha: env(t, LT(2) + 0.4, LT(3) - 0.05, 0.2, 0.3) * 0.9, ls0: 50, ls: 8 });
    }
    // factored load arrow onto the column top
    if (t >= LT(3) - 0.1) {
      const a = env(t, LT(3) - 0.1, D1, 0.3, 0.25), top = Wd.project(cam, [0, 5050, 0]), up = Wd.project(cam, [0, 6900, 0]);
      if (top && up) {
        const k = P(t, LT(3), 0.6, E.outBack);
        const yy = lerp(up[1] - 300, up[1], k);
        ctx.save(); ctx.globalAlpha *= a;
        arrow(ctx, up[0], yy, top[0], top[1] - 30, { color: COL.amber, lw: 14, head: 46, glow: 'rgba(255,150,60,0.9)', glowR: 30 });
        arrow(g, up[0], yy, top[0], top[1] - 30, { color: 'rgba(255,150,60,0.6)', lw: 18, head: 50 });
        const v = t < LT(3) + 1.2 ? Math.round(lerp(1000, 1000, 0)) : Math.round(lerp(1000, 1500, P(t, LT(3) + 1.2, 0.8)));
        text(ctx, `${v} kN`, top[0] + 150, top[1] - 250, { size: 110, fam: 'cond', weight: '700', color: '#fff', align: 'left', glow: 'rgba(255,150,60,0.8)', glowR: 30 });
        text(ctx, t < LT(3) + 1.2 ? 'WORKING LOAD  P' : 'FACTORED  Pu = 1.5 × P', top[0] + 154, top[1] - 170, { size: 30, fam: 'hud', weight: '600', color: COL.amber, align: 'left', ls: 3 });
        ctx.restore();
        if (t >= LT(3) + 1.2) sparks(ctx, top[0], top[1] - 20, t, LT(3) + 1.25, { n: 70, vmin: 300, vmax: 1300, spread: Math.PI * 1.6, seed: 4 });
      }
    }
    // the 5 m length dimension along the column
    if (t >= LT(4)) {
      const a = env(t, LT(4), D1, 0.2, 0.3);
      ctx.save(); ctx.globalAlpha *= a;
      K.dim3(ctx, cam, [-COLM.s / 2 - COLM.bf - 160, 0, COLM.h / 2], [-COLM.s / 2 - COLM.bf - 160, 5000, COLM.h / 2], 'L = 5 m', P(t, LT(4) + 0.1, 0.9), { size: 34, glow: true, off: -34 });
      ctx.restore();
      K.title(ctx, 'Fe 410', W * 0.78, H * 0.62, t, LT(4) + 0.9, { size: 120, alpha: a, ls0: 30, ls: 6, glow: 'rgba(79,209,255,0.6)' });
      text(ctx, 'f_y = 250  ·  f_u = 410  N/mm²'.replace('_', ''), W * 0.78, H * 0.62 + 92, { size: 26, fam: 'hud', weight: '600', color: 'rgba(200,225,255,0.85)', ls: 3, alpha: a * P(t, LT(4) + 1.2, 0.4) });
    }
    // input data card (right)
    const rows = [
      { t: LT(1), s: 'Section    2 × ISMC 350  (back-to-back)' },
      { t: LT(2), s: 'Clear spacing    s = 240 mm' },
      { t: LT(3) + 1.2, s: 'P_{u} = 1.5 × 1000 = 1500 kN', c: COL.amber },
      { t: LT(4), s: 'L_{eff} = 5000 mm    ·    Fe 410' },
    ];
    const ca = 1 - P(t, D1 - 0.5, 0.4);
    K.card(ctx, 70, 120, 600, rows, t, { head: 'INPUT  DATA  ·  IS 800 : 2007', t0: LT(0) + 0.1, alpha: ca, size: 32 });
    // build-up to the drop: streaks converge
    if (build > 0.55) X.flare(ctx, W / 2, H * 0.4, 1 + 2 * build, (build - 0.55) * 1.6, '255,190,120');
  },
});
flash(LT(3) + 1.2, 0.3, 0.25, '#ffb36b'); shake(LT(3) + 1.2, 10, 0.3); punch(LT(3) + 1.2, 0.03, 0.4);

// ===================================================================== VERSE 1  slot 6 → slot 14  (L5–L12)
const V0 = T.s6, V1 = T.s14;
const TOP = (k) => ({ pos: [0, 26000, 300 + k * 4], tgt: [0, 2400, 0], fov: 3.3 });
const v1Keys = [
  { t: V0, pos: [2600, 400, 2600], tgt: [0, 2900, 0], fov: 50, roll: 0.25 },
  { t: LT(6) - 0.6, pos: [-2300, 1600, 2700], tgt: [0, 3000, 0], fov: 46, roll: -0.05, ease: E.ioQ },
  Object.assign({ t: LT(6) + 0.1, ease: E.ioQuint }, TOP(0)),
  Object.assign({ t: LT(8) - 0.45, ease: E.lin }, TOP(40)),
  { t: LT(8) + 0.25, pos: [0, 3650, 2350], tgt: [0, 3650, 0], fov: 22, ease: E.ioQuint },
  { t: LT(9) - 0.35, pos: [60, 3600, 2300], tgt: [0, 3620, 0], fov: 22, ease: E.ioS },
  { t: LT(9) + 0.2, pos: [420, 900, 2200], tgt: [0, 760, 0], fov: 34, ease: E.ioQuint },
  { t: LT(10) + 0.1, pos: [460, 1000, 2250], tgt: [0, 860, 0], fov: 34, ease: E.ioS },
  { t: LT(10) + 2.1, pos: [700, 4300, 2500], tgt: [0, 4050, 0], fov: 36, roll: -0.04, ease: E.ioS },
  { t: LT(11) - 0.1, pos: [900, 3200, 3600], tgt: [0, 2800, 0], fov: 40, ease: E.ioS },
  { t: LT(11) + 0.45, pos: [-1350, 1700, 1500], tgt: [-170, 1500, 175], fov: 34, roll: 0.12, ease: E.ioQuint },
  { t: V1, pos: [-1200, 1350, 1420], tgt: [-170, 1480, 175], fov: 32, roll: 0.06, ease: E.ioS },
];
S.push({
  a: V0, b: V1, draw(ctx, g, t) {
    const cam = Wd.camPath(v1Keys, t);
    const topView = env(t, LT(6) - 0.2, LT(8) + 0.1, 0.4, 0.35);
    K.stage(ctx, cam, { t, haze: lerp(0.95, 0.25, topView), floor: topView < 0.5, flareA: 0.5 * (1 - topView), shafts: topView < 0.5 });
    // bars arrive with the lacing lines
    const nb = t < LT(9) ? 0 : t < LT(10) ? 1 * P(t, LT(9) + 0.2, 0.8) : 1 + 11 * P(t, LT(10) + 0.15, 1.9, E.ioQ);
    const bolts = t < LT(9) ? 0 : clamp(nb / 12);
    const segHi = env(t, LT(11) + 0.3, V1, 0.4, 0.3);
    const style = (f) => {
      if (topView > 0.4 && f.part === 'chanA' && f.cap === 1 && t >= LT(6) && t < LT(8)) return { emis: [60 * topView, 28 * topView, 0] };
      if (segHi > 0 && f.part === 'chanA' && !f.cap) { const y = f.pts[0][1]; if (y >= Wd.nodeY(2) - 10 && y < Wd.nodeY(4) + 10) return { emis: [70 * segHi, 34 * segHi, 6 * segHi] }; }
      if (f.part === 'bar' && f.vis < 1) return { eprog: f.vis, alpha: clamp(f.vis * 1.4 - 0.3) };
      return null;
    };
    K.drawCol(ctx, g, cam, { chanH: 1, bars: nb, bolts, tie: 1, nseg: 20 }, { style, chanGlow: topView > 0.3 ? 'rgba(79,209,255,0.55)' : null, barGlow: 'rgba(255,160,80,0.95)', fogStart: topView > 0.5 ? 21500 : 1400, fogD: topView > 0.5 ? 0.0009 : 0.00016 });
    embers(ctx, t, { n: 60, alpha: 0.5 * (1 - topView) });
    // bolt sparks as bars land
    if (t >= LT(10)) for (let k = 0; k < 13; k++) { const tk = LT(10) + 0.15 + 1.9 * E.ioQ(clamp((k - 0.2) / 12)) * 0 + (k / 12) * 1.9; const p = Wd.project(cam, [Wd.nodeX(k, 1), Wd.nodeY(k), COLM.h / 2 + 30]); if (p) sparks(ctx, p[0], p[1], t, tk, { n: 18, vmin: 150, vmax: 700, life: 0.6, seed: k * 13, g: 900 }); }

    // ---- L5 safety factors
    if (t < LT(6) + 0.2) {
      const a = env(t, V0, LT(6) + 0.2, 0.15, 0.4);
      ctx.save(); ctx.globalAlpha *= a;
      K.bigNum(ctx, '1.10', W * 0.24, H * 0.42, t, LT(5) + 0.05, { size: 210 });
      mathText(ctx, 'γ_{m0}  ·  MATERIAL', W * 0.24, H * 0.42 + 130, { size: 40, fam: 'hud', weight: '600', color: COL.amber, align: 'center' });
      K.bigNum(ctx, '1.25', W * 0.76, H * 0.42, t, LT(5) + 1.25, { size: 210, glow: 'rgba(79,209,255,0.8)' });
      mathText(ctx, 'γ_{mb}  ·  BOLTS', W * 0.76, H * 0.42 + 130, { size: 40, fam: 'hud', weight: '600', color: COL.cyan, align: 'center', alpha: P(t, LT(5) + 1.25, 0.3) });
      K.title(ctx, 'PARTIAL  SAFETY  FACTORS', W / 2, H * 0.14, t, LT(5) + 0.4, { size: 46, ls0: 40, ls: 12, glow: null, color: 'rgba(255,255,255,0.8)' });
      ctx.restore();
    }
    // ---- L6/L7 section properties (top view)
    if (topView > 0.05) {
      ctx.save(); ctx.globalAlpha *= topView;
      const yC = 5000;
      if (t >= LT(6) + 0.2 && t < LT(7) + 0.3) {
        const a = env(t, LT(6) + 0.2, LT(7) + 0.3, 0.3, 0.3);
        ctx.save(); ctx.globalAlpha *= a;
        K.dim3(ctx, cam, [COLM.s / 2 + COLM.bf + 70, yC, -175], [COLM.s / 2 + COLM.bf + 70, yC, 175], 'h = 350', P(t, LT(6) + 0.5, 0.6), { size: 38, glow: true, flat: true, off: 70 });
        K.dim3(ctx, cam, [COLM.s / 2, yC, 250], [COLM.s / 2 + COLM.bf, yC, 250], 'bf = 100', P(t, LT(6) + 0.9, 0.6), { size: 34, glow: true, flat: true, off: 40 });
        K.callout(ctx, cam, [-170, yC, 0], 'A = 5366 mm²', { dx: -300, dy: -170, t, prog: P(t, LT(6) + 0.3, 0.6), sub: 'ONE  ISMC 350', color: COL.amber, glow: 'rgba(255,170,90,0.6)', size: 44 });
        K.callout(ctx, cam, [-COLM.s / 2 - COLM.bf + 10, yC, COLM.h / 2 - 7], 't_{f} = 13.5', { dx: -200, dy: 130, t, prog: P(t, LT(6) + 1.3, 0.5), size: 34 });
        K.callout(ctx, cam, [-COLM.s / 2 - 4, yC, -80], 't_{w} = 8.1', { dx: 250, dy: 190, t, prog: P(t, LT(6) + 1.6, 0.5), size: 34 });
        ctx.restore();
      }
      if (t >= LT(7) - 0.1) {
        const a = env(t, LT(7) - 0.1, LT(8) + 0.1, 0.3, 0.3), c = Wd.project(cam, [-COLM.s / 2 - 24.4, yC, 0]), ez = Wd.project(cam, [-COLM.s / 2 - 24.4, yC, 136.6]), ey = Wd.project(cam, [-COLM.s / 2 - 24.4 - 28.3, yC, 0]);
        if (c && ez && ey) {
          const rz = Math.abs(ez[1] - c[1]), ry = Math.abs(ey[0] - c[0]), k = P(t, LT(7), 0.8, E.outBack);
          ctx.save(); ctx.globalAlpha *= a;
          ctx.strokeStyle = COL.cyan; ctx.lineWidth = 2.5; ctx.shadowColor = COL.cyan; ctx.shadowBlur = 16;
          ctx.beginPath(); ctx.ellipse(c[0], c[1], ry * k, rz * k, 0, 0, TAU); ctx.stroke();
          ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(c[0], c[1] - rz * k); ctx.lineTo(c[0], c[1] + rz * k); ctx.moveTo(c[0] - ry * k - 30, c[1]); ctx.lineTo(c[0] + ry * k + 30, c[1]); ctx.stroke(); ctx.setLineDash([]);
          ctx.shadowBlur = 0;
          mathText(ctx, 'r_{z} = 136.6', c[0] - 40, c[1] - rz * k - 34, { size: 52, fam: 'cond', weight: '700', color: '#fff', align: 'right', glow: 'rgba(79,209,255,0.8)' });
          mathText(ctx, 'r_{y} = 28.3', c[0] - ry * k - 50, c[1] + 6, { size: 52, fam: 'cond', weight: '700', color: COL.amber, align: 'right', glow: 'rgba(255,170,90,0.8)' });
          text(ctx, 'RADII OF GYRATION  (mm)', c[0] - 40, c[1] + rz * k + 46, { size: 28, fam: 'hud', weight: '600', color: 'rgba(200,225,255,0.8)', align: 'right', ls: 3 });
          ctx.restore();
        }
      }
      ctx.restore();
    }
    // ---- L8 gauge lines (front elevation)
    if (t >= LT(8) + 0.1 && t < LT(10) + 0.2) {
      const a = env(t, LT(8) + 0.1, LT(10) + 0.2, 0.3, 0.3);
      ctx.save(); ctx.globalAlpha *= a;
      for (const x of [-170, 170]) { const p0 = Wd.project(cam, [x, 200, COLM.h / 2 + 2]), p1 = Wd.project(cam, [x, 4800, COLM.h / 2 + 2]); if (p0 && p1) line(ctx, [[p0[0], p0[1]], [p1[0], p1[1]]], { color: COL.amber, lw: 2, dash: [14, 10], dashOff: -t * 40, prog: P(t, LT(8) + 0.2, 0.8), glow: 'rgba(255,170,90,0.8)' }); }
      K.dim3(ctx, cam, [-120, 3800, COLM.h / 2], [-170, 3800, COLM.h / 2], 'g = 50', P(t, LT(8) + 0.5, 0.5), { size: 28, glow: true, flat: true, off: -32 });
      K.dim3(ctx, cam, [-170, 3500, COLM.h / 2], [170, 3500, COLM.h / 2], 'a₁ = 340', P(t, LT(8) + 1.0, 0.7), { size: 34, glow: true, flat: true, off: -34 });
      text(ctx, 'a₁ = s + 2g = 240 + 2 × 50 = 340 mm', W / 2, H * 0.13, { size: 44, fam: 'cond', weight: '600', color: '#fff', alpha: P(t, LT(8) + 1.3, 0.4), glow: 'rgba(255,170,90,0.5)' });
      ctx.restore();
    }
    // ---- L9 the 45° angle
    if (t >= LT(9) + 0.3 && t < LT(11)) {
      const a = env(t, LT(9) + 0.3, LT(11), 0.3, 0.3), n = Wd.project(cam, [Wd.nodeX(0, 1), Wd.nodeY(0), 200]), up = Wd.project(cam, [Wd.nodeX(0, 1), Wd.nodeY(0) + 300, 200]), b1 = Wd.project(cam, [Wd.nodeX(1, 1), Wd.nodeY(1), 200]);
      if (n && up && b1) {
        const a0 = Math.atan2(up[1] - n[1], up[0] - n[0]), a1 = Math.atan2(b1[1] - n[1], b1[0] - n[0]), k = P(t, LT(9) + 0.5, 0.8, E.ioC), r = 120;
        ctx.save(); ctx.globalAlpha *= a; line(ctx, [[n[0], n[1]], [up[0], up[1]]], { color: 'rgba(255,255,255,0.6)', lw: 2, dash: [8, 6] });
        ctx.strokeStyle = COL.amber; ctx.lineWidth = 4; ctx.shadowColor = COL.amber; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(n[0], n[1], r, a0, lerp(a0, a1, k), a1 < a0); ctx.stroke(); ctx.restore();
        K.bigNum(ctx, '45°', n[0] + 250, n[1] - 190, t, LT(9) + 0.6, { size: 150, alpha: a });
        text(ctx, 'θ  ·  IS 800 cl. 7.6.4  (40° – 70°)', n[0] + 250, n[1] - 90, { size: 26, fam: 'hud', weight: '600', color: COL.amber, alpha: a * P(t, LT(9) + 1, 0.4), ls: 2 });
      }
    }
    // ---- L10 spacing a = 680
    if (t >= LT(10) + 0.8 && t < LT(11) + 0.3) {
      const a = env(t, LT(10) + 0.8, LT(11) + 0.3, 0.3, 0.3);
      ctx.save(); ctx.globalAlpha *= a;
      K.dim3(ctx, cam, [-300, Wd.nodeY(2), COLM.h / 2], [-300, Wd.nodeY(4), COLM.h / 2], 'a = 680', P(t, LT(10) + 1.0, 0.6), { size: 36, glow: true, off: -40 });
      K.card(ctx, W - 760, 150, 680, [{ t: LT(10) + 1.1, s: 'a = 2 a_{1} cot θ' }, { t: LT(10) + 1.6, s: '= 2 × 340 × cot 45° = 680 mm', c: COL.amber }], t, { head: 'LACING  SPACING', t0: LT(10) + 1.1, size: 40, rh: 62 });
      ctx.restore();
    }
    // ---- L11 slenderness check title
    if (t >= LT(11) - 0.05 && t < LT(12) + 0.3) {
      const a = env(t, LT(11) - 0.05, LT(12) + 0.3, 0.1, 0.4);
      ctx.save(); ctx.globalAlpha *= a;
      K.title(ctx, 'SLENDERNESS  CHECK', W * 0.62, H * 0.26, t, LT(11), { size: 110, ls0: 70, ls: 8, lsT: 1.4 });
      K.title(ctx, 'સ્લેન્ડરનેસ ચેક', W * 0.62, H * 0.26 + 100, t, LT(11) + 0.4, { size: 64, fam: 'gu', weight: '600', ls0: 20, ls: 2, glow: null, color: COL.amber });
      text(ctx, 'IS 800  cl. 7.6.5.1  ·  between two lacing connections', W * 0.62, H * 0.26 + 168, { size: 26, fam: 'hud', weight: '600', color: 'rgba(200,225,255,0.8)', ls: 2, alpha: P(t, LT(11) + 0.8, 0.4) });
      ctx.restore();
    }
    // ---- L12 680 / 28.3 = 24.03
    if (t >= LT(12) - 0.05) {
      const a = 1 - P(t, V1 - 0.35, 0.35);
      ctx.save(); ctx.globalAlpha *= a;
      mathText(ctx, 'a / r_{y}  =  680 / 28.3', W * 0.62, H * 0.27, { size: 64, fam: 'cond', weight: '600', color: '#fff', align: 'center', alpha: P(t, LT(12), 0.3) });
      K.bigNum(ctx, '24.03', W * 0.62, H * 0.47, t, LT(12) + 1.2, { size: 240, decode: 0.9 });
      ctx.restore();
    }
  },
});
flash(V0, 0.9, 0.3); shake(V0, 22, 0.35); punch(V0, 0.06, 0.4); chroma(V0, 1, 0.3);
flash(LT(11), 0.35, 0.25); punch(LT(11), 0.03, 0.4); flash(LT(12) + 1.2, 0.3, 0.2, '#ffb36b');

// ===================================================================== THE BREAK  slot 14 → slot 15 (slow motion bolt)
S.push({
  a: V1 - 0.02, b: T.s15 + 0.02, draw(ctx, g, t) {
    const k = (t - V1) / (T.s15 - V1);
    const ang = -0.6 + k * 0.5;
    const cam = Wd.camera([Math.sin(ang) * 120 + 20, 30 + k * 16, Math.cos(ang) * 120], [12, 0, -14], 40, 0.08);
    K.stage(ctx, cam, { t, haze: 0.4, floor: false, backlight: [-200, 260, -900], shafts: false, flareA: 0.3 });
    const faces = Wd.boltFull([0, 0, 0], [0.15, 0.25, 1], k * 0.6, {});
    K.drawCol(ctx, g, cam, {}, { faces, edge: 'rgba(255,200,150,0.35)', spot: null, fogStart: 4000, glow: 0.6, glowStyle: (f) => ({ flat: '#000', edge: f.part === 'washer' || f.part === 'bhead' ? 'rgba(255,170,90,0.5)' : null }) });
    embers(ctx, t, { n: 40, speed: 0.2, alpha: 0.6, size: 1.4 });
    ctx.save(); ctx.globalAlpha = P(t, V1 + 0.2, 0.8) * (1 - P(t, T.s15 - 0.2, 0.2));
    text(ctx, '24.03', W * 0.22, H * 0.42, { size: 150, fam: 'cond', weight: '700', color: 'rgba(255,255,255,0.9)', glow: 'rgba(255,170,90,0.6)', glowR: 30, scale: 1 + k * 0.08 });
    text(ctx, '≤  50 ?', W * 0.22, H * 0.42 + 120, { size: 70, fam: 'cond', weight: '600', color: COL.amber, alpha: P(t, V1 + 1.2, 0.6) });
    ctx.restore();
  },
});

module.exports = { S };
