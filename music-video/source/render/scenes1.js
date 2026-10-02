'use strict';
// Cold open, spoken intro, title drop (0 – 41 s)
const C = require('./core');
const { W, H, clamp, lerp, inv, E, rnd, srnd, noise1, TAU, P, env, pop, WT, COL, text, tw, writeOn, eqn, mathText, line, arrow, rrect, circle,
  dimLine, pinSupport, rollerSupport, beamElev, udl, iSection, beam3D, stamp, burst, check, cross, rays, speedLines, emoji, shake, flash, punch, glitch,
  beatPulse, impactPulse, feS, ink, setFont } = C;

// ---------- small drawings
function student(ctx, x, y, s, t, o = {}) {
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  ctx.strokeStyle = ink(ctx, o.color || 'chalk'); ctx.lineWidth = 4; ctx.lineCap = 'round';
  circle(ctx, x, y - s * 0.55, s * 0.32); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y + s * 0.35, s * 0.55, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  ctx.restore();
}
function phone(ctx, x, y, s, rot, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= o.alpha ?? 1;
  rrect(ctx, -s * 0.5, -s, s, s * 2, s * 0.14); ctx.fillStyle = '#111'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#ddd'; ctx.stroke();
  const g = ctx.createLinearGradient(0, -s, 0, s); g.addColorStop(0, '#5b7cfa'); g.addColorStop(1, '#ff5fd2');
  rrect(ctx, -s * 0.42, -s * 0.86, s * 0.84, s * 1.72, s * 0.08); ctx.fillStyle = g; ctx.fill();
  for (let i = 0; i < 4; i++) { rrect(ctx, -s * 0.34, -s * 0.7 + i * s * 0.38, s * (0.45 + 0.2 * rnd(i)), s * 0.22, s * 0.08); ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.9)' : 'rgba(30,30,30,0.6)'; ctx.fill(); }
  ctx.restore();
}
function eye(ctx, x, y, r, open, lx, ly, o = {}) {
  ctx.save(); ctx.translate(x, y);
  const h = r * 0.62 * clamp(open);
  ctx.beginPath(); ctx.moveTo(-r, 0); ctx.quadraticCurveTo(0, -h * 2, r, 0); ctx.quadraticCurveTo(0, h * 2, -r, 0); ctx.closePath();
  ctx.fillStyle = '#f4f4ee'; ctx.fill(); ctx.save(); ctx.clip();
  const ir = r * 0.42;
  circle(ctx, lx * r * 0.4, ly * r * 0.25, ir); ctx.fillStyle = o.iris || '#2aa6c9'; ctx.fill();
  circle(ctx, lx * r * 0.4, ly * r * 0.25, ir * (o.pupil || 0.5)); ctx.fillStyle = '#050505'; ctx.fill();
  circle(ctx, lx * r * 0.4 - ir * 0.3, ly * r * 0.25 - ir * 0.3, ir * 0.18); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.restore();
  ctx.lineWidth = 5; ctx.strokeStyle = ink(ctx, 'chalk');
  ctx.beginPath(); ctx.moveTo(-r, 0); ctx.quadraticCurveTo(0, -h * 2, r, 0); ctx.quadraticCurveTo(0, h * 2, -r, 0); ctx.stroke();
  ctx.restore();
}
function chalkStick(ctx, x, y, len, rot, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= o.alpha ?? 1;
  rrect(ctx, -len / 2, -9, len, 18, 8); ctx.fillStyle = '#f3f3ea'; ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(-len / 2 + 4, 3, len - 8, 5);
  ctx.restore();
}

const S = [];
// ===================================================================== COLD OPEN 0 – 8.75
S.push({
  a: 0, b: 8.9, draw(ctx, t) {
    const out = 1 - P(t, 8.55, 0.3, E.inC);
    ctx.globalAlpha = out;
    const taps = [6.52, 7.02, 8.02];
    const bump = taps.reduce((v, tt) => v + (t >= tt ? 0.06 * Math.exp(-(t - tt) / 0.12) : 0), 0);
    ctx.save(); ctx.translate(W / 2, 450); ctx.scale(1 + bump, 1 + bump); ctx.translate(-W / 2, -450);
    writeOn(ctx, 'LOW SHEAR,', W / 2, 360, P(t, 0.5, 1.9, E.lin), { size: 190, fam: 'chalk', align: 'center', color: 'chalk' });
    writeOn(ctx, 'HIGH CAPACITY', W / 2, 560, P(t, 2.3, 2.0, E.lin), { size: 190, fam: 'chalk', align: 'center', color: 'yellow' });
    ctx.restore();
    line(ctx, [[520, 668], [1400, 668]], { color: 'yellow', lw: 6, prog: P(t, 4.2, 0.6), wob: 2, seed: 3 }, t);
    writeOn(ctx, 'a lecture-song on IS 800:2007  ·  ISMB 300  ·  Fe 410', W / 2, 740, P(t, 4.6, 1.6, E.lin), { size: 44, fam: 'hand', align: 'center', color: 'chalk', alpha: 0.85 });
    // chalk taps -> dots
    taps.forEach((tt, i) => { if (t >= tt) { circle(ctx, 860 + i * 100, 850, 9); ctx.fillStyle = ink(ctx, 'chalk'); ctx.fill(); burst(ctx, 860 + i * 100, 850, t, tt, { n: 18, vmin: 60, vmax: 260, size: 3, life: 0.6, seed: i * 9 }); } });
    // chalk stick taps then snaps at 8.0
    const tapY = taps.reduce((v, tt) => v + (t >= tt - 0.12 && t < tt ? -40 * (1 - (tt - t) / 0.12) : 0), 0);
    if (t > 5.6) {
      const k = P(t, 5.6, 0.5);
      if (t < 8.02) chalkStick(ctx, lerp(1300, 1080, k), 820 + tapY + (1 - k) * 80, 150, -0.6, { alpha: k });
      else { const d = t - 8.02; chalkStick(ctx, 1040 - d * 300, 820 + d * d * 1600, 80, -0.6 - d * 9); chalkStick(ctx, 1125 + d * 380, 790 + d * d * 1500 - d * 200, 70, -0.6 + d * 11); }
    }
    burst(ctx, 1080, 810, t, 8.02, { n: 50, vmin: 200, vmax: 900, size: 4, life: 0.8, seed: 21 });
    ctx.globalAlpha = 1;
  },
});
shake(8.02, 26, 0.25); punch(8.02, 0.04, 0.2);

// ===================================================================== ROLL CALL 8.75 – 13.95 (L00)
S.push({
  a: 8.75, b: 13.95, draw(ctx, t) {
    const tFifth = WT(0, 'fifth'), tPh = WT(0, 'phones'), tAw = WT(0, 'away'), tEy = WT(0, 'eyes'), tBd = WT(0, 'board');
    // 5TH SEMESTER
    if (t < tPh + 0.1) {
      const a = env(t, 8.75, tPh + 0.1, 0.15, 0.2), k = pop(t, tFifth - 0.05, 0.25, 0.2);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, 430); ctx.scale(k, k);
      text(ctx, '5TH', 0, -90, { size: 230, fam: 'chalk', color: 'yellow' });
      text(ctx, 'SEMESTER', 0, 110, { size: 150, fam: 'chalk', color: 'chalk' });
      ctx.restore();
      ctx.globalAlpha = a;
      text(ctx, 'ALRIGHT,', W / 2, 160, { size: 70, fam: 'marker', color: 'chalk', alpha: P(t, 8.79, 0.2), scale: pop(t, 8.79) });
      // roll call scribbles
      line(ctx, Array.from({ length: 30 }, (_, i) => { const a2 = (i / 29) * TAU * 1.05; return [W / 2 + Math.cos(a2) * 470, 440 + Math.sin(a2) * 260]; }), { color: 'chalk', lw: 5, prog: P(t, tFifth + 0.1, 0.6), wob: 4, seed: 5, alpha: 0.8 }, t);
      ctx.globalAlpha = 1;
    }
    // PHONES AWAY
    if (t >= tPh - 0.3 && t < tEy) {
      const a = env(t, tPh - 0.3, tEy, 0.12, 0.15), slap = t >= tAw ? t - tAw : -1;
      const px = slap < 0 ? lerp(1500, 960, P(t, tPh - 0.3, 0.3, E.outBack)) : 960 - slap * 2600, py = slap < 0 ? 500 : 500 + slap * 600 - slap * slap * -900;
      ctx.globalAlpha = a;
      phone(ctx, px, py, 150, slap < 0 ? 0.08 * Math.sin(t * 20) : -slap * 14);
      if (slap >= 0) { burst(ctx, 960, 500, t, tAw, { n: 26, vmin: 300, vmax: 900, size: 5, color: ['#fff', '#ffd23f'], life: 0.5, seed: 33 }); }
      // hand slap
      if (slap >= -0.12 && slap < 0.35) emoji(ctx, '✋', lerp(1350, 1000, clamp((slap + 0.12) / 0.12)), 470, 220, { alpha: 1 - clamp((slap - 0.15) / 0.2) });
      stamp(ctx, 'PHONES AWAY', 960, 840, t, tAw, { size: 90, color: COL.red, rot: -0.06 });
      ctx.globalAlpha = 1;
    }
    // EYES ON THE BOARD
    if (t >= tEy - 0.15) {
      const a = env(t, tEy - 0.15, 13.95, 0.12, 0.25), op = E.outBack(P(t, tEy - 0.1, 0.25, E.lin));
      const blink = t > tBd + 0.55 && t < tBd + 0.7 ? 0.1 : 1;
      const lx = t < tBd ? Math.sin((t - tEy) * 9) * 0.8 : lerp(0, 0, 1), ly = t < tBd ? 0 : -0.8 * P(t, tBd, 0.2);
      ctx.globalAlpha = a;
      eye(ctx, 760, 470, 190, op * blink, lx, ly); eye(ctx, 1160, 470, 190, op * blink, lx, ly);
      if (t >= tBd) { text(ctx, 'ON THE BOARD', W / 2, 800, { size: 110, fam: 'chalk', color: 'yellow', scale: pop(t, tBd, 0.2) }); arrow(ctx, 960, 690, 960, 580, { color: 'yellow', lw: 6, prog: P(t, tBd + 0.1, 0.25), head: 26 }); }
      ctx.globalAlpha = 1;
    }
  },
});
shake(WT(0, 'away'), 22, 0.2); punch(WT(0, 'fifth'), 0.05, 0.2); punch(WT(0, 'eyes'), 0.05, 0.25);

// ===================================================================== MIDTERM / PIN vs ROLLER 13.95 – 19.2 (L01)
S.push({
  a: 13.95, b: 19.2, draw(ctx, t) {
    const tHalf = WT(1, 'half'), tFail = WT(1, 'failed'), tMid = WT(1, 'midterm'), tDiff = WT(1, 'difference'), tPin = WT(1, 'pin'), tRol = WT(1, 'roller');
    const up = P(t, tDiff - 0.25, 0.4, E.ioC); // students move up/shrink
    ctx.save(); ctx.translate(W / 2, 0); ctx.scale(lerp(1, 0.5, up), lerp(1, 0.5, up)); ctx.translate(-W / 2, lerp(0, -40, up)); ctx.globalAlpha *= lerp(1, 0.55, up);
    text(ctx, 'MIDTERM RESULTS', W / 2, 170, { size: 84, fam: 'chalk', color: 'chalk', alpha: P(t, tMid - 0.1, 0.2) * (1 - up), scale: pop(t, tMid - 0.1) });
    for (let i = 0; i < 10; i++) {
      const x = 360 + (i % 5) * 300, y = 380 + Math.floor(i / 5) * 230, ti = tHalf + i * 0.04;
      if (t < ti) continue;
      const failed = i % 2 === 1, tf = tFail + Math.floor(i / 2) * 0.07;
      student(ctx, x, y, 150, t, { color: failed && t >= tf ? 'red' : 'chalk', alpha: P(t, ti, 0.15) });
      if (failed && t >= tf) text(ctx, 'F', x + 70, y - 90, { size: 110, fam: 'marker', color: COL.red, scale: pop(t, tf, 0.15, 2.5), rot: -0.2 });
    }
    ctx.restore();
    if (t >= tFail && t < tDiff) stamp(ctx, '50% FAILED', W / 2, 900 - 40, t, tFail + 0.35, { size: 76, color: COL.red, rot: 0.05 });
    // PIN vs ROLLER
    if (t >= tDiff - 0.2) {
      const a = P(t, tDiff - 0.2, 0.3);
      ctx.globalAlpha = a;
      const pinX = 620, rolX = 1300, y = 560;
      // pin
      if (t >= tPin - 0.05) {
        const k = pop(t, tPin - 0.05, 0.2, 0.3);
        ctx.save(); ctx.translate(pinX, y); ctx.scale(k, k); ctx.translate(-pinX, -y);
        pinSupport(ctx, pinX, y, 70, { lw: 6 });
        arrow(ctx, pinX - 190, y, pinX - 20, y, { color: 'cyan', lw: 6, head: 22, prog: P(t, tPin + 0.1, 0.2) });
        arrow(ctx, pinX, y + 190, pinX, y + 20, { color: 'cyan', lw: 6, head: 22, prog: P(t, tPin + 0.18, 0.2) });
        text(ctx, 'R', pinX - 210, y - 40, { size: 48, fam: 'hand', color: 'cyan', alpha: P(t, tPin + 0.2, 0.2) }); text(ctx, 'x', pinX - 180, y - 28, { size: 30, fam: 'hand', color: 'cyan', alpha: P(t, tPin + 0.2, 0.2) });
        text(ctx, 'R', pinX + 50, y + 175, { size: 48, fam: 'hand', color: 'cyan', alpha: P(t, tPin + 0.25, 0.2) }); text(ctx, 'y', pinX + 80, y + 187, { size: 30, fam: 'hand', color: 'cyan', alpha: P(t, tPin + 0.25, 0.2) });
        ctx.restore();
        text(ctx, 'PIN', pinX, y - 120, { size: 90, fam: 'chalk', color: 'yellow', scale: pop(t, tPin) });
        text(ctx, '2 reactions', pinX, y + 260, { size: 44, fam: 'hand', color: 'chalk', alpha: P(t, tPin + 0.3, 0.2) });
      }
      if (t >= tPin + 0.1) text(ctx, '≠', W / 2 + 20, y + 40, { size: 160, fam: 'dejavu', color: 'chalk', scale: pop(t, tPin + 0.15) });
      if (t >= tRol - 0.05) {
        const k = pop(t, tRol - 0.05, 0.2, 0.3);
        ctx.save(); ctx.translate(rolX, y); ctx.scale(k, k); ctx.translate(-rolX, -y);
        rollerSupport(ctx, rolX, y, 70, { lw: 6, roll: t * 6 });
        arrow(ctx, rolX, y + 190, rolX, y + 20, { color: 'cyan', lw: 6, head: 22, prog: P(t, tRol + 0.12, 0.2) });
        text(ctx, 'R', rolX + 50, y + 175, { size: 48, fam: 'hand', color: 'cyan', alpha: P(t, tRol + 0.2, 0.2) }); text(ctx, 'y', rolX + 80, y + 187, { size: 30, fam: 'hand', color: 'cyan', alpha: P(t, tRol + 0.2, 0.2) });
        cross(ctx, rolX - 150, y, 60, P(t, tRol + 0.3, 0.25));
        ctx.restore();
        text(ctx, 'ROLLER', rolX, y - 120, { size: 90, fam: 'chalk', color: 'yellow', scale: pop(t, tRol) });
        text(ctx, '1 reaction', rolX, y + 260, { size: 44, fam: 'hand', color: 'chalk', alpha: P(t, tRol + 0.3, 0.2) });
      }
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = 1 - P(t, 19.0, 0.2);
  },
});
shake(WT(1, 'failed'), 16, 0.25); punch(WT(1, 'pin'), 0.04, 0.2); punch(WT(1, 'roller'), 0.04, 0.2);

// ===================================================================== TODAY: LATERAL STABILITY CHECK 19.2 – 23.65 (L02)
S.push({
  a: 19.2, b: 23.65, draw(ctx, t) {
    const a = env(t, 19.2, 23.65, 0.15, 0.2); ctx.globalAlpha = a;
    const tTo = WT(2, 'today'), tLat = WT(2, 'lateral'), tSt = WT(2, 'stability'), tCh = WT(2, 'check'), tSteel = WT(2, 'steel'), tBeam = WT(2, 'beam');
    writeOn(ctx, 'TODAY:', 150, 150, P(t, tTo, 0.35, E.lin), { size: 80, fam: 'chalk', color: 'yellow' });
    line(ctx, [[150, 195], [400, 195]], { color: 'yellow', lw: 5, prog: P(t, tTo + 0.3, 0.2), wob: 2 }, t);
    writeOn(ctx, 'LATERAL', 300, 290, P(t, tLat, 0.4, E.lin), { size: 120, fam: 'chalk' });
    writeOn(ctx, 'STABILITY', 760, 290, P(t, tSt, 0.45, E.lin), { size: 120, fam: 'chalk' });
    writeOn(ctx, 'CHECK', 1340, 290, P(t, tCh, 0.25, E.lin), { size: 120, fam: 'chalk', color: 'yellow' });
    if (t > tCh + 0.2) check(ctx, 1770, 280, 70, P(t, tCh + 0.2, 0.25));
    // steel beam flies in
    if (t >= tSteel - 0.4) {
      const k = P(t, tSteel - 0.4, 0.8, E.outC);
      const yaw = lerp(2.2, -0.62, k) + 0.04 * Math.sin(t), cx = lerp(1700, 960, k);
      const shine = t >= tBeam ? Math.exp(-(t - tBeam) / 0.35) : 0;
      beam3D(ctx, { cx, cy: 600, sc: 0.42, len: 2600, yaw, pitch: 0.3, dist: 3200, base: [175 + 60 * shine, 188 + 55 * shine, 200 + 50 * shine], edge: `rgba(255,255,255,${0.35 + 0.6 * shine})`, capFill: '#e8eef3' });
      if (t >= tBeam) {
        burst(ctx, cx + 300, 520, t, tBeam, { n: 24, vmin: 100, vmax: 500, size: 4, color: ['#fff', '#ffd23f'], life: 0.6, seed: 77, g: 0 });
        text(ctx, 'STEEL BEAM · ISMB 300', W / 2, 820, { size: 50, fam: 'mono', color: 'chalk', alpha: P(t, tBeam, 0.2), ls: 4 });
      }
    }
    ctx.globalAlpha = 1;
  },
});
punch(WT(2, 'check'), 0.04, 0.2); punch(WT(2, 'steel'), 0.03, 0.3);

// ===================================================================== ROOF CAVES IN 23.65 – 29.2 (L03)
const tRoof = () => WT(3, 'roof'), tCave = () => WT(3, 'caves');
S.push({
  a: 23.65, b: 29.25, draw(ctx, t) {
    const a = env(t, 23.65, 29.25, 0.15, 0.15); ctx.globalAlpha = a;
    const tIf = WT(3, 'if'), tReal = WT(3, 'real'), tR = tRoof(), tC = tCave(), tHit = 27.75;
    const gx0 = 420, gx1 = 1500, gy = 800, top = 360;
    // ground
    line(ctx, [[260, gy], [1660, gy]], { lw: 5, prog: P(t, tIf, 0.4), wob: 1.5, seed: 9 }, t);
    // columns
    for (const cx of [gx0, gx1]) { line(ctx, [[cx, gy], [cx, top]], { lw: 8, prog: P(t, tIf + 0.15, 0.4), wob: 1.2, seed: cx }, t); }
    // students inside
    for (let i = 0; i < 5; i++) student(ctx, 640 + i * 160, 715, 110, t, { alpha: P(t, tIf + 0.4 + i * 0.05, 0.2) });
    // roof beam: intact -> crack -> sag -> collapse
    const mid = (gx0 + gx1) / 2;
    if (t < tHit) {
      const sagv = 40 * P(t, tC, 0.5, E.inQ) + 6 * Math.sin(t * 40) * P(t, tR, 0.2) * (t < tC ? 1 : 0);
      line(ctx, [[gx0 - 30, top], [mid, top + sagv]], { lw: 12, prog: P(t, tIf + 0.4, 0.3), color: 'chalk' }, t);
      line(ctx, [[mid, top + sagv], [gx1 + 30, top]], { lw: 12, prog: P(t, tIf + 0.55, 0.3), color: 'chalk' }, t);
      if (t >= tR) line(ctx, [[mid - 10, top - 26], [mid + 12, top - 8], [mid - 8, top + 6], [mid + 10, top + 26 + sagv]], { lw: 5, color: 'red', prog: P(t, tR, 0.2), glow: 'rgba(255,60,60,0.8)' }, t);
    } else {
      const d = t - tHit, fall = Math.min(1.25, d * d * 9 + d * 2.5);
      for (const side of [-1, 1]) {
        const px = side < 0 ? gx0 : gx1, ang = side * -Math.min(1.25, fall);
        const ex = px + Math.cos(ang) * (mid - gx0) * -side, ey = top + Math.sin(-ang) * (mid - gx0) * side * -1;
        line(ctx, [[px, top], [px + (mid - px) * Math.cos(Math.min(1.2, fall)), top + Math.abs(mid - px) * Math.sin(Math.min(1.2, fall))]], { lw: 12, color: 'red' }, t);
      }
      burst(ctx, mid, gy - 40, t, tHit, { n: 70, vmin: 200, vmax: 1100, size: 7, life: 1.2, g: 300, seed: 3, color: ['#eef0e6', '#bbbbbb', '#ff4d4d'] });
      stamp(ctx, 'ROOF: CAVED IN', W / 2, 220, t, tHit + 0.35, { size: 92, color: COL.red, rot: -0.08 });
      emoji(ctx, '💀', 1640, 520, 150, { scale: pop(t, tHit + 0.5, 0.25), alpha: P(t, tHit + 0.5, 0.1) });
    }
    if (t >= tReal) text(ctx, 'REAL WORLD', 1640, 260, { size: 64, fam: 'marker', color: COL.yellow, rot: 0.12, scale: pop(t, tReal), alpha: 1 - P(t, tHit, 0.2) });
    ctx.globalAlpha = 1;
  },
});
shake(27.75, 34, 0.35); flash(27.75, 0.45, 0.2, '#ff3b30'); punch(27.75, 0.06, 0.3); shake(WT(3, 'roof'), 8, 0.2);

// ===================================================================== PAY ATTENTION / HIT THE TRACK 29.2 – 31.75 (L04)
S.push({
  a: 29.2, b: 31.75, draw(ctx, t) {
    const tSo = WT(4, 'so'), tAtt = WT(4, 'attention'), tHit = WT(4, 'hit'), tThe = WT(4, 'the'), tTr = WT(4, 'track');
    const dim = P(t, 30.0, 0.35);
    // spotlight in the silence
    ctx.fillStyle = `rgba(0,0,0,${0.7 * dim})`; ctx.fillRect(-100, -100, W + 200, H + 200);
    if (t < 30.4) {
      ctx.globalAlpha = 1 - P(t, 30.1, 0.3);
      text(ctx, 'SO PAY', W / 2, 360, { size: 170, fam: 'marker', color: COL.red, scale: pop(t, tSo), rot: -0.04 });
      text(ctx, 'ATTENTION.', W / 2, 560, { size: 190, fam: 'marker', color: 'chalk', scale: pop(t, tAtt), rot: 0.03 });
      line(ctx, [[480, 680], [800, 660], [1100, 690], [1450, 665]], { color: 'red', lw: 10, prog: P(t, tAtt + 0.2, 0.3), wob: 3 }, t);
      ctx.globalAlpha = 1;
    }
    const words = [['HIT', tHit, 330], ['THE', tThe, 520], ['TRACK!', tTr, 760]];
    for (const [w, tt, y] of words) if (t >= tt) {
      text(ctx, w, W / 2, y, { size: w === 'TRACK!' ? 300 : 170, fam: 'anton', color: w === 'TRACK!' ? COL.yellow : '#fff', scale: pop(t, tt, 0.14, 2.2), stroke: '#000', strokeW: 14, glow: w === 'TRACK!' ? 'rgba(255,210,63,0.8)' : null, glowR: 40 });
    }
    // countdown ticks over the silence
    if (t > 30.0 && t < tHit) { const k = (t - 30.0) / (tHit - 30.0); circle(ctx, W / 2, 540, 30 + 300 * k); ctx.strokeStyle = `rgba(255,210,63,${0.6 * (1 - k)})`; ctx.lineWidth = 4; ctx.stroke(); }
  },
});
punch(WT(4, 'hit'), 0.05, 0.15); punch(WT(4, 'track'), 0.08, 0.2); shake(WT(4, 'track'), 12, 0.2);

// ===================================================================== TITLE DROP 31.73 – 41.2 (instrumental)
const DROP = 31.73;
const chips = [
  ['ISMB 300', COL.yellow], ['Fe 410', '#fff'], ['f_{y} = 250 MPa', COL.cyan], ['L = 5 m', '#fff'], ['w_{u} = 40 kN/m', COL.yellow], ['IS 800:2007', '#fff'],
  ['SIMPLY SUPPORTED', COL.cyan], ['LATERALLY RESTRAINED', COL.green],
];
S.push({
  a: DROP, b: 41.25, draw(ctx, t) {
    const k = t - DROP, bp = beatPulse(t), lo = feS('low', t, 2);
    // match-cut: at the end the beam turns side-on to become the chalk elevation
    const side = P(t, 39.6, 1.3, E.ioC);
    const yaw = lerp(-0.7 + k * 0.55, Math.PI / 2, side), pitch = lerp(0.38 + 0.08 * Math.sin(k * 0.7), 0.0, side);
    rays(ctx, W / 2, 540, t, { alpha: 0.07 * (1 - side), color: '#ffd23f', n: 20 });
    const len = lerp(2000, 6000, side), sc = lerp(0.55 + 0.03 * bp, 1000 / 6000, side);
    beam3D(ctx, { cx: lerp(W / 2, 650, side), cy: lerp(545, 360, side), sc, len, yaw, pitch, dist: lerp(3600, 60000, side), base: [182, 194, 206], edge: 'rgba(255,255,255,0.4)', alpha: 1 - P(t, 40.9, 0.3) });
    ctx.globalAlpha = 1 - side;
    // title
    const tl = pop(t, DROP, 0.25, 2.4);
    text(ctx, 'LOW SHEAR,', W / 2, 190, { size: 200, fam: 'anton', color: '#fff', scale: tl * (1 + 0.03 * bp), stroke: '#000', strokeW: 16, ls: 4 });
    text(ctx, 'HIGH CAPACITY', W / 2, 900, { size: 200, fam: 'anton', color: COL.yellow, scale: pop(t, DROP + 0.33, 0.25, 2.4) * (1 + 0.03 * bp), stroke: '#000', strokeW: 16, ls: 4, glow: 'rgba(255,210,63,0.6)', glowR: 40 });
    // spec chips orbiting, one per beat
    chips.forEach(([s, c], i) => {
      const ti = DROP + 1.3 + i * 0.66; if (t < ti) return;
      const ang = -Math.PI / 2 + i * (TAU / chips.length) + k * 0.25, rx = 700, ry = 205;
      const x = W / 2 + Math.cos(ang) * rx, y = 545 + Math.sin(ang) * ry, sz = 46;
      const ww = C.mathW(ctx, s, sz, 'mono') + 40;
      ctx.save(); ctx.translate(x, y); const kk = pop(t, ti, 0.2, 0.2); ctx.scale(kk, kk);
      rrect(ctx, -ww / 2, -38, ww, 76, 38); ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = c; ctx.stroke();
      C.mathText(ctx, s, 0, 2, { size: sz, fam: 'mono', color: c, align: 'center' });
      ctx.restore();
    });
    ctx.globalAlpha = 1;
    // chalk elevation fades in at the very end (continuity into verse 1)
    if (t > 40.3) {
      const a = P(t, 40.3, 0.8);
      ctx.globalAlpha = a; beamElev(ctx, 150, 1150, 360, 44, { prog: 1 }); ctx.globalAlpha = 1;
    }
  },
});
flash(DROP, 0.9, 0.3); shake(DROP, 30, 0.35); punch(DROP, 0.1, 0.35); glitch(DROP - 0.02, 0.16, 1);
flash(41.25, 0.35, 0.18);

module.exports = { S, student, phone, eye, chalkStick };
