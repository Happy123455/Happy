'use strict';
// Cinematic renderer core for "ડિઝાઇન સેફ છે" (single lacing design music video).
// Every function is a pure function of time so frames render in parallel workers.
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
for (const f of fs.readdirSync(path.join(ROOT, 'fonts'))) GlobalFonts.registerFromPath(path.join(ROOT, 'fonts', f));

const W = 1920, H = 1080, FPS = 60;
const TL = JSON.parse(fs.readFileSync(path.join(ROOT, 'timeline.json')));
const FE = JSON.parse(fs.readFileSync(path.join(ROOT, 'features.json')));
const DUR = TL.dur;
const PER = TL.per; // beat period (0.4 s)

// ------------------------------------------------------------------ math
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const E = {
  lin: (t) => t, inQ: (t) => t * t, outQ: (t) => 1 - (1 - t) * (1 - t), ioQ: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inC: (t) => t * t * t, outC: (t) => 1 - Math.pow(1 - t, 3), ioC: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuint: (t) => 1 - Math.pow(1 - t, 5), ioQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
  ioS: (t) => 0.5 - 0.5 * Math.cos(Math.PI * t), outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)), inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outBack: (t) => { const s = 1.70158, c3 = s + 1; return 1 + c3 * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); },
  outElastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 8 - 0.75) * (TAU / 3)) + 1),
};
function rnd(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return x - Math.floor(x); }
const srnd = (n) => rnd(n) * 2 - 1;
function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(rnd(i), rnd(i + 1), u) * 2 - 1; }
const P = (t, a, d, e = E.outC) => e(inv(a, a + d, t));
function env(t, a, b, fi = 0.3, fo = 0.3) { return Math.min(fi > 0 ? inv(a, a + fi, t) : (t >= a ? 1 : 0), fo > 0 ? 1 - inv(b - fo, b, t) : (t < b ? 1 : 0)); }
const v3 = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]), norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }, lerp: (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)] };

// ------------------------------------------------------------------ timeline helpers
const LINES = TL.lines;
const LT = (i) => LINES[i].t;
const LEND = (i) => LINES[i].end;
const SEC = Object.fromEntries(TL.sections.map((s) => [s.name, s]));
const slotT = (k) => TL.phase + PER * (1 + 8 * k);
const beatT = (k) => TL.phase + PER * k;
function beatPhase(t) { const k = Math.floor((t - TL.phase) / PER); return { k, f: (t - TL.phase) / PER - k }; }
function beatPulse(t, dec = 0.11) { const { k, f } = beatPhase(t); return k < 0 ? 0 : Math.exp(-(f * PER) / dec); }
function barPulse(t, dec = 0.25) { const b = (t - TL.phase - PER) / (PER * 4); const f = b - Math.floor(b); return b < 0 ? 0 : Math.exp(-(f * PER * 4) / dec); }

// ------------------------------------------------------------------ audio
function fe(name, t) { const a = FE[name]; return a[clamp(Math.floor(t * FPS), 0, a.length - 1)] || 0; }
function feS(name, t, n = 6) { let s = 0; for (let k = 0; k < n; k++) s += fe(name, t - k / FPS); return s / n; }
function bars(t) { const i = clamp(Math.floor(t * FPS), 0, FE.n - 1); return FE.bars.map((b) => b[i] || 0); }

// ------------------------------------------------------------------ global events
const EV = { flash: [], shake: [], punch: [], chroma: [] };
const flash = (t0, a = 0.8, dec = 0.25, color = '#ffffff') => EV.flash.push([t0, a, dec, color]);
const shake = (t0, amp = 10, dec = 0.3) => EV.shake.push([t0, amp, dec]);
const punch = (t0, amp = 0.04, dec = 0.35) => EV.punch.push([t0, amp, dec]);
const chroma = (t0, amp = 1, dec = 0.25) => EV.chroma.push([t0, amp, dec]);

// ------------------------------------------------------------------ colours & fonts
const COL = {
  bg: '#05070a', steel: [150, 160, 172], amber: '#ffb347', orange: '#ff7a1a', hot: '#ff4d1a', cyan: '#4fd1ff', ice: '#bfe9ff', white: '#ffffff',
  green: '#3dffa2', red: '#ff3b47', gold: '#ffd36b', dim: 'rgba(255,255,255,0.45)', ink: '#0b0f14',
};
const FAM = {
  gu: '"Hind Vadodara", "Mukta Vaani", "DejaVu Sans"', gu2: '"Mukta Vaani", "Hind Vadodara", "DejaVu Sans"', guDisp: '"Kumar One", "Hind Vadodara", "DejaVu Sans"',
  cond: '"Barlow Condensed", "DejaVu Sans"', bebas: '"Bebas Neue", "Barlow Condensed", "DejaVu Sans"', hud: '"Chakra Petch", "DejaVu Sans"',
  mono: '"Space Mono", "DejaVu Sans Mono"', barlow: 'Barlow, "DejaVu Sans"', anton: 'Anton, "DejaVu Sans"', sym: '"DejaVu Sans"',
};
const font = (ctx, size, fam = 'cond', weight = '') => { ctx.font = `${weight} ${size}px ${FAM[fam] || fam}`.trim(); };

function text(ctx, s, x, y, o = {}) {
  const size = o.size || 48;
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  const sc = o.scale ?? 1; if (sc !== 1 || o.sx) ctx.scale(o.sx ?? sc, o.sy ?? sc);
  ctx.globalAlpha *= o.alpha ?? 1;
  font(ctx, size, o.fam || 'cond', o.weight || '');
  ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
  ctx.letterSpacing = (o.ls || 0) + 'px';
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowR ?? 24; }
  if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.shadowR ?? 20; ctx.shadowOffsetY = o.shadowY ?? 6; }
  if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = o.strokeW || 4; ctx.strokeStyle = o.stroke; ctx.strokeText(s, 0, 0); }
  if (o.grad) { const w = ctx.measureText(s).width; const g = ctx.createLinearGradient(0, -size * 0.6, 0, size * 0.5); o.grad.forEach((c, i) => g.addColorStop(i / (o.grad.length - 1), c)); ctx.fillStyle = g; void w; }
  else ctx.fillStyle = o.color || COL.white;
  if (o.color !== null) ctx.fillText(s, 0, 0);
  ctx.restore();
}
function tw(ctx, s, size, fam = 'cond', weight = '', ls = 0) { ctx.save(); font(ctx, size, fam, weight); ctx.letterSpacing = ls + 'px'; const w = ctx.measureText(s).width; ctx.restore(); return w; }
// text revealed by a soft mask sweeping left->right (with blur-in feel)
function sweepText(ctx, s, x, y, prog, o = {}) {
  if (prog <= 0) return;
  const size = o.size || 48, w = tw(ctx, s, size, o.fam || 'cond', o.weight || '', o.ls || 0);
  const al = o.align || 'center', left = al === 'left' ? x : al === 'center' ? x - w / 2 : x - w;
  ctx.save();
  const edge = left + (w + 120) * clamp(prog) - 60;
  const g = ctx.createLinearGradient(edge - 60, 0, edge + 60, 0); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  // draw text into offscreen-free path: clip rect + fade tail via globalAlpha ramp approximation
  ctx.beginPath(); ctx.rect(left - 20, y - size * 1.4, edge - left + 80, size * 2.8); ctx.clip();
  text(ctx, s, x, y, Object.assign({}, o, { align: al }));
  ctx.restore();
}
// simple subscript markup: A_{v}, x^{2}
function parseMath(s) {
  const runs = []; let cur = '', i = 0;
  while (i < s.length) { const ch = s[i]; if ((ch === '_' || ch === '^') && s[i + 1] === '{') { if (cur) { runs.push({ t: cur, m: 'n' }); cur = ''; } const j = s.indexOf('}', i); runs.push({ t: s.slice(i + 2, j), m: ch === '_' ? 'b' : 'p' }); i = j + 1; } else { cur += ch; i++; } }
  if (cur) runs.push({ t: cur, m: 'n' }); return runs;
}
function mathW(ctx, s, size, fam = 'cond', weight = '') { let w = 0; for (const r of parseMath(s)) w += tw(ctx, r.t, r.m === 'n' ? size : size * 0.62, fam, weight) + (r.m === 'n' ? 0 : 1); return w; }
function mathText(ctx, s, x, y, o = {}) {
  const size = o.size || 48, fam = o.fam || 'cond', weight = o.weight || '', al = o.align || 'left';
  const w = mathW(ctx, s, size, fam, weight); let cx = al === 'left' ? x : al === 'center' ? x - w / 2 : x - w;
  for (const r of parseMath(s)) {
    const sz = r.m === 'n' ? size : size * 0.62, dy = r.m === 'b' ? size * 0.26 : r.m === 'p' ? -size * 0.34 : 0;
    text(ctx, r.t, cx, y + dy, Object.assign({}, o, { size: sz, fam, weight, align: 'left' }));
    cx += tw(ctx, r.t, sz, fam, weight) + (r.m === 'n' ? 0 : 1);
  }
  return w;
}
// glyph-by-glyph "decode" reveal for numbers: random digits settle into the value
function decodeNum(s, prog, seed = 1) {
  if (prog >= 1) return s;
  let out = ''; for (let i = 0; i < s.length; i++) { const ch = s[i]; const settle = i / s.length * 0.7 + 0.3; out += (prog >= settle || !/[0-9]/.test(ch)) ? ch : String(Math.floor(rnd(seed + i * 7 + Math.floor(prog * 40)) * 10)); }
  return out;
}

// ------------------------------------------------------------------ 2D helpers
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
function polyLen(p) { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }
function polyPath(ctx, p, prog = 1) {
  const L = polyLen(p) * clamp(prog); let acc = 0; ctx.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < p.length; i++) { const sl = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); if (acc + sl >= L) { const f = sl > 0 ? (L - acc) / sl : 0; ctx.lineTo(lerp(p[i - 1][0], p[i][0], f), lerp(p[i - 1][1], p[i][1], f)); return; } ctx.lineTo(p[i][0], p[i][1]); acc += sl; }
}
function line(ctx, p, o = {}) {
  if ((o.prog ?? 1) <= 0) return;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.strokeStyle = o.color || COL.white; ctx.lineWidth = o.lw || 2; ctx.lineCap = o.cap || 'round'; ctx.lineJoin = 'round';
  if (o.dash) { ctx.setLineDash(o.dash); ctx.lineDashOffset = o.dashOff || 0; }
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowR || 16; }
  ctx.beginPath(); polyPath(ctx, p, o.prog ?? 1); ctx.stroke(); ctx.restore();
}
function arrowHead(ctx, x, y, ang, s, color) { ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-s, -s * 0.5); ctx.lineTo(-s * 0.75, 0); ctx.lineTo(-s, s * 0.5); ctx.closePath(); ctx.fill(); ctx.restore(); }
function arrow(ctx, x0, y0, x1, y1, o = {}) {
  const pr = o.prog ?? 1; if (pr <= 0) return; const ex = lerp(x0, x1, pr), ey = lerp(y0, y1, pr), ang = Math.atan2(y1 - y0, x1 - x0), hs = o.head || 14;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.strokeStyle = o.color || COL.white; ctx.lineWidth = o.lw || 2; ctx.lineCap = 'round';
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowR || 14; }
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(ex - Math.cos(ang) * hs * 0.6, ey - Math.sin(ang) * hs * 0.6); ctx.stroke();
  arrowHead(ctx, ex, ey, ang, hs, o.color || COL.white); if (o.both) arrowHead(ctx, x0, y0, ang + Math.PI, hs, o.color || COL.white);
  ctx.restore();
}
// dimension line between two screen points with label (grows from centre)
function dim2(ctx, a, b, label, prog, o = {}) {
  if (prog <= 0) return;
  const c = o.color || COL.ice, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, k = E.outC(clamp(prog));
  const p0 = [lerp(mx, a[0], k), lerp(my, a[1], k)], p1 = [lerp(mx, b[0], k), lerp(my, b[1], k)];
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), nx = -Math.sin(ang), ny = Math.cos(ang), ext = o.ext ?? 14;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  line(ctx, [[a[0] - nx * ext, a[1] - ny * ext], [a[0] + nx * ext, a[1] + ny * ext]], { color: c, lw: 1.5, alpha: clamp(prog * 3) });
  line(ctx, [[b[0] - nx * ext, b[1] - ny * ext], [b[0] + nx * ext, b[1] + ny * ext]], { color: c, lw: 1.5, alpha: clamp(prog * 3) });
  arrow(ctx, mx, my, p0[0], p0[1], { color: c, lw: 1.6, head: 11, glow: o.glow }); arrow(ctx, mx, my, p1[0], p1[1], { color: c, lw: 1.6, head: 11, glow: o.glow });
  if (label) { const off = o.off ?? -24; let la = ang; if (la > Math.PI / 2) la -= Math.PI; if (la < -Math.PI / 2) la += Math.PI;
    text(ctx, label, mx + nx * off, my + ny * off, { size: o.size || 30, fam: o.fam || 'hud', weight: '600', color: o.lc || c, rot: o.flat ? 0 : la, alpha: clamp(prog * 2 - 0.4), glow: o.glow ? 'rgba(79,209,255,0.7)' : null }); }
  ctx.restore();
}
function glassPanel(ctx, x, y, w, h, o = {}) {
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  rrect(ctx, x, y, w, h, o.r ?? 14);
  const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, o.top || 'rgba(30,40,52,0.62)'); g.addColorStop(1, o.bot || 'rgba(10,14,20,0.72)'); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = o.edge || 'rgba(190,225,255,0.28)'; ctx.stroke();
  if (o.accent) { ctx.fillStyle = o.accent; ctx.fillRect(x, y + 10, 3, h - 20); }
  ctx.restore();
}
// HUD corner brackets
function brackets(ctx, x, y, w, h, s = 22, o = {}) {
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.strokeStyle = o.color || COL.ice; ctx.lineWidth = o.lw || 2; if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = 12; }
  ctx.beginPath();
  ctx.moveTo(x, y + s); ctx.lineTo(x, y); ctx.lineTo(x + s, y); ctx.moveTo(x + w - s, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + s);
  ctx.moveTo(x + w, y + h - s); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - s, y + h); ctx.moveTo(x + s, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - s);
  ctx.stroke(); ctx.restore();
}

// ------------------------------------------------------------------ particles (stateless)
// sparks: emitted at t0 from (x,y), with gravity, drawn as streaks
function sparks(ctx, x, y, t, t0, o = {}) {
  const k = t - t0, life = o.life || 1.1; if (k < 0 || k > life * 1.6) return;
  const n = o.n || 60, seed = o.seed || 3, g = o.g ?? 1400;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const li = life * lerp(0.4, 1.6, rnd(seed + i * 3.3)); if (k > li) continue;
    const ang = (o.ang ?? -Math.PI / 2) + (o.spread ?? Math.PI * 1.2) * (rnd(seed + i * 1.7) - 0.5), sp = lerp(o.vmin || 300, o.vmax || 1400, rnd(seed + i * 2.9));
    const vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp, px = x + vx * k, py = y + vy * k + 0.5 * g * k * k;
    const dvx = vx, dvy = vy + g * k, trail = 0.018 + 0.02 * rnd(i);
    const a = (1 - k / li); ctx.globalAlpha = a * (o.alpha ?? 1);
    ctx.strokeStyle = o.color || (a > 0.6 ? '#fff3c4' : a > 0.3 ? '#ffb347' : '#ff6a1a'); ctx.lineWidth = (o.w || 2.4) * (0.5 + a);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - dvx * trail, py - dvy * trail); ctx.stroke();
  }
  ctx.restore();
}
// floating embers / dust (continuous field)
function embers(ctx, t, o = {}) {
  const n = o.n || 80, seed = o.seed || 11;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const sp = lerp(20, 90, rnd(seed + i)) * (o.speed ?? 1), z = rnd(seed + i * 5.1);
    const x = (rnd(seed + i * 2.3) * (W + 200) + Math.sin(t * 0.3 + i) * 40 + t * sp * 0.3 * (o.wind ?? 1)) % (W + 200) - 100;
    const y = ((rnd(seed + i * 3.7) * (H + 200) - t * sp) % (H + 200) + H + 200) % (H + 200) - 100;
    const r = lerp(0.8, 3.2, z) * (o.size ?? 1), a = (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.3))) * lerp(0.25, 1, z) * (o.alpha ?? 1);
    ctx.globalAlpha = a; ctx.fillStyle = o.color || (i % 3 ? '#ff9a3c' : '#ffd08a');
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
// light shaft (volumetric beam)
function lightShaft(ctx, x, y, ang, len, w0, w1, color, alpha) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y); ctx.rotate(ang);
  const g = ctx.createLinearGradient(0, 0, len, 0); g.addColorStop(0, color.replace('A', String(alpha))); g.addColorStop(1, color.replace('A', '0'));
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -w0 / 2); ctx.lineTo(len, -w1 / 2); ctx.lineTo(len, w1 / 2); ctx.lineTo(0, w0 / 2); ctx.closePath(); ctx.fill(); ctx.restore();
}
// anamorphic lens flare (horizontal streak + glow)
function flare(ctx, x, y, s, alpha = 1, color = '120,200,255') {
  if (alpha <= 0.01) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, 90 * s); g.addColorStop(0, `rgba(255,255,255,${0.9 * alpha})`); g.addColorStop(0.2, `rgba(${color},${0.45 * alpha})`); g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - 90 * s, y - 90 * s, 180 * s, 180 * s);
  const g2 = ctx.createLinearGradient(x - 900 * s, 0, x + 900 * s, 0); g2.addColorStop(0, `rgba(${color},0)`); g2.addColorStop(0.5, `rgba(${color},${0.55 * alpha})`); g2.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g2; ctx.fillRect(x - 900 * s, y - 2.5 * s, 1800 * s, 5 * s);
  ctx.fillStyle = `rgba(255,255,255,${0.6 * alpha})`; ctx.fillRect(x - 300 * s, y - 0.8 * s, 600 * s, 1.6 * s);
  ctx.restore();
}

module.exports = {
  createCanvas, W, H, FPS, DUR, PER, TL, FE, LINES, LT, LEND, SEC, slotT, beatT, beatPhase, beatPulse, barPulse,
  clamp, lerp, inv, TAU, DEG, E, rnd, srnd, noise1, P, env, v3, fe, feS, bars, EV, flash, shake, punch, chroma,
  COL, FAM, font, text, tw, sweepText, parseMath, mathW, mathText, decodeNum, rrect, circle, polyLen, polyPath, line, arrow, arrowHead, dim2,
  glassPanel, brackets, sparks, embers, lightShaft, flare,
};
