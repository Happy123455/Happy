'use strict';
// Bridge (shear capacity), the drop, verse 3 (bending capacity), outro verdict and finale (132.3 s – end)
const C = require('./core');
const { W, H, DUR, BE, clamp, lerp, inv, E, rnd, srnd, noise1, TAU, P, env, pop, WT, COL, text, tw, writeOn, eqn, mathText, mathW, line, arrow, rrect, circle,
  dimLine, pinSupport, rollerSupport, beamElev, udl, iSection, iPoly, beam3D, beamWire, project, stamp, burst, check, cross, rays, speedLines, hazard, emoji,
  shake, flash, punch, glitch, beatPulse, impactPulse, feS, ink, ISMB } = C;

const S = [];
const CAP_SKIP = [45, 47, 59];
const SOFT = '#cfe3ff';
// ===================================================================== BRIDGE
const Q = {
  let: WT(36, 'let'), slow: WT(36, 'slow'), second: WT(36, 'second'), breathe: WT(37, 'breathe'),
  why: WT(38, 'why'), check: WT(38, 'check'), shear: WT(38, 'shear'), V: WT(38, 'v'), D: WT(38, 'd'),
  because: WT(39, 'because'), web: WT(39, 'web'), shears: WT(39, 'shears'), whole: WT(39, 'whole'), collapses: WT(39, 'collapses'),
  area: WT(40, 'area'), web2: WT(40, 'web'), times: WT(40, 'times'), yield: WT(40, 'yield'), stress: WT(40, 'stress'), divided: WT(40, 'divided'), root: WT(40, 'root'), three: WT(40, 'three'), gamma: WT(40, 'gamma'), zero: WT(40, 'zero'),
  two: WT(41, 'two'), ninety: WT(41, 'ninety'), kn: WT(41, 'kilo'),
  applied: WT(42, 'applied'), shear2: WT(42, 'shear'), one: WT(42, 'one'), hundred: WT(42, 'hundred'),
  below: WT(43, 'below'), sixty: WT(43, 'sixty'), percent: WT(43, 'percent'), low: WT(43, 'low'), condition: WT(43, 'condition'),
  doyou: WT(44, 'do'), means: WT(44, 'means'),
};
const BR_A = 132.3, BR_B = 162.25, HIT = 162.25;
const glowT = (ctx, s, x, y, size, o = {}) => text(ctx, s, x, y, Object.assign({ size, fam: 'bebas', color: SOFT, glow: 'rgba(120,170,255,0.7)', glowR: 26, ls: 6 }, o));
const glowM = (ctx, s, x, y, size, o = {}) => mathText(ctx, s, x, y, Object.assign({ size, fam: 'mono', color: SOFT, align: 'center', glow: 'rgba(120,170,255,0.7)', glowR: 22 }, o));
S.push({
  a: BR_A, b: BR_B, draw(ctx, t) {
    const build = P(t, Q.doyou - 0.2, HIT - Q.doyou + 0.2, E.inQ);
    const dimAll = 1 - 0.7 * P(t, Q.doyou - 0.2, 0.6);
    ctx.save(); ctx.globalAlpha *= dimAll;
    // ---- tempo dial slowing down
    if (t < Q.breathe + 0.6) {
      const a = Math.min(P(t, 133.0, 0.8), 1 - P(t, Q.breathe - 0.2, 0.6));
      const cx = W / 2, cy = 470, r = 300;
      ctx.save(); ctx.globalAlpha *= a;
      ctx.strokeStyle = SOFT; ctx.lineWidth = 2; ctx.shadowColor = 'rgba(120,170,255,0.8)'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * P(t, 133.0, 1.2, E.ioC)); ctx.stroke();
      for (let i = 0; i < 60; i++) { const an = i / 60 * TAU, l = i % 5 ? 10 : 24; ctx.globalAlpha = a * 0.6; ctx.beginPath(); ctx.moveTo(cx + Math.cos(an) * (r - 8), cy + Math.sin(an) * (r - 8)); ctx.lineTo(cx + Math.cos(an) * (r - 8 - l), cy + Math.sin(an) * (r - 8 - l)); ctx.stroke(); }
      // needle angle = integral of decaying speed
      const k = Math.max(0, t - 133.0), w0 = 7, tau = 1.4, ang = -Math.PI / 2 + w0 * tau * (1 - Math.exp(-k / tau));
      ctx.globalAlpha = a; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * (r - 40), cy + Math.sin(ang) * (r - 40)); ctx.stroke();
      circle(ctx, cx, cy, 8); ctx.fillStyle = SOFT; ctx.fill();
      const bpm = Math.round(lerp(91, 45, P(t, Q.slow, 1.2, E.ioC)));
      ctx.shadowBlur = 0;
      glowT(ctx, `${bpm} BPM`, cx, cy + 120, 56, { alpha: P(t, 133.4, 0.5) });
      ctx.restore();
    }
    // ---- breathe
    if (t >= Q.breathe - 0.3 && t < Q.why + 0.5) {
      const a = Math.min(P(t, Q.breathe - 0.3, 0.5), 1 - P(t, Q.why - 0.1, 0.5));
      const inhale = P(t, Q.breathe - 0.2, 1.9, E.ioS), exhale = P(t, Q.breathe + 1.8, 1.0, E.ioS), r = 110 + 230 * inhale - 140 * exhale;
      ctx.save(); ctx.globalAlpha *= a;
      const g = ctx.createRadialGradient(W / 2, 470, 10, W / 2, 470, r); g.addColorStop(0, 'rgba(120,170,255,0.35)'); g.addColorStop(0.8, 'rgba(80,130,255,0.12)'); g.addColorStop(1, 'rgba(80,130,255,0)');
      ctx.fillStyle = g; circle(ctx, W / 2, 470, r); ctx.fill();
      ctx.strokeStyle = SOFT; ctx.lineWidth = 2; ctx.shadowColor = 'rgba(120,170,255,0.9)'; ctx.shadowBlur = 20; circle(ctx, W / 2, 470, r); ctx.stroke();
      ctx.shadowBlur = 0;
      glowT(ctx, exhale > 0.05 ? 'exhale' : 'inhale', W / 2, 470, 64, { alpha: 0.85 });
      ctx.restore();
    }
    // ---- I-section, V_d ?
    const secA = Math.min(P(t, Q.why - 0.1, 0.6), 1 - P(t, Q.area - 0.3, 0.4));
    const split = P(t, Q.collapses, 0.9, E.inQ);
    if (secA > 0) {
      ctx.save(); ctx.globalAlpha *= secA;
      const cx = 700, cy = 470, sc = 1.15;
      const webGlow = t >= Q.web ? P(t, Q.web, 0.4) : 0;
      if (webGlow > 0) { ctx.save(); ctx.globalAlpha *= webGlow * (1 - split); ctx.fillStyle = 'rgba(120,170,255,0.55)'; ctx.shadowColor = '#7fb2ff'; ctx.shadowBlur = 30; ctx.fillRect(cx - 3.75 * sc, cy - 137.6 * sc, 7.5 * sc, 275.2 * sc); ctx.restore(); }
      if (split <= 0) iSection(ctx, cx, cy, sc, { color: SOFT, lw: 2.5, prog: P(t, Q.why, 1.2, E.ioC), glow: 'rgba(120,170,255,0.9)' });
      else {
        // top half slides right/up, bottom half slides left/down, slowly apart
        for (const [sgn, dx, dy] of [[1, 90, -40], [-1, -90, 40]]) {
          ctx.save(); ctx.translate(dx * split, dy * split + split * split * 160 * (sgn < 0 ? 1 : 0.6)); ctx.rotate(sgn * 0.08 * split);
          ctx.beginPath(); ctx.rect(cx - 200, sgn > 0 ? cy - 260 : cy, 400, 260); ctx.clip();
          ctx.globalAlpha *= 1 - split * 0.85;
          iSection(ctx, cx, cy, sc, { color: SOFT, lw: 2.5, glow: 'rgba(120,170,255,0.9)' });
          ctx.restore();
        }
      }
      if (t >= Q.V && t < Q.because + 0.4) mathText(ctx, t >= Q.D ? 'V_{d} ?' : 'V ?', 1300, 470, { size: 230, fam: 'hand', color: SOFT, align: 'center', glow: 'rgba(120,170,255,0.8)', glowR: 30, alpha: Math.min(P(t, Q.V, 0.4), 1 - P(t, Q.because, 0.4)) });
      // shear element distorting
      if (t >= Q.shears - 0.3) {
        const a = Math.min(P(t, Q.shears - 0.3, 0.4), 1 - P(t, Q.area - 0.4, 0.4)), g = P(t, Q.shears, 0.7, E.ioC) * 50;
        const ex = 1310, ey = 470, s = 110;
        ctx.save(); ctx.globalAlpha *= a;
        ctx.beginPath(); ctx.moveTo(ex - s + g, ey - s); ctx.lineTo(ex + s + g, ey - s); ctx.lineTo(ex + s - g, ey + s); ctx.lineTo(ex - s - g, ey + s); ctx.closePath();
        ctx.fillStyle = 'rgba(120,170,255,0.18)'; ctx.fill(); ctx.strokeStyle = SOFT; ctx.lineWidth = 3; ctx.stroke();
        arrow(ctx, ex - s + 20, ey - s - 30, ex + s - 20, ey - s - 30, { color: SOFT, lw: 3, head: 14 });
        arrow(ctx, ex + s - 20, ey + s + 30, ex - s + 20, ey + s + 30, { color: SOFT, lw: 3, head: 14 });
        arrow(ctx, ex + s + 40, ey + s - 20, ex + s + 40, ey - s + 20, { color: SOFT, lw: 3, head: 14 });
        arrow(ctx, ex - s - 40, ey - s + 20, ex - s - 40, ey + s - 20, { color: SOFT, lw: 3, head: 14 });
        glowT(ctx, 'τ', ex, ey - s - 70, 56, { fam: 'dejavu', ls: 0 });
        if (t >= Q.collapses) glowT(ctx, 'COLLAPSE', ex, ey + 230, 70, { alpha: P(t, Q.collapses, 0.4), color: '#ff8a8a', glow: 'rgba(255,80,80,0.8)' });
        ctx.restore();
      }
      ctx.restore();
    }
    // ---- V_d equation (fraction)
    const eqA = Math.min(P(t, Q.area - 0.3, 0.4), 1);
    if (eqA > 0) {
      const up = P(t, Q.applied - 0.6, 0.6, E.ioC);
      ctx.save(); ctx.globalAlpha *= eqA;
      ctx.translate(W / 2, 0); ctx.scale(lerp(1, 0.62, up), lerp(1, 0.62, up)); ctx.translate(-W / 2, lerp(0, -120, up));
      const cy = 380, fx = 1060;
      const segIn = (tt) => ({ a: P(t, tt - 0.05, 0.4), k: lerp(0.85, 1, P(t, tt - 0.05, 0.5, E.outC)) });
      const term = (s, x, y, tt, size = 84) => { const { a } = segIn(tt); if (a <= 0) return; mathText(ctx, s, x, y, { size, fam: 'hand', color: SOFT, align: 'center', alpha: a, glow: 'rgba(120,170,255,0.6)' }); };
      term('V_{d} =', 700, cy, Q.area - 0.2);
      term('A_{v}', fx - 120, cy - 70, Q.area);
      term('·', fx, cy - 70, Q.times);
      term('f_{y}', fx + 110, cy - 70, Q.yield);
      if (t >= Q.divided) line(ctx, [[fx - 220, cy + 4], [fx + 220, cy + 4]], { color: SOFT, lw: 4, prog: P(t, Q.divided, 0.5), glow: 'rgba(120,170,255,0.8)' });
      term('√3', fx - 100, cy + 80, Q.root);
      term('·', fx + 10, cy + 80, Q.three + 0.15);
      term('γ_{m0}', fx + 120, cy + 80, Q.gamma);
      // annotations
      const ann = Math.min(1, 1 - P(t, Q.two - 0.4, 0.4));
      if (ann > 0) {
        ctx.save(); ctx.globalAlpha *= ann;
        const nt = (s, x, tt) => { if (t >= tt) mathText(ctx, s, x, 640, { size: 40, fam: 'mono', color: '#9fbfff', align: 'center', alpha: P(t, tt, 0.4) }); };
        nt('A_{v} = 300 × 7.5 = 2250 mm²', 600, Q.web2);
        nt('f_{y} = 250 MPa', 1090, Q.stress);
        nt('γ_{m0} = 1.10', 1480, Q.zero);
        ctx.restore();
      }
      if (t >= Q.two) {
        const v = 295.27 * P(t, Q.two, Q.kn - Q.two + 0.2, E.outC);
        text(ctx, `= ${v.toFixed(2)} kN`, W / 2 + 40, 640, { size: 150, fam: 'hand', color: '#ffffff', glow: 'rgba(120,170,255,0.8)', glowR: 30, scale: pop(t, Q.two, 0.3, 0.7) });
      }
      ctx.restore();
    }
    // ---- capacity bar with the 60 % line
    if (t >= Q.applied - 0.4) {
      const a = P(t, Q.applied - 0.4, 0.5), x0 = 360, x1 = 1560, y = 640, X = (v) => lerp(x0, x1, v / 295.27);
      ctx.save(); ctx.globalAlpha *= a;
      rrect(ctx, x0, y - 40, x1 - x0, 80, 12); ctx.strokeStyle = SOFT; ctx.lineWidth = 3; ctx.shadowColor = 'rgba(120,170,255,0.8)'; ctx.shadowBlur = 16; ctx.stroke(); ctx.shadowBlur = 0;
      glowM(ctx, 'V_{d} = 295.3 kN', x1 - 150, y - 80, 40);
      if (t >= Q.low) { ctx.save(); ctx.globalAlpha *= P(t, Q.low, 0.4); ctx.fillStyle = 'rgba(46,229,157,0.16)'; ctx.fillRect(x0, y - 40, X(177.16) - x0, 80); ctx.restore(); glowT(ctx, 'LOW SHEAR ZONE', (x0 + X(177.16)) / 2, y + 90, 50, { color: '#7dffc0', glow: 'rgba(46,229,157,0.8)', alpha: P(t, Q.low, 0.4) }); }
      const fill = 100 * P(t, Q.shear2, Q.hundred - Q.shear2 + 0.25, E.outC);
      if (fill > 0) { rrect(ctx, x0 + 6, y - 32, X(fill) - x0 - 6, 64, 8); ctx.fillStyle = t >= Q.condition ? '#2ee59d' : '#ff9f1c'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 24; ctx.fill(); ctx.shadowBlur = 0; }
      if (t >= Q.one) glowM(ctx, 'V_{u} = 100 kN', X(100), y - 80, 40, { alpha: P(t, Q.one, 0.3) });
      if (t >= Q.sixty) {
        const pr = P(t, Q.sixty, 0.5);
        line(ctx, [[X(177.16), y - 120], [X(177.16), y + 60]], { color: '#ffffff', lw: 3, dash: [10, 8], prog: pr });
        glowM(ctx, '0.6 V_{d} = 177.2 kN', X(177.16), y - 150, 38, { alpha: pr });
      }
      if (t >= Q.condition) check(ctx, x1 + 70, y, 70, P(t, Q.condition, 0.3), { glow: 'rgba(46,229,157,0.9)' });
      ctx.restore();
    }
    ctx.restore();
    // ---- the build: streaks converge, white core grows
    if (build > 0) {
      ctx.save();
      speedLines(ctx, t, { n: Math.floor(30 + 90 * build), alpha: 0.15 + 0.5 * build, color: '#bcd6ff' });
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 40 + 900 * build * build);
      g.addColorStop(0, `rgba(255,255,255,${0.9 * build})`); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  },
});
// tremble during the build
for (let k = 0; k < 10; k++) shake(Q.doyou + k * 0.12, 2 + k * 1.4, 0.12);

// ===================================================================== THE DROP: no reduction, full strength, brace yourselves
const D = { it: WT(45, 'it'), means: WT(45, 'means'), no: WT(45, 'no'), red: WT(45, 'reduction'), it2: WT(46, 'it'), full: WT(46, 'full'), bending: WT(46, 'bending'), strength: WT(46, 'strength'), brace: WT(47, 'brace'), yourselves: WT(47, 'yourselves') };
const V3 = 171.07;
S.push({
  a: HIT, b: V3, draw(ctx, t) {
    // reduction formula crossed out
    if (t < D.it2 - 0.2) {
      const a = 1 - P(t, D.it2 - 0.5, 0.3);
      ctx.save(); ctx.globalAlpha *= a;
      mathText(ctx, 'M_{dv} = M_{d} − β (M_{d} − M_{fd})', W / 2, 300, { size: 70, fam: 'mono', color: '#ffb3e6', align: 'center', alpha: P(t, D.it - 0.1, 0.3), scale: 1 });
      mathText(ctx, 'β = (2V/V_{d} − 1)²   [high shear only]', W / 2, 385, { size: 40, fam: 'mono', color: 'rgba(255,200,240,0.7)', align: 'center', alpha: P(t, D.means, 0.3) });
      if (t >= D.no) { cross(ctx, W / 2, 330, 300, P(t, D.no, 0.25), { lw: 30, color: 'red', glow: 'rgba(255,0,60,0.9)' }); }
      if (t >= D.red) {
        text(ctx, 'NO REDUCTION', W / 2, 640, { size: 230, fam: 'anton', color: '#ffffff', stroke: '#000', strokeW: 16, glow: 'rgba(255,95,210,0.9)', glowR: 50, scale: pop(t, D.red, 0.16, 2.2), ls: 4 });
      } else if (t >= D.no) text(ctx, 'NO', W / 2, 640, { size: 230, fam: 'anton', color: '#ffffff', stroke: '#000', strokeW: 16, scale: pop(t, D.no, 0.14, 2.2) });
      ctx.restore();
    }
    // full bending strength battery
    if (t >= D.it2 - 0.3 && t < D.brace) {
      const a = Math.min(P(t, D.it2 - 0.3, 0.3), 1 - P(t, D.brace - 0.25, 0.25));
      const lvl = P(t, D.it2, D.strength - D.it2 + 0.1, E.ioC);
      ctx.save(); ctx.globalAlpha *= a;
      const x = 360, y = 330, w = 1140, h = 220;
      rrect(ctx, x, y, w, h, 30); ctx.lineWidth = 10; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      rrect(ctx, x + w + 10, y + 70, 40, 80, 10); ctx.fillStyle = '#fff'; ctx.fill();
      const fw = (w - 30) * lvl;
      if (fw > 2) {
        rrect(ctx, x + 15, y + 15, fw, h - 30, 20);
        const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#2ee59d'); g.addColorStop(0.7, '#a7ff3f'); g.addColorStop(1, '#ffd23f');
        ctx.fillStyle = g; ctx.shadowColor = '#7dff9a'; ctx.shadowBlur = 40; ctx.fill(); ctx.shadowBlur = 0;
        // moving charge stripes
        ctx.save(); rrect(ctx, x + 15, y + 15, fw, h - 30, 20); ctx.clip(); ctx.globalAlpha *= 0.25; ctx.fillStyle = '#fff';
        for (let i = -2; i < 14; i++) { const sx = x + ((i * 110 + t * 500) % 1540) - 200; ctx.beginPath(); ctx.moveTo(sx, y + h); ctx.lineTo(sx + 60, y); ctx.lineTo(sx + 110, y); ctx.lineTo(sx + 50, y + h); ctx.closePath(); ctx.fill(); }
        ctx.restore();
      }
      text(ctx, `${Math.round(lvl * 100)}%`, x + w / 2, y + h / 2 + 4, { size: 130, fam: 'anton', color: '#ffffff', stroke: '#000', strokeW: 12 });
      mathText(ctx, 'M_{d} = full plastic capacity  (V < 0.6 V_{d})', W / 2, y + h + 80, { size: 50, fam: 'mono', color: '#ffffff', align: 'center', alpha: P(t, D.full - 0.3, 0.3) });
      emoji(ctx, '⚡', x - 70, y + h / 2, 120, { scale: 1 + 0.15 * beatPulse(t) });
      ctx.restore();
    }
    // brace yourselves: X-bracing slams in
    if (t >= D.brace - 0.05) {
      const k1 = P(t, D.brace - 0.05, 0.14, E.inQ), k2 = P(t, D.yourselves - 0.05, 0.14, E.inQ);
      const riser = P(t, D.yourselves + 0.3, V3 - D.yourselves - 0.3, E.inQ);
      ctx.save();
      const braceBar = (x0, y0, x1, y1, k) => {
        if (k <= 0) return;
        const ex = lerp(x0, x1, k), ey = lerp(y0, y1, k), ang = Math.atan2(y1 - y0, x1 - x0);
        ctx.save(); ctx.translate(x0, y0); ctx.rotate(ang);
        const L = Math.hypot(ex - x0, ey - y0);
        const g = ctx.createLinearGradient(0, -34, 0, 34); g.addColorStop(0, '#e4ebf1'); g.addColorStop(0.5, '#7d8a96'); g.addColorStop(1, '#c9d3dc');
        ctx.fillStyle = g; ctx.fillRect(0, -34, L, 68); ctx.strokeStyle = '#1b2228'; ctx.lineWidth = 4; ctx.strokeRect(0, -34, L, 68);
        ctx.fillStyle = '#2b3a46'; for (let b = 60; b < L - 30; b += 120) { circle(ctx, b, 0, 9); ctx.fill(); }
        ctx.restore();
      };
      braceBar(-100, -60, W + 100, H + 60, k1);
      braceBar(-100, H + 60, W + 100, -60, k2);
      if (k1 >= 1) burst(ctx, W / 2, H / 2, t, D.brace + 0.09, { n: 40, vmin: 300, vmax: 1200, size: 5, color: ['#ffd23f', '#ffffff', '#ff9f1c'], life: 0.6, g: 200, seed: 5 });
      if (k2 >= 1) burst(ctx, W / 2, H / 2, t, D.yourselves + 0.09, { n: 50, vmin: 300, vmax: 1400, size: 6, color: ['#ffd23f', '#ffffff', '#ff9f1c'], life: 0.7, g: 200, seed: 9 });
      const sc = 1 + 0.25 * riser + 0.02 * Math.sin(t * 60) * riser;
      text(ctx, 'BRACE', W / 2, 380, { size: 250, fam: 'anton', color: COL.yellow, stroke: '#000', strokeW: 18, scale: pop(t, D.brace, 0.14, 2.4) * sc, glow: 'rgba(255,210,63,0.8)', glowR: 40 });
      if (t >= D.yourselves) text(ctx, 'YOURSELVES', W / 2, 650, { size: 210, fam: 'anton', color: '#ffffff', stroke: '#000', strokeW: 18, scale: pop(t, D.yourselves, 0.14, 2.4) * sc });
      if (riser > 0) { speedLines(ctx, t, { n: Math.floor(40 + 80 * riser), alpha: 0.2 + 0.5 * riser, color: '#ffd23f' }); }
      ctx.restore();
    }
  },
});
flash(HIT, 1, 0.3); shake(HIT, 34, 0.35); punch(HIT, 0.1, 0.3); glitch(HIT - 0.03, 0.2, 1.2);
shake(D.no, 20, 0.2); punch(D.red, 0.08, 0.25); shake(D.red, 26, 0.3); flash(D.red, 0.35, 0.2, '#ff5fd2');
flash(165.13, 0.6, 0.25); shake(165.13, 26, 0.3); punch(165.13, 0.08, 0.25);
shake(D.brace + 0.09, 30, 0.3); shake(D.yourselves + 0.09, 36, 0.3); flash(D.yourselves + 0.09, 0.4, 0.2, '#ffd23f');
for (let k = 0; k < 8; k++) shake(D.yourselves + 0.4 + k * 0.17, 4 + k * 2.2, 0.15);
flash(V3, 1, 0.3); glitch(V3 - 0.03, 0.18, 1.2); punch(V3, 0.12, 0.3); shake(V3, 30, 0.3);

// ===================================================================== VERSE 3: CAPACITY
const Z = {
  bring: WT(48, 'bring'), plastic: WT(48, 'plastic'), modulus: WT(48, 'modulus'), Z: WT(48, 'z'), P: WT(48, 'p'), track: WT(48, 'track'),
  six: WT(49, 'six'), hundred: WT(49, 'hundred'), fifty: WT(49, 'fifty'), point: WT(49, 'point'), seven: WT(49, 'seven'), times: WT(49, 'times'), ten: WT(49, 'ten'), cubed: WT(49, 'cubed'), hold: WT(49, 'hold'), back: WT(49, 'back'),
  multiply: WT(50, 'multiply'), two: WT(50, 'two'), fifty2: WT(50, 'fifty'), divide: WT(50, 'divide'), one: WT(50, 'one'), point2: WT(50, 'point'), one2: WT(50, 'one', 1), zero: WT(50, 'zero'),
  oneH: WT(51, 'one'), forty: WT(51, 'forty'), kn: WT(51, 'kilo'), hero: WT(51, 'hero'),
  demand: WT(52, 'demand'), d125: WT(52, 'twenty'), capacity: WT(52, 'capacity'), c148: WT(52, 'forty'),
  section: WT(53, 'section'), adequate: WT(53, 'adequate'), numbers: WT(53, 'numbers'), great: WT(53, 'great'),
  check: WT(54, 'check'), elastic: WT(54, 'elastic'), limit: WT(54, 'limit'), one3: WT(54, 'one'), two3: WT(54, 'two'), Ze: WT(54, 'z'), E: WT(54, 'e'), F: WT(54, 'f'), Y: WT(54, 'y'),
  h156: WT(55, 'one'), fifty6: WT(55, 'fifty'), perfectly: WT(55, 'perfectly'), safe: WT(55, 'safe'), cry: WT(55, 'cry'),
};
const V3_B = 193.9;
S.push({
  a: V3, b: V3_B, draw(ctx, t) {
    const bp = beatPulse(t);
    // ---- plastic modulus: section halves + Z_p
    if (t < Z.multiply + 0.3) {
      const a = 1 - P(t, Z.multiply - 0.1, 0.35);
      ctx.save(); ctx.globalAlpha *= a;
      const cx = 520, cy = 450, sc = 1.2;
      const fillA = P(t, Z.plastic, 0.4);
      if (fillA > 0) {
        const pts = iPoly().map((p) => [cx + p[0] * sc, cy - p[1] * sc]);
        for (const [top, col] of [[true, 'rgba(255,159,28,0.75)'], [false, 'rgba(63,224,255,0.75)']]) {
          ctx.save(); ctx.beginPath(); ctx.rect(cx - 200, top ? cy - 200 : cy, 400, 200); ctx.clip();
          ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.globalAlpha *= fillA; ctx.fillStyle = col; ctx.fill(); ctx.restore();
        }
      }
      iSection(ctx, cx, cy, sc, { color: '#ffffff', lw: 4, prog: P(t, V3, 0.6, E.ioC), glow: 'rgba(255,255,255,0.6)' });
      line(ctx, [[cx - 170, cy], [cx + 170, cy]], { color: '#ffffff', lw: 3, dash: [12, 8], prog: P(t, Z.bring, 0.4) });
      text(ctx, 'PNA', cx - 215, cy, { size: 32, fam: 'mono', color: '#ffffff', alpha: P(t, Z.bring, 0.3) });
      if (t >= Z.modulus) {
        arrow(ctx, cx + 260, cy - 120, cx + 120, cy - 120, { color: COL.orange, lw: 8, head: 26, prog: P(t, Z.modulus, 0.3), glow: COL.orange });
        arrow(ctx, cx + 120, cy + 120, cx + 260, cy + 120, { color: COL.cyan, lw: 8, head: 26, prog: P(t, Z.modulus + 0.1, 0.3), glow: COL.cyan });
        text(ctx, 'C', cx + 300, cy - 120, { size: 64, fam: 'anton', color: COL.orange, alpha: P(t, Z.modulus, 0.3) });
        text(ctx, 'T', cx + 300, cy + 120, { size: 64, fam: 'anton', color: COL.cyan, alpha: P(t, Z.modulus + 0.1, 0.3) });
      }
      if (t >= Z.Z) {
        text(ctx, 'Z', 1180, 360, { size: 300, fam: 'anton', color: '#ffffff', stroke: '#000', strokeW: 16, scale: pop(t, Z.Z, 0.14, 2.4), glow: 'rgba(255,159,28,0.9)', glowR: 50 });
        if (t >= Z.P) text(ctx, 'p', 1300, 450, { size: 170, fam: 'anton', color: COL.orange, stroke: '#000', strokeW: 12, scale: pop(t, Z.P, 0.14, 2.4) });
      }
      if (t >= Z.six) {
        const parts = [['6', Z.six], ['5', Z.fifty], ['1', Z.fifty + 0.08], ['.', Z.point], ['7', Z.seven], [' × ', Z.times], ['10', Z.ten], ['³', Z.cubed]];
        let s = ''; for (const [p, ti] of parts) if (t >= ti) s += p;
        if (t >= Z.hundred && t < Z.fifty) s = '6__';
        text(ctx, s, 1060, 640, { size: 130, fam: 'anton', color: COL.yellow, align: 'left', stroke: '#000', strokeW: 12, glow: 'rgba(255,210,63,0.6)', glowR: 30 });
        if (t >= Z.cubed + 0.15) text(ctx, 'mm³', 1080, 760, { size: 70, fam: 'anton', color: '#ffffff', align: 'left', scale: pop(t, Z.cubed + 0.15, 0.2) });
        if (t >= Z.hold) for (let i = 0; i < 6; i++) { const ti = Z.hold + i * 0.06; if (t >= ti) emoji(ctx, '🔥', 1040 + i * 120, 820 - (i % 2) * 40, 80, { scale: pop(t, ti, 0.15, 0.3), alpha: 1 - P(t, Z.multiply - 0.2, 0.3) }); }
      }
      ctx.restore();
    }
    // ---- M_d formula & substitution
    if (t >= Z.multiply - 0.1 && t < Z.demand) {
      const a = Math.min(P(t, Z.multiply - 0.1, 0.25), 1 - P(t, Z.demand - 0.3, 0.3));
      const up = P(t, Z.oneH - 0.15, 0.3, E.ioC);
      ctx.save(); ctx.globalAlpha *= a; ctx.translate(0, -90 * up);
      eqn(ctx, [{ s: 'M_{d}', t: Z.multiply }, { s: '=', t: Z.multiply }, { s: 'β_{b}', t: Z.multiply + 0.08 }, { s: '·', t: Z.multiply + 0.1 }, { s: 'Z_{p}', t: Z.multiply + 0.14, c: COL.orange }, { s: '·', t: Z.multiply + 0.16 }, { s: 'f_{y}', t: Z.two, c: COL.yellow }, { s: '/', t: Z.divide }, { s: 'γ_{m0}', t: Z.divide + 0.1, c: COL.cyan }], W / 2, 230, t, { size: 84, fam: 'mono', color: '#ffffff' });
      let dv = ''; for (const [p, ti] of [['1', Z.one], ['.', Z.point2], ['1', Z.one2], ['0', Z.zero]]) if (t >= ti) dv += p;
      eqn(ctx, [{ s: '= 1.0 ×', t: Z.multiply + 0.2 }, { s: '651.7×10³', t: Z.multiply + 0.25, c: COL.orange }, { s: '× 250', t: Z.two, c: COL.yellow }, { s: '/ ' + (dv || '…'), t: Z.divide, c: COL.cyan }], W / 2, 370, t, { size: 70, fam: 'mono', color: '#ffffff' });
      ctx.restore();
    }
    // ---- HERO reveal 148.1
    if (t >= Z.oneH - 0.1 && t < Z.demand) {
      const a = 1 - P(t, Z.demand - 0.25, 0.25);
      ctx.save(); ctx.globalAlpha *= a;
      rays(ctx, W / 2, 600, t, { alpha: 0.22, color: '#ffd23f', n: 22, spin: 0.4 });
      const v = 148.12 * P(t, Z.oneH, Z.kn - Z.oneH, E.outC);
      text(ctx, v.toFixed(1), W / 2 - 80, 600, { size: 300, fam: 'anton', color: COL.yellow, stroke: '#000', strokeW: 18, glow: 'rgba(255,210,63,0.9)', glowR: 60, scale: pop(t, Z.oneH, 0.2, 2) * (1 + 0.03 * bp) });
      if (t >= Z.kn) text(ctx, 'kNm', W / 2 + 330, 660, { size: 120, fam: 'anton', color: '#ffffff', stroke: '#000', strokeW: 12, scale: pop(t, Z.kn, 0.15, 2) });
      if (t >= Z.hero) { stamp(ctx, 'HERO', 1560, 330, t, Z.hero, { size: 100, color: COL.yellow, rot: 0.12, hole: '#060608', glow: true }); emoji(ctx, '👑', W / 2 - 80, 400, 150, { scale: pop(t, Z.hero, 0.2) }); }
      ctx.restore();
    }
    // ---- VS screen
    if (t >= Z.demand - 0.1 && t < Z.adequate + 0.2) {
      const a = 1 - P(t, Z.adequate - 0.1, 0.25);
      const lIn = P(t, Z.demand - 0.1, 0.25, E.outBack), rIn = P(t, Z.capacity - 0.1, 0.25, E.outBack), win = t >= Z.c148;
      ctx.save(); ctx.globalAlpha *= a;
      // left panel
      ctx.save(); ctx.translate(-W * (1 - lIn), 0);
      ctx.beginPath(); ctx.moveTo(0, 90); ctx.lineTo(1000, 90); ctx.lineTo(880, 860); ctx.lineTo(0, 860); ctx.closePath();
      const gl = ctx.createLinearGradient(0, 0, 1000, 0); gl.addColorStop(0, '#5a0d14'); gl.addColorStop(1, '#c0182b'); ctx.fillStyle = gl; ctx.fill();
      text(ctx, 'DEMAND', 440, 260, { size: 120, fam: 'anton', color: '#ffffff', stroke: '#000', strokeW: 12 });
      if (t >= Z.d125) text(ctx, '125', 440, 480, { size: 260, fam: 'anton', color: '#ffd0d4', stroke: '#000', strokeW: 16, scale: pop(t, Z.d125, 0.15, 2) });
      text(ctx, 'kNm', 440, 650, { size: 70, fam: 'anton', color: '#ffffff', alpha: P(t, Z.d125, 0.2) });
      rrect(ctx, 120, 740, 640, 40, 10); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); rrect(ctx, 124, 744, 632 * (125 / 148.12), 32, 8); ctx.fillStyle = '#ff4d4d'; ctx.fill();
      ctx.restore();
      // right panel
      ctx.save(); ctx.translate(W * (1 - rIn), 0);
      ctx.beginPath(); ctx.moveTo(1040, 90); ctx.lineTo(W, 90); ctx.lineTo(W, 860); ctx.lineTo(920, 860); ctx.closePath();
      const gr = ctx.createLinearGradient(920, 0, W, 0); gr.addColorStop(0, '#0f6b8a'); gr.addColorStop(1, '#063247'); ctx.fillStyle = gr; ctx.fill();
      if (win) { ctx.save(); ctx.globalAlpha *= 0.3 + 0.3 * Math.sin(t * 20); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore(); }
      text(ctx, 'CAPACITY', 1440, 260, { size: 120, fam: 'anton', color: '#ffffff', stroke: '#000', strokeW: 12 });
      if (t >= Z.c148) text(ctx, '148.1', 1440, 480, { size: 240, fam: 'anton', color: '#c6f6ff', stroke: '#000', strokeW: 16, scale: pop(t, Z.c148, 0.15, 2) });
      text(ctx, 'kNm', 1440, 650, { size: 70, fam: 'anton', color: '#ffffff', alpha: P(t, Z.c148, 0.2) });
      rrect(ctx, 1120, 740, 640, 40, 10); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); rrect(ctx, 1124, 744, 632, 32, 8); ctx.fillStyle = '#3fe0ff'; ctx.fill();
      ctx.restore();
      if (t >= Z.capacity - 0.2) {
        text(ctx, 'VS', W / 2, 470, { size: 200, fam: 'anton', color: COL.yellow, stroke: '#000', strokeW: 16, scale: pop(t, Z.capacity - 0.2, 0.15, 2.5) * (1 + 0.05 * Math.sin(t * 30)), glow: 'rgba(255,210,63,0.9)', glowR: 50 });
      }
      if (win) stamp(ctx, 'CAPACITY WINS', W / 2, 160, t, Z.c148 + 0.15, { size: 70, color: COL.green, rot: -0.05, hole: '#000', bg: 'rgba(0,0,0,0.6)' });
      ctx.restore();
    }
    // ---- adequate
    if (t >= Z.adequate - 0.05 && t < Z.check + 0.2) {
      const a = 1 - P(t, Z.check - 0.1, 0.25);
      ctx.save(); ctx.globalAlpha *= a;
      stamp(ctx, 'ADEQUATE ✓', W / 2, 400, t, Z.adequate, { size: 170, color: COL.green, rot: -0.07, hole: '#060608', bg: 'rgba(0,0,0,0.55)', glow: true });
      if (t >= Z.numbers) mathText(ctx, 'M_{u} / M_{d} = 125 / 148.1 = 0.84 < 1.0', W / 2, 660, { size: 64, fam: 'mono', color: '#ffffff', align: 'center', alpha: P(t, Z.numbers, 0.25) });
      if (t >= Z.great) burst(ctx, W / 2, 380, t, Z.great, { n: 120, vmin: 400, vmax: 1500, size: 10, rects: true, color: ['#ffd23f', '#3fe0ff', '#ff5fd2', '#45f59a', '#ffffff'], life: 1.4, g: 900, seed: 3 });
      ctx.restore();
    }
    // ---- elastic limit check
    if (t >= Z.check - 0.1) {
      const a = P(t, Z.check - 0.1, 0.25) * (1 - P(t, V3_B - 0.5, 0.4));
      ctx.save(); ctx.globalAlpha *= a;
      text(ctx, 'ELASTIC LIMIT CHECK', W / 2, 150, { size: 70, fam: 'anton', color: '#ffffff', ls: 4, scale: pop(t, Z.check, 0.2) });
      eqn(ctx, [{ s: 'M_{d}', t: Z.elastic }, { s: '≤', t: Z.limit }, { s: '1.2', t: Z.two3, c: COL.yellow }, { s: 'Z_{e}', t: Z.E, c: COL.orange }, { s: 'f_{y}', t: Z.Y, c: COL.yellow }, { s: '/ γ_{m0}', t: Z.Y + 0.15, c: COL.cyan }], W / 2, 280, t, { size: 80, fam: 'mono', color: '#ffffff' });
      if (t >= Z.E) mathText(ctx, 'Z_{e} = 573.6 × 10³ mm³   (cl. 8.2.1.2)', W / 2, 370, { size: 40, fam: 'mono', color: 'rgba(255,255,255,0.7)', align: 'center', alpha: P(t, Z.E, 0.3) });
      if (t >= Z.h156) {
        // comparison bars
        const x0 = 520, x1 = 1640, X = (v) => lerp(x0, x1, v / 170);
        const rows = [['M_{u} demand', 125, '#ff4d4d', Z.h156], ['M_{d} capacity', 148.12, '#3fe0ff', Z.h156 + 0.12], ['1.2Z_{e}f_{y}/γ_{m0}', 156.43, '#9aa7b3', Z.fifty6]];
        rows.forEach(([lab, v, c, ti], i) => {
          if (t < ti) return; const y = 480 + i * 105, pr = P(t, ti, 0.5, E.outC);
          mathText(ctx, lab, x0 - 30, y, { size: 38, fam: 'mono', color: '#ffffff', align: 'right' });
          rrect(ctx, x0, y - 30, (X(v) - x0) * pr, 60, 10); ctx.fillStyle = c; ctx.fill();
          text(ctx, (v * pr).toFixed(1), X(v * pr) + 20, y, { size: 44, fam: 'anton', color: '#ffffff', align: 'left' });
        });
        if (t >= Z.perfectly) { const gx = X(148.12); line(ctx, [[gx, 440], [gx, 760]], { color: COL.green, lw: 4, dash: [10, 8], prog: P(t, Z.perfectly, 0.3) }); text(ctx, '148.1 GOVERNS', gx, 790, { size: 44, fam: 'anton', color: COL.green, alpha: P(t, Z.perfectly, 0.3) }); }
      }
      if (t >= Z.safe) stamp(ctx, 'SAFE ✓', 1580, 180, t, Z.safe, { size: 90, color: COL.green, rot: 0.1, hole: '#060608', glow: true });
      if (t >= Z.cry - 0.4) { const sw = t >= Z.cry; emoji(ctx, sw ? '😎' : '😭', 300, 200, 150, { scale: pop(t, sw ? Z.cry : Z.cry - 0.4, 0.2), rot: -0.1 }); }
      ctx.restore();
    }
  },
});
punch(Z.Z, 0.08, 0.25); shake(Z.Z, 22, 0.25); shake(Z.cubed, 18, 0.2); flash(Z.oneH, 0.6, 0.25, '#ffd23f'); shake(Z.oneH, 30, 0.3); punch(Z.oneH, 0.1, 0.3);
shake(Z.hero, 18, 0.2); shake(Z.demand, 16, 0.2); shake(Z.capacity, 16, 0.2); flash(Z.c148, 0.5, 0.2); shake(Z.c148, 28, 0.3);
flash(Z.adequate, 0.4, 0.2, '#45f59a'); shake(Z.adequate, 26, 0.3); punch(Z.adequate, 0.08, 0.25); shake(Z.safe, 18, 0.2); glitch(Z.check - 0.05, 0.12, 0.8);

// ===================================================================== OUTRO: the verdict
const O = {
  I: WT(56, 'i'), S: WT(56, 's'), M: WT(56, 'm'), B: WT(56, 'b'), three: WT(56, 'three'), passes: WT(56, 'passes'), lateral: WT(56, 'lateral'), check: WT(56, 'check'),
  safe: WT(57, 'safe'), secure: WT(57, 'secure'),
  and: WT(58, 'and'), understand: WT(58, 'understand'), this: WT(58, 'this'), sw: WT(58, 'switch'), major: WT(58, 'major'), business: WT(58, 'business'),
  cls: WT(59, 'class'), dismissed: WT(59, 'dismissed'),
};
const FIN = 209.45;
S.push({
  a: V3_B - 0.3, b: FIN, draw(ctx, t) {
    const a0 = P(t, V3_B - 0.3, 0.5);
    ctx.save(); ctx.globalAlpha *= a0;
    // ---- report card on the board
    const repOut = P(t, O.and - 0.3, 0.4, E.ioC);
    if (repOut < 1) {
      const sh = P(t, O.safe - 0.35, 0.4, E.ioC);
      ctx.save(); ctx.globalAlpha *= 1 - repOut;
      ctx.translate(lerp(0, -300, sh), 0); ctx.translate(W / 2, 470); ctx.scale(lerp(1, 0.78, sh), lerp(1, 0.78, sh)); ctx.translate(-W / 2, -470);
      let hx = 300; const head = [['DESIGN REPORT:', O.I - 0.4, 'chalk'], [' I', O.I, 'yellow'], ['S', O.S, 'yellow'], ['M', O.M, 'yellow'], ['B', O.B, 'yellow'], [' 300', O.three, 'yellow']];
      for (const [s, ti, c] of head) { if (t >= ti) text(ctx, s, hx, 140, { size: 76, fam: 'chalk', color: c, align: 'left', scale: pop(t, ti, 0.15, 1.6) }); hx += tw(ctx, s, 76, 'chalk'); }
      line(ctx, [[300, 190], [1500, 190]], { color: 'chalk', lw: 4, prog: P(t, O.I, 0.8), wob: 2, seed: 4 }, t);
      const rows = [
        ['Demand', 'M_{u} = 125 kNm,  V_{u} = 100 kN'], ['Section class', 'Plastic (Class 1),  β_{b} = 1.0'], ['Shear', 'V_{u} = 100 ≤ V_{d} = 295.3 kN'], ['Low shear', '100 < 0.6V_{d} = 177.2 kN'],
        ['Lateral stability', 'flange restrained → no LTB'], ['Bending', 'M_{u} = 125 ≤ M_{d} = 148.1 kNm'], ['Elastic limit', 'M_{d} = 148.1 ≤ 156.4 kNm'],
      ];
      rows.forEach(([k, v], i) => {
        const ti = O.I + 0.25 + i * 0.32, y = 250 + i * 74; if (t < ti) return;
        const pr = P(t, ti, 0.25);
        ctx.save(); ctx.globalAlpha *= pr; ctx.translate((1 - pr) * 60, 0);
        text(ctx, k, 360, y, { size: 40, fam: 'hand', color: 'chalk', align: 'left' });
        mathText(ctx, v, 760, y, { size: 40, fam: 'hand', color: i === 4 && t >= O.lateral ? 'yellow' : 'chalk' });
        ctx.restore();
        check(ctx, 310, y, 44, P(t, ti + 0.12, 0.2), { lw: 7 });
        if (i === 4 && t >= O.lateral) line(ctx, [[350, y + 34], [1500, y + 34]], { color: 'yellow', lw: 5, prog: P(t, O.lateral, 0.6), wob: 2 }, t);
      });
      if (t >= O.passes) stamp(ctx, 'PASSED', 1480, 790, t, O.passes, { size: 120, color: COL.green, rot: -0.14, hole: '#16231f', glow: true });
      ctx.restore();
    }
    // ---- safe & secure
    if (t >= O.safe - 0.2 && t < O.and + 0.2) {
      const a = Math.min(P(t, O.safe - 0.2, 0.2), 1 - P(t, O.and - 0.3, 0.4));
      ctx.save(); ctx.globalAlpha *= a;
      text(ctx, 'SAFE ✓', 1520, 330, { size: 130, fam: 'chalk', color: 'green', scale: pop(t, O.safe, 0.2) });
      if (t >= O.secure - 0.5) {
        const cx = 1520, cy = 640, close = P(t, O.secure - 0.1, 0.25, E.outBack);
        rrect(ctx, cx - 110, cy - 30, 220, 180, 22); ctx.fillStyle = 'rgba(255,210,63,0.25)'; ctx.fill(); ctx.strokeStyle = ink(ctx, 'yellow'); ctx.lineWidth = 8; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy - 30 - 60 * (1 - close), 70, Math.PI, 0); ctx.lineTo(cx + 70, cy - 30 - 60 * (1 - close) + (close < 0.9 ? 10 : 30)); ctx.moveTo(cx - 70, cy - 30 - 60 * (1 - close)); ctx.lineTo(cx - 70, cy - 30 - 60 * (1 - close) + 30); ctx.stroke();
        circle(ctx, cx, cy + 50, 18); ctx.fillStyle = ink(ctx, 'yellow'); ctx.fill();
        if (t >= O.secure) text(ctx, 'SECURE', cx, cy + 210, { size: 70, fam: 'chalk', color: 'yellow', scale: pop(t, O.secure, 0.2) });
      }
      ctx.restore();
    }
    // ---- change of major form
    if (t >= O.and - 0.2 && t < O.cls) {
      const a = Math.min(P(t, O.and - 0.2, 0.3), 1 - P(t, O.cls - 0.25, 0.2));
      const k = P(t, O.and - 0.2, 0.45, E.outBack);
      ctx.save(); ctx.globalAlpha *= a; ctx.translate(W / 2, 470 + (1 - k) * 700); ctx.rotate(0.03);
      rrect(ctx, -520, -330, 1040, 660, 10); ctx.fillStyle = '#fbfaf3'; ctx.fill(); ctx.strokeStyle = '#999'; ctx.lineWidth = 2; ctx.stroke();
      text(ctx, 'APPLICATION FOR CHANGE OF MAJOR', 0, -260, { size: 50, fam: 'type', color: '#1a1a1a' });
      ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-460, -220, 920, 3);
      text(ctx, 'Name: ______________________', -460, -150, { size: 40, fam: 'type', color: '#222', align: 'left' });
      text(ctx, 'Current: B.Tech Civil Engineering', -460, -70, { size: 40, fam: 'type', color: '#222', align: 'left' });
      text(ctx, 'Switch to:', -460, 20, { size: 40, fam: 'type', color: '#222', align: 'left' });
      const opts = [['B.Tech Civil (stay & study)', 0], ['B.B.A. — BUSINESS', 1]];
      opts.forEach(([s, i]) => { const y = 100 + i * 90; ctx.strokeStyle = '#222'; ctx.lineWidth = 3; ctx.strokeRect(-430, y - 24, 48, 48); text(ctx, s, -360, y, { size: 42, fam: 'type', color: '#222', align: 'left' }); });
      if (t >= O.business - 0.1) line(ctx, [[-424, 190], [-400, 214], [-366, 160]], { color: '#d61f1f', lw: 9, prog: P(t, O.business - 0.1, 0.2) });
      if (t >= O.sw) line(ctx, [[-370, 190 + 34], [300, 190 + 30]], { color: '#d61f1f', lw: 5, prog: P(t, O.sw, 0.6) });
      mathText(ctx, 'Reason: did not understand β_{b}', -460, 280, { size: 34, fam: 'type', color: '#666', align: 'left', alpha: P(t, O.this, 0.3) });
      ctx.restore();
      if (t >= O.understand) text(ctx, '???', 1600, 220, { size: 120, fam: 'marker', color: COL.red, rot: 0.1, scale: pop(t, O.understand, 0.2), alpha: a });
      if (t >= O.business) emoji(ctx, '💼', 1600, 760, 160, { scale: pop(t, O.business, 0.2), alpha: a });
      if (t >= O.business + 0.3) emoji(ctx, '📉', 300, 760, 140, { scale: pop(t, O.business + 0.3, 0.2), alpha: a });
    }
    // ---- class dismissed: book slam
    if (t >= O.cls - 0.25) {
      const k = P(t, O.cls - 0.2, O.dismissed - O.cls + 0.2, E.inC);
      const bw = W / 2 + 20;
      ctx.save();
      for (const sgn of [-1, 1]) {
        const x = sgn < 0 ? lerp(-bw, 0, k) : lerp(W, W / 2 - 20, k);
        const g = ctx.createLinearGradient(x, 0, x + bw, 0); g.addColorStop(0, '#5a1d1d'); g.addColorStop(1, '#3a0e0e');
        ctx.fillStyle = g; ctx.fillRect(x, -40, bw, H + 80);
        ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 6; ctx.strokeRect(x + 40, 40, bw - 80, H - 80);
      }
      ctx.restore();
      if (t >= O.dismissed) {
        burst(ctx, W / 2, H / 2, t, O.dismissed, { n: 90, vmin: 300, vmax: 1300, size: 7, life: 1.0, g: 500, seed: 11, color: ['#eef0e6', '#cfcfcf'] });
        text(ctx, 'CLASS', W / 2, 400, { size: 230, fam: 'anton', color: '#ffffff', stroke: '#000', strokeW: 16, scale: pop(t, O.cls, 0.15, 2) });
        text(ctx, 'DISMISSED.', W / 2, 640, { size: 230, fam: 'anton', color: COL.yellow, stroke: '#000', strokeW: 16, scale: pop(t, O.dismissed, 0.15, 2.2), glow: 'rgba(255,210,63,0.7)', glowR: 40 });
        emoji(ctx, '🎤', W / 2 + 560, -100 + Math.min(1, (t - O.dismissed) / 0.35) ** 2 * 900, 140, { rot: (t - O.dismissed) * 6 });
      }
    }
    ctx.restore();
  },
});
shake(O.passes, 22, 0.25); punch(O.passes, 0.06, 0.25); shake(O.secure, 12, 0.2); shake(O.business, 14, 0.2);
shake(O.dismissed, 40, 0.4); punch(O.dismissed, 0.1, 0.3); flash(O.dismissed, 0.5, 0.2);

// ===================================================================== FINALE: recap montage + end card
const beats = BE.beats.filter((b) => b >= 209.6 && b < 228);
const CARDS = [
  ['w_{u} = 40 kN/m', 'FACTORED LOAD', COL.yellow], ['M_{u} = 125 kNm', 'BENDING DEMAND', COL.red], ['V_{u} = 100 kN', 'SHEAR DEMAND', COL.cyan],
  ['b/t_{f} = 5.64', '< 9.4ε  FLANGE PLASTIC', COL.green], ['d/t_{w} = 32.96', '< 84ε  WEB PLASTIC', COL.green], ['β_{b} = 1.0', 'CLASS 1 · PLASTIC', COL.yellow],
  ['V_{d} = 295.3 kN', 'SHEAR CAPACITY', COL.cyan], ['LOW SHEAR', '100 < 177.2 kN', COL.green], ['NO LTB', 'LATERALLY RESTRAINED', COL.pink],
  ['M_{d} = 148.1 kNm', 'BENDING CAPACITY', COL.yellow], ['125 < 148.1', 'DESIGN ADEQUATE ✓', COL.green],
];
const END = 224.08;
S.push({
  a: FIN, b: DUR + 1, draw(ctx, t) {
    const bp = beatPulse(t);
    // spinning beam in the background
    const spin = (t - FIN) * 0.9;
    ctx.save(); ctx.globalAlpha *= t < END ? 0.55 : 0.45;
    beam3D(ctx, { cx: W / 2, cy: 540, sc: t < END ? 0.5 : lerp(0.5, 0.62, P(t, END, 1.5, E.outC)), len: 2600, yaw: spin, pitch: 0.35 + 0.1 * Math.sin(t), dist: 3600, base: [190, 200, 212], edge: 'rgba(255,255,255,0.5)' });
    ctx.restore();
    if (t < END) {
      let ci = -1; for (let i = 0; i < beats.length; i += 2) if (t >= beats[i]) ci = i / 2;
      if (t < beats[0]) {
        text(ctx, 'RECAP', W / 2, 540, { size: 240, fam: 'anton', color: '#ffffff', stroke: '#000', strokeW: 16, scale: pop(t, FIN, 0.2, 2.2) });
        return;
      }
      ci = Math.min(ci, CARDS.length - 1);
      const [big, small, col] = CARDS[ci], t0 = beats[ci * 2], dir = ci % 2 ? 1 : -1;
      const k = P(t, t0, 0.18, E.outC);
      // colour slab behind
      ctx.save(); ctx.translate(W / 2, 540); ctx.rotate(dir * 0.06);
      ctx.globalAlpha *= 0.9; ctx.fillStyle = col; ctx.fillRect(-W, -170 - 20 * bp, W * 2 * k, 340 + 40 * bp); ctx.restore();
      ctx.save(); ctx.translate((1 - k) * dir * -600, 0);
      for (let g = 2; g >= 1; g--) { if (k < 1) mathText(ctx, big, W / 2 + dir * g * 40 * (1 - k), 520, { size: 170, fam: 'anton', color: 'rgba(0,0,0,0.25)', align: 'center' }); }
      mathText(ctx, big, W / 2, 520, { size: 170 * (1 + 0.04 * bp), fam: 'anton', color: '#0b0b0b', align: 'center' });
      text(ctx, small, W / 2, 680, { size: 64, fam: 'anton', color: '#ffffff', stroke: '#000', strokeW: 10, ls: 6 });
      ctx.restore();
      text(ctx, `${ci + 1}/${CARDS.length}`, 140, 120, { size: 44, fam: 'mono', color: 'rgba(255,255,255,0.8)' });
    } else {
      // end card on the last hits: 224.30, 224.77, 226.23
      const h1 = 224.3, h2 = 224.77, h3 = 226.23;
      rays(ctx, W / 2, 540, t, { alpha: 0.1, color: '#ffd23f', n: 24 });
      if (t >= h1) text(ctx, 'LOW SHEAR,', W / 2, 250, { size: 210, fam: 'anton', color: '#ffffff', stroke: '#000', strokeW: 16, scale: pop(t, h1, 0.15, 2.4), ls: 4 });
      if (t >= h2) text(ctx, 'HIGH CAPACITY', W / 2, 470, { size: 210, fam: 'anton', color: COL.yellow, stroke: '#000', strokeW: 16, scale: pop(t, h2, 0.15, 2.4), ls: 4, glow: 'rgba(255,210,63,0.8)', glowR: 50 });
      if (t >= h3) stamp(ctx, 'ISMB 300 · PASSED ✓', W / 2, 760, t, h3, { size: 96, color: COL.green, rot: -0.04, hole: '#060608', bg: 'rgba(0,0,0,0.6)', glow: true });
      if (t >= h3 + 0.8) text(ctx, 'IS 800:2007  ·  Fe 410  ·  L = 5 m  ·  w = 40 kN/m', W / 2, 920, { size: 40, fam: 'mono', color: 'rgba(255,255,255,0.75)', alpha: P(t, h3 + 0.8, 0.5), ls: 2 });
    }
  },
});
flash(FIN + 0.15, 0.7, 0.25); glitch(FIN + 0.1, 0.15, 1);
beats.forEach((b, i) => { if (b < END && i % 2 === 0) { punch(b, 0.07, 0.2); shake(b, 14, 0.18); } });
for (const h of [224.3, 224.77, 226.23]) { flash(h, 0.6, 0.2); shake(h, 30, 0.3); punch(h, 0.1, 0.3); }

module.exports = { S, CAP_SKIP };
