'use strict';
// Frame composer: background -> camera -> scenes -> captions -> HUD -> overlays.
const C = require('./core');
const { createCanvas, W, H, FPS, DUR, LY, clamp, lerp, inv, E, rnd, srnd, noise1, TAU, COL, text, tw, setFont, ink, line, check,
  beatPulse, impactPulse, EV, fe, feS, bars, LS, WT } = C;
const SC = require('./scenes');
const { spawn } = require('child_process');
const fs = require('fs');

const GRAIN_MODE = process.env.GRAIN || 'static';
const canvas = createCanvas(W, H), ctx = canvas.getContext('2d');
const tmp = createCanvas(W, H), tctx = tmp.getContext('2d');

// ---------------------------------------------------------------- pre-rendered backgrounds
function mk(fn) { const c = createCanvas(W, H), x = c.getContext('2d'); fn(x); return c; }
const BG = {
  board: mk((x) => {
    const g = x.createRadialGradient(W / 2, H * 0.45, 100, W / 2, H / 2, W * 0.75);
    g.addColorStop(0, '#1d2e28'); g.addColorStop(1, '#0b1311'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.filter = 'blur(40px)';
    for (let i = 0; i < 26; i++) { x.globalAlpha = 0.025 + 0.03 * rnd(i); x.fillStyle = '#dfe8e0'; x.beginPath(); x.ellipse(rnd(i * 3) * W, rnd(i * 7) * H, 120 + 260 * rnd(i * 11), 40 + 90 * rnd(i * 13), srnd(i) * 0.4, 0, TAU); x.fill(); }
    x.filter = 'none';
    const ghosts = ['M = wL²/8', 'V = wL/2', 'Σ Fy = 0', 'Zp ≥ M/fy', 'δ = 5wL⁴/384EI', 'λLT', 'I = bd³/12', 'σ = My/I', 'τ = VQ/It', 'E = 2×10⁵ MPa', 'γm0 = 1.10', 'ε = √(250/fy)'];
    for (let i = 0; i < 22; i++) { x.save(); x.globalAlpha = 0.035 + 0.025 * rnd(i * 5); x.translate(rnd(i * 17) * W, rnd(i * 19) * H); x.rotate(srnd(i * 23) * 0.12); setFont(x, 30 + 40 * rnd(i * 29), 'hand'); x.fillStyle = '#e8efe6'; x.fillText(ghosts[i % ghosts.length], 0, 0); x.restore(); }
    for (let i = 0; i < 5000; i++) { x.globalAlpha = 0.04 + 0.12 * rnd(i * 1.7); x.fillStyle = '#f2f5ee'; x.fillRect(rnd(i * 2.1) * W, rnd(i * 3.3) * H, 1 + rnd(i) * 1.6, 1 + rnd(i * 9) * 1.6); }
    x.globalAlpha = 1;
    // chalk tray at the bottom
    const tg = x.createLinearGradient(0, H - 26, 0, H); tg.addColorStop(0, '#4b3a2a'); tg.addColorStop(1, '#241a12'); x.fillStyle = tg; x.fillRect(0, H - 22, W, 22);
    x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(0, H - 22, W, 2);
  }),
  blue: mk((x) => {
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0f4577'); g.addColorStop(1, '#072540'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(160,200,255,0.08)'; x.lineWidth = 1;
    for (let gx = 0; gx <= W; gx += 24) { x.beginPath(); x.moveTo(gx + 0.5, 0); x.lineTo(gx + 0.5, H); x.stroke(); }
    for (let gy = 0; gy <= H; gy += 24) { x.beginPath(); x.moveTo(0, gy + 0.5); x.lineTo(W, gy + 0.5); x.stroke(); }
    x.strokeStyle = 'rgba(160,200,255,0.17)';
    for (let gx = 0; gx <= W; gx += 120) { x.beginPath(); x.moveTo(gx + 0.5, 0); x.lineTo(gx + 0.5, H); x.stroke(); }
    for (let gy = 0; gy <= H; gy += 120) { x.beginPath(); x.moveTo(0, gy + 0.5); x.lineTo(W, gy + 0.5); x.stroke(); }
    x.strokeStyle = 'rgba(220,235,255,0.55)'; x.lineWidth = 3; x.strokeRect(30, 30, W - 60, H - 60); x.lineWidth = 1; x.strokeRect(40, 40, W - 80, H - 80);
  }),
  dark: mk((x) => {
    x.fillStyle = '#03050a'; x.fillRect(0, 0, W, H);
    const g = x.createRadialGradient(W / 2, H * 0.48, 50, W / 2, H * 0.5, W * 0.6); g.addColorStop(0, 'rgba(40,70,120,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  }),
  hype: mk((x) => {
    x.fillStyle = '#060608'; x.fillRect(0, 0, W, H);
    const g = x.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.7); g.addColorStop(0, 'rgba(70,40,20,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(255,255,255,0.035)'; x.lineWidth = 1;
    for (let gx = 0; gx <= W; gx += 60) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, H); x.stroke(); }
    for (let gy = 0; gy <= H; gy += 60) { x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke(); }
  }),
};
const VIG = mk((x) => { const g = x.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.72); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.62)'); x.fillStyle = g; x.fillRect(0, 0, W, H); });
const GRAIN = [0, 1, 2, 3].map((k) => { const c = createCanvas(W / 2, H / 2), x = c.getContext('2d'), id = x.createImageData(W / 2, H / 2); for (let i = 0; i < id.data.length; i += 4) { const v = (Math.random() * 255) | 0; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } x.putImageData(id, 0, 0); return c; });

// ---------------------------------------------------------------- sections
const SECTIONS = SC.SECTIONS;
function sectionAt(t) { for (let i = SECTIONS.length - 1; i >= 0; i--) if (t >= SECTIONS[i].a) return SECTIONS[i]; return SECTIONS[0]; }

function drawBG(t) {
  const s = sectionAt(t), i = SECTIONS.indexOf(s), prev = SECTIONS[i - 1];
  const fade = s.bgIn ?? 0.25;
  ctx.drawImage(BG[s.bg], 0, 0);
  if (prev && prev.bg !== s.bg && t - s.a < fade) { ctx.globalAlpha = 1 - (t - s.a) / fade; ctx.drawImage(BG[prev.bg], 0, 0); ctx.globalAlpha = 1; }
  if (s.bg === 'hype') hypeFX(t, s);
  if (s.bg === 'dark') darkFX(t);
  if (s.bg === 'blue') { // slow scanning line
    const y = ((t * 90) % (H + 200)) - 100; const g = ctx.createLinearGradient(0, y - 80, 0, y); g.addColorStop(0, 'rgba(120,190,255,0)'); g.addColorStop(1, 'rgba(120,190,255,0.10)'); ctx.fillStyle = g; ctx.fillRect(0, y - 80, W, 80);
  }
}
function hypeFX(t, s) {
  const lo = feS('low', t, 3), bp = beatPulse(t);
  // rotating light rays + audio reactive floor bars
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(t * 0.08);
  ctx.globalAlpha = 0.05 + 0.07 * lo; ctx.fillStyle = s.rayColor || '#ffb347';
  for (let i = 0; i < 16; i++) { ctx.rotate(TAU / 16); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1500, -110); ctx.lineTo(1500, 110); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  const b = bars(t), n = b.length, bw = W / n;
  for (let i = 0; i < n; i++) {
    const v = clamp(b[i]) * (0.6 + 0.4 * bp), h = v * 170;
    ctx.fillStyle = `rgba(255,${(150 + 100 * (i / n)) | 0},60,${0.10 + 0.18 * v})`;
    ctx.fillRect(i * bw + 4, H - h, bw - 8, h);
    ctx.fillRect(i * bw + 4, 0, bw - 8, h * 0.35);
  }
}
const DUST = Array.from({ length: 70 }, (_, i) => [rnd(i * 3.1), rnd(i * 4.7), 0.3 + rnd(i * 5.9) * 1.6, rnd(i * 8.3)]);
function darkFX(t) {
  ctx.save();
  for (const [x0, y0, s, ph] of DUST) {
    const x = ((x0 * W + t * 12 * s) % W), y = ((y0 * H - t * 8 * s) % H + H) % H;
    ctx.globalAlpha = 0.12 + 0.18 * (0.5 + 0.5 * Math.sin(t * 0.8 + ph * 10));
    ctx.fillStyle = '#9fc4ff'; ctx.beginPath(); ctx.arc(x, y, s * 2.2, 0, TAU); ctx.fill();
  }
  // heartbeat glow from the bass
  const lo = feS('low', t, 3); const g = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, 700); g.addColorStop(0, `rgba(80,140,255,${0.10 * lo})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ---------------------------------------------------------------- camera
function camera(t) {
  const s = sectionAt(t);
  let z = 1 + (s.cam || 0) * beatPulse(t) + (s.camImpact ?? s.cam * 1.4) * impactPulse(t);
  for (const [t0, a, d] of EV.punches) if (t >= t0 && t - t0 < 2) z += a * Math.exp(-(t - t0) / d);
  let x = 0, y = 0, r = 0;
  for (const [t0, a, d] of EV.shakes) if (t >= t0 && t - t0 < 2) { const k = a * Math.exp(-(t - t0) / d); x += k * noise1(t * 38 + t0); y += k * noise1(t * 41 + t0 + 9); r += k * 0.0009 * noise1(t * 29 + t0 + 3); }
  r += (s.drift ?? 0.004) * Math.sin(t * 0.45);
  return { x, y, z, r };
}

// ---------------------------------------------------------------- captions
const HOT_NUM = /^(one|two|three|four|five|six|seven|eight|nine|ten|twelve|eighteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|point|zero|cubed|squared|i|s|m|b|w|l|d|t|f|e|p|v|z|y|tw|tf|epsilon|beta|gamma|root)/;
const HOT_TECH = /(plastic|restrain|buckl|shear|moment|yield|hinge|adequate|safe|secure|demand|capacity|modulus|flange|web|elastic|lateral|torsional|compression|reduction|bending|strength|stability|class|section)/;
const HOT_ROAST = /(cheaters|weep|sleep|deaf|business|dismissed|failed|roof|caves|chase|space|hesitate|understand)/;
function wordColor(w, li) {
  const n = w.toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (HOT_ROAST.test(n)) return COL.red;
  if (/^(one|two|three|four|five|six|seven|eight|nine|ten|twelve|eighteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|point|zero|cubed|squared)/.test(n) || /^[ismbwldtfepvzy]$/.test(n)) return COL.yellow;
  if (HOT_TECH.test(n)) return COL.cyan;
  return null;
}
function activeLine(t) {
  for (let i = LY.length - 1; i >= 0; i--) {
    const L = LY[i], s = L.words[0].s - 0.2, next = LY[i + 1] ? LY[i + 1].words[0].s - 0.2 : 1e9;
    const end = Math.min(next, L.words[L.words.length - 1].e + 1.0);
    if (t >= s && t < end) return { i, L, s, end };
  }
  return null;
}
function layoutWords(words, size, fam, maxW, ls) {
  const sp = size * 0.28, rows = [[]]; let rw = 0;
  for (const w of words) {
    const ww = tw(ctx, w.disp, size, fam, ls);
    if (rw > 0 && rw + sp + ww > maxW) { rows.push([]); rw = 0; }
    rows[rows.length - 1].push(Object.assign({}, w, { ww })); rw += (rw > 0 ? sp : 0) + ww;
  }
  return { rows, sp };
}
function drawCaptions(t) {
  const s = sectionAt(t), mode = (s.capAt && s.capAt(t)) || s.cap;
  if (mode === 'none') return;
  const A = activeLine(t); if (!A) return;
  if (SC.CAP_SKIP && SC.CAP_SKIP.has(A.i)) return;
  const words = A.L.words.map((w, k) => ({ disp: w.w.toUpperCase(), s: w.s, e: w.e, k, next: A.L.words[k + 1] ? A.L.words[k + 1].s : w.e + 0.3 }));
  const fadeOut = 1 - inv(A.end - 0.25, A.end, t);
  let size, fam, maxW, cy, ls = 0, lh;
  if (mode === 'big') { size = 92; fam = 'anton'; maxW = 1560; lh = 104; cy = s.capY || 850; ls = 1; }
  else if (mode === 'cine') { size = 60; fam = 'bebas'; maxW = 1500; lh = 70; cy = s.capY || 940; ls = 10; }
  else { size = 58; fam = 'anton'; maxW = 1560; lh = 66; cy = s.capY || 968; ls = 1; }
  const { rows, sp } = layoutWords(words, size, fam, maxW, ls);
  const y0 = cy - (rows.length - 1) * lh / 2;
  if (mode === 'bottom' && !s.capNoBand) { // readability band
    const g = ctx.createLinearGradient(0, y0 - lh, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.35, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.globalAlpha = fadeOut * clamp((t - A.s) / 0.2); ctx.fillStyle = g; ctx.fillRect(0, y0 - lh, W, H - (y0 - lh)); ctx.globalAlpha = 1;
  }
  rows.forEach((row, ri) => {
    const rw = row.reduce((a, w) => a + w.ww, 0) + sp * (row.length - 1);
    let x = W / 2 - rw / 2; const y = y0 + ri * lh;
    for (const w of row) {
      const ap = w.s - (mode === 'cine' ? 0.12 : 0.05);
      if (t >= ap) {
        const k = t - ap, cur = t >= w.s - 0.05 && t < w.next - 0.02;
        const hc = wordColor(w.disp, A.i);
        let sc, a, dy = 0;
        if (mode === 'cine') { a = clamp(k / 0.35); sc = 1; dy = (1 - E.outC(clamp(k / 0.5))) * 18; }
        else { a = clamp(k / 0.06); sc = lerp(mode === 'big' ? 1.6 : 1.35, 1, E.outBack2(clamp(k / 0.16))); }
        const col = cur ? (s.capHi || COL.yellow) : (hc || '#ffffff');
        const cx = x + w.ww / 2;
        ctx.save(); ctx.globalAlpha = a * fadeOut;
        ctx.translate(cx, y + dy); ctx.scale(sc, sc);
        if (mode !== 'cine') ctx.rotate((cur ? 1 : 0) * srnd(w.k + A.i * 10) * 0.035);
        text(ctx, w.disp, 0, 0, { size: size * (cur && mode !== 'cine' ? 1.06 : 1), fam, color: cur && mode === 'cine' ? '#cfe3ff' : col, stroke: mode === 'cine' ? null : '#000', strokeW: mode === 'big' ? 12 : 10, ls, glow: cur && mode !== 'cine' ? 'rgba(255,210,63,0.55)' : (mode === 'cine' ? 'rgba(120,170,255,0.45)' : null), glowR: 22 });
        ctx.restore();
      }
      x += w.ww + sp;
    }
  });
}

// ---------------------------------------------------------------- HUD
const TRACK = [
  { k: 'M_u = 125 kNm', t: () => WT(13, 'demand') },
  { k: 'V_u = 100 kN', t: () => WT(15, 'kilo') },
  { k: 'LTB: restrained', t: () => WT(20, 'restrained') },
  { k: 'Class 1 Plastic', t: () => WT(34, 'plastic') },
  { k: 'V_d = 295.3 kN', t: () => WT(41, 'ninety') },
  { k: 'Low shear', t: () => WT(43, 'low') },
  { k: 'M_d = 148.1 kNm', t: () => WT(51, 'forty') },
  { k: 'M_d ≤ 156.4 kNm', t: () => WT(55, 'fifty') },
].map((r) => Object.assign(r, { tt: r.t() }));
function drawHUD(t) {
  const s = sectionAt(t);
  if (s.hud) {
    const a = Math.min(clamp((t - s.a) / 0.5), clamp((s.b - t) / 0.4));
    ctx.save(); ctx.globalAlpha = a * 0.92;
    const x = W - 330, y = 26, rows = TRACK.filter((r) => t >= r.tt);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; C.rrect(ctx, x, y, 300, 48 + 34 * Math.max(1, rows.length), 12); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5; ctx.stroke();
    text(ctx, 'DESIGN CHECK', x + 18, y + 24, { size: 20, fam: 'mono', color: COL.yellow, align: 'left', ls: 3 });
    text(ctx, `${rows.length}/8`, x + 282, y + 24, { size: 20, fam: 'mono', color: 'rgba(255,255,255,0.6)', align: 'right' });
    rows.forEach((r, i) => {
      const k = clamp((t - r.tt) / 0.25), yy = y + 62 + i * 34;
      ctx.save(); ctx.globalAlpha *= k; ctx.translate((1 - E.outBack(k)) * 40, 0);
      C.mathText(ctx, r.k, x + 52, yy, { size: 21, fam: 'mono', color: '#ffffff' });
      check(ctx, x + 30, yy, 18, clamp((t - r.tt - 0.08) / 0.2), { lw: 4 });
      ctx.restore();
    });
    ctx.restore();
  }
  if (s.tag !== false) { // lecture tag
    const a = s.tagA ?? 0.75;
    text(ctx, 'CE · 5TH SEM · STEEL DESIGN · LEC 07', 34, 40, { size: 22, fam: 'mono', color: `rgba(255,255,255,${0.55 * a})`, align: 'left', ls: 2 });
    text(ctx, s.label || '', 34, 70, { size: 22, fam: 'mono', color: `rgba(255,210,63,${0.85 * a})`, align: 'left', ls: 2 });
  }
  // progress beam at the very bottom
  const p = t / DUR; ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, H - 5, W, 5); ctx.fillStyle = COL.yellow; ctx.fillRect(0, H - 5, W * p, 5);
}

// ---------------------------------------------------------------- overlays
function overlays(t, fi) {
  for (const [t0, a, d, c] of EV.flashes) if (t >= t0 && t - t0 < 1.5) { ctx.globalAlpha = clamp(a * Math.exp(-(t - t0) / d)); ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); }
  ctx.globalAlpha = 1;
  // glitch slices
  for (const [t0, d, amp] of EV.glitches) if (t >= t0 && t < t0 + d) {
    tctx.drawImage(canvas, 0, 0);
    const fr = Math.floor(t * 30);
    for (let i = 0; i < 9; i++) {
      const y = rnd(fr * 7 + i) * H, h = 20 + rnd(fr * 3 + i * 2) * 120, dx = srnd(fr * 5 + i * 3) * 140 * amp;
      ctx.drawImage(tmp, 0, y, W, h, dx, y, W, h);
      ctx.globalAlpha = 0.35; ctx.fillStyle = i % 2 ? '#ff2bd6' : '#2bf0ff'; ctx.fillRect(0, y, W, 3); ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 * amp; ctx.drawImage(tmp, 12 * amp, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(VIG, 0, 0);
  if (GRAIN_MODE !== 'none') {
    const anim = GRAIN_MODE === 'anim';
    ctx.save(); ctx.globalAlpha = anim ? 0.07 : 0.05; ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(GRAIN[anim ? fi % 4 : 0], anim ? -((fi * 37) % 40) : -20, anim ? -((fi * 53) % 40) : -20, W + 80, H + 80);
    ctx.restore();
  }
  // global fade in/out
  const fin = clamp(t / 0.6), fout = clamp((DUR - t) / 1.2);
  if (fin < 1 || fout < 1) { ctx.globalAlpha = 1 - Math.min(fin, fout); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}

function renderFrame(fi) {
  const t = fi / FPS;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  drawBG(t);
  const cam = camera(t);
  ctx.save();
  ctx.translate(W / 2 + cam.x, H / 2 + cam.y); ctx.rotate(cam.r); ctx.scale(cam.z, cam.z); ctx.translate(-W / 2, -H / 2);
  for (const sc of SC.SCENES) if (t >= sc.a && t < sc.b) { ctx.save(); sc.draw(ctx, t, sc); ctx.restore(); }
  ctx.restore();
  drawCaptions(t);
  drawHUD(t);
  overlays(t, fi);
}

// ---------------------------------------------------------------- CLI
const args = process.argv.slice(2);
if (args[0] === 'still') {
  // node main.js still out.png t1 t2 ... (contact sheet, 3 columns)
  const out = args[1], times = args.slice(2).map(Number);
  if (times.length === 1) { renderFrame(Math.round(times[0] * FPS)); fs.writeFileSync(out, canvas.toBuffer('image/png')); }
  else {
    const cols = 3, rows = Math.ceil(times.length / cols), tw_ = W / cols, th = H / cols;
    const sheet = createCanvas(W, th * rows), sx = sheet.getContext('2d');
    times.forEach((tt, i) => { renderFrame(Math.round(tt * FPS)); sx.drawImage(canvas, (i % cols) * tw_, Math.floor(i / cols) * th, tw_, th); sx.fillStyle = '#000'; sx.fillRect((i % cols) * tw_, Math.floor(i / cols) * th, 120, 34); sx.fillStyle = '#ff0'; sx.font = '26px "DejaVu Sans"'; sx.fillText(tt.toFixed(2), (i % cols) * tw_ + 6, Math.floor(i / cols) * th + 26); });
    fs.writeFileSync(out, sheet.toBuffer('image/png'));
  }
} else if (args[0] === 'render') {
  // node main.js render f0 f1 out.mp4
  const f0 = +args[1], f1 = Math.min(+args[2], Math.ceil(DUR * FPS)), out = args[3];
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', process.env.PRESET || 'slow', '-crf', process.env.CRF || '19', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-threads', '2', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  let fi = f0; const t0 = Date.now();
  const pump = () => {
    while (fi < f1) {
      renderFrame(fi);
      const ok = ff.stdin.write(Buffer.from(canvas.data()));
      fi++;
      if (fi % 150 === 0) process.stderr.write(`[${f0}-${f1}] ${fi} ${((fi - f0) / ((Date.now() - t0) / 1000)).toFixed(1)} fps\n`);
      if (!ok) { ff.stdin.once('drain', pump); return; }
    }
    ff.stdin.end();
  };
  ff.on('close', (code) => { process.stderr.write(`done ${out} code ${code} in ${((Date.now() - t0) / 1000).toFixed(0)}s\n`); process.exit(code); });
  pump();
}
module.exports = { renderFrame };
