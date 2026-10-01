"""v2 storyboard — one spark, one song, three brands.

Song: "Soul Instrumental Garba" (KalsStockMedia, Pixabay licence). Its sections drive everything:
  0.0-10.2  intro          spark is born, draws a diya, becomes its flame
  11.1      drums          garba rings orbit the flame -> Khodaldham temple -> logo is written
  41.2      drum break     everything falls away, only the spark
  42.4      groove 2       the spark is a light on Earth -> Rajkot -> a city's network -> broadcast -> BS9
  70.9      silence        black, the spark breathes
  72.4      groove 3       the spark is a headlight -> scooter drawing -> ride -> charge -> Wayonaa
  102.4     breakdown      one flame. one city. one heartbeat.
  109.9     finale         the spark splits into three lights, the three logos, NAVRATRI 2026
  ~134      song ends      the spark lingers, then goes out
"""
import json
import functools
import numpy as np
import cv2

from engine import *  # noqa

TOTAL = 136.5

# ------------------------------------------------------------------ section times (from the song)
INTRO, DRUMS1, BREAK1, GROOVE2, SILENCE, GROOVE3, BREAKDOWN, FINALE, SONG_END = \
    0.0, 11.1, 41.2, 42.4, 70.9, 72.4, 102.4, 109.9, 134.0

FLAME = (960.0, 452.0)   # where the diya flame sits in act 1


# =================================================================== geometry helpers
def arc(cx, cy, rx, ry, a0, a1, n=80, rot=0.0):
    th = np.linspace(a0, a1, n)
    x = rx * np.cos(th)
    y = ry * np.sin(th)
    c, s = np.cos(rot), np.sin(rot)
    return np.stack([cx + x * c - y * s, cy + x * s + y * c], -1)


def plen(p):
    return float(np.sum(np.hypot(*np.diff(p, axis=0).T))) if len(p) > 1 else 0.0


def partial(p, k):
    """First fraction k of polyline p (by length)."""
    if k <= 0 or len(p) < 2:
        return p[:0]
    if k >= 1:
        return p
    seg = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(p, axis=0).T))])
    L = k * seg[-1]
    j = int(np.searchsorted(seg, L))
    f = (L - seg[j - 1]) / max(seg[j] - seg[j - 1], 1e-9)
    return np.vstack([p[:j], p[j - 1] + (p[j] - p[j - 1]) * f])


def draw_sequence(v, paths, k, col, w=1.6, a=1.0):
    """Draw a list of polylines progressively as one continuous pen (k 0..1). Returns pen tip."""
    lens = np.array([plen(p) for p in paths])
    total = lens.sum()
    rem = k * total
    tip = None
    for p, L in zip(paths, lens):
        if rem <= 0:
            break
        q = partial(p, rem / L) if rem < L else p
        v.poly(q, col, w, a)
        tip = q[-1] if len(q) else tip
        rem -= L
    return (float(tip[0]), float(tip[1])) if tip is not None else None


def seq_tip(paths, k):
    lens = np.array([plen(p) for p in paths])
    rem = k * lens.sum()
    for p, L in zip(paths, lens):
        if rem <= L:
            q = partial(p, max(rem, 1e-6) / L)
            return float(q[-1][0]), float(q[-1][1])
        rem -= L
    return float(paths[-1][-1][0]), float(paths[-1][-1][1])


class Cam:
    """Tiny pinhole camera, y up, looking at target."""

    def __init__(self, eye, target, fov=40, cx=960, cy=540):
        eye, target = np.asarray(eye, float), np.asarray(target, float)
        f = target - eye
        f /= np.linalg.norm(f)
        r = np.cross(f, [0, 1, 0])
        r /= np.linalg.norm(r)
        up = np.cross(r, f)
        self.R = np.stack([r, up, f])
        self.eye = eye
        self.f = 960 / np.tan(np.radians(fov) / 2)
        self.cx, self.cy = cx, cy

    def __call__(self, P):
        X = (np.asarray(P, float) - self.eye) @ self.R.T
        z = np.maximum(X[..., 2], 1e-3)
        return np.stack([self.cx + self.f * X[..., 0] / z, self.cy - self.f * X[..., 1] / z], -1), X[..., 2]


# =================================================================== ACT 1 — Khodaldham
def diya_paths():
    cx, cy = 960, 560
    bowl = arc(cx, cy, 170, 92, 0, np.pi, 90)                               # lower bowl
    rim_back = arc(cx, cy, 170, 26, np.pi, 2 * np.pi, 60)                   # back rim
    rim_front = arc(cx, cy, 170, 26, 0, np.pi, 60)
    spout = np.array([[cx + 150, cy - 12], [cx + 214, cy - 30], [cx + 168, cy + 10]])
    foot = arc(cx, cy + 104, 70, 13, 0, 2 * np.pi, 60)
    neck_l = np.array([[cx - 48, cy + 88], [cx - 62, cy + 102]])
    neck_r = np.array([[cx + 48, cy + 88], [cx + 62, cy + 102]])
    wick = np.array([[cx + 176, cy - 18], [cx + 186, cy - 52], [cx + 190, cy - 66]])
    return [bowl, rim_back, rim_front, spout, foot, neck_l, neck_r, wick], (cx + 190, cy - 66)


DIYA_T0, DIYA_T1 = 2.3, 9.4


def flame_shape(x, y, t, h=110, w=38):
    s = np.linspace(0, 1, 60)
    sway = 6 * np.sin(t * 5.3) * s ** 2 + 3 * np.sin(t * 9.1 + 1) * s ** 3
    half = w * np.sin(np.pi * s) ** 0.9 * (1 - s) ** 0.35
    left = np.stack([x - half + sway, y - s * h], -1)
    right = np.stack([x + half + sway, y - s * h], -1)[::-1]
    return np.vstack([left, right])


def act1(t, fr):
    img = new_frame()
    trail = None
    paths, wick_top = diya_paths()
    flame_on = smooth(u(t, 9.4, 10.0))
    # where the flame lives on screen during act 1 (diya moves to centre-top for the garba)
    shift = eio(u(t, DRUMS1 - 0.4, DRUMS1 + 1.4))
    dx, dy = lerp(0, 960 - wick_top[0], shift), lerp(0, 600 - wick_top[1], shift)

    # ---- shot 1: the spark is born on a hairline (0 - 2.3)
    if t < DRUMS1 + 1.4:
        v = Vec()
        a_line = window(t, 0.6, 3.2, 0.8, 0.8)
        L = 700 * eo(u(t, 0.8, 2.2))
        v.line((960 - L, 640), (960 + L, 640), INK, 1.0, 0.28 * a_line)
        for i in range(-6, 7):
            x = 960 + i * 100
            if abs(x - 960) < L:
                v.line((x, 634), (x, 646), INK, 1.0, 0.25 * a_line)
        # ---- shot 2: construction guides + the diya is drawn by the spark (2.3 - 9.4)
        ga = window(t, 2.0, DRUMS1 + 0.6, 0.6, 1.0)
        if ga > 0:
            cxd, cyd = 960 + dx, 560 + dy
            v.circle((cxd, cyd), 200, INK, 1.0, 0.16 * ga, dash=[4, 7])
            v.circle((cxd, cyd), 120, INK, 1.0, 0.10 * ga, dash=[2, 6])
            v.line((cxd - 300, cyd), (cxd + 300, cyd), INK, 1.0, 0.12 * ga)
            v.line((cxd, cyd - 260), (cxd, cyd + 200), INK, 1.0, 0.12 * ga)
            kd = eio(u(t, DIYA_T0, DIYA_T1))
            moved = [p + [dx, dy] for p in paths]
            draw_sequence(v, moved, kd, INK, 2.0, 0.92 * (1 - 0.6 * shift))
        img = v.over(img)
        ga = window(t, 3.0, DRUMS1, 0.5, 0.8)
        if ga > 0:
            text(img, "r = 170", 960 + dx + 210, 560 + dy - 8, "mono", 15, MUTE, ga)
            text(img, "DIYA  /  દીવો", 960 + dx - 300, 560 + dy + 150, "mono", 15, MUTE, ga, tracking=0.1)
            text(img, "fig. 01", 960 + dx - 300, 560 + dy - 230, "serif", 26, MUTE, ga)
        # kinetic words (left)
        wa = 1 - smooth(u(t, 10.2, 11.0))
        img = words(img, t, 4.1, [("Every", None, 0.0), ("year,", None, 0.25)], 140, 300, "sans", 64, a=wa)
        img = words(img, t, 5.3, [("one", None, 0.0), ("flame", SAFFRON, 0.55)], 140, 400, "serif", 128, a=wa)
        img = words(img, t, 7.4, [("એક", None, 0.0), ("જ્યોત", SAFFRON, 0.3)], 144, 510, "guj", 54, a=wa * 0.9)
        img = words(img, t, 10.25, [("lights", None, 0.0), ("up", None, 0.2)], 1350, 300, "serif", 70, a=window(t, 10.2, 11.6, 0.2, 0.5))

    # ---- the flame (from 9.4 on the spark becomes the flame)
    fx, fy = wick_top[0] + dx, wick_top[1] + dy
    flame_on *= 1 - smooth(u(t, TEMPLE_T0 - 0.5, TEMPLE_T0))
    if flame_on > 0 and t < BREAK1:
        v = Vec()
        fh = 110 * flame_on * (1 + 0.15 * beat_env(t, 0.15, DRUMS1))
        fs = flame_shape(fx, fy, t, fh, 34)
        v.poly(fs, SAFFRON, 2.0, 0.95 * flame_on, closed=True, fill=SAFFRON * 0.55, fill_a=0.5 * flame_on)
        inner = flame_shape(fx, fy - 4, t + 0.1, fh * 0.55, 15)
        v.poly(inner, SPARK, 1.4, flame_on, closed=True, fill=SPARK, fill_a=0.85 * flame_on)
        img = v.add(img, 1.0, 0.9)

    # ---- shot 4: garba rings around the flame (11.1 - 20.4)
    if DRUMS1 - 0.2 < t < 21.2:
        img = garba_rings(img, t, (fx, fy), window(t, DRUMS1, 21.2, 0.6, 0.8))
        a = 1.0
        img = words(img, t, 11.15, [("LAKHS", None, 0.0)], 140, 300, "black", 120, a=window(t, 11.1, 15.0, 0.1, 0.4))
        img = words(img, t, 11.65, [("OF", None, 0.0), ("HEARTS", SAFFRON, 0.25)], 140, 420, "black", 120,
                    a=window(t, 11.6, 15.0, 0.1, 0.4))
        img = words(img, t, 15.2, [("one", None, 0.0), ("rhythm", SAFFRON, 0.4)], 1780, 330, "serif", 120,
                    anchor_x="r", a=window(t, 15.1, 19.2, 0.1, 0.4))
        img = words(img, t, 17.2, [("ગરબે", None, 0.0), ("ઘૂમે", SAFFRON, 0.3), ("ગુજરાત", None, 0.6)], 1780, 450,
                    "guj", 64, anchor_x="r", a=window(t, 17.1, 20.6, 0.1, 0.4))
        img = text(img, "RING 03 · 24 DANCERS · 1.2 RAD/S", 140, 900, "mono", 15, MUTE, window(t, 12.0, 20.4))

    # ---- shot 5: the Khodaldham temple of Kagvad (20.4 - 28.6)
    if 19.8 < t < 30.0:
        img = temple_shot(img, t, (fx, fy))
    # ---- shot 6: the logo is written by the spark (28.6 - 39.0)
    if 28.0 < t < BREAK1 + 1.2:
        img = logo_shot_k(img, t)
    return img


@functools.lru_cache(maxsize=1)
def ring_dancers():
    rng = np.random.default_rng(3)
    rings = []
    for i, (r, n) in enumerate([(110, 12), (175, 18), (245, 26), (320, 34)]):
        rings.append((r, n, (-1) ** i * (0.9 - 0.15 * i), rng.uniform(0, 6.28)))
    return rings


def garba_rings(img, t, center, a):
    if a <= 0:
        return img
    tilt = lerp(np.radians(68), np.radians(58), u(t, DRUMS1, 20.4))
    cam = Cam((0, 2100 * np.sin(tilt), -2100 * np.cos(tilt)), (0, 0, 0), 40, center[0], center[1] + 60)
    v = Vec()
    dots = []
    b = beat_env(t, 0.18, DRUMS1)
    grow = eo(u(t, DRUMS1, DRUMS1 + 1.2))
    for i, (r, n, sp, ph) in enumerate(ring_dancers()):
        rr = r * grow * (1 + 0.03 * b * (i % 2 * 2 - 1))
        th = np.linspace(0, 2 * np.pi, 200)
        P = np.stack([rr * np.cos(th), np.zeros_like(th), rr * np.sin(th)], -1)
        p2, _ = cam(P)
        v.poly(p2, INK, 1.0, 0.22 * a, closed=True)
        ang = np.arange(n) * 2 * np.pi / n + sp * (t - DRUMS1) + ph
        hop = 10 * np.abs(np.sin(ang * 3 + t * 6.0)) * (0.5 + b)
        P = np.stack([rr * np.cos(ang), hop, rr * np.sin(ang)], -1)
        p2, z = cam(P)
        for q, zz in zip(p2, z):
            dots.append((q, zz, i))
    img = v.over(img)
    v = Vec()
    for q, zz, i in sorted(dots, key=lambda d: -d[1]):
        near = clamp(1.5 - zz / 2400)
        col = SAFFRON if i == 1 else INK
        v.circle(q, 4.2 * (0.6 + near * 0.6), col, fill=True, a=a * (0.45 + 0.55 * near))
    img = v.add(img, 1.0, 0.5)
    return img


def temple_paths():
    paths = []

    def shikhara(cx, base_y, w, h, n_bands):
        ys = np.linspace(0, 1, 60)
        half = w / 2 * (1 - ys ** 2.4) ** 0.55 * (1 - 0.1 * ys)
        left = np.stack([cx - half, base_y - ys * h], -1)
        right = np.stack([cx + half, base_y - ys * h], -1)[::-1]
        paths.append(("main", np.concatenate([left, right])))
        for b in range(1, n_bands):
            yy = b / n_bands
            hw = w / 2 * (1 - yy ** 2.4) ** 0.55 * (1 - 0.1 * yy)
            paths.append(("detail", np.array([[cx - hw, base_y - yy * h], [cx + hw, base_y - yy * h]])))
        paths.append(("detail", np.array([[cx, base_y], [cx, base_y - 0.97 * h]])))
        a = np.linspace(0, 2 * np.pi, 40)
        paths.append(("main", np.stack([cx + np.cos(a) * w * 0.12, base_y - h - 6 + np.sin(a) * w * 0.035], -1)))
        return base_y - h - 22

    def dome(cx, base_y, r):
        a = np.linspace(np.pi, 2 * np.pi, 40)
        paths.append(("main", np.stack([cx + np.cos(a) * r, base_y + np.sin(a) * r * 0.9], -1)))
        paths.append(("detail", np.array([[cx, base_y - r * 0.9], [cx, base_y - r * 0.9 - 26]])))

    for w, y in [(1300, 0), (1240, -18), (1180, -36)]:
        paths.append(("main", np.array([[-w / 2, y], [w / 2, y], [w / 2, y - 18], [-w / 2, y - 18], [-w / 2, y]])))
    paths.append(("main", np.array([[-540, -54], [-540, -230], [540, -230], [540, -54]])))
    for x in np.linspace(-500, 500, 17):
        paths.append(("detail", np.array([[x, -54], [x, -210]])))
    paths.append(("main", np.array([[-560, -230], [560, -230], [540, -250], [-540, -250], [-560, -230]])))
    for x, r in [(-420, 90), (420, 90), (-280, 110), (280, 110)]:
        dome(x, -250, r)
    for x, w, h in [(-180, 150, 250), (180, 150, 250), (-110, 190, 340), (110, 190, 340)]:
        shikhara(x, -250, w, h, 5)
    top = shikhara(0, -250, 300, 470, 8)
    return paths, top


TEMPLE_T0, TEMPLE_T1 = 20.4, 26.6
T_BASE = (960, 960)
T_SCALE = 0.95


def temple_world(paths):
    return [(k, np.stack([T_BASE[0] + p[:, 0] * T_SCALE, T_BASE[1] + p[:, 1] * T_SCALE], -1)) for k, p in paths]


def temple_shot(img, t, flame):
    a = window(t, TEMPLE_T0 - 0.4, 29.6, 0.5, 1.0)
    paths, top = temple_paths()
    wp = temple_world(paths)
    main = [p for k, p in wp if k == "main"]
    detail = [p for k, p in wp if k == "detail"]
    k = eio(u(t, TEMPLE_T0, TEMPLE_T1))
    v = Vec()
    # construction grid
    for y in range(400, 1000, 80):
        v.line((300, y), (1620, y), INK, 1.0, 0.06 * a)
    v.line((960, 120), (960, 980), INK, 1.0, 0.10 * a, dash=[4, 8])
    draw_sequence(v, main, k, INK, 1.8, 0.9 * a)
    kd = u(t, TEMPLE_T0 + 1.5, TEMPLE_T1 + 0.8)
    draw_sequence(v, detail, kd, INK, 1.0, 0.45 * a)
    # dimension line for the height
    ytop = T_BASE[1] + top * T_SCALE
    da = smooth(u(t, TEMPLE_T1 - 0.6, TEMPLE_T1 + 0.4)) * a
    if da > 0:
        x = 1500
        v.line((x, T_BASE[1]), (x, ytop), SAFFRON, 1.2, da)
        v.line((x - 10, T_BASE[1]), (x + 10, T_BASE[1]), SAFFRON, 1.2, da)
        v.line((x - 10, ytop), (x + 10, ytop), SAFFRON, 1.2, da)
    img = v.over(img)
    if da > 0:
        text(img, "159 FT", 1520, (T_BASE[1] + ytop) / 2, "mono_b", 18, SAFFRON, da, tracking=0.1)
    # flag on the top
    fa = smooth(u(t, TEMPLE_T1, TEMPLE_T1 + 0.6)) * a
    if fa > 0:
        v = Vec()
        px, py = 960, ytop
        v.line((px, py), (px, py - 80), INK, 1.4, fa)
        xs = np.linspace(0, 110, 30) * fa
        wave = np.sin(xs / 30 - 7 * t) * 7 * (xs / 110)
        top_e = np.stack([px + xs, py - 80 + wave], -1)
        bot_e = np.stack([px + xs * 0.9, py - 80 + 52 * (1 - xs / 125) + wave], -1)[::-1]
        v.poly(np.vstack([top_e, bot_e]), SAFFRON, 1.5, fa, closed=True, fill=SAFFRON, fill_a=0.9 * fa)
        img = v.add(img, 1.0, 0.6)
    la = window(t, TEMPLE_T0 + 1.0, 28.4, 0.4, 0.6)
    img = words(img, t, TEMPLE_T0 + 1.0, [("a", None, 0.0), ("temple", None, 0.2)], 140, 250, "serif", 84, a=la)
    img = words(img, t, TEMPLE_T0 + 2.6, [("built", None, 0.0), ("on", None, 0.2), ("faith", SAFFRON, 0.4)], 140, 340,
                "serif", 84, a=la)
    img = text(img, "SHREE KHODALDHAM · KAGVAD, RAJKOT", 140, 430, "mono", 16, MUTE, la, tracking=0.12)
    img = text(img, "MARU-GURJARA · INAUGURATED 21.01.2017", 140, 458, "mono", 16, MUTE, la, tracking=0.12)
    return img


LOGO_K = (960, 470, 1150)   # cx, cy, width of the Khodaldham wordmark


def logo_shot_k(img, t):
    cx, cy, wd = LOGO_K
    a = 1 - smooth(u(t, BREAK1 - 0.6, BREAK1 + 0.2))
    k_write = eio(u(t, 28.6, 32.4))
    k_fill = smooth(u(t, 32.0, 33.2))
    to_guj = smooth(u(t, 35.0, 36.0))
    if t < 36.2:
        v = Vec()
        draw_outline(v, "k_eng", cx, cy, wd, k_write, INK, 1.3, 0.9 * a * (1 - k_fill * 0.85))
        img = v.add(img)
        if k_fill > 0:
            xs, _ = grid()
            edge = (cx - wd / 2 + (wd * 1.2) * k_fill) * S
            m = np.clip((edge - xs) / (40 * S), 0, 1)
            if to_guj > 0:
                xs2, _ = grid()
                e2 = (cx - wd / 2 - 100 + (wd + 200) * to_guj) * S
                m = m * (1 - np.clip((e2 - xs2) / (60 * S), 0, 1))
            img = logo(img, "k_eng", cx, cy, wd, a, mask=m)
    if to_guj > 0:
        xs, _ = grid()
        edge = (cx - wd / 2 - 100 + (wd + 200) * to_guj) * S
        m = np.clip((edge - xs) / (60 * S), 0, 1)
        img = logo(img, "k_guj", cx, cy + 20, wd * 1.02, a, mask=m)
    ta = window(t, 36.4, BREAK1 + 0.2, 0.5, 0.6)
    img = text(img, "SHREE KHODALDHAM", 960, 790, "mono", 18, MUTE, ta, anchor="mm", tracking=0.3)
    img = words(img, t, 37.0, [("the", None, 0.0), ("pride", SAFFRON, 0.2), ("of", None, 0.4), ("a", None, 0.5),
                               ("community", None, 0.6)], 960, 860, "serif", 54, anchor_x="m", a=ta)
    return img


def act1_spark(t):
    """(x, y, size, colour, alpha) of the hero spark in act 1."""
    paths, wick = diya_paths()
    if t < DIYA_T0:
        k = eo(u(t, 0.6, 2.2))
        x = lerp(960, paths[0][0][0], smooth(u(t, 1.7, DIYA_T0)))
        y = lerp(640, paths[0][0][1], smooth(u(t, 1.7, DIYA_T0)))
        return x, y, 0.6 + 0.6 * k, SPARK, smooth(u(t, 0.3, 1.0))
    if t < DIYA_T1:
        x, y = seq_tip(paths, eio(u(t, DIYA_T0, DIYA_T1)))
        return x, y, 1.0, SPARK, 1.0
    shift = eio(u(t, DRUMS1 - 0.4, DRUMS1 + 1.4))
    fx = wick[0] + lerp(0, 960 - wick[0], shift)
    fy = wick[1] + lerp(0, 600 - wick[1], shift)
    if t < TEMPLE_T0:
        return fx, fy - 30, 1.0 + 0.4 * beat_env(t, 0.15, DRUMS1), SPARK, 1.0
    if t < TEMPLE_T1:
        paths_t, top = temple_paths()
        main = [p for k, p in temple_world(paths_t) if k == "main"]
        x, y = seq_tip(main, eio(u(t, TEMPLE_T0, TEMPLE_T1)))
        k = smooth(u(t, TEMPLE_T0, TEMPLE_T0 + 0.4))
        return lerp(fx, x, k), lerp(fy - 30, y, k), 1.0, SPARK, 1.0
    if t < 28.6:
        ytop = T_BASE[1] + temple_paths()[1] * T_SCALE - 80
        k = smooth(u(t, TEMPLE_T1, TEMPLE_T1 + 0.6))
        x, y = seq_tip([p for kk, p in temple_world(temple_paths()[0]) if kk == "main"], 1.0)
        return lerp(x, 960, k), lerp(y, ytop, k), 1.2, SPARK, 1.0
    if t < 32.4:
        cx, cy, wd = LOGO_K
        tip = outline_tip("k_eng", cx, cy, wd, eio(u(t, 28.6, 32.4)))
        ytop = T_BASE[1] + temple_paths()[1] * T_SCALE - 80
        k = smooth(u(t, 28.6, 29.0))
        return lerp(960, tip[0], k), lerp(ytop, tip[1], k), 1.0, SPARK, 1.0
    # rests at the end of the swoosh, then floats to centre for the break
    cx, cy, wd = LOGO_K
    end = (cx + wd * 0.48, cy + 0.2 * wd * logo_height("k_eng", 1) * 1.0)
    k = eio(u(t, 39.6, BREAK1 + 0.6))
    col = lerp(SPARK, np.array([0.7, 0.85, 1.0], np.float32), smooth(u(t, BREAK1, GROOVE2)))
    return lerp(end[0], 960, k), lerp(end[1], 540, k), 1.0 + 0.3 * smooth(u(t, BREAK1, GROOVE2)), col, 1.0


def outline_tip(name, cx, cy, width, k):
    polys, aspect = logo_outline(name)
    order = np.argsort([p[:, 0].min() for p in polys])
    g = order[0::6]
    ox, oy = cx - width / 2, cy - width * aspect / 2
    ps = [np.stack([ox + polys[i][:, 0] * width, oy + polys[i][:, 1] * width], -1) for i in g]
    return seq_tip(ps, max(k, 1e-4))


# =================================================================== ACT 2 — BS9
@functools.lru_cache(maxsize=1)
def coast():
    gj = json.load(open(os.path.join(HERE, "..", "motion", "assets", "land.geojson")))
    rings = []
    for f in gj["features"]:
        g = f["geometry"]
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        for poly in polys:
            r = np.array(poly[0])
            if len(r) > 8:
                rings.append(r)
    return rings


@functools.lru_cache(maxsize=1)
def night_lights():
    im = cv2.imread(os.path.join(HERE, "..", "motion", "assets", "earth_lights.png"))[..., 1].astype(np.float32) / 255
    im = cv2.resize(im, (1024, 512), interpolation=cv2.INTER_AREA)
    ys, xs = np.where(im > 0.22)
    lon = xs / 1024 * 360 - 180
    lat = 90 - ys / 512 * 180
    return lat, lon, im[ys, xs]


RAJKOT = (22.3039, 70.8022)


def llvec(lat, lon):
    la, lo = np.radians(lat), np.radians(lon)
    return np.stack([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)], -1)


def ortho(lat, lon, lat0, lon0, R, cx=960, cy=540):
    lo = np.radians(lon0)
    la = np.radians(lat0)
    e = np.array([-np.sin(lo), np.cos(lo), 0.0])
    n = np.array([-np.sin(la) * np.cos(lo), -np.sin(la) * np.sin(lo), np.cos(la)])
    f = llvec(lat0, lon0)
    P = llvec(lat, lon)
    return np.stack([cx + (P @ e) * R, cy - (P @ n) * R], -1), P @ f


def globe_R(t):
    # start very close on Rajkot, pull out to the whole Earth, hold, dive back in
    keys = [(GROOVE2, 60000), (GROOVE2 + 2.6, 380), (48.6, 400), (50.6, 3200), (52.4, 26000), (53.6, 120000)]
    ts = [k[0] for k in keys]
    ls = np.log([k[1] for k in keys])
    i = max(0, min(len(ts) - 2, np.searchsorted(ts, t) - 1))
    x = eio(u(t, ts[i], ts[i + 1]))
    return float(np.exp(lerp(ls[i], ls[i + 1], x)))


def globe_center(t):
    k = eio(u(t, GROOVE2 + 0.6, GROOVE2 + 3.4)) * (1 - eio(u(t, 48.4, 50.8)))
    return RAJKOT[0] + k * -2.0, RAJKOT[1] + k * 8.0


def earth_shot(img, t):
    R = globe_R(t)
    lat0, lon0 = globe_center(t)
    a = window(t, BREAK1 + 0.6, 54.6, 0.9, 1.0)
    v = Vec()
    # disc
    if R < 4000:
        v.circle((960, 540), R, BG * 0.6, fill=True, a=a)
        v.circle((960, 540), R, INK, 1.2, 0.35 * a)
    step = 15 if R < 2000 else (3 if R < 20000 else 1)
    for lat in np.arange(-75, 76, step):
        lon = np.linspace(-180, 180, 241)
        p, z = ortho(np.full_like(lon, lat), lon, lat0, lon0, R)
        p = p[z > 0.02]
        if len(p) > 1:
            v.poly(p, INK, 0.8, 0.10 * a)
    for lon in np.arange(-180, 180, step):
        lat = np.linspace(-85, 85, 121)
        p, z = ortho(lat, np.full_like(lat, lon), lat0, lon0, R)
        p = p[z > 0.02]
        if len(p) > 1:
            v.poly(p, INK, 0.8, 0.10 * a)
    for r in coast():
        if R > 8000 and (abs(r[:, 0].mean() - lon0) > 25 or abs(r[:, 1].mean() - lat0) > 20):
            continue
        p, z = ortho(r[:, 1], r[:, 0], lat0, lon0, R)
        if (z < 0).all():
            continue
        if p[:, 0].max() < -200 or p[:, 0].min() > 2120 or p[:, 1].max() < -200 or p[:, 1].min() > 1280:
            continue
        p = np.clip(p, -5000, 7000)
        vis = z > 0
        v.poly(p[vis] if vis.mean() < 1 else p, INK, 1.1, 0.55 * a, closed=vis.all())
    img = v.over(img)
    # city lights as tiny warm points
    if R < 6000:
        lat, lon, b = night_lights()
        p, z = ortho(lat, lon, lat0, lon0, R)
        m = (z > 0.05) & (p[:, 0] > 0) & (p[:, 0] < 1920) & (p[:, 1] > 0) & (p[:, 1] < 1080)
        pts = p[m] * S
        bb = b[m] * z[m]
        lay = np.zeros_like(img)
        xi = np.clip(pts[:, 0].astype(int), 0, W - 1)
        yi = np.clip(pts[:, 1].astype(int), 0, H - 1)
        np.add.at(lay, (yi, xi), (np.array([1.0, 0.75, 0.45]) * bb[:, None] * 0.9 * a).astype(np.float32))
        img += lay + bloom_of(lay, 0.8)
    # labels
    la = window(t, 50.4, 53.4, 0.3, 0.4)
    if la > 0:
        p, _ = ortho(np.array([23.4]), np.array([71.8]), lat0, lon0, R)
        img = text(img, "GUJARAT", p[0, 0], p[0, 1] - 60, "mono_b", 20, INK, la, anchor="mm", tracking=0.4)
    ra = window(t, 51.6, 55.0, 0.3, 0.5)
    if ra > 0:
        v = Vec()
        s = lerp(140, 46, eo(u(t, 51.6, 52.4)))
        for sx, sy in [(-1, -1), (1, -1), (1, 1), (-1, 1)]:
            x0, y0 = 960 + sx * s, 540 + sy * s
            v.line((x0, y0), (x0 - sx * s * 0.4, y0), BLUE, 1.6, ra)
            v.line((x0, y0), (x0, y0 - sy * s * 0.4), BLUE, 1.6, ra)
        img = v.over(img)
        img = text(img, "RAJKOT", 1030, 520, "sans", 44, INK, ra)
        img = text(img, "22.3039° N · 70.8022° E", 1032, 566, "mono", 16, MUTE, ra, tracking=0.08)
    wa = window(t, GROOVE2 + 2.4, 50.0, 0.3, 0.5)
    img = words(img, t, GROOVE2 + 2.5, [("Somewhere,", None, 0.0)], 110, 170, "serif", 60, a=wa)
    img = words(img, t, GROOVE2 + 4.0, [("a", None, 0.0), ("city", BLUE, 0.2), ("is", None, 0.5),
                                         ("speaking.", None, 0.7)], 110, 245, "serif", 60, a=wa)
    img = words(img, t, GROOVE2 + 5.6, [("એક", None, 0.0), ("શહેર", BLUE, 0.3), ("બોલે", None, 0.6), ("છે", None, 0.8)],
                112, 320, "guj", 40, a=wa * 0.85)
    return img


@functools.lru_cache(maxsize=1)
def city_roads():
    rng = np.random.default_rng(42)
    roads = []
    th = np.linspace(0, 2 * np.pi, 240)
    for base, amp in [(5.2, 0.5), (2.1, 0.2)]:
        r = base + amp * np.sin(2 * th + 1) + 0.3 * np.cos(3 * th) * (base > 3)
        roads.append((np.stack([np.cos(th) * r, np.sin(th) * r], -1), "ring"))
    names = [(120, "JAMNAGAR RD"), (82, "MORBI RD"), (42, "AHMEDABAD HWY"), (-12, "BHAVNAGAR RD"),
             (-78, "GONDAL RD"), (-128, "KALAWAD RD"), (200, "150 FT RING RD"), (160, "RAIYA RD")]
    for i, (ang, nm) in enumerate(names):
        a = np.radians(ang)
        s = np.linspace(0.3, 12, 100)
        bend = 0.04 * np.sin(s * 0.5 + i)
        roads.append((np.stack([np.cos(a + bend) * s, np.sin(a + bend) * s], -1), "radial"))
    rot = np.radians(12)
    Rm = np.array([[np.cos(rot), -np.sin(rot)], [np.sin(rot), np.cos(rot)]])
    for gx in np.arange(-7, 7.01, 0.55):
        for dirn in (0, 1):
            ys = np.arange(-7, 7.01, 0.55)
            for y0, y1 in zip(ys[:-1], ys[1:]):
                if rng.random() < 0.6:
                    a = (np.array([gx, y0]) if dirn == 0 else np.array([y0, gx])) @ Rm.T
                    b = (np.array([gx, y1]) if dirn == 0 else np.array([y1, gx])) @ Rm.T
                    if np.hypot(*a) < 7 and np.hypot(*b) < 7:
                        roads.append((np.array([a, b]), "minor"))
    return roads, names


def city_shot(img, t):
    a = window(t, 53.0, 59.6, 0.8, 0.6)
    if a <= 0:
        return img
    k = eio(u(t, 53.2, 56.0))
    el = np.radians(lerp(89, 42, k))
    az = np.radians(-90 + 20 * k + 3 * (t - 53))
    dist = lerp(31, 15.5, k)
    eye = (np.cos(az) * np.cos(el) * dist, np.sin(el) * dist, np.sin(az) * np.cos(el) * dist)
    cam = Cam(eye, (0, 0, 0), 50)
    roads, names = city_roads()
    v = Vec()
    pulses = Vec()
    for i, (pts, kind) in enumerate(roads):
        P = np.stack([pts[:, 0], np.zeros(len(pts)), pts[:, 1]], -1)
        p2, z = cam(P)
        if (z < 0.5).any():
            continue
        if kind == "minor":
            v.poly(p2, INK, 0.7, 0.14 * a)
        else:
            v.poly(p2, INK, 1.2, 0.42 * a, closed=kind == "ring")
            # data travelling towards the centre (the spark)
            for j in range(3):
                ph = ((t - 53) * 0.35 + j / 3 + i * 0.13) % 1
                if kind == "radial":
                    seg = partial(p2[::-1], 1.0)
                    L = len(seg)
                    i1 = int(ph * (L - 1))
                    i0 = max(0, i1 - 8)
                    pulses.poly(seg[i0:i1 + 1], BLUE if j % 2 == 0 else RED, 2.4, a)
    img = v.over(img)
    img = pulses.add(img, 1.0, 0.8)
    # area labels
    la = window(t, 55.0, 59.2, 0.3, 0.5)
    for i, (nm, (zx, zz)) in enumerate([("RACE COURSE", (0.4, 0.9)), ("KALAWAD ROAD", (-3.6, -1.9)), ("GONDAL ROAD", (0.9, -4.3)),
                                         ("RAIYA", (-3.4, 2.9)), ("MAVDI", (-1.5, -3.4)), ("AJI DAM", (3.6, -2.9)), ("MORBI ROAD", (1.6, 4.6))]):
        p, z = cam(np.array([[zx, 0, zz], [zx, 1.2, zz]]))
        aa = la * smooth(u(t, 55.0 + 0.2 * i, 55.4 + 0.2 * i))
        if aa > 0 and (z > 0.5).all():
            vv = Vec()
            vv.line(p[0], p[1], INK, 1.0, 0.5 * aa)
            vv.circle(p[0], 3, BLUE, fill=True, a=aa)
            img = vv.over(img)
            img = text(img, nm, p[1][0] + 8, p[1][1], "mono", 15, INK, aa * 0.85, tracking=0.12)
    wa = window(t, 55.6, 59.4, 0.3, 0.4)
    img = words(img, t, 55.7, [("every", None, 0.0), ("street", None, 0.25), ("has", None, 0.5), ("a", None, 0.65),
                               ("story", BLUE, 0.8)], 960, 160, "serif", 72, anchor_x="m", a=wa)
    return img


def signal_shot(img, t):
    a = window(t, 59.0, 64.2, 0.4, 0.6)
    if a <= 0:
        return img
    v = Vec()
    cam = Cam((0, 520, -760), (0, 0, 0), 45)
    for i in range(7):
        ph = ((t - 59.0) * 0.45 + i / 7) % 1
        r = 60 + ph * 900
        th = np.linspace(0, 2 * np.pi, 160)
        p, _ = cam(np.stack([r * np.cos(th), np.zeros_like(th), r * np.sin(th)], -1))
        v.poly(p, BLUE if i % 3 == 0 else INK, 1.2, a * (1 - ph) * 0.7, closed=True)
    img = v.add(img, 1.0, 0.3)
    beats_words = ["LIVE", "LOCAL", "TRAFFIC", "WEATHER", "COMMUNITY", "POLITICS", "SPORTS"]
    for i, wd in enumerate(beats_words):
        ang = i * 2 * np.pi / len(beats_words) + (t - 59) * 0.25
        p, z = cam(np.array([[np.cos(ang) * 330, 30, np.sin(ang) * 330]]))
        aa = a * smooth(u(t, 59.4 + 0.25 * i, 59.8 + 0.25 * i)) * clamp(1.4 - z[0] / 1400)
        img = text(img, wd, p[0, 0], p[0, 1], "mono_b", 18, BLUE if wd == "LIVE" else INK, aa, anchor="mm", tracking=0.2)
    ba = window(t, 60.6, 64.0, 0.05, 0.4)
    img = words(img, t, 60.65, [("BREAKING", None, 0.0)], 960, 230, "black", 150, anchor_x="m", a=ba)
    img = words(img, t, 62.2, [("સમાચાર", BLUE, 0.0)], 960, 870, "guj", 76, anchor_x="m", a=window(t, 62.1, 64.0, 0.1, 0.4))
    return img


BS9_POS = (960, 520, 760)


def bs9_ring(theta):
    cx, cy, wd = BS9_POS
    h = logo_height("bs9", wd)
    ex, ey = cx - wd / 2 + 0.5108 * wd, cy - h / 2 + 0.4992 * h
    a2, b2 = 0.2210 * wd / 2, 0.7771 * wd / 2
    ang = np.radians(29.6)
    x, y = a2 * np.cos(theta), b2 * np.sin(theta)
    return ex + x * np.cos(ang) - y * np.sin(ang), ey + x * np.sin(ang) + y * np.cos(ang)


def bs9_shot(img, t):
    if t < 63.6:
        return img
    cx, cy, wd = BS9_POS
    a = 1 - smooth(u(t, SILENCE - 0.15, SILENCE + 0.05))
    k_ring = eio(u(t, 63.6, 65.6))
    v = Vec()
    th = np.linspace(-np.pi / 2, -np.pi / 2 + 2 * np.pi * k_ring, 200)
    pts = np.array([bs9_ring(x) for x in th])
    v.poly(pts, INK, 2.0, 0.8 * a * (1 - smooth(u(t, 66.4, 67.0))))
    img = v.add(img, 1.0, 0.4)
    # panels / letters stamp in on beats, full logo lands on the big hit (67.9)
    xs, _ = grid()
    k1 = smooth(u(t, 65.6, 66.6))
    left = (cx - wd / 2 + wd * 0.62 * k1) * S
    m = np.clip((left - xs) / (30 * S), 0, 1)
    full = smooth(u(t, 67.85, 67.95))
    if full < 1:
        img = logo(img, "bs9", cx, cy, wd, a * (1 - full), mask=m, tint=None)
    sc = 1 + 0.06 * pulse(t, 67.9, 0.25)
    img = logo(img, "bs9", cx, cy, wd * sc, a * full)
    img += np.float32(pulse(t, 67.9, 0.09) * 0.5 * a)
    ta = window(t, 68.3, SILENCE, 0.4, 0.2)
    img = text(img, "BS9 NEWS  ·  RAJKOT  ·  24×7", 960, 910, "mono", 18, MUTE, ta, anchor="mm", tracking=0.3)
    return img


def act2(t, fr):
    img = new_frame()
    if t < 55.0:
        img = earth_shot(img, t)
    img = city_shot(img, t)
    img = signal_shot(img, t)
    img = bs9_shot(img, t)
    return img


def act2_spark(t):
    blue_w = np.array([0.75, 0.88, 1.0], np.float32)
    if t < 59.0:
        return 960, 540, 1.2 + 0.4 * beat_env(t, 0.15, GROOVE2), blue_w, 1.0
    if t < 63.6:
        return 960, 540, 1.4 + 0.8 * beat_env(t, 0.15, GROOVE2), blue_w, 1.0
    if t < 65.6:
        th = -np.pi / 2 + 2 * np.pi * eio(u(t, 63.6, 65.6))
        x, y = bs9_ring(th)
        k = smooth(u(t, 63.6, 63.9))
        sx, sy = bs9_ring(-np.pi / 2)
        return lerp(960, x, k) if k < 1 else x, lerp(540, y, k) if k < 1 else y, 1.1, blue_w, 1.0
    # rests on the ring (top), then returns to centre in the silence, turning green
    x, y = bs9_ring(-np.pi / 2)
    k = eio(u(t, SILENCE - 0.1, SILENCE + 0.9))
    col = lerp(blue_w, np.array([0.75, 1.0, 0.82], np.float32), smooth(u(t, SILENCE, GROOVE3)))
    return lerp(x, 960, k), lerp(y, 540, k), 1.0, col, 1.0


# =================================================================== ACT 3 — Wayonaa
def scooter_paths():
    def chaikin(p, n=3):
        p = np.asarray(p, float)
        for _ in range(n):
            q = p[:-1] * 0.75 + p[1:] * 0.25
            r = p[:-1] * 0.25 + p[1:] * 0.75
            out = np.empty((len(q) * 2, 2))
            out[0::2], out[1::2] = q, r
            p = np.vstack([p[:1], out, p[-1:]])
        return p
    body = chaikin([(120, -96), (-110, -96), (-150, -118), (-250, -136), (-305, -150), (-324, -172), (-302, -200),
                    (-230, -212), (-40, -214), (-24, -196), (-30, -150), (-8, -122), (120, -122), (158, -150),
                    (182, -230), (196, -310), (214, -336), (240, -322), (256, -250), (266, -170), (262, -124),
                    (240, -104), (180, -98), (120, -96)])
    seat = chaikin([(-262, -210), (-250, -238), (-205, -250), (-62, -250), (-34, -236), (-40, -214)], 2)
    shield = chaikin([(186, -230), (206, -200), (232, -176), (262, -160)], 2)
    fender = chaikin([(160, -104), (182, -132), (215, -140), (250, -132), (272, -110)], 2)
    stem = np.array([(214, -336), (206, -372)])
    bar = np.array([(170, -380), (206, -374), (246, -380)])
    swing = np.array([(-212, -64), (-120, -100)])
    fork = np.array([(214, -64), (232, -150)])
    wheels = [arc(-212, -64, 64, 64, -np.pi / 2, 1.5 * np.pi, 90), arc(214, -64, 64, 64, -np.pi / 2, 1.5 * np.pi, 90)]
    return [body, seat, shield, fender, stem, bar, swing, fork] + wheels


SC_X, SC_Y, SC_S = 860, 720, 1.25
HEADLIGHT = (248, -300)


def sc_world(p, x=None, y=None):
    x = SC_X if x is None else x
    y = SC_Y if y is None else y
    return np.stack([x + p[:, 0] * SC_S, y + p[:, 1] * SC_S], -1)


def act3(t, fr):
    img = new_frame()
    ride = eio(u(t, 80.6, 81.6))
    sx = SC_X - 120 * ride
    exit_k = ei(u(t, 90.4, 91.2), 2.5)
    sx += exit_k * 1600
    # road / speed
    if t > 80.0 and t < 92.0:
        a = window(t, 80.0, 91.6, 0.6, 0.4)
        v = Vec()
        gy = SC_Y + 2
        v.line((0, gy), (1920, gy), INK, 1.2, 0.5 * a)
        speed = 1400 * ride
        off = ((t - 80.6) * speed) % 160
        for i in range(-1, 14):
            x = i * 160 - off
            v.line((x, gy + 70), (x + 70, gy + 70), INK, 2.0, 0.35 * a)
        rng = np.random.default_rng(4)
        for i in range(26):
            y = rng.uniform(150, 940)
            L = rng.uniform(80, 400)
            x = (rng.uniform(0, 3000) - (t - 80.6) * speed * rng.uniform(1.2, 2.2)) % 2400 - 300
            v.line((x, y), (x + L, y), INK if i % 4 else GREEN, 1.0, 0.25 * a * ride)
        img = v.over(img)
    # scooter technical drawing
    sa = window(t, GROOVE3 - 0.2, 91.0, 0.3, 0.3)
    if sa > 0:
        paths = [sc_world(p, sx) for p in scooter_paths()]
        k = eio(u(t, GROOVE3 + 0.1, 77.0))
        v = Vec()
        draw_sequence(v, paths, k, INK, 2.0, 0.92 * sa)
        # wheel spokes once drawn
        if k >= 1:
            for wx in (-212, 214):
                c = (sx + wx * SC_S, SC_Y - 64 * SC_S)
                for j in range(5):
                    an = -(t - 80.6) * 9 * ride + j * 2 * np.pi / 5
                    v.line((c[0] + np.cos(an) * 12, c[1] + np.sin(an) * 12), (c[0] + np.cos(an) * 50, c[1] + np.sin(an) * 50),
                           INK, 1.2, 0.6 * sa)
                v.circle(c, 9, GREEN, fill=True, a=sa)
        img = v.over(img)
        # dimension annotations (blueprint feel)
        da = window(t, 77.0, 80.8, 0.4, 0.4)
        if da > 0:
            v = Vec()
            x0, x1 = sx + (-276) * SC_S, sx + 278 * SC_S
            y = SC_Y + 60
            v.line((x0, y), (x1, y), GREEN, 1.0, da)
            v.line((x0, y - 8), (x0, y + 8), GREEN, 1.0, da)
            v.line((x1, y - 8), (x1, y + 8), GREEN, 1.0, da)
            hx = sx + HEADLIGHT[0] * SC_S
            hy = SC_Y + HEADLIGHT[1] * SC_S
            v.line((hx, hy), (hx + 180, hy - 120), INK, 1.0, 0.6 * da)
            img = v.over(img)
            img = text(img, "RANGE  80 KM", (x0 + x1) / 2, y + 26, "mono_b", 16, GREEN, da, anchor="mm", tracking=0.2)
            img = text(img, "ZERO EMISSION", hx + 190, hy - 128, "mono_b", 16, INK, da, tracking=0.2)
            img = text(img, "ELECTRIC · SILENT · SMART", hx + 190, hy - 100, "mono", 15, MUTE, da, tracking=0.12)
        # headlight beam after the drawing
        ba = smooth(u(t, 76.6, 77.2)) * sa
        if ba > 0:
            hx = sx + HEADLIGHT[0] * SC_S
            hy = SC_Y + HEADLIGHT[1] * SC_S
            v = Vec()
            v.poly(np.array([[hx, hy], [hx + 1300, hy - 160], [hx + 1300, hy + 380]]), INK, 0, 0, closed=True,
                   fill=SPARK, fill_a=0.07 * ba)
            img = v.add(img, 1.0, 0.0)
    wa = window(t, GROOVE3 + 1.0, 80.4, 0.3, 0.5)
    img = words(img, t, GROOVE3 + 1.2, [("and", None, 0.0), ("the", None, 0.2), ("city", None, 0.4)], 140, 230, "serif", 80, a=wa)
    img = words(img, t, GROOVE3 + 2.6, [("moves", GREEN, 0.0), ("forward", None, 0.4)], 140, 330, "serif", 80, a=wa)
    img = words(img, t, GROOVE3 + 4.2, [("શહેર", None, 0.0), ("આગળ", GREEN, 0.3), ("વધે", None, 0.55), ("છે", None, 0.75)],
                144, 420, "guj", 46, a=wa * 0.85)
    # model names on the beat
    for i, nm in enumerate(["G-RAZOR", "G-ONE", "G-LITE"]):
        t0 = 82.7 + i * 2.05
        ma = window(t, t0, t0 + 1.95, 0.08, 0.25)
        if ma > 0:
            img = words(img, t, t0, [(nm, None, 0.0)], 1780, 250, "black", 120, anchor_x="r", a=ma, rise=40)
            img = text(img, f"MODEL 0{i + 1} / 03 · ELECTRIC SCOOTER", 1780, 330, "mono", 16, GREEN, ma, anchor="rm", tracking=0.15)
    # battery charge
    ca = window(t, 90.8, 97.4, 0.4, 0.5)
    if ca > 0:
        img = battery(img, t, ca)
    # logo reveal
    if t > 96.6:
        img = way_logo_shot(img, t)
    return img


def battery(img, t, a):
    k = eio(u(t, 91.2, 96.4))
    v = Vec()
    x0, y0, w, h = 660, 440, 560, 200
    v.poly(np.array([[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]]), INK, 2.0, a, closed=True)
    v.rect(x0 + w + 6, y0 + 70, 22, 60, INK, a)
    cells = 12
    for c in range(cells):
        f = clamp(k * cells - c)
        if f <= 0:
            break
        cx0 = x0 + 16 + c * (w - 32) / cells
        v.rect(cx0, y0 + 16, ((w - 32) / cells - 8) * f, h - 32, lerp(YELLOW, GREEN, c / cells), a * 0.9)
    for i in range(11):
        x = x0 + i * w / 10
        v.line((x, y0 + h + 14), (x, y0 + h + (26 if i % 5 == 0 else 20)), INK, 1.0, 0.5 * a)
    img = v.add(img, 1.0, 0.3)
    img = text(img, f"{int(k * 100):3d}%", 960, y0 + h + 80, "mono_b", 40, INK, a, anchor="mm", tracking=0.05)
    img = text(img, "CHARGE", 960, y0 - 40, "mono", 16, MUTE, a, anchor="mm", tracking=0.4)
    return img


WAY_POS = (960, 500, 1200)


def way_logo_shot(img, t):
    cx, cy, wd = WAY_POS
    a = 1 - smooth(u(t, BREAKDOWN - 0.3, BREAKDOWN + 0.2))
    xs, _ = grid()
    x0 = cx - wd / 2
    k1 = eo(u(t, 97.0, 97.8), 4)                # chevrons slide/wipe in
    k2 = eio(u(t, 97.9, 99.0))                  # wordmark wipe
    k3 = u(t, 99.0, 100.2)                      # tagline
    chev = np.clip(((x0 + wd * 0.27 * k1) * S - xs) / (20 * S), 0, 1) * (xs < (x0 + wd * 0.29) * S)
    word = np.clip(((x0 + wd * 0.29 + wd * 0.71 * k2) * S - xs) / (24 * S), 0, 1) * (xs >= (x0 + wd * 0.29) * S)
    _, ys = grid()
    h = logo_height("way", wd)
    tag_y = (cy - h / 2 + 0.8 * h) * S
    word = np.where(ys < tag_y, word, np.clip(((x0 + wd * 0.29 + wd * 0.71 * k3) * S - xs) / (4 * S), 0, 1))
    m = np.maximum(chev, word)
    img = logo(img, "way", cx, cy, wd, a, mask=m)
    # speed streak behind the chevrons while they arrive
    if 0 < k1 < 1:
        v = Vec()
        for i, col in enumerate([YELLOW, INK, GREEN]):
            y = cy - 40 + 30 * i
            v.line((x0 - 700 * (1 - k1), y), (x0 + wd * 0.27 * k1, y), col, 6, (1 - k1) * a)
        img = v.add(img, 1.0, 0.8)
    img += np.float32(pulse(t, 97.0, 0.1) * 0.25 * a)
    ta = window(t, 100.4, BREAKDOWN, 0.4, 0.2)
    img = text(img, "WAYONAA EV  ·  RAJKOT  ·  SURAT", 960, 860, "mono", 18, MUTE, ta, anchor="mm", tracking=0.3)
    return img


def act3_spark(t):
    green_w = np.array([0.80, 1.0, 0.86], np.float32)
    if t < GROOVE3:
        return 960, 540, 1.0 + 0.25 * np.sin(t * 3), green_w, 1.0
    hx0 = SC_X + HEADLIGHT[0] * SC_S
    hy = SC_Y + HEADLIGHT[1] * SC_S
    if t < 77.0:
        paths = [sc_world(p) for p in scooter_paths()]
        x, y = seq_tip(paths, eio(u(t, GROOVE3 + 0.1, 77.0)))
        k = smooth(u(t, GROOVE3, GROOVE3 + 0.4))
        k2 = smooth(u(t, 76.4, 77.0))
        x, y = lerp(x, hx0, k2), lerp(y, hy, k2)
        return lerp(960, x, k), lerp(540, y, k), 1.0, green_w, 1.0
    ride = eio(u(t, 80.6, 81.6))
    exit_k = ei(u(t, 90.4, 91.2), 2.5)
    hx = hx0 - 120 * ride + exit_k * 1600
    if t < 90.8:
        return hx, hy, 1.5 + 0.3 * beat_env(t, 0.12, GROOVE3), np.array([1.0, 0.97, 0.88], np.float32), 1.0
    if t < 97.0:
        # the spark comes back and sits on the battery terminal
        k = eio(u(t, 90.8, 91.6))
        return lerp(1920, 1260, k), 540, 1.2 + 0.6 * u(t, 91.2, 96.4), green_w, 1.0
    # becomes the top green pixel-dot of the W, then leaves for the breakdown
    cx, cy, wd = WAY_POS
    h = logo_height("way", wd)
    dot = (cx - wd / 2 + 0.165 * wd, cy - h / 2 + 0.06 * h)
    k = eio(u(t, 96.8, 97.6))
    k2 = eio(u(t, 101.6, BREAKDOWN + 0.8))
    x, y = lerp(1260, dot[0], k), lerp(540, dot[1], k)
    return lerp(x, 960, k2), lerp(y, 600, k2), 1.0, green_w, 1.0


# =================================================================== BREAKDOWN + FINALE
def breakdown(t, fr):
    img = new_frame()
    # a few slow dust motes
    rng = np.random.default_rng(9)
    n = 70
    x = rng.uniform(0, 1920, n) + 20 * np.sin(t * 0.3 + rng.uniform(0, 6, n))
    y = (rng.uniform(0, 1080, n) - (t - BREAKDOWN) * rng.uniform(5, 18, n)) % 1080
    v = Vec()
    for xi, yi, s in zip(x, y, rng.uniform(0.6, 1.8, n)):
        v.circle((xi, yi), s, INK, fill=True, a=0.18 * window(t, BREAKDOWN, FINALE, 1.0, 0.3))
    img = v.add(img)
    lines = [(BREAKDOWN + 0.4, "એક જ્યોત.", "one flame."), (BREAKDOWN + 2.45, "એક શહેર.", "one city."),
             (BREAKDOWN + 4.5, "એક ધબકાર.", "one heartbeat.")]
    for i, (t0, guj, eng) in enumerate(lines):
        a = window(t, t0, t0 + 2.0 if i < 2 else FINALE - 0.1, 0.5, 0.4)
        img = words(img, t, t0, [(guj, None, 0.0)], 960, 770, "guj_serif", 64, anchor_x="m", a=a, blur=10, dur=0.6)
        img = words(img, t, t0 + 0.35, [(eng, SAFFRON if i == 2 else None, 0.0)], 960, 850, "serif", 54, anchor_x="m",
                    a=a * 0.85, blur=10, dur=0.6)
    return img


FIN_POS = {"k_eng": (960, 300, 760), "bs9": (560, 760, 400), "way": (1370, 760, 560)}


def finale(t, fr):
    img = new_frame()
    a_all = 1 - smooth(u(t, SONG_END - 0.4, SONG_END + 0.6))
    # three lights orbit (garba) then settle at the three logo anchors
    k_settle = eio(u(t, 112.0, 114.0))
    cols = [SAFFRON, BLUE, GREEN]
    anchors = [(960, 300), (560, 760), (1370, 760)]
    center = (960, 600)
    v = Vec()
    for i in range(3):
        ang = (t - FINALE) * 2.4 + i * 2 * np.pi / 3
        r = 120 * eo(u(t, FINALE, FINALE + 0.6))
        ox, oy = center[0] + np.cos(ang) * r, center[1] + np.sin(ang) * r * 0.5
        px, py = lerp(ox, anchors[i][0], k_settle), lerp(oy, anchors[i][1], k_settle)
        img = spark(img, px, py, t + i, 0.9 * (1 - smooth(u(t, 114.0, 115.0))), cols[i], a_all)
        # threads back to the centre flame: everything is connected
        la = smooth(u(t, 113.0, 114.5)) * (1 - smooth(u(t, 121.0, 122.0)))
        v.line(center, (px, py), cols[i], 1.0, 0.5 * la * a_all)
    img = v.add(img, 1.0, 0.3)
    # logos land one per beat
    for i, nm in enumerate(["k_eng", "bs9", "way"]):
        t0 = 113.9 + i * 0.51
        la = smooth(u(t, t0, t0 + 0.3)) * (1 - smooth(u(t, 121.6, 122.2))) * a_all
        if la > 0:
            cx, cy, wd = FIN_POS[nm]
            img = logo(img, nm, cx, cy, wd * (1 + 0.04 * pulse(t, t0, 0.2)), la)
    # NAVRATRI 2026 (kinetic) with garba ring of dancers
    na = window(t, 121.9, 127.9, 0.1, 0.5) * a_all
    if na > 0:
        img = garba_rings(img, t + 100, (960, 400), na * 0.8)
        img = words(img, t, 121.95, [("NAVRATRI", None, 0.0)], 960, 470, "black", 200, anchor_x="m", a=na, rise=50)
        img = words(img, t, 123.0, [("2026", SAFFRON, 0.0)], 960, 670, "black", 140, anchor_x="m", a=na, rise=50)
        img = words(img, t, 124.1, [("નવરાત્રી", None, 0.0), ("મહોત્સવ", SAFFRON, 0.35)], 960, 790, "guj", 52,
                    anchor_x="m", a=na)
    # end card
    ea = smooth(u(t, 127.9, 128.6)) * a_all
    if ea > 0:
        v = Vec()
        v.line((960, 650), (960, 900), INK, 1.0, 0.25 * ea)
        v.line((500, 560), (1420, 560), INK, 1.0, 0.18 * ea)
        img = v.over(img)
        img = logo(img, "k_eng", 960, 400, 820, ea)
        img = logo(img, "bs9", 690, 775, 330, ea)
        img = logo(img, "way", 1230, 775, 470, ea)
        img = text(img, "NAVRATRI 2026", 960, 190, "mono_b", 22, SAFFRON, ea, anchor="mm", tracking=0.5)
    return img


def final_spark(t):
    if t < FINALE:
        k = smooth(u(t, BREAKDOWN, BREAKDOWN + 1.0))
        rise = (t - BREAKDOWN) * 8
        grow = 1.0 + 1.2 * ei(u(t, 107.5, FINALE), 2)
        col = lerp(np.array([0.8, 1.0, 0.86], np.float32), SPARK, k)
        return 960, 600 - rise * k, grow, col, 1.0
    if t < 127.9:
        # becomes the diya flame at the centre of the composition
        return 960, 600, 1.4 + 0.5 * beat_env(t, 0.15, FINALE), SPARK, 1.0 - smooth(u(t, 121.8, 122.0)) * 0.0
    # end card: rests above the Khodaldham logo, lingers after the song, then goes out
    k = eio(u(t, 127.9, 128.6))
    out = smooth(u(t, SONG_END + 0.6, TOTAL - 0.4))
    return lerp(960, 960, k), lerp(600, 600, k), 1.1 * (1 - out) + 0.01, SPARK, 1.0 - out


# =================================================================== dispatcher
def spark_state(t):
    if t < GROOVE2:
        return act1_spark(t)
    if t < SILENCE + 1.5:
        return act2_spark(t)
    if t < BREAKDOWN:
        return act3_spark(t)
    return final_spark(t)


def label_for(t):
    if t < BREAK1:
        return "01 — SHREE KHODALDHAM"
    if t < SILENCE:
        return "02 — BS9 NEWS"
    if t < BREAKDOWN:
        return "03 — WAYONAA EV"
    return "04 — TOGETHER"


def render(t, fr):
    if t < GROOVE2:
        img = act1(t, fr)
    elif t < SILENCE:
        img = act2(t, fr)
    elif t < GROOVE3:
        img = new_frame()
    elif t < BREAKDOWN:
        img = act3(t, fr)
    elif t < FINALE:
        img = breakdown(t, fr)
    else:
        img = finale(t, fr)
    # furniture fades in after the first breath, out at the end
    fa = smooth(u(t, 2.0, 3.0)) * (1 - smooth(u(t, SONG_END - 0.5, SONG_END + 0.5))) * \
        (1 - 0.7 * window(t, BREAKDOWN, FINALE, 0.5, 0.5))
    img = furniture(img, t, label_for(t), a=fa * 0.9)
    # the hero spark, always on top, with a short trail
    x, y, size, col, a = spark_state(t)
    trail = []
    for k in range(1, 7):
        px, py, *_ = spark_state(max(0.0, t - k / 60))
        trail.append((px, py))
    if np.hypot(trail[-1][0] - x, trail[-1][1] - y) < 2:
        trail = None
    img = spark(img, x, y, t, size, col, a, trail)
    return img
