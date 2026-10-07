'use strict';
// Checks (local slenderness, transverse shear), the instrumental flythrough, and the chorus (the lacing flat).
const X = require('./engine');
const Wd = require('./world');
const K = require('./kit');
const { W, H, clamp, lerp, inv, E, rnd, srnd, TAU, DEG, P, env, v3, text, tw, mathText, line, arrow, dim2, glassPanel, brackets, COL, LT, LEND, slotT, sparks, embers, flare, flash, shake, punch, chroma, feS, beatPulse, barPulse } = X;
const { COLM } = Wd;

const S = [];
const C0 = slotT(15), C1 = slotT(24), I1 = slotT(29), CH1 = slotT(38);

// glowing force pulses travelling along every lacing bar
function pulses(ctx, g, cam, t, o = {}) {
  const speed = o.speed ?? 1.2, faces = o.faces || [1];
  for (const face of faces) for (let k = 0; k < COLM.nodes - 1; k++) {
    const z = face * (COLM.h / 2 + (k % 2) * COLM.barT + COLM.barT + 2);
    const p0 = [Wd.nodeX(k, face), Wd.nodeY(k), z], p1 = [Wd.nodeX(k + 1, face), Wd.nodeY(k + 1), z];
    for (let j = 0; j < (o.per ?? 2); j++) {
      const f = ((t * speed + k * 0.13 + j / (o.per ?? 2)) % 1);
      const sp = Wd.project(cam, v3.lerp(p0, p1, f)); if (!sp) continue;
      const r = (o.r ?? 7) * (0.6 + 0.4 * Math.sin(f * Math.PI));
      for (const c of [ctx, g]) { const gr = c.createRadialGradient(sp[0], sp[1], 0, sp[0], sp[1], r * 4); gr.addColorStop(0, o.core || 'rgba(255,240,200,0.95)'); gr.addColorStop(0.3, o.mid || 'rgba(255,150,60,0.6)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); c.fillStyle = gr; c.fillRect(sp[0] - r * 4, sp[1] - r * 4, r * 8, r * 8); }
    }
  }
}
// screen-space bulge (ghost buckled shape) along the outer flange edge of channel A between two nodes
function bulge(ctx, cam, y0, y1, amp, color) {
  const pts = [];
  for (let i = 0; i <= 24; i++) { const f = i / 24, y = lerp(y0, y1, f), off = -amp * Math.sin(Math.PI * f); const p = Wd.project(cam, [-COLM.s / 2 - COLM.bf + off, y, COLM.h / 2]); if (p) pts.push([p[0], p[1]]); }
  if (pts.length > 2) line(ctx, pts, { color, lw: 5, glow: color, glowR: 20 });
}

// ===================================================================== CHECKS  slot 15 → slot 24 (L13–L19 + 2 extra slots)
const ckKeys = [
  { t: C0, pos: [2300, 1700, 3100], tgt: [0, 2500, 0], fov: 44, roll: 0.08 },
  { t: LT(14), pos: [-2400, 2700, 2900], tgt: [0, 2500, 0], fov: 44, roll: -0.06, ease: E.ioS },
  { t: LT(15) + 0.3, pos: [-1250, 1450, 1550], tgt: [-170, 1500, 175], fov: 36, roll: 0.1, ease: E.ioQuint },
  { t: LT(16) - 0.2, pos: [-1150, 1550, 1500], tgt: [-170, 1500, 175], fov: 36, roll: 0.08, ease: E.ioS },
  { t: LT(16) + 0.4, pos: [700, 2500, 6000], tgt: [0, 2500, 0], fov: 44, ease: E.ioQuint },
  { t: LT(18) - 0.3, pos: [-500, 2500, 6200], tgt: [0, 2500, 0], fov: 44, ease: E.ioS },
  { t: LT(18) + 0.3, pos: [4300, 2700, 3300], tgt: [0, 2500, 0], fov: 42, ease: E.ioQuint },
  { t: LT(19) - 0.25, pos: [4100, 2800, 3600], tgt: [0, 2500, 0], fov: 42, ease: E.ioS },
  { t: LT(19) + 0.3, pos: [650, 1050, 1450], tgt: [0, 1150, 190], fov: 40, roll: -0.08, ease: E.ioQuint },
  { t: slotT(22), pos: [520, 1100, 1350], tgt: [0, 1150, 190], fov: 40, roll: -0.05, ease: E.ioS },
  { t: slotT(22) + 0.5, pos: [1500, 300, 2100], tgt: [0, 1400, 0], fov: 50, roll: 0.15, ease: E.ioQuint },
  { t: slotT(23), pos: [1700, 4700, 2300], tgt: [0, 4000, 0], fov: 50, roll: -0.1, ease: E.ioS },
  { t: C1, pos: [1100, 5600, 1500], tgt: [0, 4600, 0], fov: 62, roll: -0.25, ease: E.ioS },
];
S.push({
  a: C0, b: C1, draw(ctx, g, t) {
    const cam = Wd.camPath(ckKeys, t);
    const ex = env(t, slotT(22), C1, 0.3, 0.2), slow = env(t, slotT(23), C1, 0.2, 0.05);
    K.stage(ctx, cam, { t, haze: 0.9 + 0.4 * ex, flareA: 0.5 + 0.5 * ex });
    const lit = (f) => {
      if (f.part !== 'bar') return null;
      if (ex > 0) { const ph = ((t - slotT(22)) * 3.2 - f.k * 0.18) % 1.4; const hot = clamp(1 - Math.abs(ph - 0.3) * 4) * ex; if (hot > 0) return { emis: [200 * hot, 110 * hot, 40 * hot] }; }
      return null;
    };
    K.drawCol(ctx, g, cam, { tie: 1, nseg: 18 }, { style: lit, barGlow: `rgba(255,160,80,${0.75 + 0.25 * ex})` });
    if (t >= LT(18) - 0.2 || ex > 0) pulses(ctx, g, cam, t, { faces: [1, -1], speed: 1.1 + 2 * ex, per: ex > 0 ? 3 : 2 });
    embers(ctx, t, { n: 60, alpha: 0.5, speed: slow > 0 ? 0.25 : 1 });

    // ---- L13: a/ry <= 50
    if (t < LT(14) + 0.3) {
      const a = env(t, C0 - 0.05, LT(14) + 0.3, 0.2, 0.3);
      ctx.save(); ctx.globalAlpha *= a;
      K.gauge(ctx, 120, 820, 680, 24.03, 50, 60, t, LT(13) + 0.1, { label: 'LOCAL SLENDERNESS  a / ry', limLabel: '50', valLabel: (v) => v.toFixed(2) });
      K.bigNum(ctx, '24.03', W * 0.27, H * 0.33, t, LT(13), { size: 170, decode: 0.3, from: 1.1 });
      text(ctx, '≤ 50', W * 0.27, H * 0.33 + 118, { size: 80, fam: 'cond', weight: '700', color: COL.green, glow: 'rgba(61,255,162,0.7)', alpha: P(t, LT(13) + 0.6, 0.3) });
      K.check(ctx, W * 0.27 + 120, H * 0.33 + 118, 56, P(t, LT(13) + 0.9, 0.3));
      ctx.restore();
    }
    // ---- L14: 0.7 λ
    if (t >= LT(14) - 0.1 && t < LT(15) + 0.3) {
      const a = env(t, LT(14) - 0.1, LT(15) + 0.3, 0.2, 0.3);
      ctx.save(); ctx.globalAlpha *= a;
      mathText(ctx, 'λ_{col} = L / r_{z} = 5000 / 136.6 = 36.6', W * 0.66, H * 0.2, { size: 46, fam: 'cond', weight: '600', color: '#fff', align: 'center', alpha: P(t, LT(14), 0.3) });
      mathText(ctx, '0.7 × 36.6 = 25.62', W * 0.66, H * 0.2 + 70, { size: 62, fam: 'cond', weight: '700', color: COL.amber, align: 'center', alpha: P(t, LT(14) + 0.7, 0.3), glow: 'rgba(255,170,90,0.6)' });
      K.gauge(ctx, 1110, 820, 680, 24.03, 25.62, 30, t, LT(14) + 1.0, { label: 'a / ry  ≤  0.7 λ', limLabel: '25.62', valLabel: (v) => v.toFixed(2) });
      K.check(ctx, 1840, 760, 46, P(t, LT(14) + 1.8, 0.3));
      ctx.restore();
    }
    // ---- L15: no local buckling
    if (t >= LT(15) - 0.1 && t < LT(16) + 0.4) {
      const a = env(t, LT(15) - 0.1, LT(16) + 0.4, 0.2, 0.3), y0 = Wd.nodeY(2), y1 = Wd.nodeY(4);
      const amp = 90 * (0.5 + 0.5 * Math.sin((t - LT(15)) * 9)) * (1 - P(t, LT(15) + 1.3, 0.6, E.inQ));
      ctx.save(); ctx.globalAlpha *= a;
      if (amp > 1) bulge(ctx, cam, y0, y1, amp, 'rgba(255,60,70,0.9)');
      for (const y of [y0, y1]) { const p = Wd.project(cam, [-170, y, COLM.h / 2 + 40]); if (p) { const k = P(t, LT(15) + 1.1, 0.3, E.outBack); ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(k, k); X.circle(ctx, 0, 0, 30); ctx.strokeStyle = COL.green; ctx.lineWidth = 4; ctx.shadowColor = COL.green; ctx.shadowBlur = 20; ctx.stroke(); ctx.restore(); } }
      K.title(ctx, 'NO  LOCAL  BUCKLING', W * 0.64, H * 0.24, t, LT(15) + 1.4, { size: 92, ls0: 60, ls: 8, color: '#fff', glow: 'rgba(61,255,162,0.6)' });
      K.check(ctx, W * 0.64, H * 0.24 + 110, 70, P(t, LT(15) + 1.8, 0.3));
      ctx.restore();
    }
    // ---- L16: clause 7.6.6.1
    if (t >= LT(16) + 0.2 && t < LT(17) + 0.5) {
      const a = env(t, LT(16) + 0.2, LT(17) + 0.5, 0.25, 0.4);
      ctx.save(); ctx.globalAlpha *= a;
      glassPanel(ctx, 110, 130, 820, 250, { accent: COL.cyan });
      text(ctx, 'IS 800 : 2007   ·   CLAUSE  7.6.6.1', 150, 180, { size: 34, fam: 'hud', weight: '600', color: COL.cyan, align: 'left', ls: 3 });
      const doc = 'The lacing shall be proportioned to resist a total transverse shear Vt = 2.5 % of the axial force in the member.';
      const n = Math.floor(doc.length * P(t, LT(16) + 0.5, 1.8, E.lin));
      const words = doc.slice(0, n), l1 = words.slice(0, 52), l2 = words.slice(52);
      text(ctx, l1, 150, 250, { size: 32, fam: 'barlow', color: 'rgba(235,242,250,0.92)', align: 'left' });
      text(ctx, l2, 150, 300, { size: 32, fam: 'barlow', color: 'rgba(235,242,250,0.92)', align: 'left' });
      if (n < doc.length && Math.floor(t * 4) % 2) { const cw = tw(ctx, n > 52 ? l2 : l1, 32, 'barlow'); ctx.fillStyle = COL.cyan; ctx.fillRect(150 + cw + 4, n > 52 ? 284 : 234, 14, 30); }
      ctx.restore();
    }
    // ---- L17: Vt = 37.5 kN pushing the column
    if (t >= LT(17) - 0.1 && t < LT(18) + 0.3) {
      const a = env(t, LT(17) - 0.1, LT(18) + 0.3, 0.2, 0.3);
      ctx.save(); ctx.globalAlpha *= a;
      for (let i = 0; i < 5; i++) {
        const y = 1200 + i * 650, p = Wd.project(cam, [-260, y, 0]), q = Wd.project(cam, [-1300, y, 0]);
        if (p && q) { const k = P(t, LT(17) + 0.1 + i * 0.08, 0.5, E.outBack); arrow(ctx, q[0], q[1], lerp(q[0], p[0], k), p[1], { color: COL.cyan, lw: 9, head: 30, glow: 'rgba(79,209,255,0.9)', glowR: 24 }); arrow(g, q[0], q[1], lerp(q[0], p[0], k), p[1], { color: 'rgba(79,209,255,0.55)', lw: 12, head: 32 }); }
      }
      K.bigNum(ctx, '37.5 kN', W * 0.7, H * 0.36, t, LT(17) + 0.4, { size: 150, glow: 'rgba(79,209,255,0.8)' });
      mathText(ctx, 'V_{t} = 0.025 × P_{u} = 0.025 × 1500', W * 0.7, H * 0.36 + 110, { size: 40, fam: 'cond', weight: '600', color: 'rgba(220,240,255,0.9)', align: 'center', alpha: P(t, LT(17) + 0.8, 0.3) });
      ctx.restore();
    }
    // ---- L18: two lacing planes
    if (t >= LT(18) + 0.1 && t < LT(19) + 0.3) {
      const a = env(t, LT(18) + 0.1, LT(19) + 0.3, 0.2, 0.3);
      ctx.save(); ctx.globalAlpha *= a;
      for (const face of [1, -1]) {
        const p = Wd.project(cam, [0, face > 0 ? 3300 : 2100, face * (COLM.h / 2 + 30)]); if (!p) continue;
        const k = P(t, LT(18) + (face > 0 ? 0.3 : 0.6), 0.4), lx = p[0] + (face > 0 ? 260 : 300), ly = p[1] + (face > 0 ? -60 : 40);
        line(ctx, [[p[0], p[1]], [lx - 20, ly]], { color: COL.amber, lw: 1.5, prog: k });
        text(ctx, face > 0 ? 'LACING PLANE 1  (FRONT)' : 'LACING PLANE 2  (BACK)', lx, ly - 30, { size: 28, fam: 'hud', weight: '600', color: COL.amber, align: 'left', ls: 3, alpha: k });
        text(ctx, 'V = 18.75 kN', lx, ly + 22, { size: 54, fam: 'cond', weight: '700', color: '#fff', align: 'left', glow: 'rgba(255,170,90,0.6)', alpha: k });
      }
      mathText(ctx, 'V = V_{t} / 2 = 37.5 / 2 = 18.75 kN', W * 0.3, H * 0.16, { size: 46, fam: 'cond', weight: '600', color: '#fff', align: 'center', alpha: P(t, LT(18) + 0.3, 0.3) });
      K.bigNum(ctx, '26.52 kN', W * 0.3, H * 0.33, t, LT(18) + 1.4, { size: 130 });
      text(ctx, 'FORCE  IN  EACH  LACING  BAR', W * 0.3, H * 0.33 + 92, { size: 30, fam: 'hud', weight: '600', color: COL.amber, ls: 4, alpha: P(t, LT(18) + 1.6, 0.3) });
      ctx.restore();
    }
    // ---- L19: force triangle F = V / sin θ
    if (t >= LT(19) + 0.2 && t < slotT(22) + 0.4) {
      const a = env(t, LT(19) + 0.2, slotT(22) + 0.4, 0.25, 0.4);
      ctx.save(); ctx.globalAlpha *= a;
      const ox = 1180, oy = 720, L = 330, k = P(t, LT(19) + 0.4, 0.9, E.ioC);
      const fx = ox + L * Math.sin(45 * DEG), fy = oy - L * Math.cos(45 * DEG);
      glassPanel(ctx, ox - 120, oy - L - 70, 680, L + 170, { accent: COL.amber, alpha: 0.9 });
      arrow(ctx, ox, oy, lerp(ox, fx, k), lerp(oy, fy, k), { color: COL.amber, lw: 6, head: 22, glow: 'rgba(255,170,90,0.8)' });
      line(ctx, [[ox, oy], [ox + L * Math.sin(45 * DEG), oy]], { color: COL.cyan, lw: 5, prog: P(t, LT(19) + 0.9, 0.5), glow: 'rgba(79,209,255,0.8)' });
      line(ctx, [[ox, oy], [ox, oy - L]], { color: 'rgba(255,255,255,0.5)', lw: 2, dash: [8, 8] });
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox, oy, 70, -Math.PI / 2, -Math.PI / 4); ctx.stroke();
      text(ctx, 'θ = 45°', ox + 30, oy - 110, { size: 30, fam: 'hud', weight: '600', color: '#fff', align: 'left' });
      text(ctx, 'F', lerp(ox, fx, 0.5) - 34, lerp(oy, fy, 0.5) - 26, { size: 48, fam: 'cond', weight: '700', color: COL.amber });
      text(ctx, 'V', ox + L * 0.35, oy + 40, { size: 48, fam: 'cond', weight: '700', color: COL.cyan, alpha: P(t, LT(19) + 1.0, 0.3) });
      mathText(ctx, 'F = V / sin θ', ox + 300, oy - L + 10, { size: 54, fam: 'cond', weight: '700', color: '#fff', align: 'left', alpha: P(t, LT(19) + 1.2, 0.3) });
      mathText(ctx, '= 18.75 / sin 45°', ox + 300, oy - L + 80, { size: 44, fam: 'cond', weight: '600', color: 'rgba(220,240,255,0.9)', align: 'left', alpha: P(t, LT(19) + 1.6, 0.3) });
      mathText(ctx, '= 26.52 kN', ox + 300, oy - L + 150, { size: 60, fam: 'cond', weight: '700', color: COL.amber, align: 'left', alpha: P(t, LT(19) + 2.0, 0.3), glow: 'rgba(255,170,90,0.7)' });
      ctx.restore();
    }
    // ---- extra slots: the energy cascade
    if (ex > 0) {
      K.title(ctx, '26.52 kN  ·  EVERY  BAR', W / 2, H * 0.18, t, slotT(22) + 0.3, { size: 76, ls0: 60, ls: 10, alpha: ex * (1 - slow * 0.6) });
      if (t >= slotT(22)) for (let k = 0; k < 13; k++) { const tk = slotT(22) + 0.25 + k * 0.22; const p = Wd.project(cam, [Wd.nodeX(k, 1), Wd.nodeY(k), COLM.h / 2 + 30]); if (p) sparks(ctx, p[0], p[1], t, tk, { n: 22, vmin: 200, vmax: 900, life: 0.7, seed: k * 17, g: 1000 }); }
    }
  },
});
flash(C0, 0.7, 0.3); shake(C0, 16, 0.3); chroma(C0, 0.8, 0.25); punch(C0, 0.05, 0.4);
shake(LT(17) + 0.3, 12, 0.3); flash(slotT(22), 0.35, 0.25, '#ffb36b'); punch(slotT(22), 0.04, 0.4);

// ===================================================================== INSTRUMENTAL FLYTHROUGH  slot 24 → slot 29
const flyKeys = [
  { t: C1 - 0.02, pos: [0, -600, 30], tgt: [0, 2200, 120], fov: 90, roll: 0 },
  { t: slotT(26), pos: [0, 1900, 20], tgt: [0, 5200, 80], fov: 98, roll: 0.9, ease: E.ioS },
  { t: slotT(27) + 1.2, pos: [0, 4300, 0], tgt: [0, 8000, 40], fov: 104, roll: 2.4, ease: E.inQ },
  { t: slotT(28) - 0.3, pos: [260, 8200, 320], tgt: [0, 2500, 0], fov: 46, roll: 3.4, ease: E.outC },
  { t: I1 - 0.25, pos: [120, 6900, 160], tgt: [0, 3000, 0], fov: 38, roll: 3.7, ease: E.ioS },
  { t: I1 + 0.05, pos: [60, 6200, 80], tgt: [0, 3000, 0], fov: 30, roll: 3.8, ease: E.inQ },
];
S.push({
  a: C1 - 0.02, b: I1 + 0.03, draw(ctx, g, t) {
    const cam = Wd.camPath(flyKeys, t);
    const rise = P(t, slotT(26), slotT(28) - slotT(26), E.inQ), outside = P(t, slotT(27) + 1.0, 0.8);
    K.stage(ctx, cam, { t, haze: 0.5 + 0.8 * rise, backlight: outside > 0.5 ? [0, -1200, 0] : [0, 9000, 300], flareA: 0.4 + 0.8 * rise, floor: outside > 0.5 });
    const style = (f) => { if (f.part === 'bar') { const ph = (t * (1.2 + 3 * rise) - f.k * 0.11) % 1; const hot = clamp(1 - Math.abs(ph - 0.5) * 5); return hot > 0 ? { emis: [180 * hot, 100 * hot, 30 * hot] } : null; } return null; };
    K.drawCol(ctx, g, cam, { tie: 1, nseg: 22 }, { style, barGlow: 'rgba(255,170,90,1)', chanGlow: `rgba(79,209,255,${0.25 + 0.4 * rise})`, fogStart: 900, fogD: 0.00022 });
    pulses(ctx, g, cam, t, { faces: [1, -1], speed: 1.5 + 4 * rise, per: 2, r: 9 });
    // streaking sparks rushing past the lens
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const n = 40 + Math.floor(80 * rise);
    for (let i = 0; i < n; i++) {
      const ang = rnd(i * 3.1) * TAU, z = (rnd(i * 7.7) + t * (0.6 + 2.2 * rise)) % 1, r = Math.pow(z, 2.3) * 1300, len = 10 + 140 * z * (0.5 + rise);
      const x = W / 2 + Math.cos(ang) * r, y = H / 2 + Math.sin(ang) * r;
      ctx.strokeStyle = i % 3 ? `rgba(255,180,100,${0.7 * z})` : `rgba(150,210,255,${0.6 * z})`; ctx.lineWidth = 1 + 3 * z;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); ctx.stroke();
    }
    ctx.restore();
    // giant outlined words drifting through
    const wA = env(t, slotT(24) + 0.6, slotT(26) + 0.5, 0.6, 0.6);
    if (wA > 0) { ctx.save(); ctx.globalAlpha = wA * 0.5; text(ctx, 'SINGLE  LACING', W / 2 + (slotT(25) - t) * 260, H * 0.5, { size: 250, fam: 'cond', weight: '800', color: null, stroke: 'rgba(255,190,120,0.8)', strokeW: 2.5, ls: 30 }); ctx.restore(); }
    const sA = env(t, slotT(26) + 0.4, slotT(28) - 0.2, 0.6, 0.5);
    if (sA > 0) { ctx.save(); ctx.globalAlpha = sA * 0.55; text(ctx, '2 × ISMC 350   ·   θ = 45°   ·   a = 680 mm', W / 2 - (t - slotT(27)) * 200, H * 0.82, { size: 64, fam: 'cond', weight: '600', color: 'rgba(255,255,255,0.85)', ls: 10 }); ctx.restore(); }
    // the reveal from above
    if (outside > 0) K.title(ctx, 'ડિઝાઇન સેફ છે', W / 2, H * 0.5, t, slotT(28) - 0.1, { size: 120, fam: 'gu', weight: '700', ls0: 40, ls: 4, alpha: env(t, slotT(28) - 0.1, I1 - 0.2, 0.5, 0.3) * 0.95 });
    // white-out into the chorus
    const wo = P(t, I1 - 0.5, 0.48, E.inExpo);
    if (wo > 0) { ctx.save(); ctx.globalAlpha = wo; ctx.fillStyle = '#fff6ea'; ctx.fillRect(-50, -50, W + 100, H + 100); ctx.restore(); }
  },
});
flash(C1, 0.8, 0.35); chroma(C1, 1.2, 0.35); shake(C1, 14, 0.4);
flash(slotT(28), 0.5, 0.3, '#ffb36b'); shake(slotT(28), 10, 0.5);

// ===================================================================== CHORUS  slot 29 → slot 38 : the lacing flat, then the whole column
const HOLE = 480.83 / 2;
function holes(ctx, cam, z, xs, r = 9) {
  for (const x of xs) {
    const pts = []; for (let i = 0; i < 18; i++) { const th = i / 18 * TAU; const p = Wd.project(cam, [x + Math.cos(th) * r, Math.sin(th) * r, z]); if (p) pts.push(p); }
    if (pts.length < 3) continue;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fillStyle = '#050505'; ctx.fill(); ctx.strokeStyle = 'rgba(255,200,150,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
}
const flatCam = (t) => {
  const a = -0.55 + (t - I1) * 0.075, R = lerp(980, 760, P(t, I1, 6, E.ioS));
  return Wd.camera([Math.sin(a) * R, 260 + 120 * Math.sin((t - I1) * 0.35), Math.cos(a) * R], [0, 0, 0], 34, 0.06 * Math.sin((t - I1) * 0.4));
};
const P2 = LT(24);
S.push({
  a: I1, b: CH1, draw(ctx, g, t) {
    const hot = env(t, slotT(33), P2, 0.15, 0.4);
    if (t < P2) {
      // -------- part 1: the flat
      const cam = flatCam(t);
      K.stage(ctx, cam, { t, haze: 0.85 + 0.6 * hot, backlight: [0, 400, -1600], floor: false, flareA: 0.5 + 0.6 * hot });
      const faces = Wd.flatFaces({});
      const bolted = t >= LT(21) + 0.5;
      if (bolted) for (const x of [-HOLE, HOLE]) { const dz = (1 - P(t, LT(21) + 0.5 + (x > 0 ? 0.25 : 0), 0.5, E.outBack)) * 400; faces.push(...Wd.boltFull([x, 0, 14 + dz], [0, 0, 1], t * 0 + (x > 0 ? 0.4 : 0), { grip: 14, nut: false })); }
      const st = (f) => (f.part === 'flat' && hot > 0 ? { emis: [190 * hot, 120 * hot, 60 * hot] } : null);
      K.drawCol(ctx, g, cam, {}, { faces, style: st, spot: null, fogStart: 3000, edge: 'rgba(255,214,170,0.6)', glowStyle: (f) => (f.part === 'flat' ? { flat: '#000', edge: `rgba(255,170,90,${0.7 + 0.3 * hot})`, ew: 2.5 } : { flat: '#000' }) });
      if (!bolted || t < LT(21) + 0.9) holes(ctx, cam, 14.2, [-HOLE, HOLE]);
      embers(ctx, t, { n: 60, alpha: 0.6 });
      // L20: length & thickness
      if (t >= LT(20) && t < LT(22) + 0.3) {
        const a = env(t, LT(20), LT(22) + 0.3, 0.2, 0.4);
        ctx.save(); ctx.globalAlpha *= a;
        K.dim3(ctx, cam, [-HOLE, -60, 14], [HOLE, -60, 14], 'l = 480.83 mm', P(t, LT(20) + 0.15, 0.8), { size: 36, glow: true, flat: true, off: 44 });
        K.callout(ctx, cam, [HOLE + 28, 25, 7], 't = 14 mm', { dx: 160, dy: -150, t, prog: P(t, LT(20) + 1.0, 0.5), size: 40, sub: 't ≥ l / 40 = 12.02', color: COL.amber, glow: 'rgba(255,170,90,0.6)' });
        ctx.restore();
      }
      // L21: width + bolts in
      if (t >= LT(21) - 0.1 && t < LT(22) + 0.02) {
        const a = env(t, LT(21) - 0.1, LT(22) + 0.02, 0.2, 0.28);
        ctx.save(); ctx.globalAlpha *= a;
        K.dim3(ctx, cam, [-HOLE - 70, -25, 14], [-HOLE - 70, 25, 14], 'b = 50', P(t, LT(21), 0.6), { size: 34, glow: true, flat: true, off: -46 });
        mathText(ctx, 'b ≥ 3d = 3 × 16 = 48 mm', W * 0.27, H * 0.18, { size: 44, fam: 'cond', weight: '600', color: '#fff', align: 'center', alpha: P(t, LT(21) + 0.2, 0.3) });
        K.title(ctx, 'CONNECTION  SET', W * 0.27, H * 0.18 + 76, t, LT(21) + 1.0, { size: 60, ls0: 40, ls: 8, color: COL.amber });
        ctx.restore();
        for (const x of [-HOLE, HOLE]) { const p = Wd.project(cam, [x, 0, 16]); if (p) sparks(ctx, p[0], p[1], t, LT(21) + 1.0 + (x > 0 ? 0.25 : 0), { n: 50, vmin: 300, vmax: 1200, life: 0.9, seed: x > 0 ? 5 : 9 }); }
      }
      // L22: radius of gyration & slenderness
      if (t >= LT(22) - 0.1 && t < LT(23) + 0.02) {
        const a = env(t, LT(22) - 0.1, LT(23) + 0.02, 0.2, 0.28);
        ctx.save(); ctx.globalAlpha *= a;
        mathText(ctx, 'r = t / √12 = 14 / √12 = 4.04 mm', W * 0.5, H * 0.16, { size: 46, fam: 'cond', weight: '600', color: '#fff', align: 'center', alpha: P(t, LT(22) + 0.04, 0.3) });
        K.bigNum(ctx, 'λ = 119', W * 0.5, H * 0.32, t, LT(22) + 0.6, { size: 130 });
        K.gauge(ctx, 620, 790, 680, 119, 145, 160, t, LT(22) + 1.0, { label: 'SLENDERNESS  λ = l / r', limLabel: 'MAX 145', valLabel: (v) => v.toFixed(0) });
        ctx.restore();
      }
      // L23: Table 9(c) -> Pd -> PASS
      if (t >= LT(23) - 0.1) {
        const a = 1 - P(t, P2 - 0.3, 0.3);
        K.card(ctx, 1150, 150, 680, [
          { t: LT(23), s: 'TABLE 9(c)  ·  λ = 119  →  f_{cd} = 84.8 MPa' },
          { t: LT(23) + 0.6, s: 'P_{d} = 700 × 84.8 = 59.36 kN', c: COL.amber },
          { t: LT(23) + 1.2, s: '59.36  >  26.52  kN', c: COL.green, ok: true },
        ], t, { head: 'COMPRESSION  CHECK', t0: LT(23), alpha: a, size: 34, rh: 60 });
        K.stamp(ctx, 'PASS', W * 0.3, H * 0.34, t, LT(23) + 1.65, { size: 130, alpha: a });
        if (t >= slotT(33)) { K.bigNum(ctx, '59.36 kN', W * 0.3, H * 0.6, t, slotT(33), { size: 120, alpha: a, glow: 'rgba(61,255,162,0.7)' }); }
        const c = Wd.project(cam, [0, 0, 20]); if (c) sparks(ctx, c[0], c[1], t, LT(23) + 1.65, { n: 120, vmin: 400, vmax: 1800, spread: TAU, g: 700, life: 1.2, seed: 21, color: '#ffe08a' });
        if (c) sparks(ctx, c[0], c[1], t, slotT(33) + 0.05, { n: 140, vmin: 500, vmax: 2000, spread: TAU, g: 600, life: 1.3, seed: 33 });
      }
    } else {
      // -------- part 2: the whole column with every flat working
      const k2 = (t - P2) / (CH1 - P2);
      const ang = lerp(28, -40, E.ioS(k2)) * DEG, R = 3600 - 800 * k2;
      const cam = Wd.camera([Math.sin(ang) * R, 1300 + 2600 * k2, Math.cos(ang) * R], [0, 2300 + 900 * k2, 0], 44, 0.1 * Math.sin(k2 * 3));
      K.stage(ctx, cam, { t, haze: 1.0, flareA: 0.7 });
      const st = (f) => { if (f.part === 'bar') { const ph = (t * 1.6 - f.k * 0.12) % 1; const h = clamp(1 - Math.abs(ph - 0.5) * 6); return h > 0 ? { emis: [160 * h, 90 * h, 30 * h] } : null; } return null; };
      K.drawCol(ctx, g, cam, { tie: 1, nseg: 20 }, { style: st, barGlow: 'rgba(255,170,90,1)' });
      pulses(ctx, g, cam, t, { faces: [1, -1], speed: 1.4, per: 2 });
      embers(ctx, t, { n: 80, alpha: 0.6 });
      const tags = [
        [LT(24), 'l = 480.83 mm', 't = 14 mm'], [LT(25), 'b = 50 mm', 'FLAT  50 × 14'], [LT(26), 'r = 4.04 mm', 'λ = 119  <  145'], [LT(27), 'Pd = 59.36 kN', '>  26.52 kN  ✓'],
      ];
      for (const [t0, s1, s2] of tags) {
        if (t < t0 - 0.1 || t > t0 + 3.4) continue;
        const a = env(t, t0 - 0.1, t0 + 3.4, 0.2, 0.4);
        K.bigNum(ctx, s1, W * 0.28, H * 0.36, t, t0, { size: 120, alpha: a });
        text(ctx, s2, W * 0.28, H * 0.36 + 100, { size: 46, fam: 'cond', weight: '600', color: t0 === LT(27) ? COL.green : COL.amber, alpha: a * P(t, t0 + 0.4, 0.3), ls: 4 });
      }
      if (t >= LT(27) + 1.6) { K.stamp(ctx, 'PASS', W * 0.72, H * 0.3, t, LT(27) + 1.6, { size: 150 }); const c = [W * 0.72, H * 0.3]; sparks(ctx, c[0], c[1], t, LT(27) + 1.6, { n: 160, vmin: 500, vmax: 2200, spread: TAU, g: 700, life: 1.3, seed: 44, color: '#ffe08a' }); }
    }
  },
});
flash(I1, 0.95, 0.35, '#fff6ea'); shake(I1, 18, 0.4); chroma(I1, 1.2, 0.3); punch(I1, 0.07, 0.45);
flash(LT(23) + 1.65, 0.5, 0.25, '#b9ffd9'); shake(LT(23) + 1.65, 14, 0.3);
flash(slotT(33), 0.55, 0.3, '#ffcf8a'); punch(slotT(33), 0.05, 0.4); chroma(slotT(33), 0.8, 0.3);
flash(P2, 0.7, 0.3); chroma(P2, 1, 0.3); shake(P2, 14, 0.35);
flash(LT(27) + 1.6, 0.5, 0.25, '#b9ffd9'); shake(LT(27) + 1.6, 16, 0.3);

module.exports = { S, pulses, holes };
