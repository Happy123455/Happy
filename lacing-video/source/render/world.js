'use strict';
// 3D: camera, flat-shaded mesh renderer (painter's algorithm with near-plane clipping), and the laced column model.
const X = require('./engine');
const { W, H, clamp, lerp, TAU, DEG, v3, rnd } = X;

// ------------------------------------------------------------------ camera
function camera(pos, tgt, fov = 40, roll = 0) {
  const f = v3.norm(v3.sub(tgt, pos));
  let up = [Math.sin(roll), Math.cos(roll), 0];
  if (Math.abs(v3.dot(f, [0, 1, 0])) > 0.995) up = [0, 0, -1];
  const r = v3.norm(v3.cross(f, up)), u = v3.cross(r, f);
  // apply roll around forward axis
  const cr = Math.cos(roll), sr = Math.sin(roll);
  const r2 = v3.add(v3.mul(r, cr), v3.mul(u, sr)), u2 = v3.sub(v3.mul(u, cr), v3.mul(r, sr));
  return { pos, f, r: roll ? r2 : r, u: roll ? u2 : u, focal: (H / 2) / Math.tan((fov * DEG) / 2), near: 40, cx: W / 2, cy: H / 2 };
}
function toCam(c, p) { const d = [p[0] - c.pos[0], p[1] - c.pos[1], p[2] - c.pos[2]]; return [d[0] * c.r[0] + d[1] * c.r[1] + d[2] * c.r[2], d[0] * c.u[0] + d[1] * c.u[1] + d[2] * c.u[2], d[0] * c.f[0] + d[1] * c.f[1] + d[2] * c.f[2]]; }
function scr(c, q) { return [c.cx + (q[0] * c.focal) / q[2], c.cy - (q[1] * c.focal) / q[2], q[2]]; }
function project(c, p) { const q = toCam(c, p); if (q[2] < c.near) return null; return scr(c, q); }
function clipNear(poly, near) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], ina = a[2] >= near, inb = b[2] >= near;
    if (ina) out.push(a);
    if (ina !== inb) { const t = (near - a[2]) / (b[2] - a[2]); out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t), near]); }
  }
  return out;
}

// ------------------------------------------------------------------ lighting
const LIGHTS = {
  key: { d: v3.norm([0.5, 0.62, 0.62]), c: [1.0, 0.86, 0.72], i: 1.3 },
  rim: { d: v3.norm([-0.72, 0.32, -0.62]), c: [0.45, 0.72, 1.0], i: 0.75 },
  fill: { d: v3.norm([-0.4, -0.3, 0.85]), c: [0.2, 0.25, 0.34], i: 0.75 },
  amb: [0.05, 0.055, 0.07],
};
function shade(n, center, cam, base, mat, lights) {
  const Ls = lights || LIGHTS;
  const vdir = v3.norm(v3.sub(cam.pos, center));
  let r = Ls.amb[0], g = Ls.amb[1], b = Ls.amb[2], sr = 0, sg = 0, sb = 0;
  for (const k of ['key', 'rim', 'fill']) {
    const L = Ls[k]; if (!L || L.i <= 0) continue;
    const nd = Math.max(0, v3.dot(n, L.d)) * L.i;
    r += L.c[0] * nd; g += L.c[1] * nd; b += L.c[2] * nd;
    const h = v3.norm(v3.add(L.d, vdir)), s = Math.pow(Math.max(0, v3.dot(n, h)), mat.shin || 40) * (mat.spec ?? 0.6) * L.i;
    sr += L.c[0] * s; sg += L.c[1] * s; sb += L.c[2] * s;
  }
  // fresnel rim brightening
  const fr = Math.pow(1 - Math.max(0, v3.dot(n, vdir)), 3) * (mat.fres ?? 0.25);
  return [base[0] * r + 255 * (sr + fr * 0.6), base[1] * g + 255 * (sg + fr * 0.75), base[2] * b + 255 * (sb + fr)];
}

// ------------------------------------------------------------------ face builders
function quad(a, b, c, d, n, part, extra) { return Object.assign({ pts: [a, b, c, d], n, part }, extra || {}); }
function polyArea2(p) { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s; }
// extrude an (x,z) polygon along y from y0 to y1 in nseg segments
function extrudeY(poly, y0, y1, nseg, part, extra) {
  const faces = [], ccw = polyArea2(poly) > 0, n = poly.length;
  for (let s = 0; s < nseg; s++) {
    const ya = lerp(y0, y1, s / nseg), yb = lerp(y0, y1, (s + 1) / nseg);
    for (let i = 0; i < n; i++) {
      const p = poly[i], q = poly[(i + 1) % n], dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1;
      // outward normal in xz for polygon orientation (x right, z "up" in plan)
      const nrm = ccw ? [dz / l, 0, -dx / l] : [-dz / l, 0, dx / l];
      faces.push(quad([p[0], ya, p[1]], [q[0], ya, q[1]], [q[0], yb, q[1]], [p[0], yb, p[1]], nrm, part, Object.assign({ seg: s, edge: i }, extra)));
    }
  }
  faces.push(Object.assign({ pts: poly.map((p) => [p[0], y1, p[1]]), n: [0, 1, 0], part, cap: 1 }, extra));
  faces.push(Object.assign({ pts: poly.map((p) => [p[0], y0, p[1]]).reverse(), n: [0, -1, 0], part, cap: -1 }, extra));
  return faces;
}
// oriented box from centre-line p0->p1 (in a plane), width w (along in-plane normal), thickness t along axis 'out'
function bar(p0, p1, w, t, out, part, extra) {
  const d = v3.norm(v3.sub(p1, p0)), o = v3.norm(out), s = v3.norm(v3.cross(o, d)); // s: in-plane width dir
  const hw = w / 2, A = (p, sw, so) => v3.add(v3.add(p, v3.mul(s, sw)), v3.mul(o, so));
  const a0 = A(p0, -hw, 0), a1 = A(p0, hw, 0), a2 = A(p0, hw, t), a3 = A(p0, -hw, t);
  const b0 = A(p1, -hw, 0), b1 = A(p1, hw, 0), b2 = A(p1, hw, t), b3 = A(p1, -hw, t);
  const nd = v3.mul(d, -1);
  return [
    quad(a3, a2, b2, b3, o, part, Object.assign({ top: 1 }, extra)), quad(a0, b0, b1, a1, v3.mul(o, -1), part, extra),
    quad(a1, b1, b2, a2, s, part, extra), quad(a0, a3, b3, b0, v3.mul(s, -1), part, extra),
    quad(a0, a1, a2, a3, nd, part, extra), quad(b0, b3, b2, b1, d, part, extra),
  ];
}
// hexagon-head bolt at centre c on a surface whose outward axis is 'ax'; rotation 'rot' about the axis
function boltHead(c, ax, rot, part, extra, sz = 1) {
  const a = v3.norm(ax), ref = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const e1 = v3.norm(v3.cross(a, ref)), e2 = v3.cross(a, e1);
  const R = 13.9 * sz, hgt = 10 * sz, faces = [], ring = (h, r) => Array.from({ length: 6 }, (_, i) => { const th = rot + i * TAU / 6; return v3.add(v3.add(c, v3.mul(a, h)), v3.add(v3.mul(e1, Math.cos(th) * r), v3.mul(e2, Math.sin(th) * r))); });
  const b = ring(0, R), tp = ring(hgt, R);
  for (let i = 0; i < 6; i++) { const j = (i + 1) % 6, mid = v3.norm(v3.sub(v3.lerp(b[i], b[j], 0.5), c)); faces.push(quad(b[i], b[j], tp[j], tp[i], v3.norm(v3.sub(mid, v3.mul(a, v3.dot(mid, a)))), part, extra)); }
  faces.push(Object.assign({ pts: tp.slice().reverse(), n: a, part, cap: 1 }, extra));
  // washer ring under the head (12-gon, very thin)
  const wr = Array.from({ length: 12 }, (_, i) => { const th = i * TAU / 12; return v3.add(v3.add(c, v3.mul(a, -1.5 * sz)), v3.add(v3.mul(e1, Math.cos(th) * 17 * sz), v3.mul(e2, Math.sin(th) * 17 * sz))); });
  faces.push(Object.assign({ pts: wr.slice().reverse(), n: a, part: part + 'W' }, extra));
  return faces;
}

// ------------------------------------------------------------------ the laced column model (mm)
const COLM = { s: 240, bf: 100, h: 350, tf: 13.5, tw: 8.1, g: 50, a1: 340, a: 680, L: 5000, tieH: 320, nodes: 13, y0: 460, barW: 50, barT: 14, ext: 30 };
function channelPoly(side) { // side -1 = left channel (A), +1 = right (B); flanges point outward
  const { s, bf, h, tf, tw } = COLM, xb = side * s / 2, xt = side * (s / 2 + bf), xw = side * (s / 2 + tw), zh = h / 2;
  return [[xb, -zh], [xb, zh], [xt, zh], [xt, zh - tf], [xw, zh - tf], [xw, -zh + tf], [xt, -zh + tf], [xt, -zh]];
}
function nodeY(k) { return COLM.y0 + COLM.a1 * k; }
function nodeX(k, face) { const left = (k % 2 === 0) === (face > 0); return left ? -(COLM.s / 2 + COLM.g) : COLM.s / 2 + COLM.g; }
// state: { chanH: 0..1 (height grow), bars: number of bars shown per face (float, fractional = sliding in), bolts: 0..1, tie: 0..1, explode: 0..1 }
function columnFaces(st = {}) {
  const faces = [], L = COLM.L * (st.chanH ?? 1), nseg = st.nseg || 16;
  if (L > 1) for (const side of [-1, 1]) faces.push(...extrudeY(channelPoly(side), 0, L, nseg, side < 0 ? 'chanA' : 'chanB', { base: [92, 98, 108] }));
  const zf = COLM.h / 2;
  // tie plates (end battens) front and back
  if ((st.tie ?? 1) > 0) {
    const tk = st.tie ?? 1;
    for (const [y0, y1] of [[20, COLM.tieH], [COLM.L - COLM.tieH, COLM.L - 20]]) {
      if (y1 > L) continue;
      for (const face of [1, -1]) {
        const z0 = face * zf, t = 10 * face, pull = (1 - tk) * 400 * face;
        const pts = [[-215, y0, z0 + pull], [215, y0, z0 + pull], [215, y1, z0 + pull], [-215, y1, z0 + pull]];
        const out = [0, 0, face];
        faces.push(...bar([0, y0, z0 + pull], [0, y1, z0 + pull], 430, Math.abs(t), out, 'tie', { base: [104, 110, 120] }));
        void pts;
      }
    }
  }
  // lacing bars, alternating layers so the joints overlap like real single lacing
  const nb = st.bars ?? COLM.nodes - 1;
  for (const face of [1, -1]) {
    for (let k = 0; k < COLM.nodes - 1; k++) {
      const vis = clamp(nb - k); if (vis <= 0) break;
      const layer = (k % 2) * COLM.barT;
      const zs = face * (zf + layer);
      const p0 = [nodeX(k, face), nodeY(k), zs], p1 = [nodeX(k + 1, face), nodeY(k + 1), zs];
      const d = v3.norm(v3.sub(p1, p0));
      let q0 = v3.sub(p0, v3.mul(d, COLM.ext)), q1 = v3.add(p1, v3.mul(d, COLM.ext));
      const slide = (1 - X.E.outC(vis)) * 700 * face, off = [0, 0, slide + (st.explode || 0) * 220 * face];
      q0 = v3.add(q0, off); q1 = v3.add(q1, off);
      faces.push(...bar(q0, q1, COLM.barW, COLM.barT, [0, 0, face], 'bar', { base: [150, 156, 166], k, face, vis }));
    }
  }
  // bolts at nodes
  const bt = st.bolts ?? 1;
  if (bt > 0) for (const face of [1, -1]) for (let k = 0; k < COLM.nodes; k++) {
    if (k > nb + 0.5) break;
    const show = clamp(bt * COLM.nodes - k); if (show <= 0) continue;
    const layers = (k > 0 && k < COLM.nodes - 1) ? 2 : 1, top = zf + COLM.barT * (k === 0 ? 1 : layers);
    const c = [nodeX(k, face), nodeY(k), face * top + face * (1 - X.E.outC(show)) * 260 + face * (st.explode || 0) * 260];
    faces.push(...boltHead(c, [0, 0, face], (1 - show) * 6 + k, 'bolt', { base: [58, 61, 68], k, face }));
  }
  return faces;
}

// ------------------------------------------------------------------ render
// opts: { lights, fog:[r,g,b], fogD, style(face)->{col, emis, alpha, edge, ew, skip}, edges:'all'|'none', mirrorY (floor reflection) }
function render(ctx, cam, faces, opts = {}) {
  const list = [];
  for (const f of faces) {
    const st = opts.style ? opts.style(f) : null; if (st && st.skip) continue;
    const c = f.pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]).map((v) => v / f.pts.length);
    if (opts.cull !== false && !(st && st.noCull)) { const vd = v3.sub(c, cam.pos); if (v3.dot(f.n, vd) > 0) continue; }
    let cp = f.pts.map((p) => toCam(cam, p));
    if (cp.some((q) => q[2] < cam.near)) { cp = clipNear(cp, cam.near); if (cp.length < 3) continue; }
    const sp = cp.map((q) => scr(cam, q));
    let zsum = 0; for (const q of cp) zsum += q[2];
    const z = zsum / cp.length;
    list.push({ f, sp, z, c, st });
  }
  list.sort((a, b) => b.z - a.z);
  const fog = opts.fog || [6, 8, 12], fogD = opts.fogD ?? 0.00012, fogStart = opts.fogStart ?? 1500;
  ctx.save(); ctx.lineJoin = 'round';
  for (const it of list) {
    const { f, sp, z, c, st } = it;
    const base = (st && st.col) || f.base || [150, 160, 170];
    const mat = { spec: f.part === 'bolt' ? 0.9 : f.part === 'bar' ? 0.75 : 0.55, shin: f.part === 'bolt' ? 70 : 34, fres: 0.3 };
    let rgb = shade(f.n, c, cam, base, mat, opts.lights);
    if (st && st.emis) rgb = [rgb[0] + st.emis[0], rgb[1] + st.emis[1], rgb[2] + st.emis[2]];
    const fk = 1 - Math.exp(-Math.max(0, z - fogStart) * fogD);
    rgb = [lerp(rgb[0], fog[0], fk), lerp(rgb[1], fog[1], fk), lerp(rgb[2], fog[2], fk)];
    ctx.beginPath(); sp.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    const a = st && st.alpha != null ? st.alpha : 1;
    if (a > 0) {
      ctx.globalAlpha = a * (opts.alpha ?? 1);
      if (st && st.flat) { ctx.fillStyle = st.flat; ctx.fill(); } else {
      const cs = (k) => `rgb(${clamp(rgb[0] * k, 0, 255) | 0},${clamp(rgb[1] * k, 0, 255) | 0},${clamp(rgb[2] * k, 0, 255) | 0})`;
      if (opts.spot && f.pts.length >= 3) {
        // pool of light: brightness falls off with distance from the spot centre (world), shaded as a screen gradient
        let hi = 0, lo = 0; for (let i = 1; i < f.pts.length; i++) { if (f.pts[i][1] > f.pts[hi][1]) hi = i; if (f.pts[i][1] < f.pts[lo][1]) lo = i; }
        const fall = (p) => clamp(1.15 - v3.len(v3.sub(p, opts.spot.p)) / opts.spot.r, opts.spot.min ?? 0.18, 1.15);
        const kh = fall(f.pts[hi]), kl = fall(f.pts[lo]);
        if (Math.abs(kh - kl) > 0.02 && hi !== lo) {
          const g = ctx.createLinearGradient(sp[Math.min(hi, sp.length - 1)][0], sp[Math.min(hi, sp.length - 1)][1], sp[Math.min(lo, sp.length - 1)][0], sp[Math.min(lo, sp.length - 1)][1]);
          g.addColorStop(0, cs(kh)); g.addColorStop(1, cs(kl)); ctx.fillStyle = g;
        } else ctx.fillStyle = cs((kh + kl) / 2);
      } else ctx.fillStyle = cs(1);
      ctx.fill();
      }
    }
    let edge = (st && st.edge) || opts.edge;
    if (edge === 'auto') edge = f.part === 'bar' ? 'rgba(255,214,170,0.55)' : f.part === 'bolt' ? 'rgba(255,255,255,0.45)' : f.part === 'tie' ? 'rgba(200,225,255,0.4)' : 'rgba(170,205,240,0.32)';
    if (edge) {
      ctx.globalAlpha = (st && st.ea != null ? st.ea : 1) * (opts.alpha ?? 1) * (1 - fk * 0.8); ctx.strokeStyle = edge; ctx.lineWidth = (st && st.ew) || opts.ew || 1.2;
      if (st && st.eprog != null && st.eprog < 1) {
        if (st.eprog > 0) { ctx.beginPath(); X.polyPath(ctx, sp.concat([sp[0]]), st.eprog); ctx.stroke(); }
      } else if ((f.part === 'chanA' || f.part === 'chanB') && !f.cap && sp.length === 4 && cpLen(f) === 4) {
        ctx.beginPath(); ctx.moveTo(sp[1][0], sp[1][1]); ctx.lineTo(sp[2][0], sp[2][1]); ctx.moveTo(sp[3][0], sp[3][1]); ctx.lineTo(sp[0][0], sp[0][1]); ctx.stroke();
      } else ctx.stroke();
    }
  }
  ctx.restore();
  return list.length;
}
function cpLen(f) { return f.pts.length; }
// floor: soft spotlight + reflection hint
function floor(ctx, cam, o = {}) {
  const c = project(cam, [0, 0, 0]); if (!c) return;
  const e1 = project(cam, [1800, 0, 0]), e2 = project(cam, [0, 0, 1800]);
  if (!e1 || !e2) return;
  const rx = Math.hypot(e1[0] - c[0], e1[1] - c[1]), ry = Math.max(8, Math.hypot(e2[0] - c[0], e2[1] - c[1]));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(c[0], c[1]); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, `rgba(255,170,90,${0.22 * (o.alpha ?? 1)})`); g.addColorStop(0.5, `rgba(120,150,200,${0.07 * (o.alpha ?? 1)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
}

// interpolate camera keyframes [{t, pos, tgt, fov, roll}] with smooth easing between keys
function camPath(keys, t, ease = X.E.ioC) {
  if (t <= keys[0].t) return camera(keys[0].pos, keys[0].tgt, keys[0].fov, keys[0].roll || 0);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b.t) { const k = (b.ease || ease)((t - a.t) / (b.t - a.t)); return camera(v3.lerp(a.pos, b.pos, k), v3.lerp(a.tgt, b.tgt, k), lerp(a.fov, b.fov, k), lerp(a.roll || 0, b.roll || 0, k)); }
  }
  const z = keys[keys.length - 1]; return camera(z.pos, z.tgt, z.fov, z.roll || 0);
}
// orbit helper: camera around the column axis
function orbit(angDeg, dist, y, tgtY, fov = 40, roll = 0) { const a = angDeg * DEG; return camera([Math.sin(a) * dist, y, Math.cos(a) * dist], [0, tgtY, 0], fov, roll); }

// standalone lacing flat lying along x (centre at origin), length between holes lh, width b, thickness t
function flatFaces(o = {}) {
  const lh = o.lh ?? 480.83, ext = o.ext ?? 30, b = o.b ?? 50, t = o.t ?? 14;
  const L = lh / 2 + ext;
  return bar([-L, 0, 0], [L, 0, 0], b, t, [0, 0, 1], 'flat', { base: o.base || [160, 166, 176] });
}
function cylFaces(c, ax, r, h, n, part, base, extra) {
  const a = v3.norm(ax), ref = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], e1 = v3.norm(v3.cross(a, ref)), e2 = v3.cross(a, e1), faces = [];
  const ring = (hh) => Array.from({ length: n }, (_, i) => { const th = i * TAU / n; return v3.add(v3.add(c, v3.mul(a, hh)), v3.add(v3.mul(e1, Math.cos(th) * r), v3.mul(e2, Math.sin(th) * r))); });
  const b0 = ring(0), b1 = ring(h);
  for (let i = 0; i < n; i++) { const j = (i + 1) % n, th = (i + 0.5) * TAU / n; faces.push(quad(b0[i], b0[j], b1[j], b1[i], v3.add(v3.mul(e1, Math.cos(th)), v3.mul(e2, Math.sin(th))), part, Object.assign({ base }, extra))); }
  faces.push(Object.assign({ pts: b1.slice().reverse(), n: a, part, cap: 1, base }, extra));
  faces.push(Object.assign({ pts: b0.slice(), n: v3.mul(a, -1), part, cap: -1, base }, extra));
  return faces;
}
function hexFaces(c, ax, R, h, rot, part, base, extra) {
  const a = v3.norm(ax), ref = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], e1 = v3.norm(v3.cross(a, ref)), e2 = v3.cross(a, e1), faces = [];
  const ring = (hh) => Array.from({ length: 6 }, (_, i) => { const th = rot + i * TAU / 6; return v3.add(v3.add(c, v3.mul(a, hh)), v3.add(v3.mul(e1, Math.cos(th) * R), v3.mul(e2, Math.sin(th) * R))); });
  const b0 = ring(0), b1 = ring(h);
  for (let i = 0; i < 6; i++) { const j = (i + 1) % 6, th = rot + (i + 0.5) * TAU / 6; faces.push(quad(b0[i], b0[j], b1[j], b1[i], v3.add(v3.mul(e1, Math.cos(th)), v3.mul(e2, Math.sin(th))), part, Object.assign({ base }, extra))); }
  faces.push(Object.assign({ pts: b1.slice().reverse(), n: a, part, cap: 1, base }, extra));
  faces.push(Object.assign({ pts: b0.slice(), n: v3.mul(a, -1), part, cap: -1, base }, extra));
  return faces;
}
// M16 bolt along +axis from c (head at c, shank going -axis), with nut at distance 'grip'
function boltFull(c, ax, rot, o = {}) {
  const a = v3.norm(ax), grip = o.grip ?? 27.5, faces = [];
  faces.push(...hexFaces(c, a, 13.9, 10, rot, 'bhead', [64, 67, 74]));
  faces.push(...cylFaces(v3.add(c, v3.mul(a, -3)), a, 15, 3, 18, 'washer', [96, 100, 108]));
  faces.push(...cylFaces(v3.add(c, v3.mul(a, -(grip + 28))), a, 8, grip + 25, 16, 'shank', [120, 124, 132]));
  if (o.nut !== false) { const nd = o.nutPos ?? grip; faces.push(...hexFaces(v3.add(c, v3.mul(a, -(nd + 13))), a, 13.9, 13, rot + 0.3, 'nut', [70, 73, 80])); }
  for (let k = 0; k < 9; k++) faces.push(...cylFaces(v3.add(c, v3.mul(a, -(grip + 26 - k * 2.2))), a, 8.4, 0.9, 16, 'thread', [150, 154, 162]));
  return faces;
}
module.exports = { flatFaces, cylFaces, hexFaces, boltFull, camera, toCam, project, render, floor, columnFaces, channelPoly, COLM, nodeX, nodeY, bar, boltHead, extrudeY, quad, camPath, orbit, shade, LIGHTS };
