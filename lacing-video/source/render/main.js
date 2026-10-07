'use strict';
// Frame composer for the lacing music video: scenes -> bloom/grade -> flashes -> vignette -> letterbox -> lyrics -> grain.
const X = require('./engine');
const PP = require('./post');
const K = require('./kit');
const { createCanvas, W, H, FPS, DUR, clamp, lerp, E, SEC, TL } = X;
const { spawn } = require('child_process');
const fs = require('fs');

const parts = ['./sc_a', './sc_b', './sc_c'].map((p) => { try { return require(p); } catch (e) { if (e.code === 'MODULE_NOT_FOUND' && e.message.includes(p.slice(2))) return { S: [] }; throw e; } });
const SCENES = parts.flatMap((p) => p.S);

const canvas = createCanvas(W, H), ctx = canvas.getContext('2d');
const glowC = createCanvas(W, H), gctx = glowC.getContext('2d');

// letterbox amount over time (cinematic bars in the quiet / epic parts)
const LB = [[0, 1], [SEC.data.a + 0.6, 0], [SEC.break.a - 0.2, 1], [SEC.checks.a + 0.4, 0], [SEC.inst.a - 0.1, 1], [SEC.chorus.a - 0.2, 0], [SEC.breakdown.a, 1], [SEC.verse3.a - 0.1, 0], [SEC.outro.a - 0.3, 1]];
function letterboxAt(t) {
  let v = LB[0][1];
  for (let i = 0; i < LB.length; i++) { const [t0, target] = LB[i]; if (t >= t0) { const prev = i ? LB[i - 1][1] : target; v = lerp(prev, target, E.ioC(clamp((t - t0) / 0.7))); } }
  return v;
}

function renderFrame(fi) {
  const t = fi / FPS;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  gctx.setTransform(1, 0, 0, 1, 0, 0); gctx.globalAlpha = 1; gctx.globalCompositeOperation = 'source-over'; gctx.filter = 'none';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); gctx.clearRect(0, 0, W, H);
  const cs = PP.camShake(t);
  const kick = X.feS('kick', t, 4), bp = X.beatPulse(t, 0.12);
  const breathe = 1 + cs.z + 0.006 * bp * (t > SEC.verse1.a ? 1 : 0.3);
  for (const c of [ctx, gctx]) { c.translate(W / 2 + cs.x, H / 2 + cs.y); c.rotate(cs.r); c.scale(breathe, breathe); c.translate(-W / 2, -H / 2); }
  for (const sc of SCENES) if (t >= sc.a && t < sc.b) { ctx.save(); gctx.save(); sc.draw(ctx, gctx, t, sc); ctx.restore(); gctx.restore(); }
  ctx.setTransform(1, 0, 0, 1, 0, 0); gctx.setTransform(1, 0, 0, 1, 0, 0);
  void kick;
  PP.bloom(ctx, canvas, glowC, 0.62, 0.85);
  PP.grade(ctx, 0.24);
  PP.chromatic(ctx, canvas, PP.chromaAmt(t));
  PP.flashes(ctx, t);
  PP.vignette(ctx, 0.95);
  PP.letterbox(ctx, letterboxAt(t));
  K.lyricRail(ctx, t, { band: 0.5 * (1 - letterboxAt(t)) + 0.05 });
  PP.grain(ctx, fi, 0.045);
  const fin = clamp(t / 0.5), fout = clamp((DUR - 0.4 - t) / 3.2);
  if (fin < 1 || fout < 1) { ctx.globalAlpha = 1 - Math.min(fin, fout); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}

const args = process.argv.slice(2);
if (args[0] === 'still') {
  const out = args[1], times = args.slice(2).map(Number);
  if (times.length === 1) { renderFrame(Math.round(times[0] * FPS)); fs.writeFileSync(out, canvas.toBuffer('image/png')); }
  else {
    const cols = 3, rows = Math.ceil(times.length / cols), tw_ = W / cols, th = H / cols;
    const sheet = createCanvas(W, th * rows), sx = sheet.getContext('2d');
    times.forEach((tt, i) => { renderFrame(Math.round(tt * FPS)); sx.drawImage(canvas, (i % cols) * tw_, Math.floor(i / cols) * th, tw_, th); sx.fillStyle = '#000'; sx.fillRect((i % cols) * tw_, Math.floor(i / cols) * th, 120, 34); sx.fillStyle = '#ff0'; sx.font = '26px "DejaVu Sans"'; sx.fillText(tt.toFixed(2), (i % cols) * tw_ + 6, Math.floor(i / cols) * th + 26); });
    fs.writeFileSync(out, sheet.toBuffer('image/png'));
  }
} else if (args[0] === 'render') {
  const f0 = +args[1], f1 = Math.min(+args[2], Math.ceil(DUR * FPS)), out = args[3];
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', process.env.PRESET || 'slow', '-crf', process.env.CRF || '20', '-pix_fmt', 'yuv420p', '-threads', '2', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  let fi = f0; const t0 = Date.now();
  const pump = () => {
    while (fi < f1) {
      renderFrame(fi);
      const ok = ff.stdin.write(Buffer.from(canvas.data()));
      fi++;
      if (fi % 300 === 0) process.stderr.write(`[${f0}-${f1}] ${fi} ${((fi - f0) / ((Date.now() - t0) / 1000)).toFixed(1)} fps\n`);
      if (!ok) { ff.stdin.once('drain', pump); return; }
    }
    ff.stdin.end();
  };
  ff.on('close', (code) => { process.stderr.write(`done ${out} code ${code} in ${((Date.now() - t0) / 1000).toFixed(0)}s\n`); process.exit(code); });
  pump();
}
module.exports = { renderFrame };
