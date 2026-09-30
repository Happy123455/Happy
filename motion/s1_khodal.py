"""Act 1 — Shree Khodaldham (0 s .. BLACK1).

0-8    dark sci-fi 3D field: wireframe, contours, orbit loops, HUD graphs
8      DROP: every point snaps together, point-to-point, into logo v1
10.5   the logo rolls like an old film strip; a glowing dot falls into the next frame
11.5+  the dot bounces with gravity on guitar strings: every hit plucks the strings,
       the whole logo vibrates like a guitar note and turns into the next version
16     the ball bursts -> Navratri celebration (mandala, Khodaldham temple of Kagvad,
       garba rings, fireworks, nine colours of Navratri)
28     finale, then everything slowly sinks into black
"""
import functools
import numpy as np
import cv2
from skimage import measure

import timeline as T
from common import *  # noqa


# =========================================================================== assets
V_NAMES = {1: "khodal_eng.png", 2: "khodal_guj.png", 3: "khodal_idol_lit.png"}
V_WIDTH = {1: 1250, 2: 1180, 3: 820}


@functools.lru_cache(maxsize=8)
def version(k, width=None):
    im = logo(V_NAMES[k])
    w = (width or V_WIDTH[k]) * S
    sc = w / im.shape[1]
    pm = im.copy()
    pm[..., :3] *= pm[..., 3:4]
    out = cv2.resize(pm, (int(im.shape[1] * sc), int(im.shape[0] * sc)), interpolation=cv2.INTER_AREA)
    a = out[..., 3:4]
    out[..., :3] = np.clip(out[..., :3] / np.maximum(a, 1e-4), 0, 1)
    return out


def logo_layer(k, cx=CX, cy=CY, scale=1.0, alpha=1.0, width=None):
    """Full-frame (rgb_premult, alpha) of logo version k."""
    return place(None, version(k, width), cx, cy, scale, alpha, return_layer=True)


@functools.lru_cache(maxsize=1)
def targets_v1():
    """Particle targets for logo v1: ordered outline points + interior fill."""
    im = version(1)
    a = (im[..., 3] > 0.5).astype(np.uint8)
    h, w = a.shape
    cnts, _ = cv2.findContours(a, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    outline = []
    groups = []
    for c in cnts:
        c = c[:, 0, :].astype(np.float32)
        if len(c) < 12:
            continue
        step = max(1, int(4 * S))
        pts = c[::step]
        groups.append((len(outline), len(outline) + len(pts)))
        outline.extend(pts)
    outline = np.array(outline)
    ys, xs = np.where(a > 0)
    rng = np.random.default_rng(5)
    pick = rng.choice(len(xs), min(len(xs), int(9000 * S)), replace=False)
    fill = np.stack([xs[pick], ys[pick]], -1).astype(np.float32)
    pts = np.concatenate([outline, fill])
    cols = im[np.clip(pts[:, 1].astype(int), 0, h - 1), np.clip(pts[:, 0].astype(int), 0, w - 1), :3]
    pts[:, 0] += CX - w / 2
    pts[:, 1] += CY - h / 2
    return pts, cols, len(outline), groups


# =========================================================================== 0-8 s: sci-fi field
def field(X, Y, t, amp=1.0):
    r2 = X * X + Y * Y
    r = np.sqrt(r2)
    z = (0.55 * np.sin(2.2 * r - 2.5 * t) * np.exp(-0.16 * r2)
         + 0.45 * np.exp(-((X - 1.3 * np.cos(0.7 * t)) ** 2 + (Y - 1.2 * np.sin(0.9 * t)) ** 2) / 0.45)
         - 0.35 * np.exp(-((X + 1.4 * np.cos(0.5 * t)) ** 2 + (Y + 1.1 * np.sin(0.6 * t)) ** 2) / 0.6)
         + 0.08 * np.sin(3 * X + t) * np.cos(2.5 * Y - 0.7 * t))
    return z * amp


FLOOR = -1.45


def intro_camera(t):
    th = 0.7 + 0.10 * t + (0.28 * (t - 5) ** 2 if t > 5 else 0)
    ph = 0.62 - 0.025 * t
    d = 10.6 - 0.4 * t
    eye = (d * np.cos(th) * np.cos(ph), d * np.sin(th) * np.cos(ph), d * np.sin(ph))
    return Camera(eye, (0, 0, -0.25), 46)


def draw_segments_binned(lay, P2, depth, val, cols_lo, cols_hi, reveal_mask=None, nb=10, th=1):
    """P2: (L, M, 2) polylines; val in [0,1] per vertex decides colour/brightness."""
    seg_a = P2[:, :-1].reshape(-1, 2)
    seg_b = P2[:, 1:].reshape(-1, 2)
    v = ((val[:, :-1] + val[:, 1:]) / 2).reshape(-1)
    keep = np.ones(len(v), bool)
    if reveal_mask is not None:
        keep &= reveal_mask[:, :-1].reshape(-1) & reveal_mask[:, 1:].reshape(-1)
    idx = np.clip((v * nb).astype(int), 0, nb - 1)
    for b in range(nb):
        m = keep & (idx == b)
        if not m.any():
            continue
        segs = np.stack([seg_a[m], seg_b[m]], 1)
        x = (b + 0.5) / nb
        col = np.asarray(cols_lo) * (1 - x) + np.asarray(cols_hi) * x
        lay.polys(list(segs), col, th)


_stars = None


def starfield(img, t, gain=1.0, drift=(0, 0)):
    global _stars
    if _stars is None:
        rng = np.random.default_rng(11)
        n = int(700 * S)
        _stars = (rng.uniform(0, W, n), rng.uniform(0, H, n), rng.uniform(0.1, 1.0, n) ** 3, rng.uniform(0, 6.28, n))
    x, y, b, ph = _stars
    tw = b * (0.6 + 0.4 * np.sin(ph + t * 3.0))
    splat(img, (x + drift[0]) % W, (y + drift[1]) % H, np.array([0.6, 0.75, 1.0]) * tw[:, None], gain)


@functools.lru_cache(maxsize=1)
def surface_particles():
    rng = np.random.default_rng(21)
    n = len(targets_v1()[0])
    XY = rng.uniform(-3, 3, (n, 2))
    return XY, rng.uniform(0, 1, n), rng.uniform(0, 2 * np.pi, n)


def particles_world_pos(t):
    XY, rnd, ph = surface_particles()
    Z = field(XY[:, 0], XY[:, 1], t, amp_intro(t))
    X, Y = XY[:, 0].copy(), XY[:, 1].copy()
    if t > 6.0:
        k = ease_in(u(t, 6.0, 7.6), 2)
        ang = k * (2.5 + 3 * rnd)
        c, s = np.cos(ang), np.sin(ang)
        X, Y = X * c - Y * s, X * s + Y * c
        Z = Z + k * (0.6 + 1.2 * rnd)
        shrink = 1 - 0.99 * ease_in(u(t, 6.8, 7.75), 2.2)
        X, Y = X * shrink, Y * shrink
        Z = lerp(Z, 0.2, 1 - shrink)
    return np.stack([X, Y, Z], -1)


def amp_intro(t):
    return 0.2 + 0.8 * smooth(u(t, 0.2, 3.0)) + 0.5 * smooth(u(t, 5.0, 7.5))


def scene_intro(t, fr):
    img = radial_bg((0.012, 0.03, 0.07), (0.0, 0.0, 0.01), cy=CY * 1.1)
    starfield(img, t, 0.5 * smooth(u(t, 0.0, 2.0)))
    fade_all = 1 - smooth(u(t, 7.35, 7.75))
    cam = intro_camera(t)
    amp = amp_intro(t)
    lay = Layer()
    n1, n2 = 41, 81
    g = np.linspace(-3, 3, n1)
    s = np.linspace(-3, 3, n2)
    # lines along x (fixed y) and along y (fixed x)
    Xa, Ya = np.meshgrid(s, g)       # (41, 81) varying x
    Xb, Yb = Ya.T.copy(), Xa.T.copy()
    Xb, Yb = np.meshgrid(g, s)
    Xb, Yb = Xb.T, Yb.T               # (41, 81) varying y
    front = lerp(-3.3, 3.3, ease_inout(u(t, 0.25, 2.4)))
    for X, Y in ((Xa, Ya), (Xb, Yb)):
        Z = field(X, Y, t, amp)
        P2, dep = cam.project(np.stack([X, Y, Z], -1))
        hv = clamp01((Z / max(amp, 0.3) + 0.8) / 1.6)
        fog = clamp01(1.3 - (dep - 5.0) / 7.0)
        val = clamp01(hv * 0.75 + 0.25) * fog * fade_all
        draw_segments_binned(lay, P2, dep, val, (0.0, 0.06, 0.14), (0.25, 0.85, 1.0), X < front, 12)
    # scan front line
    if 0.25 < t < 2.6:
        Yf = np.linspace(-3, 3, 60)
        Xf = np.full_like(Yf, front)
        P2, _ = cam.project(np.stack([Xf, Yf, field(Xf, Yf, t, amp)], -1))
        lay.poly(P2, (0.9, 0.97, 1.0), 2)
    # contours (on surface and projected on floor)
    ca = smooth(u(t, 1.2, 2.6)) * fade_all
    if ca > 0:
        gg = np.linspace(-3, 3, 96)
        GX, GY = np.meshgrid(gg, gg)
        F = field(GX, GY, t, amp)
        levels = np.linspace(-0.55, 0.65, 11) * max(amp, 0.3)
        floor_paths, surf_paths = [], []
        for li, lv in enumerate(levels):
            for c in measure.find_contours(F, lv):
                xw = np.interp(c[:, 1], np.arange(96), gg)
                yw = np.interp(c[:, 0], np.arange(96), gg)
                p, _ = cam.project(np.stack([xw, yw, np.full_like(xw, FLOOR)], -1))
                floor_paths.append(p)
                p2, _ = cam.project(np.stack([xw, yw, np.full_like(xw, lv)], -1))
                surf_paths.append((li, p2))
        lay.polys(floor_paths, np.array([1.0, 0.45, 0.1]) * 0.55 * ca, 1)
        for li, p in surf_paths:
            x = li / (len(levels) - 1)
            col = np.array([1.0, 0.25 + 0.5 * x, 0.08 + 0.5 * (1 - x) * 0.6]) * (0.45 + 0.4 * x) * ca
            lay.poly(p, col, 1)
    # bounding box + ticks
    ba = smooth(u(t, 0.5, 1.5)) * fade_all * 0.5
    if ba > 0:
        corners = np.array([[x, y, z] for z in (FLOOR, 1.25) for x in (-3, 3) for y in (-3, 3)])
        edges = [(0, 1), (0, 2), (1, 3), (2, 3), (4, 5), (4, 6), (5, 7), (6, 7), (0, 4), (1, 5), (2, 6), (3, 7)]
        P2, _ = cam.project(corners)
        for a_, b_ in edges:
            lay.line(P2[a_], P2[b_], np.array([0.3, 0.45, 0.7]) * ba)
        for v in np.linspace(-3, 3, 13):
            a2, _ = cam.project(np.array([[v, -3, FLOOR], [v, -3.18, FLOOR]]))
            lay.line(a2[0], a2[1], np.array([0.5, 0.7, 1.0]) * ba)
            b2, _ = cam.project(np.array([[-3, v, FLOOR], [-3.18, v, FLOOR]]))
            lay.line(b2[0], b2[1], np.array([0.5, 0.7, 1.0]) * ba)
            if abs(v) % 1.5 < 1e-6:
                p, _ = cam.project(np.array([v, -3.45, FLOOR]))
                lay.text(f"{v:+.1f}", (p[0] - 16 * S, p[1]), 0.38, np.array([0.5, 0.7, 1.0]) * ba * 1.6)
    # orbit loops
    la = smooth(u(t, 1.6, 3.0)) * fade_all
    if la > 0:
        uu = np.linspace(0, 2 * np.pi, 600)
        loops = []
        # torus knot (2,3)
        r = 2.2 + 0.6 * np.cos(3 * uu)
        loops.append((np.stack([r * np.cos(2 * uu), r * np.sin(2 * uu), 0.55 * np.sin(3 * uu) + 0.35], -1),
                      (0.3, 0.8, 1.0), 0.8 * t, rot_z(0.3 * t)))
        loops.append((np.stack([3.1 * np.sin(3 * uu + 0.5), 3.1 * np.sin(2 * uu), 0.9 * np.sin(5 * uu) + 0.25], -1),
                      (1.0, 0.35, 0.75), 1.1 * t + 2, rot_z(-0.2 * t) @ rot_x(0.25)))
        loops.append((np.stack([3.4 * np.cos(uu), 3.4 * np.sin(uu), 0.25 * np.sin(8 * uu) + 0.9], -1),
                      (1.0, 0.7, 0.2), 0.6 * t + 4, rot_x(0.35 * np.sin(0.4 * t)) @ rot_y(0.2)))
        for P, col, head, Rm in loops:
            Pw = P @ Rm.T
            p2, _ = cam.project(Pw)
            col = np.asarray(col)
            lay.poly(p2, col * 0.22 * la, 1, closed=True)
            # comet head with fading tail
            hi = int((head / (2 * np.pi)) % 1 * len(uu))
            for k in range(6):
                a0 = (hi - (k + 1) * 14) % len(uu)
                a1 = (hi - k * 14) % len(uu)
                seg = p2[a0:a1 + 1] if a0 < a1 else np.concatenate([p2[a0:], p2[:a1 + 1]])
                lay.poly(seg, col * la * (1 - k / 6) ** 1.5, 2 if k < 2 else 1)
            lay.circle(p2[hi], 3.5 * S, col * la, fill=True)
    img = lay.add_to(img, 1.25, glow_amt=0.9)

    # particles on the surface
    pa = smooth(u(t, 2.4, 3.6))
    if pa > 0:
        P = particles_world_pos(t)
        p2, dep = cam.project(P)
        _, rnd, ph = surface_particles()
        if t > 6.9:  # collapse towards the screen centre before the drop
            kc = ease_in(u(t, 6.9, 7.75), 2)
            p2 = lerp(p2, np.array([CX, CY]), kc)
        b = (0.35 + 0.65 * (0.5 + 0.5 * np.sin(ph + 4 * t))) * pa
        k = u(t, 6.0, 7.75)
        b = b * (1 + 3 * k)
        pl = np.zeros_like(img)
        splat(pl, p2[:, 0], p2[:, 1], np.array([1.0, 0.78, 0.45]) * b[:, None], 0.8)
        img += glow(pl, 1.2)
    # HUD
    img = hud_intro(img, t, fade_all)
    # implosion core
    if t > 7.3:
        k = u(t, 7.3, 8.0)
        core = np.exp(-(radial() * (40 - 30 * k)) ** 2) * (0.5 + 2.5 * k)
        img += core[..., None] * np.array([1.0, 0.85, 0.6])
    # camera shake builds
    if t > 5.5:
        dx, dy = shake(t, 6 * u(t, 5.5, 7.7))
        img = transform(img, 1 + 0.03 * u(t, 5.5, 7.7), 0, dx, dy)
        img = chroma(img, 6 * u(t, 6, 7.7) * S)
    return img


def hud_intro(img, t, fade):
    a = smooth(u(t, 0.8, 1.8)) * fade
    if a <= 0:
        return img
    lay = Layer()
    c = np.array([0.45, 0.8, 1.0]) * a
    x0, y0 = 70 * S, 90 * S
    lay.text("FIELD SOLVER  //  KHD-09", (x0, y0), 0.62, c, 1)
    lay.text(f"t = {t:6.3f}s   phi = {0.618 + 0.01 * np.sin(t):.4f}", (x0, y0 + 30 * S), 0.45, c * 0.8)
    lay.text(f"nodes = {min(5000, int(t * 900)):5d}   lambda = {2.2 + 0.1 * np.sin(2 * t):.3f}", (x0, y0 + 55 * S), 0.45, c * 0.8)
    lay.line((x0, y0 + 70 * S), (x0 + 380 * S, y0 + 70 * S), c * 0.5)
    # oscilloscope (bottom-left)
    bx, by, bw, bh = 70 * S, H - 190 * S, 420 * S, 110 * S
    lay.poly(np.array([[bx, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh]]), c * 0.35, 1, True)
    xs = np.linspace(0, 1, 200)
    ys = field(np.cos(xs * 6 + t) * 1.2, np.sin(xs * 4 - t) * 1.2, t + xs * 3, 1.0)
    lay.poly(np.stack([bx + xs * bw, by + bh / 2 - ys * bh * 0.6], -1), np.array([1.0, 0.55, 0.2]) * a, 1)
    lay.poly(np.stack([bx + xs * bw, by + bh / 2 - 0.4 * bh * np.sin(xs * 25 - 6 * t) * np.exp(-3 * (xs - 0.5) ** 2)], -1), c * 0.8, 1)
    # spectrum bars (right)
    rx, ry = W - 90 * S, H - 90 * S
    for i in range(24):
        hgt = (0.2 + 0.8 * abs(np.sin(i * 0.7 + t * (2 + 0.2 * i)))) * (60 + 60 * u(t, 5, 7.7)) * S
        xb = rx - i * 14 * S
        lay.line((xb, ry), (xb, ry - hgt), c * (0.5 + 0.5 * (i % 3 == 0)), max(1, int(6 * S)))
    lay.text("SPECTRAL DENSITY", (rx - 330 * S, ry + 30 * S), 0.42, c * 0.7)
    # crosshair on the right
    cxh, cyh = W - 230 * S, 170 * S
    r = 60 * S
    lay.circle((cxh, cyh), r, c * 0.6)
    ang = t * 2
    lay.line((cxh, cyh), (cxh + r * np.cos(ang), cyh + r * np.sin(ang)), c)
    lay.circle((cxh, cyh), r * 0.45, c * 0.35)
    lay.text(f"{(t * 37.3) % 360:05.1f} deg", (cxh - 50 * S, cyh + r + 28 * S), 0.42, c * 0.8)
    return lay.add_to(img, 1.0, 0.4)


# =========================================================================== 8-10.5: drop -> logo v1
def scene_drop(t, fr):
    img = radial_bg((0.05, 0.025, 0.04), (0.0, 0.0, 0.0))
    starfield(img, t, 0.35)
    pts, cols, n_out, groups = targets_v1()
    n = len(pts)
    rng = np.random.default_rng(9)
    order = np.arange(n)
    delay = np.where(order < n_out, 0.5 * order / max(n_out, 1), rng.uniform(0.1, 0.7, n))
    k = ease_out(clamp01((t - T.DROP1 - delay) / 0.55), 3)
    # swirl offset while travelling
    ang = np.arctan2(pts[:, 1] - CY, pts[:, 0] - CX)
    rad = np.hypot(pts[:, 0] - CX, pts[:, 1] - CY)
    sw = (1 - k) * 1.8
    px = CX + np.cos(ang + sw) * rad * k
    py = CY + np.sin(ang + sw) * rad * k
    # shockwave from the drop
    dt = t - T.DROP1
    lay = Layer()
    for j in range(3):
        rr = (dt - 0.05 * j) * 2600 * S
        if 0 < rr < 2400 * S:
            lay.circle((CX, CY), rr, np.array([1.0, 0.7, 0.4]) * (1 - rr / (2400 * S)) * 0.9, max(1, int(3 * S)))
    # point-to-point constellation along the outline
    line_a = smooth(u(t, T.DROP1 + 0.15, T.DROP1 + 0.8)) * (1 - smooth(u(t, 9.3, 9.9)))
    if line_a > 0:
        arrived = k[:n_out] > 0.97
        segs = []
        for a0, a1 in groups:
            p = np.stack([px[a0:a1], py[a0:a1]], -1)
            m = arrived[a0:a1]
            good = m[:-1] & m[1:]
            for i in np.where(good)[0]:
                segs.append(p[i:i + 2])
        lay.polys(segs, np.array([1.0, 0.75, 0.45]) * line_a, 1)
        # a few long triangulation lines between random arrived points
        idx = np.where(arrived)[0]
        if len(idx) > 20:
            rr = np.random.default_rng(int(t * 15))
            a_ = rr.choice(idx, 40)
            b_ = np.clip(a_ + rr.integers(20, 200, 40), 0, n_out - 1)
            for i, j in zip(a_, b_):
                lay.line((px[i], py[i]), (px[j], py[j]), np.array([1.0, 0.5, 0.3]) * 0.25 * line_a)
    img = lay.add_to(img, 1.0, 0.8)
    # particles
    pa = 1 - smooth(u(t, 9.4, 10.1))
    pl = np.zeros_like(img)
    bright = 0.6 + 2.5 * np.exp(-dt / 0.3)
    splat(pl, px, py, (cols * 0.7 + 0.3) * bright * pa, 0.7)
    img += glow(pl, 1.0)
    # real logo fades in over the particle cloud
    la = smooth(u(t, 9.0, 9.7))
    if la > 0:
        beat = beat_pulse(t, T.DROP1, T.BEAT, 0.15)
        rgb, a = logo_layer(1, alpha=la)
        img = img * (1 - a) + rgb * (1.0 + 0.25 * beat)
        img += glow(rgb * 0.5, 0.8 + 0.8 * beat)
    # flash
    img += pulse(t, T.DROP1, 0.12) * 1.5
    if t > T.TAPESTOP:  # tape-stop: the image sags and desaturates
        k2 = u(t, T.TAPESTOP, T.FILM)
        img = transform(img, 1 - 0.04 * k2, 0, 0, 20 * S * k2 ** 2)
        grey = img.mean(axis=2, keepdims=True)
        img = lerp(img, grey * np.array([1.05, 0.9, 0.7]), 0.7 * k2)
    return img


# =========================================================================== 10.5-16: film strip, strings, ball
G_PX = 1800.0  # gravity in px/s^2 at 1920 width
STR_XL, STR_XR = 170, 1750
STR_Y = CY / S + 150


def version_after(n_hits):
    seq = [1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3]
    return seq[n_hits]


def ball_state(t):
    """Screen position (design px) of the ball, and index of last hit."""
    hits = T.HITS
    r = 16
    yc = STR_Y - r
    x_of = lambda k: 900 + 110 * k / (len(hits) - 1)  # noqa
    if t < hits[0]:
        t_rel = t - (hits[0] - 0.55)
        if t_rel < 0:
            return x_of(0), yc - 0.5 * G_PX * 0.55 ** 2, -1
        y = (yc - 0.5 * G_PX * 0.55 ** 2) + 0.5 * G_PX * t_rel ** 2
        return x_of(0), y, -1
    for k in range(len(hits) - 1):
        if hits[k] <= t < hits[k + 1]:
            F = hits[k + 1] - hits[k]
            tt = t - hits[k]
            v = G_PX * F / 2
            y = yc - (v * tt - 0.5 * G_PX * tt * tt)
            x = lerp(x_of(k), x_of(k + 1), tt / F)
            return x, y, k
    return x_of(len(hits) - 1), yc, len(hits) - 1


def string_disp(xd, t, phase=0.0):
    """Vertical displacement (design px) of the guitar string at design-x xd, plus blur envelope."""
    d = np.zeros_like(xd, dtype=np.float64)
    env = np.zeros_like(d)
    xi = clamp01((xd - STR_XL) / (STR_XR - STR_XL))
    for k, h in enumerate(T.HITS):
        if t < h:
            break
        dt = t - h
        A = (34 if k < 3 else 16 * 0.93 ** k) * np.exp(-dt / 0.9)
        if A < 0.05:
            continue
        bx = ball_state(h)[0]
        p = (bx - STR_XL) / (STR_XR - STR_XL)
        shape_e = np.zeros_like(d)
        for m in (1, 2, 3):
            mode = np.sin(m * np.pi * xi) * np.sin(m * np.pi * p) / m ** 2
            d += A * mode * np.cos(2 * np.pi * 5.5 * m * dt + phase * m)
            shape_e += mode
        env += A * np.abs(shape_e)
    return d, env


def film_bands(img, offset, alpha, sepia):
    """Draw film strip borders with sprocket holes; offset scrolls them."""
    if alpha <= 0:
        return img
    bw = 120 * S
    slide = (1 - alpha) * bw * 1.2
    band = np.array([0.04, 0.035, 0.03])
    xl0 = -slide
    xr0 = W - bw + slide
    img[:, max(0, int(xl0)):max(0, int(xl0 + bw))] = band
    img[:, min(W, int(xr0)):min(W, int(xr0 + bw))] = band
    lay = Layer()
    pitch = 76 * S
    hw, hh = 34 * S, 46 * S
    start = offset % pitch - pitch
    y = start
    col = np.array([0.85, 0.78, 0.62]) * 0.9
    while y < H + pitch:
        for x in (xl0 + bw / 2, xr0 + bw / 2):
            pts = np.array([[x - hw / 2, y - hh / 2], [x + hw / 2, y - hh / 2], [x + hw / 2, y + hh / 2], [x - hw / 2, y + hh / 2]])
            lay.fillpoly(pts, col)
        y += pitch
    f = lay.f(1.0)
    img[:] = np.where(f.max(axis=2, keepdims=True) > 0, f, img)
    # edge text like real film stock
    return img


def sepia_tone(img, k):
    if k <= 0:
        return img
    lum = img @ np.array([0.3, 0.59, 0.11], np.float32)
    sep = lum[..., None] * np.array([1.12, 0.92, 0.66], np.float32)
    return lerp(img, sep, k)


def film_scratches(img, fr, k):
    if k <= 0:
        return img
    rng = np.random.default_rng(fr * 7 + 1)
    lay = Layer()
    for _ in range(rng.integers(1, 4)):
        x = rng.uniform(0, W)
        lay.line((x, 0), (x + rng.uniform(-8, 8), H), np.array([1, 0.95, 0.85]) * rng.uniform(0.15, 0.4))
    for _ in range(rng.integers(3, 10)):
        lay.circle((rng.uniform(0, W), rng.uniform(0, H)), rng.uniform(1, 3) * S, np.array([0.9, 0.85, 0.75]) * rng.uniform(0.2, 0.6), fill=True)
    return img + lay.f(k)


def scene_film(t, fr):
    hits = T.HITS
    n_hit = sum(1 for h in hits if t >= h)
    last = max([h for h in hits if t >= h], default=None)
    energy = n_hit / len(hits)
    bg = radial_bg(np.array([0.10, 0.04, 0.02]) * (0.6 + 1.2 * energy), (0.0, 0.0, 0.0), cy=STR_Y * S)
    img = bg
    film_a = smooth(u(t, T.FILM, T.FILM + 0.3)) * (1 - smooth(u(t, hits[0] + 0.1, hits[0] + 0.8)))
    sepia = 0.85 * smooth(u(t, T.FILM, T.FILM + 0.25)) * (1 - smooth(u(t, hits[0], hits[0] + 0.3)))
    zoom = 1 - 0.14 * film_a
    # film roll: strip moves up by one frame between FILM+0.25 and HIT1-0.15
    roll = ease_inout(u(t, T.FILM + 0.25, T.HIT1 - 0.2))
    frame_h = H + 60 * S
    off = -roll * frame_h
    speed = abs(np.gradient([ease_inout(u(t + d, T.FILM + 0.25, T.HIT1 - 0.2)) for d in (-0.01, 0, 0.01)])[1]) / 0.01

    # --- logo(s)
    cur = version_after(n_hit)
    prev = version_after(max(0, n_hit - 1))
    d_px, env = None, None
    if n_hit == 0:
        # rolling strip with two copies of v1
        lay_rgb = np.zeros_like(img)
        lay_a = np.zeros(img.shape[:2] + (1,), np.float32)
        for i in (0, 1):
            cy = CY + (i * frame_h + off) * zoom
            rgb, a = logo_layer(1, CX, cy, zoom)
            lay_rgb = lay_rgb * (1 - a) + rgb
            lay_a = lay_a + a * (1 - lay_a)
            # frame separators
        if speed > 0.05:
            k = int(min(120, speed * 60) * S) | 1
            lay_rgb = cv2.blur(lay_rgb, (1, k))
            lay_a = cv2.blur(lay_a, (1, k))[..., None]
        img = img * (1 - lay_a) + lay_rgb
        # separator bars between frames
        for i in (0, 1):
            ysep = CY + (i * frame_h + off - frame_h / 2) * zoom
            y0, y1 = int(ysep - 24 * S), int(ysep + 24 * S)
            if y1 > 0 and y0 < H:
                img[max(0, y0):max(0, y1)] *= 0.08
    else:
        xd = np.arange(W) / S
        d_px, env = string_disp(xd, t)
        # logo rides the string (vertical remap)
        mx, my = grid()
        dd = (d_px * S * 0.9).astype(np.float32)
        rgb, a = logo_layer(cur)
        # glitch morph right after a hit
        gk = u(t, last, last + 0.16)
        if gk < 1:
            rgb2, a2 = logo_layer(prev)
            rng = np.random.default_rng(int(t * 60))
            bands = np.sort(rng.uniform(0, H, 14).astype(int))
            mix_ = np.zeros((H, 1, 1), np.float32)
            for b0, b1 in zip(bands[:-1:2], bands[1::2]):
                mix_[b0:b1] = 1
            sel = (mix_ * (1 - gk) > 0.5)
            shift = int(rng.uniform(-60, 60) * S * (1 - gk))
            rgb = np.where(sel, np.roll(rgb2, shift, axis=1), rgb)
            a = np.where(sel, np.roll(a2, shift, axis=1), a)
        comb = np.concatenate([rgb, a], axis=2)
        warped = cv2.remap(comb, mx, my - dd[None, :], cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
        # ghost copies = vibration blur
        e = float(np.max(env)) * S
        if e > 1.0:
            ghost_up = cv2.remap(comb, mx, my - dd[None, :] - (env * S * 0.5).astype(np.float32)[None, :], cv2.INTER_LINEAR)
            ghost_dn = cv2.remap(comb, mx, my - dd[None, :] + (env * S * 0.5).astype(np.float32)[None, :], cv2.INTER_LINEAR)
            ga = min(0.45, e / 40)
            img = img * (1 - ghost_up[..., 3:] * ga * 0.6) + ghost_up[..., :3] * ga * np.array([1.0, 0.3, 0.3])
            img = img * (1 - ghost_dn[..., 3:] * ga * 0.6) + ghost_dn[..., :3] * ga * np.array([0.3, 0.6, 1.0])
        img = img * (1 - warped[..., 3:]) + warped[..., :3]
        img += glow(warped[..., :3] * 0.4, 0.5 + 1.5 * pulse(t, last, 0.3))
        img = img * zoom + 0  # zoom handled below for film only

    # --- strings
    str_a = smooth(u(t, T.FILM + 0.5, T.HIT1 - 0.1))
    if str_a > 0:
        n_str = 1 if n_hit < 2 else (3 if n_hit < 3 else 6)
        lay = Layer()
        xs = np.linspace(STR_XL, STR_XR, 240)
        grow = ease_out(u(t, T.FILM + 0.5, T.HIT1 - 0.15))
        half = (STR_XR - STR_XL) / 2 * grow
        mid = (STR_XL + STR_XR) / 2
        xs = np.clip(xs, mid - half, mid + half)
        for si in range(n_str):
            yoff = (si - (n_str - 1) / 2) * 16
            if si > 0 and last is not None:
                # new strings stretch in
                born = hits[1] if n_str == 3 else hits[2]
                if si >= 1 and t < born + 0.3:
                    pass
            ds, en = string_disp(xs, t, phase=si * 0.9) if n_hit else (np.zeros_like(xs), np.zeros_like(xs))
            ys = STR_Y + yoff + ds * (1 - 0.1 * si)
            bright = (0.55 + 0.45 * energy) * str_a * (1 + 2.5 * (pulse(t, last, 0.25) if last else 0))
            col = np.array([1.0, 0.82, 0.5]) * bright
            if en.max() > 0.5:
                top = np.stack([xs, STR_Y + yoff - en], -1) * S
                bot = np.stack([xs, STR_Y + yoff + en], -1)[::-1] * S
                lay.fillpoly(np.concatenate([top, bot]), col * 0.05)
            lay.poly(np.stack([xs, ys], -1) * S, col, max(1, int(2 * S)))
        # nut & bridge
        for xe in (STR_XL, STR_XR):
            lay.fillpoly(np.array([[xe - 6, STR_Y - 60], [xe + 6, STR_Y - 60], [xe + 6, STR_Y + 60], [xe - 6, STR_Y + 60]]) * S,
                         np.array([0.8, 0.6, 0.3]) * str_a * grow)
        img = lay.add_to(img, 1.0, 1.0)

    # --- ball
    ba = smooth(u(t, T.FILM + 0.2, T.FILM + 0.45))
    if ba > 0:
        bx, by, k = ball_state(t)
        charge = u(t, hits[-1], T.DROP2)
        if k == len(hits) - 1:
            bx_, _ = bx, by
            by = STR_Y - 16 + string_disp(np.array([bx]), t)[0][0]
        lay = np.zeros_like(img)
        # trail
        for j in range(1, 10):
            tx, ty, _ = ball_state(t - j * 0.012)
            splat(lay, [tx * S], [ty * S], np.array([1.0, 0.7, 0.3]) * (1 - j / 10) * 6)
        rr = radial(bx * S, by * S, 16 * S * (1 + 1.5 * charge))
        core = np.exp(-rr ** 2 * 1.2)
        lay += core[..., None] * np.array([1.0, 0.85, 0.55]) * (1.3 + 3 * charge) * ba
        img += glow(lay, 0.5 + 1.5 * charge)
    # impact flashes / shock rings
    if last is not None:
        k = t - last
        bx = ball_state(last)[0]
        lay = Layer()
        big = 1.0 if hits.index(last) < 3 else 0.5
        for j in range(2):
            rr = (k - 0.04 * j) * 1500 * S * big
            if 0 < rr < 900 * S:
                lay.circle((bx * S, STR_Y * S), rr, np.array([1.0, 0.8, 0.5]) * (1 - rr / (900 * S)) * big, max(1, int(2 * S)))
        img = lay.add_to(img, 1.0, 0.6)
        img += (np.exp(-(radial(bx * S, STR_Y * S) * 16) ** 2) * pulse(t, last, 0.1) * 1.5 * big)[..., None] * np.array([1.0, 0.9, 0.7])

    # --- film look
    if film_a > 0:
        img = transform(img, 1.0, 0, *shake(t, 2.5 * film_a))
        img = film_bands(img, off * zoom, film_a, sepia)
        img = sepia_tone(img, sepia)
        img = film_scratches(img, fr, sepia)
        img *= 1 + 0.07 * sepia * np.sin(fr * 2.7)
    # pre-drop push in
    if t > hits[-1]:
        k = u(t, hits[-1], T.DROP2)
        img = transform(img, 1 + 0.1 * ease_in(k, 2), 0, 0, 0, CX, STR_Y * S)
        img = vignette(img, 0.6 * k, 1.5)
    return img


# =========================================================================== 16-31: Navratri celebration
NAV_COLORS = ["#FF7A00", "#FFFFFF", "#E0102A", "#1E3FD8", "#FFD200", "#10A83A", "#8A8A8A", "#7B2FBE", "#00A6A6"]


_polar = None


def polar():
    global _polar
    if _polar is None:
        xs, ys = grid()
        _polar = (np.arctan2(ys - CY, xs - CX).astype(np.float32), (np.hypot(xs - CX, ys - CY) / (H / 2)).astype(np.float32))
    return _polar


def rays(img, t, col, strength, n=14, cx=None):
    th, r = polar()
    rot = 0.25 * t
    pat = (0.5 + 0.5 * np.cos(n * th + rot)) ** 6 + 0.5 * (0.5 + 0.5 * np.cos((n // 2) * th - 1.3 * rot)) ** 10
    fall = np.exp(-r * 1.1) * (1 - np.exp(-r * 6))
    img += (pat * fall * strength)[..., None] * np.asarray(col, np.float32)
    return img


def mandala(lay, t, cx, cy, scale, alpha, palette, spin=1.0):
    th = np.linspace(0, 2 * np.pi, 720)
    rings = [
        (120, 8, 30, 0.8),
        (190, 12, 36, -0.6),
        (265, 16, 30, 0.45),
        (340, 24, 26, -0.35),
        (420, 32, 22, 0.25),
        (500, 40, 16, -0.2),
    ]
    for i, (R, n, a, sp) in enumerate(rings):
        col = np.asarray(palette[i % len(palette)]) * alpha
        rot = sp * t * spin
        r = R + a * np.abs(np.cos(n / 2 * (th + rot))) ** 0.6
        pts = np.stack([cx + np.cos(th) * r * scale * S, cy + np.sin(th) * r * scale * S], -1)
        lay.poly(pts, col, max(1, int(2 * S)), True)
        r2 = R - 8 + 0.6 * a * np.abs(np.sin(n / 2 * (th + rot) * 1.0)) ** 1.5
        pts = np.stack([cx + np.cos(th) * r2 * scale * S, cy + np.sin(th) * r2 * scale * S], -1)
        lay.poly(pts, col * 0.6, 1, True)
        # dots between petals
        k = np.arange(n) * 2 * np.pi / n - rot
        rd = (R + a + 12) * scale * S
        for kk in k:
            lay.circle((cx + np.cos(kk) * rd, cy + np.sin(kk) * rd), 3 * S * scale, col, fill=True)


def firework(lay, t, t0, cx, cy, col, seed, n=110, spd=520, life=1.6):
    dt = t - t0
    if dt < 0 or dt > life:
        return
    rng = np.random.default_rng(seed)
    ang = rng.uniform(0, 2 * np.pi, n)
    v = spd * S * rng.uniform(0.4, 1.0, n)
    k = 2.2

    def pos(tt):
        d = (1 - np.exp(-k * tt)) / k
        return cx + np.cos(ang) * v * d, cy + np.sin(ang) * v * d + 0.5 * 260 * S * tt * tt

    x1, y1 = pos(dt)
    x0, y0 = pos(max(0, dt - 0.09))
    fade = (1 - dt / life) ** 1.5
    col = np.asarray(col)
    segs = [np.array([[a, b], [c, d]]) for a, b, c, d in zip(x0, y0, x1, y1)]
    lay.polys(segs, col * fade, max(1, int(2 * S)))
    if dt < 0.12:
        lay.circle((cx, cy), 30 * S * (1 - dt / 0.12) + 2, np.array([1, 1, 1]) * 0.8, fill=True)


def temple_paths():
    """Line-art of Shree Khodaldham (Kagvad): Maru-Gurjara style shikhara with
    urushringas, domed mandapas, pillared base and platform. Units: design px,
    origin at the base centre, y up is negative."""
    paths = []

    def shikhara(cx, base_y, w, h, n_bands):
        ys = np.linspace(0, 1, 60)
        half = w / 2 * (1 - ys ** 2.4) ** 0.55 * (1 - 0.1 * ys)
        left = np.stack([cx - half, base_y - ys * h], -1)
        right = np.stack([cx + half, base_y - ys * h], -1)[::-1]
        outline = np.concatenate([left, right])
        paths.append(("shikhara", outline))
        for b in range(1, n_bands):
            yy = b / n_bands
            hw = w / 2 * (1 - yy ** 2.4) ** 0.55 * (1 - 0.1 * yy)
            paths.append(("band", np.array([[cx - hw, base_y - yy * h], [cx + hw, base_y - yy * h]])))
        # vertical rib
        paths.append(("band", np.array([[cx, base_y], [cx, base_y - 0.97 * h]])))
        # amalaka + kalash
        ty = base_y - h
        a = np.linspace(0, 2 * np.pi, 40)
        paths.append(("crown", np.stack([cx + np.cos(a) * w * 0.12, ty - 6 + np.sin(a) * w * 0.035], -1)))
        paths.append(("crown", np.stack([cx + np.cos(a) * w * 0.05, ty - 22 + np.sin(a) * w * 0.05], -1)))
        return ty - 22 - w * 0.05

    def dome(cx, base_y, r):
        a = np.linspace(np.pi, 2 * np.pi, 40)
        paths.append(("dome", np.stack([cx + np.cos(a) * r, base_y + np.sin(a) * r * 0.9], -1)))
        paths.append(("dome", np.array([[cx, base_y - r * 0.9], [cx, base_y - r * 0.9 - 26]])))
        a2 = np.linspace(0, 2 * np.pi, 20)
        paths.append(("dome", np.stack([cx + np.cos(a2) * 7, base_y - r * 0.9 - 30 + np.sin(a2) * 7], -1)))

    # platform & steps
    for i, (w, y) in enumerate([(1300, 0), (1240, -18), (1180, -36)]):
        paths.append(("base", np.array([[-w / 2, y], [w / 2, y], [w / 2, y - 18], [-w / 2, y - 18], [-w / 2, y]])))
    # wall with pillars
    paths.append(("base", np.array([[-540, -54], [-540, -230], [540, -230], [540, -54]])))
    for x in np.linspace(-500, 500, 17):
        paths.append(("pillar", np.array([[x, -54], [x, -210]])))
    for x in np.linspace(-468.75, 468.75, 16):
        a = np.linspace(np.pi, 2 * np.pi, 12)
        paths.append(("pillar", np.stack([x + np.cos(a) * 31, -170 + np.sin(a) * 28], -1)))
    paths.append(("base", np.array([[-560, -230], [560, -230], [540, -250], [-540, -250], [-560, -230]])))
    # side domes (mandapa)
    for x, r in [(-420, 90), (420, 90), (-280, 110), (280, 110)]:
        dome(x, -250, r)
    # urushringas
    for x, w, h in [(-180, 150, 250), (180, 150, 250), (-110, 190, 340), (110, 190, 340)]:
        shikhara(x, -250, w, h, 5)
    top = shikhara(0, -250, 300, 470, 8)
    return paths, top


def temple(img, t, t0, cx, base_y, scale, alpha):
    paths, top = temple_paths()
    draw = ease_inout(u(t, t0, t0 + 1.5))
    fill = smooth(u(t, t0 + 0.9, t0 + 2.2))
    lay = Layer()
    order_y = lambda p: -p[1][:, 1].min()  # noqa
    fill_lay = Layer()
    for kind, p in paths:
        P = np.stack([cx + p[:, 0] * scale * S, base_y + p[:, 1] * scale * S], -1)
        # bottom-to-top reveal
        ymin = -p[:, 1].max()
        if ymin / 800 > draw:
            continue
        m = (-p[:, 1]) / 800 <= draw + 0.02
        Pv = P[m] if kind in ("shikhara", "dome") else P
        col = {"shikhara": (1.0, 0.72, 0.3), "band": (1.0, 0.55, 0.2), "crown": (1.0, 0.85, 0.5),
               "dome": (1.0, 0.7, 0.3), "base": (1.0, 0.6, 0.25), "pillar": (0.9, 0.45, 0.2)}[kind]
        lay.poly(Pv, np.asarray(col) * alpha, max(1, int(2 * S)) if kind in ("shikhara", "dome", "base") else 1)
        if kind in ("shikhara",) and fill > 0:
            fill_lay.fillpoly(P, np.array([0.35, 0.12, 0.05]) * fill * alpha)
    img += fill_lay.f(1.0)
    img = lay.add_to(img, 1.2, 1.0)
    # flag (dhaja) waving on the top
    if draw >= 0.99:
        fx, fy = cx, base_y + top * scale * S
        pole_h = 90 * scale * S
        l2 = Layer()
        l2.line((fx, fy), (fx, fy - pole_h), np.array([1.0, 0.85, 0.5]) * alpha, max(1, int(2 * S)))
        fa = smooth(u(t, t0 + 1.4, t0 + 2.0))
        xs = np.linspace(0, 110, 30) * scale * S * fa
        wave = np.sin(xs / (40 * S) - 7 * t) * 9 * S * (xs / (110 * S * scale + 1e-6))
        top_e = np.stack([fx + xs, fy - pole_h + wave], -1)
        bot_e = np.stack([fx + xs * 0.9, fy - pole_h + 55 * scale * S * (1 - xs / (125 * scale * S + 1e-6)) + wave], -1)[::-1]
        if fa > 0.02:
            l2.fillpoly(np.concatenate([top_e, bot_e]), np.array([1.0, 0.45, 0.05]) * alpha)
        img = l2.add_to(img, 1.0, 0.8)
    return img


def garba_rings(img, t, cx, cy, alpha, speed=1.0, n_rings=3):
    lay = np.zeros_like(img)
    lines = Layer()
    beat = beat_pulse(t, T.DROP2, T.BEAT, 0.1)
    for ri in range(n_rings):
        rx = (360 + 190 * ri) * S
        ry = rx * 0.16
        n = 20 + 10 * ri
        dirn = 1 if ri % 2 == 0 else -1
        ang = np.arange(n) * 2 * np.pi / n + dirn * speed * 0.7 * (t - T.DROP2)
        # dancers bob on every beat, pairs close in on dandiya hits
        clap = beat_pulse(t, T.DROP2 + 0.25, T.BEAT, 0.08)
        ang = ang + ((np.arange(n) % 2) * 2 - 1) * 0.05 * clap
        x = cx + np.cos(ang) * rx
        y = cy + np.sin(ang) * ry - (8 + 10 * beat) * S * np.abs(np.sin(ang * 3 + t * 6))
        depth = 0.55 + 0.45 * (np.sin(ang) + 1) / 2
        cols = np.array([NAV_COLORS_RGB[(i + ri * 3) % 9] for i in range(n)]) * depth[:, None] * alpha
        for oy, g_ in ((0, 5), (-6, 4), (-12, 4), (-18, 3)):
            splat(lay, x, y + oy * S, cols * g_)
        for xi, yi, c in zip(x, y, cols):
            lines.line((xi - 7 * S, yi - 26 * S), (xi + 7 * S, yi - 14 * S), c * (0.5 + clap), 1)
            lines.line((xi + 7 * S, yi - 26 * S), (xi - 7 * S, yi - 14 * S), c * (0.5 + clap), 1)
    img += glow(lay, 1.5)
    return lines.add_to(img, 1.0, 0.5)


NAV_COLORS_RGB = [hexcol(c) for c in NAV_COLORS]


def embers(img, t, t0, n=600, alpha=1.0, seed=3):
    rng = np.random.default_rng(seed)
    x0 = rng.uniform(0, W, n)
    y0 = rng.uniform(0, H, n)
    sp = rng.uniform(30, 140, n) * S
    ph = rng.uniform(0, 6.28, n)
    dt = t - t0
    x = x0 + 30 * S * np.sin(ph + dt * 1.3)
    y = (y0 - sp * dt) % H
    b = (0.4 + 0.6 * np.sin(ph + dt * 4) ** 2) * alpha
    lay = np.zeros_like(img)
    splat(lay, x, y, np.array([1.0, 0.55, 0.15]) * b[:, None] * 2)
    img += glow(lay, 1.2)
    return img


def scene_navratri(t, fr):
    t0 = T.DROP2
    dt = t - t0
    beat = beat_pulse(t, t0, T.BEAT, 0.12)
    bar = int(dt // T.BAR)
    img = radial_bg(np.array([0.30, 0.04, 0.08]) * (0.8 + 0.3 * beat), (0.02, 0.0, 0.02))
    warm = np.array([1.0, 0.55, 0.15])
    lay = Layer()

    if t < T.COLORS9:
        img = rays(img, t, warm, 0.35 + 0.25 * beat)
        # mandala blooms from the ball burst, then becomes the halo of the temple
        bloom = back_out(u(t, t0, t0 + 0.9), 1.4)
        to_temple = ease_inout(u(t, T.TEMPLE - 0.3, T.TEMPLE + 0.8))
        mcx = CX
        mcy = lerp(CY, 330 * S, to_temple)
        msc = bloom * lerp(1.0, 0.62, to_temple) * (1 + 0.04 * beat)
        palette = [NAV_COLORS_RGB[i] * 0.9 for i in (0, 4, 2, 7, 5, 8)]
        mandala(lay, t, mcx, mcy, msc, 0.9, palette)
        img = lay.add_to(img, 1.0, 1.2)
        # center logo: v3 (Maa Khodal) during bar 1
        la = smooth(u(t, t0 + 0.05, t0 + 0.4)) * (1 - smooth(u(t, T.TEMPLE - 0.4, T.TEMPLE)))
        if la > 0:
            sc = back_out(u(t, t0, t0 + 0.6)) * (1 + 0.05 * beat) * 0.72
            back = np.exp(-(radial(CX, CY) * 2.4) ** 2)[..., None]
            img *= 1 - 0.8 * back * la
            img += np.exp(-(radial(CX, CY - 150 * S) * 7) ** 2)[..., None] * warm * 0.5 * la
            img = place(img, version(3), CX, CY, sc, la)
        # temple of Kagvad rises
        if t >= T.TEMPLE - 0.2:
            ta = smooth(u(t, T.TEMPLE - 0.2, T.TEMPLE + 0.2))
            img = temple(img, t, T.TEMPLE, CX, 905 * S, 0.95, ta)
            img = garba_rings(img, t, CX, 930 * S, smooth(u(t, T.TEMPLE + 0.8, T.TEMPLE + 1.6)), 1.0)
            fw = Layer()
            for k, (tt, x, y, c) in enumerate([(19.5, 420, 250, 0), (20.0, 1500, 220, 4), (20.5, 700, 160, 2), (21.0, 1250, 300, 8),
                                                (21.25, 300, 380, 5), (21.5, 1650, 400, 7)]):
                firework(fw, t, tt, x * S, y * S, NAV_COLORS_RGB[c] * 1.2 + 0.2, 40 + k)
            img = fw.add_to(img, 1.0, 1.4)
            ta2 = smooth(u(t, T.TEMPLE + 1.6, T.TEMPLE + 2.2)) * (1 - smooth(u(t, T.COLORS9 - 0.3, T.COLORS9)))
            if ta2 > 0:
                txt = text_rgba("SHREE KHODALDHAM  •  KAGVAD", "Montserrat.ttf", 40, 700, 14, (1.0, 0.82, 0.45))
                img = place(img, txt, CX, 1035 * S, 1.0, ta2)
        # ball burst
        img += pulse(t, t0, 0.08) * 1.3
    elif t < T.FINALE1:
        # nine colours of Navratri, one per beat
        k = min(8, int((t - T.COLORS9) / T.BEAT))
        tb = T.COLORS9 + k * T.BEAT
        fill_phase = t >= T.COLORS9 + 9 * T.BEAT - 1e-6  # after the 9th colour: build to finale
        col = NAV_COLORS_RGB[k]
        bright_bg = k in (1, 4)
        if not fill_phase:
            img = radial_bg(col * (0.85 + 0.25 * beat), col * 0.25)
            img = rays(img, t, np.ones(3), 0.25)
            ink = np.array([0.35, 0.05, 0.08]) if bright_bg else np.ones(3)
            mandala(lay, t * 1.5, CX, CY, 1.05 + 0.05 * beat, 0.55, [ink] * 6, 1.5)
            img = lay.add_to(img, 1.0 if not bright_bg else -1.0, 0.0 if bright_bg else 0.6)
            # big day numeral
            num = text_rgba(str(k + 1), "Anton-Regular.ttf", 700, None, 0, tuple(ink))
            img = place(img, num, CX + 730 * S, CY, 1.0 + 0.05 * (t - tb), 0.16)
            ver = [1, 2][k % 2]
            sc = 1.0 + 0.08 * np.exp(-(t - tb) / 0.12)
            rgb, a = logo_layer(ver, CX, CY, sc * (0.85 if ver != 3 else 0.8))
            if bright_bg:
                img = img * (1 - a) + rgb
            else:
                img = img * (1 - a) + a * np.ones(3) * 1.05
                img += glow(a * np.ones(3) * 0.3, 0.8)
            img += np.exp(-(t - tb) / 0.06) * 0.6
        else:
            # build: garba rings spin faster, everything spirals in to the finale
            kk = u(t, T.COLORS9 + 4.5, T.FINALE1)
            img = radial_bg(np.array([0.35, 0.05, 0.1]) * (1 + kk), (0.02, 0.0, 0.02))
            img = rays(img, t * (1 + 4 * kk), warm, 0.5 + kk)
            mandala(lay, t * (1 + 5 * kk), CX, CY, 1.1 - 0.5 * kk, 0.9, [NAV_COLORS_RGB[i] for i in (0, 4, 2, 7, 5, 8)], 2)
            img = lay.add_to(img, 1.0, 1.0)
            img = garba_rings(img, t, CX, CY + 200 * S * (1 - kk), 1.0, 1 + 6 * kk, 3)
            img = embers(img, t, T.COLORS9, 500, 1.0)
            img += kk ** 4 * 1.0
    else:
        img = scene_finale1(t, fr)
    return img


@functools.lru_cache(maxsize=1)
def dissolve_noise():
    n = value_noise((H, W), 22, 5, 3)
    n = (n - n.min()) / (np.ptp(n) + 1e-6)
    return n


def scene_finale1(t, fr):
    t0 = T.FINALE1
    fade = 1 - smooth(u(t, T.FADE1, T.BLACK1 - 0.2))
    img = radial_bg(np.array([0.28, 0.04, 0.06]) * fade, (0.0, 0.0, 0.0))
    img = rays(img, t, np.array([1.0, 0.6, 0.2]), 0.3 * fade * (1 - 0.5 * u(t, t0, T.FADE1)))
    fw = Layer()
    rng = np.random.default_rng(77)
    for k in range(9):
        tt = t0 + (0 if k < 4 else 0.25 * (k - 3))
        firework(fw, t, tt, rng.uniform(250, 1670) * S, rng.uniform(90, 330) * S, NAV_COLORS_RGB[k] * 1.3 + 0.2, 90 + k, 130, 600, 2.2)
    img = fw.add_to(img, fade, 1.5)
    img *= 1 - 0.7 * np.exp(-(radial(CX, CY - 40 * S) * 2.2) ** 2)[..., None]
    # logo v1 + NAVRATRI 2026
    sc = back_out(u(t, t0, t0 + 0.5), 1.4) * (1 + 0.03 * (t - t0))
    dissolve = u(t, T.FADE1 + 0.3, T.BLACK1 - 0.3)
    rgb, a = logo_layer(1, CX, CY - 60 * S, sc * 0.9)
    if dissolve > 0:
        thr = dissolve_noise()
        m = (thr > dissolve * 1.1)[..., None].astype(np.float32)
        edge = ((thr > dissolve * 1.1 - 0.04) & (thr <= dissolve * 1.1))[..., None].astype(np.float32)
        img += glow(edge * a * np.array([1.0, 0.5, 0.1]) * 3, 1.0)
        a = a * m
        rgb = rgb * m
    img = img * (1 - a) + rgb
    img += glow(rgb * 0.35, 0.8 * fade)
    ta = smooth(u(t, t0 + 0.3, t0 + 0.8)) * fade
    txt = text_rgba("NAVRATRI 2026", "Montserrat.ttf", 64, 800, 22, (1.0, 0.83, 0.42))
    img = place(img, txt, CX, CY + 250 * S, 1 + 0.02 * (t - t0), ta)
    guj = text_rgba("નવરાત્રી મહોત્સવ", "NotoSansGujarati.ttf", 44, 600, 0, (1.0, 0.65, 0.35))
    img = place(img, guj, CX, CY + 325 * S, 1.0, ta * 0.9)
    img = embers(img, t, t0, 700, fade)
    img += pulse(t, t0, 0.15) * 2.5
    return img * fade


# =========================================================================== dispatcher
def render(t, fr):
    if t < T.DROP1:
        img = scene_intro(t, fr)
    elif t < T.FILM:
        img = scene_drop(t, fr)
    elif t < T.DROP2:
        img = scene_film(t, fr)
    elif t < T.BLACK1:
        img = scene_navratri(t, fr)
    else:
        img = blank()
    return img
