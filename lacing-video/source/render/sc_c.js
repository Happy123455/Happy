'use strict';
// Breakdown (tension check), verse 3 (the bolt + final summary), outro.
const X = require('./engine');
const Wd = require('./world');
const K = require('./kit');
const { W, H, DUR, clamp, lerp, inv, E, rnd, srnd, TAU, DEG, P, env, v3, text, tw, mathText, line, arrow, dim2, glassPanel, brackets, COL, LT, LEND, slotT, sparks, embers, flare, flash, shake, punch, chroma, feS, beatPulse } = X;
const { COLM } = Wd;
const { pulses, holes } = require('./sc_b');

const S = [];
const B0 = slotT(38), B1 = slotT(42), V3E = slotT(51);
const HOLE = 480.83 / 2;

// ===================================================================== BREAKDOWN: tension capacity  slot 38 → slot 42 (L28)
S.push({
  a: B0, b: B1, draw(ctx, g, t) {
    const k = (t - B0) / (B1 - B0), build = P(t, slotT(41), B1 - slotT(41), E.inQ);
    const ang = lerp(-0.95, -0.35, E.ioS(k)), R = lerp(820, 560, E.ioS(clamp(k * 1.3)));
    let cam = Wd.camera([Math.sin(ang) * R + 120, 150 + 60 * Math.sin(k * 2), Math.cos(ang) * R], [HOLE * 0.55, 0, 6], 32, 0.05);
    if (build > 0) { // pull away to reveal the column waking up
      const c2 = Wd.camera([2600, 900 + 1800 * build, 3600], [0, 2200 + 900 * build, 0], 48, 0.08);
      cam = Wd.camera(v3.lerp(cam.pos, c2.pos, E.ioC(build)), v3.lerp([HOLE * 0.55, 0, 6], [0, 2200 + 900 * build, 0], E.ioC(build)), lerp(32, 48, build), 0.06);
    }
    K.stage(ctx, cam, { t, haze: 0.45 + 0.6 * build, backlight: build > 0.5 ? [0, 3600, -1600] : [400, 300, -1400], flareA: 0.3 + 0.5 * build, floor: build > 0.5, shafts: true, warm: '255,150,80' });
    if (build < 0.6) {
      const faces = Wd.flatFaces({}).concat(Wd.boltFull([-HOLE, 0, 14], [0, 0, 1], 0.3, { grip: 14, nut: false }));
      K.drawCol(ctx, g, cam, {}, { faces, spot: null, fogStart: 2200, alpha: 1 - build / 0.6, edge: 'rgba(255,214,170,0.55)', glowStyle: (f) => (f.part === 'flat' ? { flat: '#000', edge: 'rgba(255,150,70,0.8)', ew: 2 } : { flat: '#000' }) });
      holes(ctx, cam, 14.2, [HOLE]);
      // tension arrows pulling the flat apart
      const ta = env(t, LT(28) + 0.1, slotT(41) + 0.6, 0.4, 0.5) * (1 - build / 0.6);
      for (const sd of [-1, 1]) {
        const p0 = Wd.project(cam, [sd * (HOLE + 40), 0, 7]), p1 = Wd.project(cam, [sd * (HOLE + 260 + 30 * Math.sin(t * 3)), 0, 7]);
        if (p0 && p1) { ctx.save(); ctx.globalAlpha *= ta; arrow(ctx, p0[0], p0[1], p1[0], p1[1], { color: COL.red, lw: 8, head: 28, glow: 'rgba(255,60,70,0.9)', glowR: 24 }); arrow(g, p0[0], p0[1], p1[0], p1[1], { color: 'rgba(255,60,70,0.5)', lw: 10, head: 30 }); ctx.restore(); }
      }
      // the net section across the hole
      const na = env(t, LT(28) + 0.9, slotT(41) + 0.6, 0.4, 0.5) * (1 - build / 0.6);
      if (na > 0) {
        const q = [[HOLE, -25, -1], [HOLE, 25, -1], [HOLE, 25, 16], [HOLE, -25, 16]].map((p) => Wd.project(cam, p));
        if (q.every(Boolean)) { ctx.save(); ctx.globalAlpha *= na * (0.55 + 0.25 * Math.sin(t * 5)); ctx.beginPath(); q.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fillStyle = 'rgba(255,60,70,0.5)'; ctx.fill(); ctx.strokeStyle = COL.red; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
        ctx.save(); ctx.globalAlpha *= na;
        K.callout(ctx, cam, [HOLE, -18, 14], 'b − d₀ = 50 − 18 = 32 mm', { dx: 120, dy: 170, t, prog: P(t, LT(28) + 1.1, 0.5), size: 36, color: COL.red, glow: 'rgba(255,60,70,0.6)', sub: 'NET  SECTION  AT  THE  BOLT  HOLE' });
        ctx.restore();
      }
      // formulas
      if (t >= LT(28) + 1.6) {
        const a = (1 - build / 0.6);
        K.card(ctx, 90, 140, 760, [
          { t: LT(28) + 1.7, s: 'A_{n} = (50 − 18) × 14 = 448 mm²' },
          { t: LT(28) + 2.6, s: 'T_{dn} = 0.9 A_{n} f_{u} / γ_{m1}' },
          { t: LT(28) + 3.4, s: '= 0.9 × 448 × 410 / 1.25', c: 'rgba(220,240,255,0.9)' },
        ], t, { head: 'TENSION  CHECK  ·  WHEN  THE  FORCE  REVERSES', t0: LT(28) + 1.7, alpha: a, size: 36, rh: 62, accent: COL.red });
        K.bigNum(ctx, '132.23 kN', W * 0.7, H * 0.62, t, LT(28) + 4.4, { size: 150, alpha: a, glow: 'rgba(61,255,162,0.7)' });
        text(ctx, '>  26.52 kN', W * 0.7, H * 0.62 + 110, { size: 56, fam: 'cond', weight: '700', color: COL.green, alpha: a * P(t, LT(28) + 5.0, 0.3), glow: 'rgba(61,255,162,0.6)' });
        K.title(ctx, 'ALL  SECURE', W * 0.7, H * 0.25, t, LT(28) + 6.2, { size: 100, ls0: 70, ls: 12, alpha: a, glow: 'rgba(61,255,162,0.6)' });
        K.title(ctx, 'બધું છે સુરક્ષિત', W * 0.7, H * 0.25 + 96, t, LT(28) + 6.6, { size: 60, fam: 'gu', weight: '600', ls0: 20, ls: 2, alpha: a, color: COL.green, glow: null });
      }
    }
    if (build > 0.2) {
      const st = (f) => { if (f.part === 'bar') { const on = clamp((build * 14) - f.k * 0.9); return { emis: [190 * on, 110 * on, 40 * on], alpha: clamp(on * 2) }; } return null; };
      K.drawCol(ctx, g, cam, { tie: 1, nseg: 18 }, { style: st, alpha: clamp((build - 0.2) / 0.4), barGlow: 'rgba(255,170,90,1)' });
    }
    embers(ctx, t, { n: 70, speed: 0.35 + 1.5 * build, alpha: 0.7, size: 1.3 });
  },
});
flash(B0, 0.4, 0.5, '#ff9a6b');

// ===================================================================== VERSE 3: the bolt, the summary, the title  slot 42 → slot 51
const boltCam = (t) => { const k = t - B1, a = -0.9 + k * 0.12; return Wd.camera([Math.sin(a) * 300 + 40, 90 + 30 * Math.sin(k * 0.6), Math.cos(a) * 300], [0, 0, -12], 34, 0.08 * Math.sin(k * 0.5)); };
const SUM = LT(34) - 0.35;
S.push({
  a: B1, b: V3E, draw(ctx, g, t) {
    if (t < SUM) {
      // -------- bolt macro: flat (14) on flange (13.5), M16 through both
      const cam = boltCam(t);
      K.stage(ctx, cam, { t, haze: 0.8, backlight: [-300, 400, -1600], flareA: 0.5, floor: false });
      const fly = P(t, B1, 0.9, E.outC), spin = (1 - fly) * 14 + (t >= LT(33) ? P(t, LT(33), 0.8, E.outBack) * 1.2 : 0);
      const faces = [];
      faces.push(...Wd.bar([-160, 0, 0], [160, 0, 0], 50, 14, [0, 0, 1], 'flat', { base: [160, 166, 176] }));
      faces.push(...Wd.bar([-160, 0, -13.5], [160, 0, -13.5], 110, 13.5, [0, 0, 1], 'flange', { base: [96, 102, 112] }));
      faces.push(...Wd.boltFull([0, 0, 14 + (1 - fly) * 520], [0, 0, 1], spin, { grip: 27.5, nutPos: 27.5 + (1 - P(t, LT(29) + 1.0, 1.0, E.outC)) * 80 }));
      const shearOn = env(t, LT(30) + 0.3, LT(31) + 0.02, 0.3, 0.28);
      K.drawCol(ctx, g, cam, {}, { faces, spot: null, fogStart: 2600, edge: 'rgba(255,214,170,0.5)', glowStyle: (f) => (f.part === 'bhead' || f.part === 'washer' ? { flat: '#000', edge: 'rgba(255,170,90,0.8)', ew: 2 } : f.part === 'shank' && shearOn > 0 ? { flat: '#000', edge: `rgba(79,209,255,${0.8 * shearOn})`, ew: 2 } : { flat: '#000' }) });
      holes(ctx, cam, 14.3, [0], 9.2);
      embers(ctx, t, { n: 60, alpha: 0.6 });
      const head = Wd.project(cam, [0, 0, 20]);
      if (head) sparks(ctx, head[0], head[1], t, B1 + 0.85, { n: 120, vmin: 300, vmax: 1600, spread: TAU, g: 900, life: 1.0, seed: 5 });
      // L29 title
      if (t < LT(30) + 0.2) { const a = env(t, B1, LT(30) + 0.2, 0.1, 0.4); K.title(ctx, 'THE  LAST  STEP', W * 0.27, H * 0.3, t, LT(29) + 0.2, { size: 92, ls0: 34, ls: 10, alpha: a }); K.title(ctx, 'BOLT  STRENGTH', W * 0.27, H * 0.3 + 92, t, LT(29) + 0.7, { size: 70, ls0: 30, ls: 10, alpha: a, color: COL.amber, glow: null }); }
      // L30 shear plane
      if (shearOn > 0) {
        const pts = []; for (let i = 0; i < 24; i++) { const th = i / 24 * TAU; const p = Wd.project(cam, [Math.cos(th) * 30, Math.sin(th) * 30, 0]); if (p) pts.push(p); }
        if (pts.length > 3) { ctx.save(); ctx.globalAlpha *= shearOn * 0.7; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fillStyle = 'rgba(79,209,255,0.35)'; ctx.fill(); ctx.strokeStyle = COL.cyan; ctx.lineWidth = 2.5; ctx.shadowColor = COL.cyan; ctx.shadowBlur = 20; ctx.stroke(); ctx.restore(); }
        ctx.save(); ctx.globalAlpha *= shearOn;
        text(ctx, 'M16  ·  GRADE 4.6  ·  fub = 400 MPa', W * 0.73, H * 0.16, { size: 40, fam: 'hud', weight: '600', color: COL.cyan, ls: 3 });
        mathText(ctx, 'V_{dsb} = f_{ub} A_{nb} / (√3 γ_{mb})', W * 0.73, H * 0.27, { size: 50, fam: 'cond', weight: '600', color: '#fff', align: 'center', alpha: P(t, LT(30) + 0.6, 0.3) });
        mathText(ctx, '= 400 × 157 / (√3 × 1.25)', W * 0.73, H * 0.35, { size: 44, fam: 'cond', weight: '600', color: 'rgba(220,240,255,0.9)', align: 'center', alpha: P(t, LT(30) + 1.1, 0.3) });
        K.bigNum(ctx, '28.98 kN', W * 0.73, H * 0.5, t, LT(30) + 1.6, { size: 140, glow: 'rgba(79,209,255,0.8)' });
        text(ctx, 'SINGLE  SHEAR', W * 0.73, H * 0.5 + 92, { size: 30, fam: 'hud', weight: '600', color: COL.cyan, ls: 6, alpha: P(t, LT(30) + 1.9, 0.3) });
        ctx.restore();
      }
      // L31 bearing on the flange hole
      if (t >= LT(31) && t < LT(32) + 0.02) {
        const a = env(t, LT(31), LT(32) + 0.02, 0.25, 0.28);
        const arcPts = []; for (let i = 0; i <= 16; i++) { const th = -Math.PI / 2 + (i / 16) * Math.PI; const p = Wd.project(cam, [Math.cos(th) * 10, Math.sin(th) * 10, -6]); if (p) arcPts.push([p[0], p[1]]); }
        ctx.save(); ctx.globalAlpha *= a; if (arcPts.length > 2) line(ctx, arcPts, { color: COL.orange, lw: 8, glow: 'rgba(255,122,26,0.9)', glowR: 24 }); ctx.restore();
        ctx.save(); ctx.globalAlpha *= a;
        text(ctx, 'BEARING  ON  THE  13.5 mm  FLANGE', W * 0.73, H * 0.16, { size: 34, fam: 'hud', weight: '600', color: COL.orange, ls: 3 });
        mathText(ctx, 'k_{b} = min(0.555, 0.49, 0.975, 1) = 0.49', W * 0.73, H * 0.26, { size: 40, fam: 'cond', weight: '600', color: 'rgba(220,240,255,0.9)', align: 'center', alpha: P(t, LT(31) + 0.4, 0.3) });
        mathText(ctx, 'V_{dpb} = 2.5 k_{b} d t f_{u} / γ_{mb}', W * 0.73, H * 0.34, { size: 46, fam: 'cond', weight: '600', color: '#fff', align: 'center', alpha: P(t, LT(31) + 0.9, 0.3) });
        K.bigNum(ctx, '86.8 kN', W * 0.73, H * 0.5, t, LT(31) + 1.5, { size: 140, glow: 'rgba(255,122,26,0.8)' });
        ctx.restore();
      }
      // L32 0.92 -> 1 bolt
      if (t >= LT(32) && t < LT(33) + 0.5) {
        const a = env(t, LT(32), LT(33) + 0.5, 0.25, 0.4);
        ctx.save(); ctx.globalAlpha *= a;
        mathText(ctx, 'BOLT VALUE = min(28.98, 86.8) = 28.98 kN', W * 0.72, H * 0.16, { size: 40, fam: 'cond', weight: '600', color: '#fff', align: 'center' });
        mathText(ctx, 'n = 26.52 / 28.98', W * 0.72, H * 0.27, { size: 56, fam: 'cond', weight: '600', color: 'rgba(220,240,255,0.9)', align: 'center', alpha: P(t, LT(32) + 0.4, 0.3) });
        K.bigNum(ctx, '0.92', W * 0.62, H * 0.47, t, LT(32) + 1.0, { size: 190 });
        text(ctx, '→', W * 0.76, H * 0.47, { size: 120, fam: 'sym', color: '#fff', alpha: P(t, LT(32) + 1.8, 0.3) });
        K.bigNum(ctx, '1', W * 0.86, H * 0.47, t, LT(32) + 2.1, { size: 230, glow: 'rgba(61,255,162,0.8)' });
        text(ctx, 'BOLT', W * 0.86, H * 0.47 + 140, { size: 44, fam: 'cond', weight: '700', color: COL.green, ls: 10, alpha: P(t, LT(32) + 2.4, 0.3) });
        ctx.restore();
      }
      // L33 one bolt on site
      if (t >= LT(33) + 0.2) {
        const a = 1 - P(t, SUM - 0.35, 0.35);
        K.title(ctx, '1 × M16  ON  SITE', W * 0.3, H * 0.24, t, LT(33) + 0.3, { size: 96, ls0: 70, ls: 8, alpha: a });
        K.title(ctx, 'ગણિતનો અસલી ખ્વાબ', W * 0.3, H * 0.24 + 92, t, LT(33) + 0.8, { size: 56, fam: 'gu', weight: '600', ls0: 20, ls: 2, alpha: a, color: COL.gold, glow: null });
        const hd = Wd.project(cam, [0, 0, 24]); if (hd) sparks(ctx, hd[0], hd[1], t, LT(33) + 0.15, { n: 160, vmin: 400, vmax: 2000, spread: TAU, g: 800, life: 1.2, seed: 61, color: '#ffe08a' });
      }
    } else {
      // -------- the complete column: summary, labels, title
      const k = (t - SUM) / (V3E - SUM);
      const ang = lerp(38, -24, E.ioS(k)) * DEG, R = lerp(4200, 3300, E.ioS(k));
      let cam = Wd.camera([Math.sin(ang) * R, lerp(1700, 900, E.ioS(k)), Math.cos(ang) * R], [0, lerp(2500, 2900, k), 0], lerp(46, 50, k), 0.04);
      const fin = P(t, LT(37) - 0.1, 1.2, E.ioC);
      if (fin > 0) cam = Wd.camera(v3.lerp(cam.pos, [1900, 300, 2300], fin), v3.lerp([0, 2900, 0], [0, 3000, 0], fin), lerp(50, 56, fin), lerp(0.04, 0.2, fin));
      K.stage(ctx, cam, { t, haze: 1 + 0.6 * fin, flareA: 0.6 + 0.6 * fin, warm: fin > 0 ? '255,190,110' : '255,165,85', bp: fin > 0 ? [1250, 175, E.ioC(fin)] : null });
      const st = (f) => { if (f.part === 'bar') { const ph = (t * 1.2 - f.k * 0.1) % 1; const h = clamp(1 - Math.abs(ph - 0.5) * 6) * (0.6 + 0.4 * fin); return h > 0 ? { emis: [170 * h, 100 * h, 40 * h] } : null; } return null; };
      K.drawCol(ctx, g, cam, { tie: 1, nseg: 20 }, { style: st, barGlow: 'rgba(255,175,95,1)', chanGlow: fin > 0 ? `rgba(255,210,140,${0.35 * fin})` : null });
      pulses(ctx, g, cam, t, { faces: [1, -1], speed: 1.2, per: 2 });
      embers(ctx, t, { n: 90 + Math.floor(90 * fin), alpha: 0.7, speed: 1 + fin });
      // summary card
      const ca = env(t, SUM, LT(37) - 0.2, 0.4, 0.4);
      K.card(ctx, 80, 120, 700, [
        { t: LT(34) + 0.1, s: 'Lacing flat      50 × 14 mm', ok: true },
        { t: LT(34) + 0.6, s: 'Angle      θ = 45°', ok: true },
        { t: LT(34) + 1.1, s: 'Spacing      a = 680 mm c/c', ok: true },
        { t: LT(34) + 1.6, s: 'Bolt      1 × M16 (gr 4.6) / end', ok: true },
        { t: LT(34) + 2.1, s: 'a/r_{y} 24.03 · λ 119 · P_{d} 59.36 · T_{dn} 132.23', c: COL.green, fam: 'cond' },
      ], t, { head: 'FINAL  DESIGN  SUMMARY', t0: LT(34), alpha: ca, size: 32, rh: 58 });
      // L35 labels on the column
      if (t >= LT(35) - 0.1 && t < LT(37)) {
        const a = env(t, LT(35) - 0.1, LT(37), 0.2, 0.4);
        K.callout(ctx, cam, [0, (Wd.nodeY(6) + Wd.nodeY(7)) / 2, COLM.h / 2 + 30], 'FLAT 50 × 14', { dx: 260, dy: -120, t, prog: P(t, LT(35), 0.5), size: 40, alpha: a * (1 - P(t, LT(36) - 0.3, 0.3)), color: COL.amber, glow: 'rgba(255,170,90,0.6)' });
        K.callout(ctx, cam, [Wd.nodeX(4, 1), Wd.nodeY(4), COLM.h / 2 + 30], 'θ = 45°', { dx: 250, dy: 90, t, prog: P(t, LT(35) + 0.5, 0.5), size: 40, alpha: a });
        K.dim3(ctx, cam, [Wd.nodeX(8, 1) - 140, Wd.nodeY(8), COLM.h / 2], [Wd.nodeX(8, 1) - 140, Wd.nodeY(10), COLM.h / 2], 'a = 680', P(t, LT(35) + 0.9, 0.6), { size: 36, glow: true, off: -40, alpha: a });
      }
      // L36 end distance
      if (t >= LT(36) - 0.1 && t < LT(37) + 0.2) {
        const a = env(t, LT(36) - 0.1, LT(37) + 0.2, 0.2, 0.4);
        ctx.save(); ctx.globalAlpha *= a;
        glassPanel(ctx, W - 640, 150, 560, 360, { accent: COL.cyan });
        text(ctx, '1 × M16', W - 360, 214, { size: 60, fam: 'cond', weight: '700', color: '#fff', glow: 'rgba(79,209,255,0.6)', alpha: P(t, LT(36), 0.3) });
        const sc = 1.9, px = W - 360 - 75 * sc, cx = px + 30 * sc, cy = 318;
        X.rrect(ctx, px, cy - 25 * sc, 150 * sc, 50 * sc, 6); ctx.fillStyle = 'rgba(160,166,176,0.25)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,214,170,0.8)'; ctx.lineWidth = 2; ctx.stroke();
        X.circle(ctx, cx, cy, 9 * sc); ctx.fillStyle = '#05070a'; ctx.fill(); ctx.strokeStyle = COL.amber; ctx.lineWidth = 3; ctx.stroke();
        line(ctx, [[cx, cy - 34 * sc], [cx, cy + 34 * sc]], { color: 'rgba(255,179,71,0.5)', lw: 1.5, dash: [6, 6] });
        dim2(ctx, [px, cy + 40 * sc], [cx, cy + 40 * sc], 'e = 30', P(t, LT(36) + 0.3, 0.5), { size: 28, flat: true, off: 22 });
        text(ctx, 'END DISTANCE 30 mm', W - 360, 478, { size: 26, fam: 'hud', weight: '600', color: COL.cyan, ls: 3, alpha: P(t, LT(36) + 0.4, 0.3) });
        ctx.restore();
      }
      // L37 the title
      if (t >= LT(37) - 0.05) {
        K.scrim(ctx, g, W / 2, H * 0.42 + 70, 900, 230, 0.66 * P(t, LT(37) - 0.05, 0.7));
        K.title(ctx, 'ડિઝાઇન સેફ છે', W / 2, H * 0.42, t, LT(37) + 0.05, { size: 170, fam: 'gu', weight: '700', ls0: 60, ls: 4, lsT: 2.0, blur: 20, blurT: 0.8, glow: 'rgba(255,190,110,0.85)', glowR: 40 });
        K.title(ctx, 'THE  DESIGN  IS  SAFE', W / 2, H * 0.42 + 130, t, LT(37) + 0.8, { size: 46, ls0: 60, ls: 20, glow: null, color: 'rgba(255,255,255,0.85)' });
        K.title(ctx, 'આ છે ઇજનેરીનો સાર', W / 2, H * 0.42 + 200, t, LT(37) + 1.6, { size: 52, fam: 'gu', weight: '600', ls0: 20, ls: 2, glow: null, color: COL.gold });
        sparks(ctx, W / 2, -40, t, LT(37) + 0.05, { n: 160, vmin: 200, vmax: 900, ang: Math.PI / 2, spread: Math.PI * 0.9, g: 500, life: 2.4, seed: 71, color: '#ffe08a', w: 2 });
        sparks(ctx, W / 2, -40, t, LT(37) + 1.2, { n: 120, vmin: 200, vmax: 900, ang: Math.PI / 2, spread: Math.PI * 0.9, g: 500, life: 2.4, seed: 72, color: '#ffd08a', w: 2 });
      }
    }
  },
});
flash(B1, 0.95, 0.35); shake(B1, 20, 0.4); chroma(B1, 1.2, 0.3); punch(B1, 0.07, 0.45);
flash(B1 + 0.85, 0.5, 0.2, '#ffcf8a'); shake(B1 + 0.85, 14, 0.3);
flash(LT(33) + 0.15, 0.45, 0.25, '#ffe08a'); shake(LT(33) + 0.15, 12, 0.3);
flash(SUM, 0.6, 0.3); chroma(SUM, 0.8, 0.3);
flash(V3E, 0.35, 0.45, '#ffd9a0'); flash(LT(37) + 0.05, 0.9, 0.5, '#ffd9a0'); shake(LT(37) + 0.05, 18, 0.45); punch(LT(37) + 0.05, 0.06, 0.6); chroma(LT(37) + 0.05, 1, 0.35);

// ===================================================================== OUTRO  slot 51 → end
S.push({
  a: V3E, b: DUR + 1, draw(ctx, g, t) {
    const k = (t - V3E) / (DUR - V3E);
    const ang = lerp(-20, 40, E.ioS(k)) * DEG, R = lerp(3600, 6200, E.ioS(k));
    const cam = Wd.camera([Math.sin(ang) * R, lerp(500, 1400, k), Math.cos(ang) * R], [0, 2600, 0], 46, 0.03);
    K.stage(ctx, cam, { t, haze: 1.5, backlight: [0, 7000, -3500], flareA: 1, warm: '255,180,100', hazeR: 1.4 });
    K.drawCol(ctx, g, cam, { tie: 1, nseg: 18 }, { barGlow: 'rgba(255,175,95,0.9)', chanGlow: 'rgba(255,210,140,0.35)', lights: { key: { d: v3.norm([0.4, 0.5, 0.75]), c: [0.6, 0.55, 0.5], i: 0.6 }, rim: { d: v3.norm([-0.3, 0.3, -0.9]), c: [1, 0.75, 0.5], i: 1.4 }, fill: { d: [0, -1, 0], c: [0.1, 0.12, 0.16], i: 0.3 }, amb: [0.03, 0.03, 0.04] } });
    embers(ctx, t, { n: 120, alpha: 0.8, speed: 0.6 });
    const a = 1 - P(t, DUR - 3.4, 2.4), ty = H * 0.42;
    K.scrim(ctx, g, W / 2, ty + 150, 940, 330, 0.66 * a);
    ctx.save(); ctx.globalAlpha *= a;
    text(ctx, 'ડિઝાઇન સેફ છે', W / 2, ty, { size: 170, fam: 'gu', weight: '700', color: '#fff', glow: 'rgba(255,190,110,0.85)', glowR: 40, ls: 4 });
    text(ctx, 'THE  DESIGN  IS  SAFE', W / 2, ty + 130, { size: 46, fam: 'cond', weight: '700', color: 'rgba(255,255,255,0.85)', ls: 20 });
    text(ctx, 'આ છે ઇજનેરીનો સાર', W / 2, ty + 200, { size: 52, fam: 'gu', weight: '600', color: COL.gold, ls: 2 });
    K.check(ctx, W / 2, ty + 292, 58, P(t, V3E + 0.4, 0.5));
    text(ctx, '2 × ISMC 350  ·  SINGLE LACING  ·  FLAT 50 × 14  ·  θ 45°  ·  a 680 mm  ·  1 × M16', W / 2, ty + 382, { size: 26, fam: 'hud', weight: '600', color: 'rgba(255,200,140,0.85)', ls: 3, alpha: P(t, V3E + 1.2, 0.8) });
    text(ctx, 'IS 800 : 2007  ·  LIMIT STATE METHOD', W / 2, ty + 424, { size: 22, fam: 'hud', weight: '600', color: 'rgba(200,225,255,0.7)', ls: 5, alpha: P(t, V3E + 1.8, 0.8) });
    ctx.restore();
  },
});

module.exports = { S };
