'use strict';
// Post-processing: bloom, grade, vignette, grain, letterbox, flashes, chromatic aberration.
const X = require('./engine');
const { createCanvas, W, H, clamp, lerp, rnd, EV, noise1, TAU } = X;

const QW = W / 4, QH = H / 4;
const q1 = createCanvas(QW, QH), qx1 = q1.getContext('2d');
const q2 = createCanvas(QW, QH), qx2 = q2.getContext('2d');
const e1 = createCanvas(W / 8, H / 8), ex1 = e1.getContext('2d');
const full = createCanvas(W, H), fx = full.getContext('2d');

// static grain + vignette
const GRAIN = (() => { const c = createCanvas(W / 2, H / 2), x = c.getContext('2d'), id = x.createImageData(W / 2, H / 2); for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (rnd(i * 0.37) - 0.5) * 160; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } x.putImageData(id, 0, 0); return c; })();
const VIG = (() => { const c = createCanvas(W, H), x = c.getContext('2d'); const g = x.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.68); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.78)'); x.fillStyle = g; x.fillRect(0, 0, W, H); return c; })();
const GRADE = (() => { const c = createCanvas(W, H), x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, 'rgb(40,110,140)'); g.addColorStop(0.55, 'rgb(128,128,128)'); g.addColorStop(1, 'rgb(200,120,60)'); x.fillStyle = g; x.fillRect(0, 0, W, H); return c; })();

// bloom from the frame itself (x^4 soft threshold) + explicit glow layer
function bloom(ctx, canvas, glowCanvas, amt = 0.55, glowAmt = 1) {
  if (amt > 0) {
    qx1.globalCompositeOperation = 'source-over'; qx1.globalAlpha = 1; qx1.filter = 'none';
    qx1.drawImage(canvas, 0, 0, QW, QH);
    qx1.globalCompositeOperation = 'multiply'; qx1.drawImage(q1, 0, 0); qx1.drawImage(q1, 0, 0); // ~x^4
    qx1.globalCompositeOperation = 'source-over';
    if (glowCanvas) { qx1.globalCompositeOperation = 'lighter'; qx1.drawImage(glowCanvas, 0, 0, QW, QH); qx1.globalCompositeOperation = 'source-over'; }
    qx2.clearRect(0, 0, QW, QH); qx2.filter = 'blur(6px)'; qx2.drawImage(q1, 0, 0); qx2.filter = 'none';
    ex1.clearRect(0, 0, W / 8, H / 8); ex1.filter = 'blur(10px)'; ex1.drawImage(q1, 0, 0, W / 8, H / 8); ex1.filter = 'none';
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = amt; ctx.drawImage(q2, 0, 0, W, H);
    ctx.globalAlpha = amt * 0.8; ctx.drawImage(e1, 0, 0, W, H);
    ctx.restore();
  }
  if (glowCanvas && glowAmt > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = glowAmt; ctx.drawImage(glowCanvas, 0, 0); ctx.restore(); }
}
function grade(ctx, amt = 0.22) {
  ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = amt; ctx.drawImage(GRADE, 0, 0); ctx.restore();
}
function vignette(ctx, amt = 1) { ctx.save(); ctx.globalAlpha = amt; ctx.drawImage(VIG, 0, 0); ctx.restore(); }
function grain(ctx, fi, amt = 0.06) { ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = amt; const ox = -((fi * 53) % 41), oy = -((fi * 29) % 37); ctx.drawImage(GRAIN, ox, oy, W + 60, H + 60); ctx.restore(); }
function letterbox(ctx, amt) { if (amt <= 0) return; const h = 132 * amt; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h); }
function flashes(ctx, t) {
  for (const [t0, a, d, c] of EV.flash) if (t >= t0 && t - t0 < 2.5) { const k = a * Math.exp(-(t - t0) / d); if (k > 0.004) { ctx.save(); ctx.globalAlpha = clamp(k); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); ctx.restore(); } }
}
function chromaAmt(t) { let v = 0; for (const [t0, a, d] of EV.chroma) if (t >= t0 && t - t0 < 1.5) v = Math.max(v, a * Math.exp(-(t - t0) / d)); return v; }
// chromatic aberration: shifted red & blue copies (only on impact frames)
function chromatic(ctx, canvas, amt) {
  if (amt < 0.03) return;
  fx.globalCompositeOperation = 'source-over'; fx.globalAlpha = 1; fx.drawImage(canvas, 0, 0);
  const s = 14 * amt;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 * clamp(amt);
  ctx.drawImage(full, s, 0); ctx.drawImage(full, -s, 0);
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.25 * clamp(amt); ctx.fillStyle = 'rgb(255,140,170)'; ctx.fillRect(0, 0, W, H); ctx.restore();
}
function camShake(t) {
  let x = 0, y = 0, r = 0, z = 0;
  for (const [t0, a, d] of EV.shake) if (t >= t0 && t - t0 < 2) { const k = a * Math.exp(-(t - t0) / d); x += k * noise1(t * 32 + t0); y += k * noise1(t * 29 + t0 + 7); r += k * 0.0012 * noise1(t * 21 + t0 + 3); }
  for (const [t0, a, d] of EV.punch) if (t >= t0 && t - t0 < 2.5) z += a * Math.exp(-(t - t0) / d);
  return { x, y, r, z };
}
module.exports = { bloom, grade, vignette, grain, letterbox, flashes, chromatic, chromaAmt, camShake };
