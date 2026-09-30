"""Act 3 — Wayonaa EV (WAY .. TOTAL) and the closing end card.

power-up (electric arcs charge a ring) -> neon side-view ride: an electric
scooter is drawn in light, headlight on, wheels spinning through a night city,
model names G-Razor / G-One / G-Lite slam in -> battery charges to 100% ->
the W chevrons slash in, WAYONAA wipes on, "THE SMART WAY TO MOVE" ->
end card with all three logos.
"""
import functools
import numpy as np
import cv2

import timeline as T
from common import *  # noqa

GREEN = np.array([0.22, 0.95, 0.38], np.float32)
YELLOW = np.array([1.0, 0.76, 0.08], np.float32)
WHITE = np.ones(3, np.float32)


# =========================================================================== logo parts
@functools.lru_cache(maxsize=1)
def way_parts():
    im = logo("wayonaa.png")
    rgb = im[..., :3]
    a = im[..., 3]
    h, w = a.shape
    xs = np.arange(w)[None, :].repeat(h, 0)
    ys = np.arange(h)[:, None].repeat(w, 1)
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    sat = (mx - mn) / (mx + 1e-4)
    chev = xs < 324
    yellow = chev & (rgb[..., 0] > rgb[..., 1] * 0.95) & (sat > 0.35)
    green = chev & (rgb[..., 1] > rgb[..., 0] + 0.12)
    grey = chev & ~yellow & ~green
    text = (xs >= 324) & (ys < 215)
    tag = (xs >= 324) & (ys >= 215)
    parts = {}
    for name, m in [("yellow", yellow), ("grey", grey), ("green", green), ("text", text), ("tag", tag)]:
        p = im.copy()
        mm = cv2.dilate(m.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(np.float32)
        p[..., 3] = a * mm
        parts[name] = p
    return parts, (w, h)


def way_logo(img, t, t0, cx, cy, scale, alpha=1.0):
    parts, (w, h) = way_parts()
    sc = scale * 1250 * S / w
    ox = cx - w * sc / 2
    oy = cy - h * sc / 2
    lay_rgb = np.zeros_like(img)
    lay_a = np.zeros(img.shape[:2] + (1,), np.float32)
    streaks = Layer()

    def comp(p, dx=0.0, dy=0.0, a=1.0, sc_mul=1.0):
        nonlocal lay_rgb, lay_a
        rgb, aa = place(None, p, cx + dx, cy + dy, sc * sc_mul, a * alpha, return_layer=True)
        lay_rgb = lay_rgb * (1 - aa) + rgb
        lay_a = lay_a + aa * (1 - lay_a)

    for i, (name, col) in enumerate([("yellow", YELLOW), ("grey", np.array([0.8, 0.8, 0.85])), ("green", GREEN)]):
        k = ease_out(u(t, t0 + 0.12 * i, t0 + 0.12 * i + 0.3), 4)
        if k <= 0:
            continue
        dx = (1 - k) * -1300 * S
        comp(parts[name], dx, 0, 1.0)
        if k < 1:  # speed streak behind the chevron
            y_ = cy + (-30 + 25 * i) * S * scale
            streaks.line((cx - 900 * S + dx * 0.2, y_), (cx - 400 * S * scale + dx, y_), col * (1 - k) * 2, max(1, int(10 * S)))
    # text wipe left -> right
    kt = ease_inout(u(t, t0 + 0.45, t0 + 1.0))
    if kt > 0:
        rgb, aa = place(None, parts["text"], cx, cy, sc, alpha, return_layer=True)
        xs, _ = grid()
        edge = lerp(ox + 320 * sc, ox + w * sc, kt)
        m = clamp01((edge - xs) / (30 * S))[..., None]
        lay_rgb = lay_rgb * (1 - aa * m) + rgb * m
        lay_a = lay_a + aa * m * (1 - lay_a)
        if kt < 1:
            img += (np.exp(-((xs - edge) / (10 * S)) ** 2)[..., None] *
                    np.exp(-((grid()[1] - (oy + 145 * sc)) / (70 * S * scale)) ** 2)[..., None] * GREEN * 1.5 * alpha)
    kg = u(t, t0 + 1.0, t0 + 1.8)
    if kg > 0:
        rgb, aa = place(None, parts["tag"], cx, cy, sc, alpha, return_layer=True)
        xs, _ = grid()
        edge = lerp(ox + 320 * sc, ox + w * sc, kg)
        m = clamp01((edge - xs) / (4 * S))[..., None]
        lay_rgb = lay_rgb * (1 - aa * m) + rgb * m
        lay_a = lay_a + aa * m * (1 - lay_a)
    img = img * (1 - lay_a) + lay_rgb
    img += glow(lay_rgb * 0.35, 0.9)
    img = streaks.add_to(img, 1.0, 1.0)
    return img, lay_a


# =========================================================================== power-up
def scene_power(t, fr):
    img = radial_bg((0.02, 0.03, 0.02), (0, 0, 0))
    k = u(t, T.WAY, T.WAY_RIDE)
    rng = np.random.default_rng(fr)
    lay = Layer()
    R = (150 + 40 * np.sin(t * 7) * 0.1) * S
    # progress ring
    prog = ease_inout(u(t, T.WAY + 0.2, T.WAY_RIDE - 0.15))
    a = np.linspace(-np.pi / 2, -np.pi / 2 + 2 * np.pi * prog, max(2, int(200 * prog)))
    lay.poly(np.stack([CX + np.cos(a) * R, CY + np.sin(a) * R], -1), GREEN * 1.2, max(1, int(8 * S)))
    lay.circle((CX, CY), R + 18 * S, YELLOW * 0.35, 1)
    lay.circle((CX, CY), R - 18 * S, GREEN * 0.3, 1)
    for j in range(60):
        aa = j * 2 * np.pi / 60 + t * 0.5
        l = (14 if j % 5 else 26) * S
        lay.line((CX + np.cos(aa) * (R + 30 * S), CY + np.sin(aa) * (R + 30 * S)),
                 (CX + np.cos(aa) * (R + 30 * S + l), CY + np.sin(aa) * (R + 30 * S + l)), GREEN * 0.4)
    # arcs crackling into the ring
    n_arc = int(3 + 7 * k)
    for i in range(n_arc):
        ang = rng.uniform(0, 2 * np.pi)
        far = rng.uniform(420, 900) * S
        p0 = (CX + np.cos(ang) * far, CY + np.sin(ang) * far * 0.6)
        p1 = (CX + np.cos(ang) * (R + 20 * S), CY + np.sin(ang) * (R + 20 * S))
        bolt = lightning(p0, p1, rng, 7, 0.22)
        lay.poly(bolt, (GREEN if i % 2 else YELLOW) * rng.uniform(0.6, 1.3), max(1, int(2 * S)))
    img = lay.add_to(img, 1.0, 1.6)
    pct = text_rgba(f"{int(prog * 100):3d}%", "Orbitron.ttf", 64, 800, 4, tuple(WHITE))
    img = place(img, pct, CX, CY, 1.0, smooth(u(t, T.WAY + 0.2, T.WAY + 0.5)))
    lab = text_rgba("POWERING UP", "Orbitron.ttf", 22, 600, 10, tuple(GREEN))
    img = place(img, lab, CX, CY + R + 90 * S, 1.0, smooth(u(t, T.WAY + 0.4, T.WAY + 0.7)))
    img += pulse(t, T.WAY, 0.06) * 0.8
    if t > T.WAY_RIDE - 0.3:  # ring rushes into the camera
        kk = ease_in(u(t, T.WAY_RIDE - 0.3, T.WAY_RIDE), 3)
        img = transform(img, 1 + 8 * kk) + kk * 1.5
    return img


# =========================================================================== scooter
def chaikin(p, n=3, closed=False):
    p = np.asarray(p, float)
    for _ in range(n):
        q = p[:-1] * 0.75 + p[1:] * 0.25
        r = p[:-1] * 0.25 + p[1:] * 0.75
        out = np.empty((len(q) * 2, 2))
        out[0::2] = q
        out[1::2] = r
        p = np.vstack([p[:1], out, p[-1:]]) if not closed else out
    return p


@functools.lru_cache(maxsize=1)
def scooter_paths():
    """Side profile of an electric scooter facing right. Units: design px, origin at
    ground between the wheels, y negative up."""
    body = chaikin([(120, -96), (-110, -96), (-150, -118), (-250, -136), (-305, -150), (-324, -172), (-302, -200),
                    (-230, -212), (-40, -214), (-24, -196), (-30, -150), (-8, -122), (120, -122), (158, -150),
                    (182, -230), (196, -310), (214, -336), (240, -322), (256, -250), (266, -170), (262, -124),
                    (240, -104), (180, -98), (120, -96)], 3)
    seat = chaikin([(-262, -210), (-250, -238), (-205, -250), (-62, -250), (-34, -236), (-40, -214), (-150, -212), (-262, -210)], 2)
    stripe_g = chaikin([(-300, -178), (-220, -190), (-110, -194), (-36, -190)], 2)
    stripe_y = chaikin([(-290, -160), (-220, -170), (-110, -174), (-34, -170)], 2)
    shield = chaikin([(186, -230), (206, -200), (232, -176), (262, -160)], 2)
    fender = chaikin([(160, -104), (182, -132), (215, -140), (250, -132), (272, -110)], 2)
    stem = np.array([(214, -332), (206, -372)])
    bar = np.array([(170, -380), (206, -374), (246, -380)])
    swing = np.array([(-212, -64), (-120, -100)])
    fork = np.array([(214, -64), (232, -150)])
    return dict(body=body, seat=seat, stripe_g=stripe_g, stripe_y=stripe_y, shield=shield, fender=fender, stem=stem,
                bar=bar, swing=swing, fork=fork)


WHEELS = [(-212, -64), (214, -64)]
WHEEL_R = 64


def poly_len(p):
    return np.concatenate([[0], np.cumsum(np.hypot(*np.diff(p, axis=0).T))])


def partial(p, k):
    L = poly_len(p)
    m = L <= k * L[-1]
    return p[m] if m.sum() >= 2 else p[:0]


def draw_scooter(img, t, cx, gy, scale, draw_k, fill_k, light_k, spin):
    P = scooter_paths()

    def tr(p):
        p = np.asarray(p, float)
        return np.stack([cx + p[:, 0] * scale * S, gy + p[:, 1] * scale * S], -1)

    fill = Layer()
    if fill_k > 0:
        fill.fillpoly(tr(P["body"]), np.array([0.62, 0.64, 0.7]) * fill_k)
        fill.fillpoly(tr(P["seat"]), np.array([0.14, 0.13, 0.12]) * fill_k + 0.001)
    f = fill.f(1.0)
    m = (fill.im.max(axis=2, keepdims=True) > 0)
    if fill_k > 0:
        # vertical gradient on the body: bright top, darker bottom
        _, ys = grid()
        grad = clamp01((ys - (gy - 260 * scale * S)) / (170 * scale * S))[..., None]
        f = f * (1.15 - 0.6 * grad)
        img = np.where(m, img * (1 - fill_k) + f, img)
    lay = Layer()
    th = max(1, int(3 * S))
    for name, col in [("body", GREEN), ("seat", GREEN * 0.7), ("shield", WHITE * 0.8), ("fender", GREEN),
                      ("stem", WHITE * 0.8), ("bar", WHITE), ("swing", WHITE * 0.6), ("fork", WHITE * 0.6)]:
        lay.poly(tr(partial(P[name], draw_k)), col * (1 - 0.5 * fill_k), th)
    for name, col in [("stripe_g", GREEN * 1.3), ("stripe_y", YELLOW * 1.3)]:
        lay.poly(tr(partial(P[name], draw_k)), col, max(1, int(6 * S)))
    # wheels
    for wx, wy in WHEELS:
        c = tr([(wx, wy)])[0]
        r = WHEEL_R * scale * S
        a_end = 2 * np.pi * draw_k
        a = np.linspace(0, a_end, max(2, int(80 * draw_k)))
        lay.poly(np.stack([c[0] + np.cos(a) * r, c[1] + np.sin(a) * r], -1), WHITE * 0.9, max(1, int(5 * S)))
        lay.poly(np.stack([c[0] + np.cos(a) * r * 0.62, c[1] + np.sin(a) * r * 0.62], -1), GREEN, th)
        if draw_k >= 1:
            for j in range(5):
                aa = spin + j * 2 * np.pi / 5
                lay.line((c[0] + np.cos(aa) * r * 0.15, c[1] + np.sin(aa) * r * 0.15),
                         (c[0] + np.cos(aa) * r * 0.6, c[1] + np.sin(aa) * r * 0.6), GREEN * 0.9, th)
            lay.circle(c, r * 0.12, YELLOW, fill=True)
    img = lay.add_to(img, 1.0, 1.2)
    # headlight + beam
    if light_k > 0:
        hl = tr([(248, -300)])[0]
        beam = Layer()
        L = 1500 * S
        beam.fillpoly(np.array([hl, (hl[0] + L, hl[1] - 120 * S), (hl[0] + L, hl[1] + 330 * S)]), np.array([1.0, 0.95, 0.75]) * 0.22 * light_k)
        bf = cv2.GaussianBlur(beam.f(1.0), (0, 0), 25 * S)
        xs, _ = grid()
        bf *= np.exp(-np.maximum(xs - hl[0], 0) / (900 * S))[..., None]
        img += bf
        img += (np.exp(-(radial(hl[0], hl[1], 16 * S * scale)) ** 2) * 2.2 * light_k)[..., None] * np.array([1.0, 0.97, 0.85])
        tl = tr([(-306, -160)])[0]
        img += (np.exp(-(radial(tl[0], tl[1], 10 * S * scale)) ** 2) * 1.6 * light_k)[..., None] * np.array([1.0, 0.1, 0.1])
    return img


@functools.lru_cache(maxsize=1)
def skyline():
    rng = np.random.default_rng(8)
    b = []
    x = 0
    while x < 4000:
        w = rng.uniform(60, 180)
        h = rng.uniform(80, 360)
        b.append((x, w, h, rng.random()))
        x += w + rng.uniform(4, 30)
    return b, x


def scene_ride(t, fr):
    dt = t - T.WAY_RIDE
    gy = 820 * S
    img = radial_bg((0.05, 0.07, 0.05), (0.0, 0.0, 0.01), cy=gy)
    # horizon glow
    _, ys = grid()
    img += (np.exp(-((ys - gy) / (160 * S)) ** 2) * 0.35)[..., None] * lerp(GREEN, YELLOW, 0.4)
    speed = 1500 * S * (0.4 + 0.6 * smooth(u(t, T.WAY_RIDE, T.WAY_RIDE + 1.2)))
    travel = speed * dt + 0.5 * 500 * S * max(0, t - T.WAY_CHARGE) ** 2
    # far skyline (parallax)
    blds, total = skyline()
    lay = Layer()
    win = Layer()
    off = (travel * 0.12) % (total * S)
    for x, w, h, r in blds:
        for rep in (0, 1):
            X = x * S - off + rep * total * S
            if X > W or X + w * S < 0:
                continue
            lay.fillpoly(np.array([[X, gy], [X + w * S, gy], [X + w * S, gy - h * S], [X, gy - h * S]]), np.array([0.03, 0.045, 0.06]))
            rr = np.random.default_rng(int(x))
            for _ in range(int(h / 40)):
                wx = X + rr.uniform(8, w - 8) * S
                wy = gy - rr.uniform(15, h - 10) * S
                win.circle((wx, wy), 1.6 * S, np.array([1.0, 0.8, 0.4]) * rr.uniform(0.3, 1.0), fill=True)
    img = np.where(lay.im.max(axis=2, keepdims=True) > 0, lay.f(1.0), img)
    img = win.add_to(img, 1.0, 0.6)
    # street lights (fast parallax)
    sl = Layer()
    period = 620 * S
    o2 = (travel * 0.7) % period
    for i in range(-1, int(W / period) + 2):
        X = i * period - o2
        sl.line((X, gy), (X, gy - 330 * S), np.array([0.12, 0.14, 0.16]), max(1, int(5 * S)))
        sl.line((X, gy - 330 * S), (X + 60 * S, gy - 340 * S), np.array([0.12, 0.14, 0.16]), max(1, int(5 * S)))
        sl.circle((X + 60 * S, gy - 332 * S), 7 * S, np.array([1.0, 0.85, 0.5]), fill=True)
    img = sl.add_to(img, 1.0, 1.3)
    # road
    img[int(gy):] = np.array([0.018, 0.02, 0.022]) + np.linspace(0, 0.03, H - int(gy))[:, None, None] * 0
    rd = Layer()
    rd.line((0, gy), (W, gy), GREEN * 1.2, max(1, int(3 * S)))
    dash = 260 * S
    o3 = travel % dash
    for i in range(-1, int(W / dash) + 2):
        X = i * dash - o3
        rd.line((X, gy + 150 * S), (X + 130 * S, gy + 150 * S), WHITE * 0.7, max(1, int(6 * S)))
    img = rd.add_to(img, 1.0, 0.8)
    # reflection of the horizon line on the road
    img[int(gy):int(gy + 40 * S)] += np.linspace(0.25, 0, int(gy + 40 * S) - int(gy))[:, None, None] * GREEN
    # speed lines
    rng = np.random.default_rng(4)
    spd = Layer()
    for i in range(40):
        y = rng.uniform(0.15, 0.95) * H
        L = rng.uniform(150, 600) * S
        x = (rng.uniform(0, W * 2) - travel * rng.uniform(1.2, 2.2)) % (W + L) - L
        spd.line((x, y), (x + L, y), (GREEN if i % 3 == 0 else (YELLOW if i % 3 == 1 else WHITE)) * 0.35, 1)
    img = spd.add_to(img, 1.0, 0.6)
    # scooter
    exit_k = ease_in(u(t, T.WAY_CHARGE, T.WAY_CHARGE + 0.55), 2.5)
    enter_k = ease_out(u(t, T.WAY_RIDE, T.WAY_RIDE + 0.6))
    sx = lerp(-500 * S, CX - 240 * S, enter_k) + exit_k * 1900 * S
    draw_k = ease_inout(u(t, T.WAY_RIDE + 0.1, T.WAY_RIDE + 1.3))
    fill_k = smooth(u(t, T.WAY_RIDE + 1.1, T.WAY_RIDE + 1.6))
    light_k = smooth(u(t, T.WAY_RIDE + 1.4, T.WAY_RIDE + 1.6))
    bob = 3 * S * np.sin(t * 11)
    img = draw_scooter(img, t, sx, gy + bob, 1.15, draw_k, fill_k, light_k, -travel / (WHEEL_R * 1.15 * S))
    if exit_k > 0:  # light trail when it launches
        tr_ = Layer()
        for y_, c in ((gy - 170 * S, GREEN), (gy - 150 * S, YELLOW)):
            tr_.line((sx - 1200 * S * exit_k, y_), (sx - 300 * S, y_), c * 1.5, max(1, int(8 * S)))
        img = tr_.add_to(img, 1.0, 1.4)
    # model names G-Razor / G-One / G-Lite
    models = ["G-RAZOR", "G-ONE", "G-LITE"]
    for i, name in enumerate(models):
        t0 = T.WAY_RIDE + 2.0 + i * 1.0
        a = smooth(u(t, t0 - 0.05, t0 + 0.08)) * (1 - smooth(u(t, t0 + 0.85, t0 + 1.0)))
        if a <= 0:
            continue
        slam = 1 + 0.25 * np.exp(-(t - t0) / 0.08)
        tx = text_rgba(name, "Orbitron.ttf", 96, 900, 10, tuple(WHITE))
        img = place(img, tx, W - 470 * S, 300 * S, slam, a)
        sub = text_rgba("ELECTRIC SCOOTER", "Orbitron.ttf", 24, 600, 12, tuple(GREEN))
        img = place(img, sub, W - 470 * S, 385 * S, 1.0, a)
        ln = Layer()
        ln.line((W - 760 * S, 420 * S), (W - 760 * S + 580 * S * smooth(u(t, t0, t0 + 0.3)), 420 * S), YELLOW * a, max(1, int(3 * S)))
        img = ln.add_to(img, 1.0, 0.8)
    # spec chips
    ca = smooth(u(t, T.WAY_RIDE + 1.6, T.WAY_RIDE + 2.0)) * (1 - smooth(u(t, T.WAY_CHARGE - 0.2, T.WAY_CHARGE + 0.2)))
    if ca > 0:
        for i, s_ in enumerate(["80 KM RANGE", "ZERO EMISSION", "SMART RIDE"]):
            tx = text_rgba(s_, "Rajdhani-Bold.ttf", 34, None, 4, tuple(WHITE))
            x = 300 * S + i * 420 * S
            y = 120 * S
            ch = Layer()
            wbox = tx.shape[1] / 2 + 24 * S
            ch.poly(np.array([[x - wbox, y - 30 * S], [x + wbox, y - 30 * S], [x + wbox, y + 30 * S], [x - wbox, y + 30 * S]]),
                    (GREEN if i != 1 else YELLOW) * ca, max(1, int(2 * S)), True)
            img = ch.add_to(img, 1.0, 0.6)
            img = place(img, tx, x, y, 1.0, ca * smooth(u(t, T.WAY_RIDE + 1.6 + 0.15 * i, T.WAY_RIDE + 1.9 + 0.15 * i)))
    img += pulse(t, T.WAY_RIDE, 0.15) * 1.2
    return img


# =========================================================================== battery charge
def scene_charge(t, fr):
    img = scene_ride(t, fr) * (1 - 0.75 * smooth(u(t, T.WAY_CHARGE + 0.2, T.WAY_CHARGE + 0.6)))
    k = smooth(u(t, T.WAY_CHARGE + 0.3, T.WAY_CHARGE + 0.6))
    if k <= 0:
        return img
    fill = ease_inout(u(t, T.WAY_CHARGE + 0.5, T.WAY_LOGO - 0.2))
    bw, bh = 520 * S, 240 * S
    x0, y0 = CX - bw / 2, CY - bh / 2
    lay = Layer()
    lay.poly(np.array([[x0, y0], [x0 + bw, y0], [x0 + bw, y0 + bh], [x0, y0 + bh]]), WHITE * k, max(1, int(6 * S)), True)
    lay.fillpoly(np.array([[x0 + bw + 8 * S, CY - 45 * S], [x0 + bw + 36 * S, CY - 45 * S], [x0 + bw + 36 * S, CY + 45 * S], [x0 + bw + 8 * S, CY + 45 * S]]), WHITE * k)
    pad = 18 * S
    fw = (bw - 2 * pad) * fill
    col = lerp(YELLOW, GREEN, fill)
    cells = 10
    for c in range(cells):
        cx0 = x0 + pad + c * (bw - 2 * pad) / cells
        cx1 = cx0 + (bw - 2 * pad) / cells - 8 * S
        if cx0 - (x0 + pad) < fw:
            lay.fillpoly(np.array([[cx0, y0 + pad], [min(cx1, x0 + pad + fw), y0 + pad], [min(cx1, x0 + pad + fw), y0 + bh - pad], [cx0, y0 + bh - pad]]), col * k * 0.9)
    img = lay.add_to(img, 1.0, 1.2)
    # bolt icon
    bolt = np.array([[CX + 20, CY - 95], [CX - 40, CY + 10], [CX + 2, CY + 10], [CX - 20, CY + 95], [CX + 45, CY - 15], [CX + 2, CY - 15]])
    bolt = (bolt - [CX, CY]) * S + [CX, CY]
    bl = Layer()
    bl.fillpoly(bolt, WHITE * k)
    img = bl.add_to(img, 1.0, 0.8)
    pct = text_rgba(f"{int(fill * 100)}%", "Orbitron.ttf", 56, 800, 4, tuple(WHITE))
    img = place(img, pct, CX, y0 + bh + 70 * S, 1.0, k)
    # energy particles streaming in
    rng = np.random.default_rng(6)
    n = 500
    ang = rng.uniform(0, 2 * np.pi, n)
    ph = rng.uniform(0, 1, n)
    rr = (1 - ((t * 0.9 + ph) % 1)) * 900 * S + 150 * S
    pl = np.zeros_like(img)
    splat(pl, CX + np.cos(ang) * rr, CY + np.sin(ang) * rr * 0.6, np.where((np.arange(n) % 3 == 0)[:, None], YELLOW, GREEN) * 3 * k)
    img += glow(pl, 1.2)
    if t > T.WAY_LOGO - 0.25:
        kk = ease_in(u(t, T.WAY_LOGO - 0.25, T.WAY_LOGO), 3)
        img = transform(img, 1 - 0.9 * kk) + kk * 1.2
    return img


# =========================================================================== logo reveal
def scene_logo(t, fr):
    dt = t - T.WAY_LOGO
    img = radial_bg((0.03, 0.06, 0.035), (0.0, 0.0, 0.0))
    # moving floor grid reflection
    lay = Layer()
    hy = 700 * S
    for i in range(14):
        z = ((i + dt * 2.0) % 14) / 14
        y = hy + (H - hy) * z ** 2
        lay.line((0, y), (W, y), GREEN * 0.18 * z, 1)
    for i in range(-12, 13):
        lay.line((CX + i * 30 * S, hy), (CX + i * 260 * S, H), GREEN * 0.12, 1)
    img = lay.add_to(img, 1.0, 0.4)
    # occasional arcs around the logo
    rng = np.random.default_rng(fr // 2)
    arc = Layer()
    if rng.random() < 0.35 and dt > 1.2:
        a0 = (rng.uniform(150, 600) * S, rng.uniform(80, 200) * S)
        a1 = (rng.uniform(1300, 1780) * S, rng.uniform(80, 200) * S)
        arc.poly(lightning(a0, a1, rng, 7, 0.15), (GREEN if rng.random() < 0.5 else YELLOW) * 0.35, 1)
    img = arc.add_to(img, 1.0, 1.0)
    sc = 1.0 + 0.03 * smooth(u(t, T.WAY_LOGO, T.ENDCARD))
    img, a = way_logo(img, t, T.WAY_LOGO, CX, CY - 20 * S, sc)
    # light sweep
    for t0 in (T.WAY_LOGO + 1.9, T.WAY_LOGO + 3.2):
        k = u(t, t0, t0 + 0.6)
        if 0 < k < 1:
            xs, ys = grid()
            band = np.exp(-((xs + ys * 0.4 - lerp(-300 * S, W + 300 * S, k)) / (90 * S)) ** 2)
            img += band[..., None] * a * 1.1
    # green pixel dots rising from the chevron
    pl = np.zeros_like(img)
    rng = np.random.default_rng(2)
    n = 160
    x0 = CX - 360 * S + rng.normal(0, 60, n) * S
    ph = rng.uniform(0, 1, n)
    yy = CY - 80 * S - ((dt * 0.4 + ph) % 1) * 400 * S
    splat(pl, x0, yy, GREEN * (1 - (dt * 0.4 + ph) % 1)[:, None] * 2 * smooth(u(t, T.WAY_LOGO + 0.4, T.WAY_LOGO + 1.0)))
    img += glow(pl, 1.0)
    img += pulse(t, T.WAY_LOGO, 0.12) * 1.3
    return img


# =========================================================================== end card
def scene_end(t, fr):
    from s1_khodal import version, embers
    from s2_bs9 import bs9_full
    dt = t - T.ENDCARD
    fade = 1 - smooth(u(t, T.TOTAL - 1.8, T.TOTAL - 0.2))
    img = radial_bg((0.07, 0.03, 0.04), (0.0, 0.0, 0.0))
    img = embers(img, t, T.ENDCARD, 350, 0.6)
    title = text_rgba("NAVRATRI 2026", "Montserrat.ttf", 54, 800, 22, (1.0, 0.83, 0.42))
    img = place(img, title, CX, 180 * S, 1.0, smooth(u(t, T.ENDCARD, T.ENDCARD + 0.5)))
    ln = Layer()
    wln = 520 * S * ease_out(u(t, T.ENDCARD + 0.2, T.ENDCARD + 0.9))
    ln.line((CX - wln, 240 * S), (CX + wln, 240 * S), np.array([1.0, 0.7, 0.3]) * 0.6, 1)
    img = ln.add_to(img, 1.0, 0.6)
    # three logos on successive beats
    items = [("k", CX, 430 * S), ("b", CX - 420 * S, 790 * S), ("w", CX + 400 * S, 790 * S)]
    for i, (kind, x, y) in enumerate(items):
        t0 = T.ENDCARD + 0.3 + i * T.BEAT
        a = smooth(u(t, t0, t0 + 0.25))
        if a <= 0:
            continue
        sc = back_out(u(t, t0, t0 + 0.4), 1.6)
        if kind == "k":
            img = place(img, version(1), x, y, 0.82 * sc, a)
        elif kind == "b":
            img = place(img, bs9_full(), x, y, 0.42 * sc, a)
        else:
            img, _ = way_logo(img, t + 10, t0 - 10, x, y, 0.56 * sc, a)
        img += (np.exp(-(radial(x, y) * 9) ** 2) * pulse(t, t0, 0.15) * 0.8)[..., None]
    # separators
    sep = Layer()
    sa = smooth(u(t, T.ENDCARD + 1.4, T.ENDCARD + 1.8))
    sep.line((CX, 650 * S), (CX, 930 * S), np.array([1.0, 0.8, 0.5]) * 0.35 * sa, 1)
    img = sep.add_to(img, 1.0, 0.4)
    img += pulse(t, T.ENDCARD, 0.15) * 1.0
    return img * fade


# =========================================================================== dispatcher
def render(t, fr):
    if t < T.WAY_RIDE:
        return scene_power(t, fr)
    if t < T.WAY_CHARGE:
        return scene_ride(t, fr)
    if t < T.WAY_LOGO:
        return scene_charge(t, fr)
    if t < T.ENDCARD:
        return scene_logo(t, fr)
    return scene_end(t, fr)
