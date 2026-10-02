'use strict';
// Core helpers for the "Low Shear, High Capacity" music video renderer.
// Every drawing function is a pure function of time so frames can render in parallel.
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
for (const f of fs.readdirSync(path.join(ROOT, 'fonts'))) GlobalFonts.registerFromPath(path.join(ROOT, 'fonts', f));

const W = 1920, H = 1080, FPS = 30;
const LY = JSON.parse(fs.readFileSync(path.join(ROOT, 'lyrics.json')));
const FE = JSON.parse(fs.readFileSync(path.join(ROOT, 'features.json')));
const BE = JSON.parse(fs.readFileSync(path.join(ROOT, 'beats.json')));
const DUR = FE.dur;

// ---------------------------------------------------------------- math
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const TAU = Math.PI * 2;
const E = {
  lin: (t) => t,
  inQ: (t) => t * t,
  outQ: (t) => 1 - (1 - t) * (1 - t),
  inC: (t) => t * t * t,
  outC: (t) => 1 - Math.pow(1 - t, 3),
  ioC: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  ioS: (t) => 0.5 - 0.5 * Math.cos(Math.PI * t),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outBack: (t) => { const s = 1.70158, c3 = s + 1; return 1 + c3 * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); },
  outBack2: (t) => { const s = 3.2, c3 = s + 1; return 1 + c3 * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); },
  outElastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
};
function rnd(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return x - Math.floor(x); }
function srnd(n) { return rnd(n) * 2 - 1; }
function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(rnd(i), rnd(i + 1), u) * 2 - 1; }
// progress of t within [a, a+d], eased
const P = (t, a, d, e = E.outC) => e(inv(a, a + d, t));
// envelope: fade in over fi from a, fade out over fo ending at b
function env(t, a, b, fi = 0.2, fo = 0.2) { return Math.min(fi > 0 ? inv(a, a + fi, t) : t >= a ? 1 : 0, fo > 0 ? 1 - inv(b - fo, b, t) : t < b ? 1 : 0); }
// pop: scale curve for an element appearing at t0
function pop(t, t0, d = 0.18, from = 0.4) { return lerp(from, 1, E.outBack2(inv(t0, t0 + d, t))); }

// ---------------------------------------------------------------- lyrics
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
function WT(li, word, occ = 0) {
  let c = 0;
  for (const w of LY[li].words) if (norm(w.w).startsWith(norm(word))) { if (c++ === occ) return w.s; }
  throw new Error(`word not found: line ${li} "${word}"`);
}
const LS = (li) => LY[li].words[0].s;
const LE = (li) => LY[li].words[LY[li].words.length - 1].e;

// ---------------------------------------------------------------- audio
function fe(name, t) { const a = FE[name]; return a[clamp(Math.floor(t * FPS), 0, a.length - 1)] || 0; }
function feS(name, t, n = 4) { let s = 0; for (let k = 0; k < n; k++) s += fe(name, t - k / FPS); return s / n; }
function bars(t) { return FE.bars[clamp(Math.floor(t * FPS), 0, FE.bars.length - 1)]; }
function lastIdx(arr, t, key = (x) => x) { let lo = 0, hi = arr.length - 1, idx = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (key(arr[m]) <= t) { idx = m; lo = m + 1; } else hi = m - 1; } return idx; }
function beatPulse(t, dec = 0.13) { const i = lastIdx(BE.beats, t); return i < 0 ? 0 : Math.exp(-(t - BE.beats[i]) / dec); }
function beatIndex(t) { return lastIdx(BE.beats, t); }
function impactPulse(t, dec = 0.2) {
  let v = 0; const i = lastIdx(BE.impacts, t, (x) => x[0]);
  for (let k = i; k >= 0 && t - BE.impacts[k][0] < 1.2; k--) v = Math.max(v, BE.impacts[k][1] * Math.exp(-(t - BE.impacts[k][0]) / dec));
  return v;
}

// ---------------------------------------------------------------- global events (registered at load time)
const EV = { shakes: [], flashes: [], punches: [], glitches: [] };
const shake = (t0, amp = 18, dec = 0.3) => EV.shakes.push([t0, amp, dec]);
const flash = (t0, a = 0.7, dec = 0.22, color = '#ffffff') => EV.flashes.push([t0, a, dec, color]);
const punch = (t0, amp = 0.05, dec = 0.25) => EV.punches.push([t0, amp, dec]);
const glitch = (t0, d = 0.2, amp = 1) => EV.glitches.push([t0, d, amp]);

// ---------------------------------------------------------------- colours, fonts
const COL = {
  chalk: '#eef0e6', dim: 'rgba(238,240,230,0.35)', yellow: '#ffd23f', red: '#ff4d4d', cyan: '#3fe0ff',
  green: '#45f59a', pink: '#ff5fd2', orange: '#ff9f1c', board: '#13201c', ink: '#070b0a', steel: '#a9b8c6',
  blue: '#0d3b66', navy: '#05070d', white: '#ffffff',
};
const FAM = {
  anton: 'Anton, "DejaVu Sans"', bebas: '"Bebas Neue", "DejaVu Sans"', chalk: '"Cabin Sketch", "DejaVu Sans"',
  hand: '"Architects Daughter", "DejaVu Sans"', marker: '"Permanent Marker", "DejaVu Sans"', mono: '"Space Mono", "DejaVu Sans Mono"',
  stamp: '"Black Ops One", "DejaVu Sans"', bungee: 'Bungee, "DejaVu Sans"', emoji: '"Noto Color Emoji"', archivo: '"Archivo Black", "DejaVu Sans"',
  gochi: '"Gochi Hand", "DejaVu Sans"', type: '"Special Elite", "DejaVu Sans Mono"', dejavu: '"DejaVu Sans"', serif: '"DejaVu Serif"',
};
const setFont = (ctx, size, fam = 'anton') => { ctx.font = `${size}px ${FAM[fam] || fam}`; };

// chalk textures -> patterns (created once per context)
function makeTex(rgb, seed, strength = 1) {
  const s = 256, c = createCanvas(s, s), x = c.getContext('2d'), id = x.createImageData(s, s);
  for (let i = 0; i < s * s; i++) {
    const py = (i / s) | 0;
    let a = 0.8 + 0.2 * rnd(i * 1.37 + seed);
    if (rnd(i * 7.77 + seed * 3.1) < 0.16 * strength) a *= 0.2;
    a *= 0.86 + 0.14 * Math.sin(py * 0.7 + noise1(py * 0.05 + seed) * 6);
    id.data[i * 4] = rgb[0]; id.data[i * 4 + 1] = rgb[1]; id.data[i * 4 + 2] = rgb[2]; id.data[i * 4 + 3] = clamp(a) * 255;
  }
  x.putImageData(id, 0, 0);
  return c;
}
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const TEX = {};
for (const k of ['chalk', 'yellow', 'red', 'cyan', 'green', 'pink', 'orange']) TEX[k] = makeTex(hexRgb(COL[k]), k.length * 13.7);
const PATS = new WeakMap();
function pat(ctx, k) {
  let m = PATS.get(ctx); if (!m) { m = {}; PATS.set(ctx, m); }
  if (!m[k]) m[k] = ctx.createPattern(TEX[k], 'repeat');
  return m[k];
}
// chalk colour by name -> pattern, any other css colour -> itself
const ink = (ctx, c) => (TEX[c] ? pat(ctx, c) : c);

// ---------------------------------------------------------------- text
function text(ctx, s, x, y, o = {}) {
  const size = o.size || 48;
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  if (o.sx != null || o.scale != null) ctx.scale(o.sx ?? o.scale ?? 1, o.sy ?? o.scale ?? 1);
  ctx.globalAlpha *= o.alpha ?? 1;
  setFont(ctx, size, o.fam || 'anton');
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = o.base || 'middle';
  ctx.letterSpacing = (o.ls || 0) + 'px';
  if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.shadowR ?? 0; ctx.shadowOffsetX = o.shadowX ?? 6; ctx.shadowOffsetY = o.shadowY ?? 6; }
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowR || 24; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }
  if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = o.strokeW || 8; ctx.strokeStyle = ink(ctx, o.stroke); ctx.strokeText(s, 0, 0); if (!o.glow && !o.shadow) {} }
  if (o.color !== null) { ctx.fillStyle = ink(ctx, o.color || 'chalk'); ctx.fillText(s, 0, 0); }
  ctx.restore();
}
function tw(ctx, s, size, fam = 'anton', ls = 0) { ctx.save(); setFont(ctx, size, fam); ctx.letterSpacing = ls + 'px'; const w = ctx.measureText(s).width; ctx.restore(); return w; }
// handwritten reveal: clip sweeps left->right
function writeOn(ctx, s, x, y, prog, o = {}) {
  if (prog <= 0) return;
  const size = o.size || 48, w = tw(ctx, s, size, o.fam || 'hand', o.ls || 0);
  const al = o.align || 'left';
  const left = al === 'left' ? x : al === 'center' ? x - w / 2 : x - w;
  ctx.save();
  ctx.beginPath(); ctx.rect(left - 20, y - size * 1.5, (w + 40) * clamp(prog), size * 3); ctx.clip();
  text(ctx, s, x, y, Object.assign({ fam: 'hand' }, o, { align: al }));
  ctx.restore();
  if (prog < 1 && o.nib !== false) { // chalk nib glow
    const nx = left - 20 + (w + 40) * prog;
    ctx.save(); ctx.globalAlpha *= 0.55; ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(nx, y + noise1(prog * 20) * size * 0.25, 4, 0, TAU); ctx.fill(); ctx.restore();
  }
}

// simple math markup: x_{sub}, x^{sup}
function parseMath(s) {
  const runs = []; let cur = '', i = 0;
  while (i < s.length) {
    const ch = s[i];
    if ((ch === '_' || ch === '^') && s[i + 1] === '{') {
      if (cur) { runs.push({ t: cur, m: 'n' }); cur = ''; }
      const j = s.indexOf('}', i); runs.push({ t: s.slice(i + 2, j), m: ch === '_' ? 'b' : 'p' }); i = j + 1;
    } else { cur += ch; i++; }
  }
  if (cur) runs.push({ t: cur, m: 'n' });
  return runs;
}
function mathW(ctx, s, size, fam = 'hand') {
  let w = 0; for (const r of parseMath(s)) w += tw(ctx, r.t, r.m === 'n' ? size : size * 0.6, fam) + (r.m === 'n' ? 0 : 2); return w;
}
function mathText(ctx, s, x, y, o = {}) {
  const size = o.size || 48, fam = o.fam || 'hand', al = o.align || 'left';
  const w = mathW(ctx, s, size, fam);
  let cx = al === 'left' ? x : al === 'center' ? x - w / 2 : x - w;
  for (const r of parseMath(s)) {
    const sz = r.m === 'n' ? size : size * 0.6, dy = r.m === 'b' ? size * 0.28 : r.m === 'p' ? -size * 0.36 : 0;
    text(ctx, r.t, cx + (r.m === 'n' ? 0 : 1), y + dy, Object.assign({}, o, { size: sz, fam, align: 'left' }));
    cx += tw(ctx, r.t, sz, fam) + (r.m === 'n' ? 0 : 2);
  }
  return w;
}
// equation built from timed segments: [{s, t, c}] -> laid out once, each segment pops in at its time
function eqn(ctx, segs, x, y, t, o = {}) {
  const size = o.size || 56, fam = o.fam || 'hand', gap = o.gap ?? size * 0.22;
  const ws = segs.map((sg) => mathW(ctx, sg.s, sg.size || size, sg.fam || fam));
  const total = ws.reduce((a, b) => a + b, 0) + gap * (segs.length - 1);
  let cx = o.align === 'left' ? x : x - total / 2;
  const out = [];
  segs.forEach((sg, i) => {
    const t0 = sg.t ?? -1e9;
    if (t >= t0 - 0.02) {
      const k = pop(t, t0, 0.2, 0.3), a = clamp((t - t0 + 0.02) / 0.08);
      ctx.save(); ctx.globalAlpha *= a;
      const mx = cx + ws[i] / 2;
      ctx.translate(mx, y); ctx.scale(k, k); ctx.translate(-mx, -y);
      mathText(ctx, sg.s, cx, y, Object.assign({}, o, { size: sg.size || size, fam: sg.fam || fam, color: sg.c || o.color || 'chalk', align: 'left', glow: sg.glow }));
      ctx.restore();
    }
    out.push([cx, ws[i]]);
    cx += ws[i] + gap;
  });
  return out; // positions for underlines etc.
}

// ---------------------------------------------------------------- lines & shapes
function polyLen(p) { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }
function polyPath(ctx, p, prog = 1) {
  const L = polyLen(p) * clamp(prog); let acc = 0;
  ctx.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < p.length; i++) {
    const sl = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    if (acc + sl >= L) { const f = sl > 0 ? (L - acc) / sl : 0; ctx.lineTo(lerp(p[i - 1][0], p[i][0], f), lerp(p[i - 1][1], p[i][1], f)); return; }
    ctx.lineTo(p[i][0], p[i][1]); acc += sl;
  }
}
function subdiv(p, step = 28) {
  const out = [p[0]];
  for (let i = 1; i < p.length; i++) {
    const n = Math.max(1, Math.ceil(Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]) / step));
    for (let k = 1; k <= n; k++) out.push([lerp(p[i - 1][0], p[i][0], k / n), lerp(p[i - 1][1], p[i][1], k / n)]);
  }
  return out;
}
// hand-drawn wobble that "boils" at 8 fps
function wob(p, seed, amp, t) {
  const k = Math.floor(t * 8);
  return p.map((q, i) => [q[0] + amp * noise1(seed + i * 0.37 + k * 3.1), q[1] + amp * noise1(seed * 1.7 + i * 0.41 + k * 2.3 + 50)]);
}
function line(ctx, p, o = {}, t = 0) {
  if ((o.prog ?? 1) <= 0) return;
  let pts = o.wob ? wob(subdiv(p, o.step || 28), o.seed || 1, o.wob, t) : p;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.strokeStyle = ink(ctx, o.color || 'chalk'); ctx.lineWidth = o.lw || 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (o.dash) ctx.setLineDash(o.dash);
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowR || 18; }
  ctx.beginPath(); polyPath(ctx, pts, o.prog ?? 1); ctx.stroke();
  ctx.restore();
}
function arrowHead(ctx, x, y, ang, s, color) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-s, -s * 0.55); ctx.lineTo(-s * 0.78, 0); ctx.lineTo(-s, s * 0.55); ctx.closePath(); ctx.fill(); ctx.restore();
}
function arrow(ctx, x0, y0, x1, y1, o = {}) {
  const pr = o.prog ?? 1; if (pr <= 0) return;
  const ex = lerp(x0, x1, pr), ey = lerp(y0, y1, pr);
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  const c = ink(ctx, o.color || 'chalk');
  ctx.strokeStyle = c; ctx.lineWidth = o.lw || 4; ctx.lineCap = 'round';
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowR || 14; }
  const ang = Math.atan2(y1 - y0, x1 - x0), hs = o.head || 16;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(ex - Math.cos(ang) * hs * 0.6, ey - Math.sin(ang) * hs * 0.6); ctx.stroke();
  arrowHead(ctx, ex, ey, ang, hs, c);
  if (o.both) arrowHead(ctx, x0, y0, ang + Math.PI, hs, c);
  ctx.restore();
}
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }

// dimension line with label (grows from centre)
function dimLine(ctx, x0, x1, y, label, prog, o = {}) {
  if (prog <= 0) return;
  const c = o.color || 'chalk', cx = (x0 + x1) / 2, hw = (x1 - x0) / 2 * E.outC(prog);
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  line(ctx, [[x0, y - 18], [x0, y + 18]], { color: c, lw: 3, prog: clamp(prog * 3) });
  line(ctx, [[x1, y - 18], [x1, y + 18]], { color: c, lw: 3, prog: clamp(prog * 3) });
  arrow(ctx, cx, y, cx - hw, y, { color: c, lw: 3, head: 14 });
  arrow(ctx, cx, y, cx + hw, y, { color: c, lw: 3, head: 14 });
  if (label) text(ctx, label, cx, y + (o.labelDy ?? -30), { size: o.size || 40, fam: o.fam || 'hand', color: o.lc || c, alpha: clamp(prog * 2 - 0.5), scale: pop(prog, 0.3, 0.4) });
  ctx.restore();
}

// ---------------------------------------------------------------- structural primitives
// pin support: apex at (x,y)
function pinSupport(ctx, x, y, s = 46, o = {}) {
  const pr = o.prog ?? 1; if (pr <= 0) return;
  const c = o.color || 'chalk';
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  line(ctx, [[x, y], [x - s * 0.6, y + s], [x + s * 0.6, y + s], [x, y]], { color: c, lw: o.lw || 4, prog: pr });
  if (pr > 0.6) {
    const a = inv(0.6, 1, pr);
    line(ctx, [[x - s, y + s], [x + s, y + s]], { color: c, lw: o.lw || 4, prog: a });
    for (let i = 0; i < 6; i++) { const hx = x - s + 6 + i * (2 * s - 12) / 5; line(ctx, [[hx, y + s + 2], [hx - 14, y + s + 18]], { color: c, lw: 2.5, prog: a, alpha: 0.8 }); }
  }
  ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fillStyle = ink(ctx, c); ctx.fill();
  ctx.restore();
}
function rollerSupport(ctx, x, y, s = 46, o = {}) {
  const pr = o.prog ?? 1; if (pr <= 0) return;
  const c = o.color || 'chalk', h = s * 0.72;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  line(ctx, [[x, y], [x - s * 0.6, y + h], [x + s * 0.6, y + h], [x, y]], { color: c, lw: o.lw || 4, prog: pr });
  if (pr > 0.5) {
    const a = inv(0.5, 1, pr), r = s * 0.13, rot = o.roll || 0;
    for (const dx of [-s * 0.32, s * 0.32]) {
      ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = ink(ctx, c); ctx.lineWidth = 3; circle(ctx, x + dx, y + h + r + 2, r); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + dx, y + h + r + 2); ctx.lineTo(x + dx + Math.cos(rot) * r, y + h + r + 2 + Math.sin(rot) * r); ctx.stroke(); ctx.restore();
    }
    const gy = y + h + 2 * r + 4;
    line(ctx, [[x - s, gy], [x + s, gy]], { color: c, lw: o.lw || 4, prog: a });
    for (let i = 0; i < 6; i++) { const hx = x - s + 6 + i * (2 * s - 12) / 5; line(ctx, [[hx, gy + 2], [hx - 14, gy + 18]], { color: c, lw: 2.5, prog: a, alpha: 0.8 }); }
  }
  ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fillStyle = ink(ctx, c); ctx.fill();
  ctx.restore();
}
// normalised UDL deflection shape, peak 1 at midspan
const sag = (xi) => (16 / 5) * (xi - 2 * xi * xi * xi + xi * xi * xi * xi);
// beam elevation (I-beam seen from the side)
function beamElev(ctx, x0, x1, y, d, o = {}) {
  const pr = o.prog ?? 1; if (pr <= 0) return;
  const defl = o.defl || 0, n = 40, xe = lerp(x0, x1, pr);
  const yy = (x) => y + defl * sag(inv(x0, x1, x)) + (o.hinge ? o.hinge * (1 - Math.abs(2 * inv(x0, x1, x) - 1)) : 0);
  const top = [], bot = [];
  for (let i = 0; i <= n; i++) { const x = lerp(x0, xe, i / n); top.push([x, yy(x) - d / 2]); bot.push([x, yy(x) + d / 2]); }
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  if (o.fill) {
    ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]); for (const p of top) ctx.lineTo(p[0], p[1]); for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]); ctx.closePath();
    if (o.fill === 'steel') { const g = ctx.createLinearGradient(0, y - d / 2, 0, y + d / 2); g.addColorStop(0, '#d9e2ea'); g.addColorStop(0.18, '#8c9aa8'); g.addColorStop(0.5, '#5d6b78'); g.addColorStop(0.82, '#8c9aa8'); g.addColorStop(1, '#c7d1da'); ctx.fillStyle = g; }
    else ctx.fillStyle = o.fill;
    ctx.fill();
  }
  const c = o.color || 'chalk', lw = o.lw || 4;
  line(ctx, top, { color: c, lw }); line(ctx, bot, { color: c, lw });
  const tf = d * 0.16;
  line(ctx, top.map((p) => [p[0], p[1] + tf]), { color: c, lw: lw * 0.6, alpha: 0.8 });
  line(ctx, bot.map((p) => [p[0], p[1] - tf]), { color: c, lw: lw * 0.6, alpha: 0.8 });
  line(ctx, [top[0], bot[0]], { color: c, lw });
  if (pr >= 1) line(ctx, [top[n], bot[n]], { color: c, lw });
  ctx.restore();
  return yy;
}
// uniformly distributed load arrows
function udl(ctx, x0, x1, yTop, yBot, n, t, o = {}) {
  const t0 = o.t0 ?? -1e9, stagger = o.stagger ?? 0.03, c = o.color || 'yellow';
  const yb = typeof yBot === 'function' ? yBot : () => yBot;
  let shown = 0;
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, i / (n - 1)), ti = t0 + i * stagger, k = inv(ti, ti + 0.22, t);
    if (k <= 0) continue; shown++;
    const drop = (1 - E.outBack2(k)) * -120, pulse = (o.pulse || 0) * (0.5 + 0.5 * Math.sin(i * 0.9 - t * 9));
    const ya = yTop + drop - pulse, yz = yb(x) + drop;
    arrow(ctx, x, ya, x, yz, { color: c, lw: o.lw || 4, head: o.head || 16, alpha: clamp(k * 3) * (o.alpha ?? 1), glow: o.glow });
  }
  if (shown > 1) {
    const xe = lerp(x0, x1, (shown - 1) / (n - 1));
    line(ctx, [[x0, yTop - (o.pulse || 0) * 0.5], [xe, yTop - (o.pulse || 0) * 0.5]], { color: c, lw: o.lw || 4, alpha: o.alpha ?? 1 });
  }
}
// ISMB 300 cross-section (mm), centre (cx,cy), sc px per mm
const ISMB = { D: 300, B: 140, tf: 12.4, tw: 7.5, r1: 14 };
function iPoly() {
  const { D, B, tf, tw } = ISMB, h = D / 2, b = B / 2, w = tw / 2;
  return [[-b, h], [b, h], [b, h - tf], [w, h - tf], [w, -h + tf], [b, -h + tf], [b, -h], [-b, -h], [-b, -h + tf], [-w, -h + tf], [-w, h - tf], [-b, h - tf]];
}
function iSection(ctx, cx, cy, sc, o = {}) {
  const pts = iPoly().map((p) => [cx + p[0] * sc, cy - p[1] * sc]);
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  if (o.fill) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fillStyle = o.fill; ctx.fill(); }
  line(ctx, pts.concat([pts[0]]), { color: o.color || 'chalk', lw: o.lw || 4, prog: o.prog ?? 1, glow: o.glow, wob: o.wob, seed: o.seed, step: 40 }, o.t || 0);
  ctx.restore();
  return pts;
}

// ---------------------------------------------------------------- 3D I-beam
// o: yaw, pitch, roll, len (mm), sc (px per mm), dist, deform(zFrac)->{u (mm lateral), v (mm vertical), phi (rad twist)}
function project(p, o) {
  let [x, y, z] = p;
  const cy = Math.cos(o.yaw || 0), sy = Math.sin(o.yaw || 0), cp = Math.cos(o.pitch || 0), sp = Math.sin(o.pitch || 0), cr = Math.cos(o.roll || 0), sr = Math.sin(o.roll || 0);
  let x1 = x * cr - y * sr, y1 = x * sr + y * cr; x = x1; y = y1;
  let x2 = x * cy + z * sy, z2 = -x * sy + z * cy; x = x2; z = z2;
  let y3 = y * cp - z * sp, z3 = y * sp + z * cp; y = y3; z = z3;
  const d = o.dist || 4000, f = d / (d + z);
  return [o.cx + x * f * o.sc, o.cy - y * f * o.sc, z];
}
function beamPts(o, nz = 1) {
  const base = iPoly(), L = o.len || 2000, slices = [];
  for (let k = 0; k <= nz; k++) {
    const zf = k / nz, z = -L / 2 + L * zf, df = o.deform ? o.deform(zf) : null;
    slices.push(base.map(([x, y]) => {
      let X = x, Y = y;
      if (df) { const c = Math.cos(df.phi || 0), s = Math.sin(df.phi || 0); X = x * c - y * s + (df.u || 0); Y = x * s + y * c + (df.v || 0); }
      return [X, Y, z];
    }));
  }
  return slices;
}
function beam3D(ctx, o) {
  const nz = o.deform ? 24 : 1, S = beamPts(o, nz), P = S.map((sl) => sl.map((p) => project(p, o)));
  const n = S[0].length, light = o.light || [-0.4, 0.75, -0.55];
  const faces = [];
  for (let k = 0; k < nz; k++) for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, q = [P[k][i], P[k][j], P[k + 1][j], P[k + 1][i]];
    const cross = (q[1][0] - q[0][0]) * (q[3][1] - q[0][1]) - (q[1][1] - q[0][1]) * (q[3][0] - q[0][0]);
    // edge normal in section plane (outward for clockwise polygon)
    const ex = S[0][j][0] - S[0][i][0], ey = S[0][j][1] - S[0][i][1], nl = Math.hypot(ex, ey) || 1;
    const nx = -ey / nl, ny = ex / nl;
    const sh = clamp(0.25 + 0.75 * Math.max(0, nx * light[0] + ny * light[1]));
    faces.push({ q, z: (q[0][2] + q[1][2] + q[2][2] + q[3][2]) / 4, vis: cross, sh, i, k });
  }
  faces.sort((a, b) => b.z - a.z);
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  ctx.lineJoin = 'round';
  for (const f of faces) {
    if (o.cull !== false && f.vis > 0) continue;
    ctx.beginPath(); f.q.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    if (o.style !== 'wire') {
      const base = o.base || [150, 165, 180], hl = o.hl && o.hl(f) ? o.hl(f) : null, c = hl || base;
      ctx.fillStyle = `rgb(${(c[0] * f.sh) | 0},${(c[1] * f.sh) | 0},${(c[2] * f.sh) | 0})`; ctx.fill();
    }
    if (o.edges !== false && (o.style === 'wire' || nz === 1)) { ctx.strokeStyle = o.edge || 'rgba(255,255,255,0.55)'; ctx.lineWidth = o.elw || 1.5; ctx.stroke(); }
  }
  // end caps
  for (const k of [0, nz]) {
    const cap = P[k];
    const a = (cap[1][0] - cap[0][0]) * (cap[2][1] - cap[0][1]) - (cap[1][1] - cap[0][1]) * (cap[2][0] - cap[0][0]);
    const facing = k === 0 ? a > 0 : a < 0;
    if (o.cull !== false && !facing && o.style !== 'wire') continue;
    ctx.beginPath(); cap.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    if (o.style !== 'wire') { ctx.fillStyle = o.capFill || '#dfe7ee'; ctx.fill(); }
    ctx.strokeStyle = o.capEdge || o.edge || 'rgba(255,255,255,0.9)'; ctx.lineWidth = (o.elw || 1.5) * 1.6; ctx.stroke();
  }
  if (o.longEdges) { // draw longitudinal lines along flange tips for deformed beams
    for (const i of o.longEdges) { ctx.beginPath(); P.forEach((sl, k) => (k ? ctx.lineTo(sl[i][0], sl[i][1]) : ctx.moveTo(sl[i][0], sl[i][1]))); ctx.strokeStyle = o.longColor || o.edge; ctx.lineWidth = o.longW || 2; ctx.stroke(); }
  }
  ctx.restore();
  return P;
}

// ---------------------------------------------------------------- effects
function stamp(ctx, s, x, y, t, t0, o = {}) {
  if (t < t0) return;
  const k = t - t0, size = o.size || 80, c = o.color || COL.red;
  const sc = k < 0.13 ? lerp(o.from || 2.6, 1, E.inQ(k / 0.13)) : 1 + 0.05 * Math.exp(-(k - 0.13) / 0.08) * Math.sin((k - 0.13) * 50);
  const a = clamp(k / 0.05) * (o.alpha ?? 1);
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? -0.1); ctx.scale(sc, sc); ctx.globalAlpha *= a;
  setFont(ctx, size, o.fam || 'stamp'); ctx.letterSpacing = (o.ls ?? 4) + 'px';
  const w = ctx.measureText(s).width, pad = size * 0.32, h = size * 1.25;
  if (o.box !== false) {
    if (o.bg) { rrect(ctx, -w / 2 - pad, -h / 2, w + pad * 2, h, size * 0.12); ctx.fillStyle = o.bg; ctx.fill(); }
    rrect(ctx, -w / 2 - pad, -h / 2, w + pad * 2, h, size * 0.12); ctx.lineWidth = size * 0.09; ctx.strokeStyle = c; ctx.stroke();
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = c;
  if (o.glow) { ctx.shadowColor = c; ctx.shadowBlur = 30; }
  ctx.fillText(s, 0, size * 0.05);
  ctx.restore();
  // grunge holes for an ink look
  if (o.grunge !== false && k > 0.05) {
    ctx.save(); ctx.globalAlpha *= 0.35 * a; ctx.fillStyle = o.hole || COL.board;
    for (let i = 0; i < 26; i++) { const rx = x + srnd(i * 3.3 + size) * (size * s.length * 0.33), ry = y + srnd(i * 5.1 + size) * size * 0.5; circle(ctx, rx, ry, 1 + rnd(i) * 3); ctx.fill(); }
    ctx.restore();
  }
}
function burst(ctx, x, y, t, t0, o = {}) {
  const k = t - t0, life = o.life || 0.9; if (k < 0 || k > life) return;
  const n = o.n || 40, seed = o.seed || 7;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const ang = (o.ang ?? 0) + (o.spread ?? TAU) * (rnd(seed + i * 1.1) - 0.5), sp = lerp(o.vmin || 200, o.vmax || 900, rnd(seed + i * 2.3));
    const kk = k * lerp(0.8, 1.2, rnd(seed + i * 4.1));
    const px = x + Math.cos(ang) * sp * kk * (1 - kk / (life * 2.2)), py = y + Math.sin(ang) * sp * kk * (1 - kk / (life * 2.2)) + 0.5 * (o.g ?? 600) * kk * kk;
    const a = (1 - k / life) * (o.alpha ?? 1), r = (o.size || 4) * lerp(0.4, 1.4, rnd(seed + i * 6.7)) * (1 - 0.5 * k / life);
    ctx.globalAlpha = a; ctx.fillStyle = o.color ? (Array.isArray(o.color) ? o.color[i % o.color.length] : o.color) : '#eef0e6';
    if (o.rects) { ctx.save(); ctx.translate(px, py); ctx.rotate(rnd(i) * 6 + k * 8); ctx.fillRect(-r, -r * 0.5, r * 2, r); ctx.restore(); }
    else { circle(ctx, px, py, r); ctx.fill(); }
  }
  ctx.restore();
}
function check(ctx, x, y, s, prog, o = {}) {
  if (prog <= 0) return;
  line(ctx, [[x - s * 0.5, y], [x - s * 0.12, y + s * 0.4], [x + s * 0.6, y - s * 0.5]], { color: o.color || 'green', lw: o.lw || s * 0.16, prog, glow: o.glow });
}
function cross(ctx, x, y, s, prog, o = {}) {
  if (prog <= 0) return;
  line(ctx, [[x - s / 2, y - s / 2], [x + s / 2, y + s / 2]], { color: o.color || 'red', lw: o.lw || s * 0.14, prog: clamp(prog * 2), glow: o.glow });
  line(ctx, [[x + s / 2, y - s / 2], [x - s / 2, y + s / 2]], { color: o.color || 'red', lw: o.lw || s * 0.14, prog: clamp(prog * 2 - 1), glow: o.glow });
}
// glowing rays behind a hero element
function rays(ctx, x, y, t, o = {}) {
  const n = o.n || 18, r = o.r || 1400;
  ctx.save(); ctx.translate(x, y); ctx.rotate(t * (o.spin ?? 0.15));
  ctx.globalAlpha *= o.alpha ?? 0.12; ctx.fillStyle = o.color || '#fff';
  for (let i = 0; i < n; i++) { ctx.rotate(TAU / n); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r, -r * 0.08); ctx.lineTo(r, r * 0.08); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
// speed lines radiating to the edges
function speedLines(ctx, t, o = {}) {
  const n = o.n || 60, cx = o.cx ?? W / 2, cy = o.cy ?? H / 2;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 0.5; ctx.strokeStyle = o.color || '#fff'; ctx.lineCap = 'round';
  const fr = Math.floor(t * 15);
  for (let i = 0; i < n; i++) {
    const a = rnd(i * 3.7 + fr * 0.13) * TAU, r0 = lerp(380, 700, rnd(i * 1.9 + fr)), r1 = r0 + lerp(200, 900, rnd(i * 5.3 + fr));
    ctx.lineWidth = lerp(1, 5, rnd(i * 2.2 + fr));
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
  }
  ctx.restore();
}
function hazard(ctx, x, y, w, h, t, o = {}) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = o.c1 || COL.yellow; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = o.c2 || '#111'; const sw = o.sw || 40, off = ((t * (o.speed ?? 120)) % (sw * 2));
  for (let k = -h - sw * 2; k < w + h; k += sw * 2) { ctx.beginPath(); ctx.moveTo(x + k + off, y + h); ctx.lineTo(x + k + off + h, y); ctx.lineTo(x + k + off + h + sw, y); ctx.lineTo(x + k + off + sw, y + h); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function emoji(ctx, s, x, y, size, o = {}) { text(ctx, s, x, y, Object.assign({ size, fam: 'emoji', color: '#000' }, o)); }

// wireframe cage of a (possibly deformed) beam: slice outlines + longitudinal edges
function beamWire(ctx, o) {
  const nz = o.nz || 24, S = beamPts(o, nz), P2 = S.map((sl) => sl.map((p) => project(p, o)));
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.strokeStyle = o.color || '#ff4d4d'; ctx.lineWidth = o.lw || 2; ctx.lineJoin = 'round';
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowR || 16; }
  for (let k = 0; k <= nz; k += o.every || 4) { const sl = P2[k]; ctx.beginPath(); sl.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.stroke(); }
  for (const i of o.edges || [0, 1, 6, 7, 3, 4, 9, 10]) { ctx.beginPath(); P2.forEach((sl, k) => (k ? ctx.lineTo(sl[i][0], sl[i][1]) : ctx.moveTo(sl[i][0], sl[i][1]))); ctx.stroke(); }
  ctx.restore();
  return P2;
}
module.exports = { beamWire, beamPts,
  createCanvas, W, H, FPS, DUR, LY, FE, BE, clamp, lerp, inv, TAU, E, rnd, srnd, noise1, P, env, pop,
  WT, LS, LE, fe, feS, bars, beatPulse, beatIndex, impactPulse, EV, shake, flash, punch, glitch,
  COL, FAM, setFont, pat, ink, text, tw, writeOn, parseMath, mathW, mathText, eqn,
  polyLen, polyPath, subdiv, wob, line, arrow, arrowHead, rrect, circle, dimLine,
  pinSupport, rollerSupport, sag, beamElev, udl, ISMB, iPoly, iSection, project, beam3D,
  stamp, burst, check, cross, rays, speedLines, hazard, emoji, lastIdx,
};
