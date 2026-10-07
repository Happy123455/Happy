'use strict';
// Shared scene building blocks: stage, column rendering (main + glow with occlusion), 3D callouts, lyric rail, stamps, gauges.
const X = require('./engine');
const Wd = require('./world');
const { W, H, clamp, lerp, inv, E, rnd, srnd, noise1, TAU, P, env, v3, text, tw, mathText, mathW, line, arrow, dim2, glassPanel, brackets, COL, LINES, embers, lightShaft, flare, decodeNum, feS, beatPulse } = X;

// ------------------------------------------------------------------ stage
function stage(ctx, cam, o = {}) {
  ctx.fillStyle = o.bg || '#020305'; ctx.fillRect(-40, -40, W + 80, H + 80);
  const hz = o.haze ?? 1;
  if (hz > 0) {
    let bp = (cam && Wd.project(cam, o.backlight || [0, 3600, -1600])) || [W * 0.55, H * 0.32];
    if (o.bp) bp = [lerp(bp[0], o.bp[0], o.bp[2] ?? 1), lerp(bp[1], o.bp[1], o.bp[2] ?? 1)];
    const warm = o.warm || '255,165,85', cool = o.cool || '60,140,230';
    let g = ctx.createRadialGradient(bp[0], bp[1], 10, bp[0], bp[1], 950 * (o.hazeR ?? 1));
    g.addColorStop(0, `rgba(${warm},${0.5 * hz})`); g.addColorStop(0.35, `rgba(120,90,80,${0.22 * hz})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(W * 0.12, H * 0.92, 10, W * 0.12, H * 0.92, 950); g.addColorStop(0, `rgba(${cool},${0.32 * hz})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (o.shafts !== false) {
      const sw = 0.03 * Math.sin((o.t || 0) * 0.4);
      const wl = warm.split(',').map((c, i) => Math.round(lerp(+c, [255, 235, 210][i], 0.45))).join(',');
      lightShaft(ctx, bp[0] - 220, -90, 1.22 + sw, 1500, 80, 560, `rgba(${wl},A)`, 0.14 * hz);
      lightShaft(ctx, bp[0] + 260, -90, 1.78 - sw, 1600, 60, 440, 'rgba(150,200,255,A)', 0.09 * hz);
    }
    if (o.flare !== false) flare(ctx, bp[0], bp[1], 1.1, (o.flareA ?? 0.55) * hz, warm);
  }
  if (cam && o.floor !== false) Wd.floor(ctx, cam, { alpha: o.floorA ?? 1 });
}

// ------------------------------------------------------------------ column (main + glow pass with occlusion)
const SPOT = { p: [900, 5400, 2200], r: 6500, min: 0.5 };
function drawCol(ctx, g, cam, state = {}, o = {}) {
  const faces = o.faces || Wd.columnFaces(state);
  Wd.render(ctx, cam, faces, { spot: o.spot || SPOT, edge: o.edge ?? 'auto', fog: o.fog || [10, 10, 14], fogD: o.fogD ?? 0.00016, fogStart: o.fogStart ?? 1400, style: o.style, alpha: o.alpha, lights: o.lights });
  if (g && (o.glow ?? 1) > 0) {
    const gs = o.glowStyle || ((f) => (f.part === 'bar' ? { flat: '#000', edge: o.barGlow || 'rgba(255,160,80,0.9)', ew: 2 } : f.part === 'bolt' ? { flat: '#000', edge: o.boltGlow || null } : { flat: '#000', edge: o.chanGlow || null }));
    Wd.render(g, cam, faces, { style: gs, edge: null, alpha: o.glow ?? 1 });
  }
  return faces;
}

// ------------------------------------------------------------------ 3D-anchored callouts
function callout(ctx, cam, p, label, o = {}) {
  const sp = Wd.project(cam, p); if (!sp) return null;
  const a = o.alpha ?? 1; if (a <= 0) return sp;
  const dx = o.dx ?? 160, dy = o.dy ?? -110, ex = sp[0] + dx, ey = sp[1] + dy, c = o.color || COL.ice, pr = o.prog ?? 1;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(sp[0], sp[1], 4, 0, TAU); ctx.fill();
  ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sp[0], sp[1], 9 + 3 * Math.sin((o.t || 0) * 6), 0, TAU); ctx.stroke();
  line(ctx, [[sp[0], sp[1]], [ex, ey], [ex + (dx >= 0 ? 40 : -40), ey]], { color: c, lw: 1.5, prog: pr });
  if (pr > 0.6) {
    const s = o.size || 30, k = clamp((pr - 0.6) / 0.4);
    mathText(ctx, label, ex + (dx >= 0 ? 52 : -52), ey, { size: s, fam: o.fam || 'hud', weight: '600', color: o.tc || '#ffffff', align: dx >= 0 ? 'left' : 'right', alpha: k, glow: o.glow || 'rgba(79,209,255,0.5)', glowR: 14 });
    if (o.sub) text(ctx, o.sub, ex + (dx >= 0 ? 52 : -52), ey + s * 0.95, { size: s * 0.55, fam: 'hud', color: 'rgba(200,225,255,0.7)', align: dx >= 0 ? 'left' : 'right', alpha: k, ls: 2 });
  }
  ctx.restore();
  return sp;
}
function dim3(ctx, cam, p0, p1, label, prog, o = {}) { const a = Wd.project(cam, p0), b = Wd.project(cam, p1); if (!a || !b) return; dim2(ctx, a, b, label, prog, o); }

// ------------------------------------------------------------------ typography moments
function bigNum(ctx, s, x, y, t, t0, o = {}) {
  if (t < t0) return;
  const k = t - t0, dec = o.decode ?? 0.55, pr = clamp(k / dec);
  const sc = lerp(o.from ?? 1.35, 1, E.outExpo(clamp(k / 0.5))), a = clamp(k / 0.12) * (o.alpha ?? 1);
  const blur = (1 - clamp(k / 0.35)) * 12;
  ctx.save(); ctx.globalAlpha *= a;
  if (blur > 0.5) ctx.filter = `blur(${blur.toFixed(1)}px)`;
  text(ctx, decodeNum(s, pr, o.seed || 3), x, y, { size: o.size || 200, fam: o.fam || 'cond', weight: o.weight || '700', color: o.color || '#ffffff', scale: sc, glow: o.glow || 'rgba(255,170,90,0.75)', glowR: o.glowR ?? 40, align: o.align || 'center', ls: o.ls ?? 2, grad: o.grad });
  ctx.restore();
}
function title(ctx, s, x, y, t, t0, o = {}) {
  if (t < t0) return;
  const k = t - t0, a = clamp(k / (o.fade ?? 0.35)) * (o.alpha ?? 1), blur = (1 - E.outC(clamp(k / (o.blurT ?? 0.5)))) * (o.blur ?? 14);
  const ls = lerp(o.ls0 ?? 40, o.ls ?? 4, E.outQuint(clamp(k / (o.lsT ?? 1.2))));
  ctx.save(); ctx.globalAlpha *= a; if (blur > 0.4) ctx.filter = `blur(${blur.toFixed(1)}px)`;
  text(ctx, s, x, y, Object.assign({ size: 96, fam: 'cond', weight: '700', color: '#fff', ls, glow: 'rgba(255,170,90,0.55)', glowR: 26 }, o, { ls, alpha: 1 }));
  ctx.restore();
}
function stamp(ctx, s, x, y, t, t0, o = {}) {
  if (t < t0) return;
  const k = t - t0, size = o.size || 90, c = o.color || COL.green;
  const sc = k < 0.12 ? lerp(2.2, 1, E.inQ(k / 0.12)) : 1 + 0.04 * Math.exp(-(k - 0.12) / 0.1) * Math.sin((k - 0.12) * 45);
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? -0.06); ctx.scale(sc, sc); ctx.globalAlpha *= clamp(k / 0.05) * (o.alpha ?? 1);
  X.font(ctx, size, o.fam || 'cond', '800'); ctx.letterSpacing = (o.ls ?? 8) + 'px';
  const w = ctx.measureText(s).width, pad = size * 0.35, h = size * 1.2;
  X.rrect(ctx, -w / 2 - pad, -h / 2, w + pad * 2, h, size * 0.14); ctx.lineWidth = size * 0.07; ctx.strokeStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 30; ctx.stroke();
  if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = c; ctx.fillText(s, 0, size * 0.04);
  ctx.restore();
}
function check(ctx, x, y, s, prog, o = {}) { if (prog <= 0) return; line(ctx, [[x - s * 0.5, y], [x - s * 0.12, y + s * 0.38], [x + s * 0.58, y - s * 0.48]], { color: o.color || COL.green, lw: o.lw || s * 0.14, prog, glow: o.glow || 'rgba(61,255,162,0.8)', glowR: 18 }); }
// horizontal gauge: value vs limit on 0..max
function gauge(ctx, x, y, w, val, limit, maxv, t, t0, o = {}) {
  if (t < t0) return;
  const k = E.outC(clamp((t - t0) / 0.9)), X0 = (v) => x + (v / maxv) * w, a = clamp((t - t0) / 0.2) * (o.alpha ?? 1);
  ctx.save(); ctx.globalAlpha *= a;
  X.rrect(ctx, x, y - 14, w, 28, 14); ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill(); ctx.strokeStyle = 'rgba(200,225,255,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  const vv = val * k; X.rrect(ctx, x + 3, y - 11, Math.max(8, X0(vv) - x - 6), 22, 11);
  const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, o.c0 || '#1fd18a'); g.addColorStop(1, o.c1 || '#3dffa2'); ctx.fillStyle = g; ctx.shadowColor = o.c1 || '#3dffa2'; ctx.shadowBlur = 20; ctx.fill(); ctx.shadowBlur = 0;
  const lx = X0(limit); line(ctx, [[lx, y - 30], [lx, y + 30]], { color: o.limC || COL.red, lw: 3, glow: 'rgba(255,60,70,0.8)' });
  text(ctx, o.limLabel || `LIMIT ${limit}`, lx, y - 48, { size: 24, fam: 'hud', weight: '600', color: o.limC || COL.red, ls: 2 });
  text(ctx, o.valLabel ? o.valLabel(vv) : vv.toFixed(2), X0(vv), y + 48, { size: 30, fam: 'hud', weight: '600', color: '#fff' });
  if (o.label) text(ctx, o.label, x, y - 48, { size: 24, fam: 'hud', weight: '600', color: 'rgba(200,225,255,0.85)', align: 'left', ls: 3 });
  ctx.restore();
}
// glass card with rows that appear at given times: rows [{t, s, c}]
function card(ctx, x, y, w, rows, t, o = {}) {
  const shown = rows.filter((r) => t >= r.t);
  if (!shown.length && !o.always) return;
  const t0 = o.t0 ?? rows[0].t, a = clamp((t - t0) / 0.3) * (o.alpha ?? 1), rh = o.rh || 58, h = (o.head ? 70 : 24) + rh * Math.max(1, shown.length) + 16;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate((1 - E.outC(clamp((t - t0) / 0.5))) * (o.slide ?? 60), 0);
  glassPanel(ctx, x, y, w, h, { accent: o.accent || COL.amber });
  if (o.head) { text(ctx, o.head, x + 28, y + 38, { size: 26, fam: 'hud', weight: '600', color: o.accent || COL.amber, align: 'left', ls: 5 }); line(ctx, [[x + 28, y + 62], [x + w - 28, y + 62]], { color: 'rgba(255,255,255,0.15)', lw: 1 }); }
  shown.forEach((r, i) => {
    const k = clamp((t - r.t) / 0.35), yy = y + (o.head ? 70 : 24) + rh * i + rh / 2;
    ctx.save(); ctx.globalAlpha *= k; ctx.translate((1 - E.outC(k)) * 30, 0);
    mathText(ctx, r.s, x + 28, yy, { size: o.size || 34, fam: r.fam || 'cond', weight: '600', color: r.c || '#ffffff' });
    if (r.ok) check(ctx, x + w - 44, yy, 28, clamp((t - r.t - 0.2) / 0.25));
    ctx.restore();
  });
  ctx.restore();
}

// ------------------------------------------------------------------ lyric rail (Gujarati line + English translation, karaoke sweep)
function curLine(t) {
  for (let i = LINES.length - 1; i >= 0; i--) if (t >= LINES[i].t - 0.18) return t < LINES[i].end + 0.35 ? i : -1;
  return -1;
}
function lyricRail(ctx, t, o = {}) {
  const i = curLine(t);
  const y = o.y ?? 978, gsize = o.size ?? 54, bandA = o.band ?? 0.55;
  const draw = (j, alphaMul, dy, sweep) => {
    if (alphaMul <= 0.003) return;
    const L = LINES[j], s = L.gu, w = tw(ctx, s, gsize, 'gu', '600');
    const x0 = W / 2 - w / 2;
    ctx.save(); ctx.globalAlpha *= alphaMul;
    text(ctx, s, W / 2, y + dy, { size: gsize, fam: 'gu', weight: '600', color: 'rgba(255,255,255,0.55)' });
    if (sweep > 0) { // karaoke highlight: bright text revealed by a moving clip with a glowing edge
      const ex = x0 + (w + 40) * sweep - 20;
      ctx.save(); ctx.beginPath(); ctx.rect(x0 - 30, y + dy - gsize, ex - x0 + 30, gsize * 2); ctx.clip();
      text(ctx, s, W / 2, y + dy, { size: gsize, fam: 'gu', weight: '600', color: '#ffffff', glow: 'rgba(255,170,90,0.7)', glowR: 18 });
      ctx.restore();
      if (sweep < 1) { const gg = ctx.createRadialGradient(ex, y + dy, 0, ex, y + dy, 46); gg.addColorStop(0, 'rgba(255,190,120,0.55)'); gg.addColorStop(1, 'rgba(255,190,120,0)'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gg; ctx.fillRect(ex - 46, y + dy - 46, 92, 92); ctx.restore(); }
    }
    text(ctx, L.en, W / 2, y + dy + gsize * 0.92, { size: Math.round(gsize * 0.46), fam: 'barlow', color: 'rgba(225,235,245,0.62)', ls: 2 });
    ctx.restore();
  };
  // outgoing line: if the previous line was still up when this one arrived, roll it up and away
  // (staggered: the old line is mostly gone before the new one rises in, so the two never overlap)
  let outA = 0, outK = 1, rolled = false;
  if (i >= 1) {
    const Pv = LINES[i - 1], t0 = LINES[i].t - 0.18;
    const at0 = 1 - clamp((t0 - Pv.end - 0.05) / 0.25);
    if (at0 > 0) { rolled = true; outK = clamp((t - t0) / 0.26); outA = at0 * (1 - outK) * (1 - outK); }
  }
  let inA = 0, inK = 1, sweep = 0;
  if (i >= 0) {
    const L = LINES[i]; inK = rolled ? clamp((t - L.t + 0.06) / 0.34) : clamp((t - L.t + 0.15) / 0.4);
    inA = E.outC(inK) * (1 - clamp((t - L.end - 0.05) / 0.25));
    sweep = clamp((t - L.t) / (Math.min(L.end - L.t, X.PER * 8) * 0.88));
  }
  const bA = bandA * Math.max(inA, outA);
  if (bA > 0.003) { const g = ctx.createLinearGradient(0, y - 110, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.45, `rgba(0,0,0,${bA})`); g.addColorStop(1, `rgba(0,0,0,${bA})`); ctx.fillStyle = g; ctx.fillRect(0, y - 110, W, H - (y - 110)); }
  if (outA > 0) draw(i - 1, outA, -64 * E.outC(outK), 1);
  if (i >= 0) draw(i, inA, (1 - E.outC(inK)) * 26, sweep);
}
// soft elliptical dark scrim behind hero text; also eats the glow layer so bloom does not bleed through
function scrim(ctx, g, cx, cy, rx, ry, a = 0.6) {
  if (a <= 0.003) return;
  for (const [c, al, op] of [[ctx, a, 'source-over'], [g, a * 0.9, 'destination-out']]) {
    if (!c) continue;
    c.save(); c.globalCompositeOperation = op; c.translate(cx, cy); c.scale(1, ry / rx);
    const gr = c.createRadialGradient(0, 0, 0, 0, 0, rx);
    gr.addColorStop(0, `rgba(0,0,0,${al})`); gr.addColorStop(0.55, `rgba(0,0,0,${al * 0.72})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr; c.fillRect(-rx, -rx, 2 * rx, 2 * rx); c.restore();
  }
}

module.exports = { stage, drawCol, callout, dim3, bigNum, title, stamp, check, gauge, card, lyricRail, curLine, scrim, SPOT };
