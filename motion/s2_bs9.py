"""Act 2 — BS9 News (DOT .. WAY).

blue dot -> Earth -> India -> Gujarat -> Rajkot; the city rises in 3D (zones,
buildings, roads carrying blue/red data like circuit traces); blue and red 3D
fractals emerge and collide (shockwave, meters spike); a giant monitoring glow
soaks it all in; the BS9 logo is built part by part in jump cuts, rotates into
place on blue; then a 12 s broadcast package (video wall of local beats:
city, politics, traffic, weather, community, sports; breaking-news lower third,
ticker, LIVE bug; final stinger).
"""
import json
import functools
import numpy as np
import cv2
from scipy.interpolate import PchipInterpolator

import timeline as T
from common import *  # noqa

RAJKOT = (22.3039, 70.8022)
BLUE = np.array([0.15, 0.55, 1.0], np.float32)
RED = np.array([1.0, 0.16, 0.22], np.float32)
CYAN = np.array([0.35, 0.85, 1.0], np.float32)


# =========================================================================== Earth
@functools.lru_cache(maxsize=1)
def earth_tex():
    day = cv2.imread(f"{ASSETS}/earth.jpg")[..., ::-1].astype(np.float32) / 255
    night = cv2.imread(f"{ASSETS}/earth_lights.png")[..., ::-1].astype(np.float32) / 255
    return day, night


@functools.lru_cache(maxsize=1)
def coastlines():
    gj = json.load(open(f"{ASSETS}/land.geojson"))
    rings = []
    for f in gj["features"]:
        g = f["geometry"]
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        for poly in polys:
            ring = np.array(poly[0])
            if ring[:, 0].max() < 40 or ring[:, 0].min() > 110 or ring[:, 1].max() < -5 or ring[:, 1].min() > 45:
                continue
            rings.append(ring)
    return rings


def ll2vec(lat, lon):
    la, lo = np.radians(lat), np.radians(lon)
    return np.stack([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)], -1)


def basis(lat0, lon0):
    f = ll2vec(lat0, lon0)
    lo = np.radians(lon0)
    la = np.radians(lat0)
    e = np.array([-np.sin(lo), np.cos(lo), 0.0])
    n = np.array([-np.sin(la) * np.cos(lo), -np.sin(la) * np.sin(lo), np.cos(la)])
    return e, n, f


ZOOM_KEYS = [(T.ZOOM, 3.0), (T.ZOOM + 0.8, 330), (T.ZOOM + 1.9, 470), (T.ZOOM + 2.6, 1500),
             (T.MAPX, 7000), (T.MAPX + 0.9, 45000), (T.CITY, 410000)]
_zoom = PchipInterpolator([k[0] for k in ZOOM_KEYS], np.log([k[1] for k in ZOOM_KEYS]))


def earth_R(t):
    t = min(max(t, T.ZOOM), T.CITY)
    return float(np.exp(_zoom(t))) * S


def earth_center(t):
    k = ease_inout(u(t, T.ZOOM + 0.3, T.ZOOM + 2.6))
    lat = lerp(8.0, RAJKOT[0], k)
    lon = lerp(-5.0, RAJKOT[1], k)
    return lat, lon


def project_ll(lat, lon, lat0, lon0, R):
    e, n, f = basis(lat0, lon0)
    P = ll2vec(lat, lon)
    x, y, z = P @ e, P @ n, P @ f
    return np.stack([CX + x * R, CY - y * R], -1), z


def render_earth(t, R, lat0, lon0, tint=0.45):
    day, night = earth_tex()
    th, tw = day.shape[:2]
    xs, ys = grid()
    px = (xs - CX) / R
    py = (ys - CY) / R
    d2 = px * px + py * py
    inside = d2 < 1
    pz = np.sqrt(np.clip(1 - d2, 0, 1))
    e, n, f = basis(lat0, lon0)
    X = px * e[0] - py * n[0] + pz * f[0]
    Y = px * e[1] - py * n[1] + pz * f[1]
    Z = px * e[2] - py * n[2] + pz * f[2]
    lat = np.arcsin(np.clip(Z, -1, 1))
    lon = np.arctan2(Y, X)
    mu = ((lon + np.pi) / (2 * np.pi) * tw).astype(np.float32) % tw
    mv = ((np.pi / 2 - lat) / np.pi * th).astype(np.float32)
    dcol = cv2.remap(day, mu, mv, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
    ncol = cv2.remap(night, mu, mv, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
    sun = ll2vec(10.0, lon0 - 55.0)
    diff = np.clip(X * sun[0] + Y * sun[1] + Z * sun[2], 0, 1)
    lum = dcol @ np.array([0.3, 0.59, 0.11], np.float32)
    techno = lum[..., None] * np.array([0.35, 0.75, 1.3], np.float32)
    col = lerp(dcol, techno, tint) * (0.12 + 1.0 * diff[..., None] ** 0.8)
    col += ncol * np.array([1.0, 0.75, 0.45]) * (1 - diff[..., None]) ** 2 * 1.6
    rim = (1 - pz) ** 3
    col += rim[..., None] * np.array([0.25, 0.55, 1.0]) * 0.9
    img = np.where(inside[..., None], col, 0).astype(np.float32)
    # atmosphere halo outside
    d = np.sqrt(d2)
    halo = np.exp(-np.maximum(d - 1, 0) * 18) * (~inside)
    img += halo[..., None] * np.array([0.2, 0.5, 1.0], np.float32) * 0.9
    return img


def graticule(lay, lat0, lon0, R, step, col):
    for lat in np.arange(-80, 81, step):
        lon = np.linspace(-180, 180, 361)
        p, z = project_ll(np.full_like(lon, lat), lon, lat0, lon0, R)
        p = p[z > 0.02]
        if len(p) > 1:
            lay.poly(p, col, 1)
    for lon in np.arange(-180, 180, step):
        lat = np.linspace(-85, 85, 171)
        p, z = project_ll(lat, np.full_like(lat, lon), lat0, lon0, R)
        p = p[z > 0.02]
        if len(p) > 1:
            lay.poly(p, col, 1)


def scene_zoom(t, fr):
    img = blank()
    # stars drift slightly
    from s1_khodal import starfield
    if t < T.ZOOM:
        # single blue dot + sonar ring
        k = smooth(u(t, T.DOT, T.DOT + 0.2))
        core = np.exp(-(radial(CX, CY, 5 * S)) ** 2) * k * (1 + 0.3 * np.sin(t * 12))
        img += core[..., None] * np.array([0.3, 0.6, 1.0]) * 2.5
        img = glow(img, 1.5)
        lay = Layer()
        for j in range(3):
            rr = (t - T.DOT - 0.18 * j) * 500 * S
            if rr > 0:
                lay.circle((CX, CY), rr, BLUE * max(0, 1 - rr / (260 * S)) * 0.8)
        return lay.add_to(img, 1.0, 0.5)
    R = earth_R(t)
    lat0, lon0 = earth_center(t)
    starfield(img, t, 0.6 * (1 - u(t, T.ZOOM + 2.0, T.ZOOM + 2.8)), (-(t - T.ZOOM) * 30 * S, 0))
    mapk = smooth(u(t, T.MAPX - 0.4, T.MAPX + 0.3))
    if mapk < 1:
        e = render_earth(t, R, lat0, lon0)
        inside = (radial(CX, CY, R) < 1.0)[..., None]
        img = np.where(inside, e, img + e) * (1 - mapk)
    lay = Layer()
    ga = (0.25 * smooth(u(t, T.ZOOM + 0.8, T.ZOOM + 1.6))) * (1 - 0.6 * mapk)
    step = 10 if R < 3000 * S else (2 if R < 30000 * S else 0.5)
    if ga > 0:
        graticule(lay, lat0, lon0, R, step, CYAN * ga)
    # vector coastline map (India / Gujarat)
    ca = smooth(u(t, T.ZOOM + 1.6, T.ZOOM + 2.4))
    if ca > 0:
        land = Layer()
        for ring in coastlines():
            p, z = project_ll(ring[:, 1], ring[:, 0], lat0, lon0, R)
            if (z < 0).all():
                continue
            if p[:, 0].max() < -W or p[:, 0].min() > 2 * W or p[:, 1].max() < -H or p[:, 1].min() > 2 * H:
                continue
            p = np.clip(p, -4 * W, 5 * W)
            if mapk > 0:
                land.fillpoly(p, np.array([0.03, 0.11, 0.24]) * mapk)
            lay.poly(p, CYAN * ca * (0.5 + 0.7 * mapk), max(1, int(2 * S)), True)
        img += land.f(1.0)
        if mapk > 0:
            # sea dot-matrix
            xs, ys = grid()
            dots = ((xs % (14 * S) < 1.5) & (ys % (14 * S) < 1.5)).astype(np.float32)
            img += dots[..., None] * np.array([0.05, 0.12, 0.25]) * mapk
    img = lay.add_to(img, 1.0, 0.8)
    # labels
    lab = Layer()
    if R < 2500 * S and t > T.ZOOM + 1.7:
        p, z = project_ll(np.array([21.0]), np.array([78.5]), lat0, lon0, R)
        a = smooth(u(t, T.ZOOM + 1.7, T.ZOOM + 2.0)) * (1 - u(R, 1600 * S, 2500 * S))
        txt = text_rgba("INDIA", "Orbitron.ttf", 34, 700, 10, tuple(CYAN))
        img = place(img, txt, p[0, 0], p[0, 1], 1.0, a)
    if 3000 * S < R < 60000 * S:
        p, z = project_ll(np.array([23.3]), np.array([71.6]), lat0, lon0, R)
        a = smooth(u(R, 3000 * S, 5000 * S)) * (1 - smooth(u(R, 30000 * S, 60000 * S)))
        txt = text_rgba("GUJARAT", "Orbitron.ttf", 40, 700, 14, tuple(CYAN))
        img = place(img, txt, p[0, 0], p[0, 1] - 150 * S, 1.0, a)
        p2, _ = project_ll(np.array([21.75]), np.array([70.9]), lat0, lon0, R)
        txt = text_rgba("SAURASHTRA", "Orbitron.ttf", 22, 500, 8, tuple(CYAN * 0.8))
        img = place(img, txt, p2[0, 0], p2[0, 1], 1.0, a * 0.8 * (1 - smooth(u(R, 12000 * S, 20000 * S))))
    # target reticle on Rajkot
    ca2 = smooth(u(t, T.MAPX + 1.1, T.CITY))
    if ca2 > 0:
        cimg = render_city(t, show_labels=False, rise=False, flat=True)
        img = img * (1 - 0.6 * ca2) + cimg * ca2
    ra = smooth(u(t, T.MAPX + 0.5, T.MAPX + 0.9)) * (1 - smooth(u(t, T.CITY - 0.5, T.CITY - 0.1)))
    if ra > 0:
        lock = u(t, T.MAPX + 0.9, T.MAPX + 1.5)
        size = lerp(260, 70, ease_out(lock)) * S
        c = lerp(CYAN, RED * 1.2, float(lock >= 1)) * ra
        for sx, sy in [(-1, -1), (1, -1), (1, 1), (-1, 1)]:
            x0, y0 = CX + sx * size, CY + sy * size
            lab.line((x0, y0), (x0 - sx * size * 0.35, y0), c, max(1, int(2 * S)))
            lab.line((x0, y0), (x0, y0 - sy * size * 0.35), c, max(1, int(2 * S)))
        lab.circle((CX, CY), 5 * S, c, fill=True)
        lab.line((CX - size * 1.6, CY), (CX - size * 1.1, CY), c * 0.6)
        lab.line((CX + size * 1.1, CY), (CX + size * 1.6, CY), c * 0.6)
        img = lab.add_to(img, 1.0, 0.8)
        txt = text_rgba("RAJKOT", "Orbitron.ttf", 46, 800, 12, (1, 1, 1))
        img = place(img, txt, CX + size + 190 * S, CY - 40 * S, 1.0, ra)
        txt = text_rgba("22.3039° N   70.8022° E", "Rajdhani-SemiBold.ttf", 30, None, 3, tuple(CYAN))
        img = place(img, txt, CX + size + 190 * S, CY + 12 * S, 1.0, ra)
    return img


# =========================================================================== Rajkot city
@functools.lru_cache(maxsize=1)
def city():
    rng = np.random.default_rng(42)
    roads = []  # (pts (N,2) km, kind)

    def wiggle(p, amp, seed):
        r = np.random.default_rng(seed)
        n = len(p)
        off = np.cumsum(r.normal(0, amp, (n, 2)), 0)
        off -= np.linspace(0, 1, n)[:, None] * off[-1]
        return p + cv2.GaussianBlur(off.astype(np.float32), (1, 0), 3).reshape(-1, 2) if n > 5 else p

    th = np.linspace(0, 2 * np.pi, 240)
    r = 5.2 + 0.5 * np.sin(2 * th + 1) + 0.3 * np.cos(3 * th)
    roads.append((np.stack([np.cos(th) * r, np.sin(th) * r], -1), "ring"))
    r2 = 2.1 + 0.2 * np.sin(3 * th)
    roads.append((np.stack([np.cos(th) * r2, np.sin(th) * r2], -1), "ring"))
    radial_names = [(120, "JAMNAGAR RD"), (82, "MORBI RD"), (42, "AHMEDABAD HWY"), (-12, "BHAVNAGAR RD"),
                    (-78, "GONDAL RD"), (-128, "KALAWAD RD"), (200, "150 FT RING RD"), (160, "RAIYA RD")]
    for i, (ang, _) in enumerate(radial_names):
        a = np.radians(ang)
        s = np.linspace(0.3, 12, 120)
        bend = 0.04 * np.sin(s * 0.5 + i)
        p = np.stack([np.cos(a + bend) * s, np.sin(a + bend) * s], -1)
        roads.append((p, "radial"))
    # minor street grid
    rot = np.radians(12)
    Rm = np.array([[np.cos(rot), -np.sin(rot)], [np.sin(rot), np.cos(rot)]])
    nodes = []
    for gx in np.arange(-7, 7.01, 0.55):
        for dirn in (0, 1):
            ys = np.arange(-7, 7.01, 0.55)
            segs = []
            for y0, y1 in zip(ys[:-1], ys[1:]):
                if rng.random() < 0.62:
                    a = np.array([gx, y0]) if dirn == 0 else np.array([y0, gx])
                    b = np.array([gx, y1]) if dirn == 0 else np.array([y1, gx])
                    a = a @ Rm.T + rng.normal(0, 0.03, 2)
                    b = b @ Rm.T + rng.normal(0, 0.03, 2)
                    if np.hypot(*a) < 7.2 and np.hypot(*b) < 7.2:
                        roads.append((np.array([a, b]), "minor"))
                        nodes.append(b)
    # water
    a = np.linspace(0, 2 * np.pi, 60)
    aji = np.stack([3.6 + 1.3 * np.cos(a) + 0.2 * np.sin(3 * a), -2.9 + 0.8 * np.sin(a)], -1)
    nyari = np.stack([-6.6 + 0.8 * np.cos(a), -1.2 + 0.55 * np.sin(a) + 0.1 * np.cos(2 * a)], -1)
    river = np.array([[3.0, -2.2], [2.5, -1.2], [2.2, 0.0], [2.0, 1.2], [1.7, 2.6], [1.5, 4.0], [1.2, 5.8], [1.0, 8.0]])
    # buildings
    bl = []
    tries = 0
    major = [p for p, k in roads if k != "minor"]
    while len(bl) < 1400 and tries < 20000:
        tries += 1
        rr = abs(rng.normal(0, 2.8))
        if rr > 7.0:
            continue
        ang = rng.uniform(0, 2 * np.pi)
        c = np.array([np.cos(ang) * rr, np.sin(ang) * rr])
        if any(np.min(np.hypot(*(p - c).T)) < 0.16 for p in major):
            continue
        if np.hypot((c[0] - 3.6) / 1.4, (c[1] + 2.9) / 0.9) < 1 or np.hypot((c[0] + 6.6) / 0.9, (c[1] + 1.2) / 0.65) < 1:
            continue
        w = rng.uniform(0.07, 0.2)
        d = rng.uniform(0.07, 0.2)
        h = rng.lognormal(-2.2, 0.55) * (1.8 if rr < 2.5 else 1.0)
        if rng.random() < 0.02:
            h = rng.uniform(0.6, 1.0)
        bl.append((c[0], c[1], w, d, min(h, 1.1), rng.random()))
    bl = np.array(bl)
    zones = [("RACE COURSE", (0.3, 0.9)), ("KALAWAD ROAD", (-3.6, -1.9)), ("GONDAL ROAD", (0.9, -4.3)),
             ("RAIYA", (-3.4, 2.9)), ("MAVDI", (-1.5, -3.4)), ("AJI DAM", (3.6, -2.9)), ("MORBI ROAD", (1.6, 4.6)),
             ("NYARI DAM", (-6.6, -1.2))]
    return roads, np.array(nodes), aji, nyari, river, bl, zones


def city_camera(t):
    k = ease_inout(u(t, T.CITY, T.CITY + 2.0))
    fov = 50
    f = (W / 2) / np.tan(np.radians(fov) / 2)
    h0 = f / (earth_R(t) / 6371.0)
    elev = np.radians(lerp(89.5, 36, k))
    dist = lerp(h0, 16.5, k) - 1.5 * u(t, T.CITY + 2, T.COLLIDE)
    az = np.radians(-90 + 25 * k + 6 * (t - T.CITY))
    eye = np.array([np.cos(az) * np.cos(elev) * dist, np.sin(az) * np.cos(elev) * dist, np.sin(elev) * dist])
    return Camera(eye, (0, 0, 0), fov)


def pulses_on(lay, P2, nseg, t, speed, col, n_p, seed, length=0.08, th=2):
    if len(P2) < 2:
        return
    rng = np.random.default_rng(seed)
    offs = rng.uniform(0, 1, n_p)
    L = len(P2)
    for o in offs:
        s = (o + speed * t) % 1.0
        i1 = int(s * (L - 1))
        i0 = max(0, int((s - length) * (L - 1)))
        if i1 - i0 >= 1:
            lay.poly(P2[i0:i1 + 1], col, th)


def render_city(t, cam=None, show_labels=True, rise=True, flat=False):
    cam = cam or city_camera(t)
    roads, nodes, aji, nyari, river, bl, zones = city()
    img = blank() if flat else radial_bg((0.02, 0.05, 0.11), (0.0, 0.01, 0.03))
    base = Layer()
    # ground grid
    for g in np.arange(-10, 10.01, 1.0):
        p, z = cam.project(np.array([[g, -10, 0], [g, 10, 0]]))
        base.line(p[0], p[1], np.array([0.05, 0.12, 0.22]))
        p, z = cam.project(np.array([[-10, g, 0], [10, g, 0]]))
        base.line(p[0], p[1], np.array([0.05, 0.12, 0.22]))
    # water
    for wpoly in (aji, nyari):
        p, _ = cam.project(np.column_stack([wpoly, np.zeros(len(wpoly))]))
        base.fillpoly(p, np.array([0.03, 0.18, 0.4]))
        base.poly(p, CYAN * 0.8, max(1, int(2 * S)), True)
    p, _ = cam.project(np.column_stack([river, np.zeros(len(river))]))
    base.poly(p, np.array([0.1, 0.4, 0.8]), max(1, int(3 * S)))
    img += base.f(1.0)
    # roads + data pulses
    rl = Layer()
    pl = Layer()
    for i, (pts, kind) in enumerate(roads):
        P3 = np.column_stack([pts, np.full(len(pts), 0.005)])
        p2, z = cam.project(P3)
        if (z < 0.1).all():
            continue
        if kind == "minor":
            rl.poly(p2, np.array([0.07, 0.2, 0.38]), 1)
        else:
            rl.poly(p2, np.array([0.15, 0.4, 0.75]), max(1, int(2 * S)), kind == "ring")
            col = BLUE * 1.4 if i % 2 == 0 else RED * 1.4
            pulses_on(pl, p2, len(p2), t - T.CITY, 0.10 + 0.03 * (i % 3), col, 5, i, 0.07, max(1, int(3 * S)))
    # data flow on minor streets (short hops)
    minor = [p for p, k in roads if k == "minor"]
    for j in range(60):
        pts = minor[(j * 37 + int((t - T.CITY) * 8)) % len(minor)]
        ph = ((t - T.CITY) * 3 + j * 0.37) % 1
        a3 = np.array([*pts[0], 0.005])
        b3 = np.array([*pts[1], 0.005])
        p2, _ = cam.project(np.array([a3 + (b3 - a3) * max(0, ph - 0.35), a3 + (b3 - a3) * ph]))
        pl.poly(p2, (BLUE if j % 2 else RED) * 1.2, max(1, int(2 * S)))
    # via nodes
    if len(nodes):
        p2, z = cam.project(np.column_stack([nodes, np.zeros(len(nodes))]))
        for q in p2[::3]:
            rl.circle(q, 2.2 * S, np.array([0.2, 0.5, 0.9]), fill=True)
    img += rl.f(1.0)
    img = pl.add_to(img, 1.0, 1.2)
    if flat:
        return img
    # buildings (painter's algorithm)
    ex, ey, ez = cam.eye
    d = np.hypot(bl[:, 0] - ex, bl[:, 1] - ey)
    order = np.argsort(-d)
    bld = Layer()
    edges = Layer()
    r = np.hypot(bl[:, 0], bl[:, 1])
    for i in order:
        x, y, w, dd, h, rnd = bl[i]
        if rise:
            k = back_out(clamp01((t - (T.CITY + 0.4 + 0.25 * r[i] + 0.3 * rnd)) / 0.7), 1.2)
        else:
            k = 1.0
        hh = h * k
        if hh < 0.004:
            continue
        xs = np.array([x - w, x + w, x + w, x - w])
        ys = np.array([y - dd, y - dd, y + dd, y + dd])
        bot = np.column_stack([xs, ys, np.zeros(4)])
        top = np.column_stack([xs, ys, np.full(4, hh)])
        pb, zb = cam.project(bot)
        pt, zt = cam.project(top)
        if (zb < 0.2).any():
            continue
        tint = RED if rnd > 0.93 else BLUE
        for a_, b_ in ((0, 1), (1, 2), (2, 3), (3, 0)):
            mid = (bot[a_] + bot[b_]) / 2
            nrm = np.array([mid[0] - x, mid[1] - y, 0])
            if np.dot(nrm, cam.eye - mid) <= 0:
                continue
            face = np.array([pb[a_], pb[b_], pt[b_], pt[a_]])
            shade = 0.5 + 0.5 * abs(nrm[0]) / (np.hypot(nrm[0], nrm[1]) + 1e-9)
            bld.fillpoly(face, np.array([0.02, 0.06, 0.14]) * shade + tint * 0.04)
            edges.line(pt[a_], pt[b_], tint * (0.35 + 0.4 * (hh > 0.3)))
            edges.line(pb[a_], pt[a_], tint * 0.18)
        bld.fillpoly(pt, np.array([0.05, 0.13, 0.28]) + tint * 0.05)
    bl_f = bld.f(1.0)
    mask = (bld.im.max(axis=2) > 0)[..., None]
    img = np.where(mask, bl_f, img)
    img = edges.add_to(img, 1.0, 0.6)
    # zone labels (billboards)
    if show_labels:
        lay = Layer()
        for zi, (name, (zx, zy)) in enumerate(zones):
            t0 = T.CITY + 1.3 + 0.28 * zi
            a = smooth(u(t, t0, t0 + 0.3)) * (1 - smooth(u(t, T.FRACT + 0.6, T.FRACT + 1.2)))
            if a <= 0:
                continue
            pz_, zz = cam.project(np.array([[zx, zy, 0.0], [zx, zy, 1.4]]))
            if (zz < 0.3).any():
                continue
            col = (RED if zi % 3 == 1 else CYAN) * a
            lay.line(pz_[0], pz_[1], col * 0.8)
            lay.circle(pz_[0], 6 * S, col, max(1, int(2 * S)))
            rr = 60 * S * (1 + 0.5 * np.sin((t - t0) * 3))
            lay.circle(pz_[0], rr, col * 0.35)
            txt = text_rgba(name, "Rajdhani-Bold.ttf", 30, None, 4, (1, 1, 1))
            img = place(img, txt, pz_[1][0] + txt.shape[1] / 2 + 8 * S, pz_[1][1], 1.0, a)
        img = lay.add_to(img, 1.0, 0.6)
    return img


def scene_city(t, fr):
    img = render_city(t)
    # HUD
    hud = Layer()
    a = smooth(u(t, T.CITY + 0.8, T.CITY + 1.4))
    hud.text("RAJKOT  //  LIVE CITY GRID", (70 * S, 90 * S), 0.7, CYAN * a, 1)
    hud.text(f"DATA NODES {int(1400 * a + 37 * (t - T.CITY) ** 2):05d}   UPLINK {97 + 2 * np.sin(t * 3):.1f}%", (70 * S, 125 * S), 0.48, CYAN * 0.8 * a)
    img = hud.add_to(img, 1.0, 0.3)
    return img


# =========================================================================== fractals + collision
@functools.lru_cache(maxsize=2)
def fractal_segments(depth=4):
    dirs = np.array([[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], float)
    segs = []  # (a, b, level)

    def grow(p, d, L, lev):
        q = p + d * L
        segs.append((p, q, lev))
        if lev + 1 >= depth:
            return
        for d2 in dirs:
            if np.dot(d2, d) < -0.5:
                continue
            grow(q, d2, L * 0.46, lev + 1)

    for d in dirs:
        grow(np.zeros(3), d, 1.0, 0)
    a = np.array([s[0] for s in segs])
    b = np.array([s[1] for s in segs])
    lv = np.array([s[2] for s in segs])
    return a, b, lv


def draw_fractal(lay, t, cx, cy, size, grow, col, rot):
    a, b, lv = fractal_segments()
    R3 = rot_y(rot[0]) @ rot_x(rot[1]) @ rot_z(rot[2])
    A = a @ R3.T
    B = b @ R3.T
    f = 4.0

    def proj(P):
        z = P[:, 2] + f
        return np.stack([cx + P[:, 0] * size * f / z, cy - P[:, 1] * size * f / z], -1), z

    pa, za = proj(A)
    pb, zb = proj(B)
    for L in range(4):
        m = lv == L
        k = clamp01(grow * 4 - L)
        if k <= 0:
            continue
        end = pa[m] + (pb[m] - pa[m]) * k
        segs = [np.array([p, q]) for p, q in zip(pa[m], end)]
        lay.polys(segs, col * (1.0 - 0.15 * L), max(1, int((3 - L * 0.6) * S)))
        if k >= 1:
            for q in pb[m][::2]:
                lay.circle(q, (4 - L) * S, col * 1.2, fill=True)


def scene_fractal(t, fr):
    # city keeps living underneath (darkened)
    img = render_city(t) * (1 - 0.45 * u(t, T.FRACT, T.FRACT + 1.0))
    grow = ease_out(u(t, T.FRACT, T.FRACT + 1.3))
    approach = ease_in(u(t, T.FRACT + 0.6, T.COLLIDE), 2.2)
    size = (170 + 90 * approach) * S * grow
    lay = Layer()
    xb = lerp(CX - 560 * S, CX - 40 * S, approach)
    xr = lerp(CX + 560 * S, CX + 40 * S, approach)
    yy = lerp(CY + 120 * S, CY, approach)
    dt = t - T.FRACT
    draw_fractal(lay, t, xb, yy, size, grow, BLUE * 1.3, (dt * 1.3, 0.5 + dt * 0.4, 0.2))
    draw_fractal(lay, t, xr, yy, size, grow, RED * 1.3, (-dt * 1.5, -0.4 + dt * 0.5, -0.3))
    # arcs of energy between them when close
    if approach > 0.5:
        rng = np.random.default_rng(fr)
        for _ in range(int(6 * approach)):
            pts = lightning((xb + size * 0.3, yy + rng.uniform(-60, 60) * S), (xr - size * 0.3, yy + rng.uniform(-60, 60) * S), rng, 6, 0.2)
            lay.poly(pts, np.array([0.8, 0.6, 1.0]) * approach, 1)
    img = lay.add_to(img, 1.0, 1.4)
    dx, dy = shake(t, 5 * approach)
    return transform(img, 1 + 0.04 * approach, 0, dx, dy)


def meters(lay, t, k):
    """Multimeter / oscilloscope readouts spiking after the collision."""
    rng = np.random.default_rng(3)
    for i in range(5):
        y0 = (180 + i * 170) * S
        xs = np.linspace(0, W, 300)
        amp = 120 * S * np.exp(-(t - T.COLLIDE) * 3) * (1 + rng.random())
        ys = y0 + amp * np.sin(xs / (20 + 10 * i) / S + t * 40) * np.exp(-((xs - CX) / (500 * S)) ** 2)
        lay.poly(np.stack([xs, ys], -1), (BLUE if i % 2 else RED) * k, 1)
        lay.text(f"CH{i + 1}  {9.99 * np.exp(-(t - T.COLLIDE)) * (i + 1):5.2f} kV", (40 * S, y0 - 12 * S), 0.45, CYAN * k)


def scene_collide(t, fr):
    dt = t - T.COLLIDE
    base = render_city(t, rise=False) * 0.5
    # shockwave distortion
    rr = dt * 2600 * S
    xs, ys = grid()
    dx = xs - CX
    dy = ys - CY
    dist = np.sqrt(dx * dx + dy * dy) + 1e-3
    ring = np.exp(-((dist - rr) / (70 * S)) ** 2)
    disp = ring * 60 * S * np.exp(-dt * 2)
    mx = (xs - dx / dist * disp).astype(np.float32)
    my = (ys - dy / dist * disp).astype(np.float32)
    img = cv2.remap(base, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    img += (ring * np.exp(-dt * 2.5))[..., None] * np.array([0.8, 0.7, 1.0]) * 0.8
    # debris particles from the fractals
    rng = np.random.default_rng(12)
    n = 900
    ang = rng.uniform(0, 2 * np.pi, n)
    sp = rng.uniform(200, 1400, n) * S
    px = CX + np.cos(ang) * sp * (1 - np.exp(-dt * 3)) / 3 * 3
    py = CY + np.sin(ang) * sp * (1 - np.exp(-dt * 3)) / 3 * 3
    cols = np.where((np.arange(n) % 2)[:, None] == 0, BLUE, RED) * 3 * np.exp(-dt * 1.5)
    pl = np.zeros_like(img)
    splat(pl, px, py, cols)
    img += glow(pl, 1.5)
    lay = Layer()
    meters(lay, t, np.exp(-dt * 1.2))
    img = lay.add_to(img, 1.0, 0.5)
    img += np.exp(-dt / 0.05) * 1.6
    sx, sy = shake(t, 22 * np.exp(-dt * 4))
    img = transform(img, 1.0, 0, sx, sy)
    return chroma(img, 14 * S * np.exp(-dt * 3))


def scene_glow(t, fr):
    k = u(t, T.GLOW, T.CUTS)
    src = scene_collide(t, fr) if t < T.COLLIDE + 0.9 else render_city(t, rise=False) * 0.45
    # swirl the world into the centre
    xs, ys = grid()
    dx = xs - CX
    dy = ys - CY
    r = np.sqrt(dx * dx + dy * dy)
    th = np.arctan2(dy, dx)
    pull = 1 + 5 * ease_in(k, 2)
    tw = 3.5 * ease_in(k, 2) * np.exp(-r / (500 * S))
    r2 = r * pull
    mx = (CX + np.cos(th + tw) * r2).astype(np.float32)
    my = (CY + np.sin(th + tw) * r2).astype(np.float32)
    img = cv2.remap(src, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT) * (1 - 0.6 * k)
    # the giant monitoring glow
    R = lerp(40, 330, ease_out(u(t, T.GLOW, T.GLOW + 1.2))) * S * (1 + 0.04 * np.sin(t * 20))
    core = np.exp(-(r / R) ** 2 * 2.2)
    img += core[..., None] * np.array([0.45, 0.75, 1.0]) * (1.3 + 1.5 * k)
    lay = Layer()
    for i, (rad, n, sp, c) in enumerate([(1.25, 72, 0.8, CYAN), (1.55, 36, -0.5, BLUE), (1.9, 120, 0.3, CYAN * 0.7), (2.3, 8, -0.9, RED)]):
        rr = R * rad
        lay.circle((CX, CY), rr, c * 0.6)
        for j in range(n):
            a = j * 2 * np.pi / n + sp * t
            l = 10 * S if j % 6 else 22 * S
            lay.line((CX + np.cos(a) * rr, CY + np.sin(a) * rr), (CX + np.cos(a) * (rr + l), CY + np.sin(a) * (rr + l)), c * 0.8)
    # scanning beam
    a = t * 4
    lay.line((CX, CY), (CX + np.cos(a) * R * 2.6, CY + np.sin(a) * R * 2.6), CYAN)
    img = lay.add_to(img, 1.0, 1.0)
    img += float(ease_in(u(t, T.CUTS - 0.35, T.CUTS), 2)) * 3.0
    return img


# =========================================================================== BS9 logo parts
@functools.lru_cache(maxsize=1)
def bs9_parts():
    im = logo("bs9_white.png")
    orig = logo("bs9.png")
    rgb = orig[..., :3]
    a = orig[..., 3]
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    sat = (mx - mn) / (mx + 1e-4)
    lum = rgb.mean(axis=2)
    blue = (rgb[..., 2] > rgb[..., 0] + 0.15) & (sat > 0.35)
    red = (rgb[..., 0] > rgb[..., 2] + 0.3) & (sat > 0.35)
    white = (lum > 0.8) & (sat < 0.2)
    grey = (lum > 0.25) & (lum <= 0.8) & (sat < 0.2)
    dark = (lum <= 0.25)
    parts = {}
    for name, m in [("blue", blue), ("red", red), ("white", white), ("ring", grey), ("news", dark)]:
        mm = cv2.dilate(m.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(np.float32)
        p = im.copy()
        p[..., 3] = a * mm
        parts[name] = p
    return parts


def bs9_sprite(which, width=1000):
    parts = bs9_parts()
    base = np.zeros_like(parts["blue"])
    for w_ in which:
        p = parts[w_]
        a = p[..., 3:4]
        base[..., :3] = base[..., :3] * (1 - a) + p[..., :3] * a
        base[..., 3:4] = base[..., 3:4] + a * (1 - base[..., 3:4])
    sc = width * S / base.shape[1]
    return base, sc


@functools.lru_cache(maxsize=4)
def bs9_full(width=1000):
    im = logo("bs9_white.png")
    sc = width * S / im.shape[1]
    pm = im.copy()
    pm[..., :3] *= pm[..., 3:4]
    out = cv2.resize(pm, (int(im.shape[1] * sc), int(im.shape[0] * sc)), interpolation=cv2.INTER_AREA)
    out[..., :3] = np.clip(out[..., :3] / np.maximum(out[..., 3:4], 1e-4), 0, 1)
    return out


def news_bg(t, k=1.0):
    img = radial_bg(np.array([0.05, 0.28, 0.85]) * k, np.array([0.0, 0.03, 0.16]) * k, cy=CY * 0.9)
    from s1_khodal import rays
    img = rays(img, t * 0.6, np.array([0.3, 0.6, 1.0]), 0.25 * k, 18)
    return img


def scene_cuts(t, fr):
    i = int((t - T.CUTS) / (T.BEAT / 4))
    tc = t - (T.CUTS + i * T.BEAT / 4)
    sets = [["blue"], ["red"], ["ring"], ["white"], ["blue", "white"], ["news"], ["red", "white"],
            ["blue", "red"], ["blue", "red", "ring"], ["blue", "red", "ring", "white"]]
    rng = np.random.default_rng(100 + i)
    if i < len(sets):
        bgc = [np.array([0.0, 0.0, 0.0]), np.array([0.02, 0.1, 0.35]), np.array([0.3, 0.02, 0.05])][i % 3]
        img = blank(bgc)
        spr, sc = bs9_sprite(sets[i])
        zoom = rng.uniform(1.6, 3.2) if i < 7 else 1.2 - 0.03 * i
        ox, oy = rng.uniform(-300, 300) * S, rng.uniform(-150, 150) * S
        rot = rng.uniform(-18, 18) if i < 7 else 0
        img = place(img, spr, CX + ox * (i < 7), CY + oy * (i < 7), sc * zoom * (1 + 0.15 * tc / 0.125), 1.0, rot)
        img += glow(img * 0.25, 0.5)
        # glitch slices
        for _ in range(3):
            y0 = int(rng.uniform(0, H))
            h_ = int(rng.uniform(10, 60) * S)
            img[y0:y0 + h_] = np.roll(img[y0:y0 + h_], int(rng.uniform(-80, 80) * S), axis=1)
        img = chroma(img, rng.uniform(6, 16) * S)
        img[::3] *= 0.75
        img += np.exp(-tc / 0.03) * 0.6
    else:
        # logo rotates into place, background goes blue
        k = u(t, T.CUTS + len(sets) * T.BEAT / 4, T.LOCK)
        img = news_bg(t, smooth(k))
        ang = lerp(np.radians(80), 0, back_out(k, 1.3))
        spr = bs9_full()
        q = quad_rot_y(CX, CY, spr.shape[1], spr.shape[0], ang)
        img = place_persp(img, spr, q)
        img += glow(img * 0.3 * k, 0.8)
    return img


# =========================================================================== news package
def globe_wire(lay, t, cx, cy, R, col):
    for lat in np.arange(-60, 61, 30):
        lon = np.linspace(0, 360, 90)
        P = ll2vec(np.full_like(lon, lat), lon + t * 12) @ rot_x(0.35).T
        m = P[:, 1] < 0.2
        pts = np.stack([cx + P[:, 0] * R, cy - P[:, 2] * R], -1)
        lay.poly(pts, col * 0.6, 1, True)
    for lon in np.arange(0, 180, 20):
        lat = np.linspace(-90, 90, 60)
        P = ll2vec(lat, np.full_like(lat, lon + t * 12)) @ rot_x(0.35).T
        pts = np.stack([cx + P[:, 0] * R, cy - P[:, 2] * R], -1)
        lay.poly(pts, col * 0.5, 1)
        P2 = ll2vec(lat, np.full_like(lat, lon + 180 + t * 12)) @ rot_x(0.35).T
        lay.poly(np.stack([cx + P2[:, 0] * R, cy - P2[:, 2] * R], -1), col * 0.5, 1)
    lay.circle((cx, cy), R, col * 0.9, max(1, int(2 * S)))


def light_sweep(img, a_mask, t, t0, dur=0.7, width=120):
    k = u(t, t0, t0 + dur)
    if k <= 0 or k >= 1:
        return img
    xs, ys = grid()
    pos = lerp(-400 * S, W + 400 * S, k)
    band = np.exp(-((xs + ys * 0.35 - pos) / (width * S)) ** 2)
    img += (band[..., None] * a_mask) * 0.8
    return img


TILES = [("LOCAL NEWS", "city"), ("POLITICS", "dome"), ("TRAFFIC", "road"),
         ("WEATHER", "sun"), ("COMMUNITY", "people"), ("SPORTS", "cricket")]


def tile_sprite(label, icon, t, w=520, h=250):
    w, h = int(w * S), int(h * S)
    im = np.zeros((h, w, 4), np.float32)
    # glass panel
    yy = np.linspace(0, 1, h)[:, None]
    im[..., 0] = 0.02 + 0.03 * (1 - yy)
    im[..., 1] = 0.10 + 0.10 * (1 - yy)
    im[..., 2] = 0.28 + 0.2 * (1 - yy)
    im[..., 3] = 0.92
    u8 = np.zeros((h, w, 3), np.uint8)
    c = (90, 200, 255)
    cv2.rectangle(u8, (1, 1), (w - 2, h - 2), c, max(1, int(2 * S)), cv2.LINE_AA)
    cv2.rectangle(u8, (0, 0), (int(10 * S), h), (255, 40, 55), -1)
    ix, iy = int(w * 0.78), int(h * 0.5)
    s = S * 0.8
    ph = t * 2
    if icon == "city":
        for k, (bx, bh) in enumerate([(-90, 60), (-60, 100), (-25, 80), (5, 130), (40, 70), (70, 105), (100, 55)]):
            cv2.rectangle(u8, (int(ix + bx * s), int(iy + 70 * s - bh * s)), (int(ix + (bx + 26) * s), int(iy + 70 * s)), c, 1, cv2.LINE_AA)
        if int(ph * 2) % 2:
            cv2.circle(u8, (int(ix + 18 * s), int(iy - 66 * s)), int(5 * s), (255, 60, 70), -1, cv2.LINE_AA)
    elif icon == "dome":
        cv2.ellipse(u8, (ix, int(iy - 5 * s)), (int(70 * s), int(60 * s)), 0, 180, 360, c, 2, cv2.LINE_AA)
        for k in range(7):
            x = int(ix - 80 * s + k * 26.6 * s)
            cv2.line(u8, (x, int(iy - 5 * s)), (x, int(iy + 60 * s)), c, 1, cv2.LINE_AA)
        cv2.line(u8, (int(ix - 95 * s), int(iy + 62 * s)), (int(ix + 95 * s), int(iy + 62 * s)), c, 2, cv2.LINE_AA)
        cv2.line(u8, (ix, int(iy - 65 * s)), (ix, int(iy - 95 * s)), c, 1, cv2.LINE_AA)
    elif icon == "road":
        cv2.line(u8, (int(ix - 30 * s), int(iy - 70 * s)), (int(ix - 110 * s), int(iy + 75 * s)), c, 2, cv2.LINE_AA)
        cv2.line(u8, (int(ix + 30 * s), int(iy - 70 * s)), (int(ix + 110 * s), int(iy + 75 * s)), c, 2, cv2.LINE_AA)
        for k in range(5):
            f = ((k / 5 + ph * 0.5) % 1)
            y = iy - 70 * s + f * 145 * s
            cv2.line(u8, (ix, int(y)), (ix, int(y + 12 * s * (0.3 + f))), (255, 255, 255), 2, cv2.LINE_AA)
            cv2.circle(u8, (int(ix - 50 * s * f - 10 * s), int(y)), max(1, int(5 * s * (0.4 + f))), (255, 50, 60), -1, cv2.LINE_AA)
    elif icon == "sun":
        cv2.circle(u8, (int(ix - 30 * s), int(iy - 15 * s)), int(32 * s), (80, 200, 255), 2, cv2.LINE_AA)
        for k in range(10):
            a = k * 0.628 + ph * 0.5
            p0 = (int(ix - 30 * s + np.cos(a) * 42 * s), int(iy - 15 * s + np.sin(a) * 42 * s))
            p1 = (int(ix - 30 * s + np.cos(a) * 58 * s), int(iy - 15 * s + np.sin(a) * 58 * s))
            cv2.line(u8, p0, p1, (80, 200, 255), 2, cv2.LINE_AA)
        cv2.ellipse(u8, (int(ix + 30 * s), int(iy + 30 * s)), (int(60 * s), int(30 * s)), 0, 180, 360, (255, 255, 255), 2, cv2.LINE_AA)
        cv2.line(u8, (int(ix - 30 * s), int(iy + 30 * s)), (int(ix + 90 * s), int(iy + 30 * s)), (255, 255, 255), 2, cv2.LINE_AA)
    elif icon == "people":
        for k in range(5):
            x = int(ix - 90 * s + k * 45 * s)
            y = int(iy + (10 if k % 2 else -5) * s)
            cv2.circle(u8, (x, int(y - 30 * s)), int(14 * s), c, 2, cv2.LINE_AA)
            cv2.ellipse(u8, (x, int(y + 25 * s)), (int(24 * s), int(30 * s)), 0, 180, 360, c, 2, cv2.LINE_AA)
    elif icon == "cricket":
        a = 0.4 * np.sin(ph * 2)
        p0 = (int(ix - 40 * s), int(iy + 70 * s))
        p1 = (int(ix - 40 * s + np.sin(a) * 140 * s), int(iy + 70 * s - np.cos(a) * 140 * s))
        cv2.line(u8, p0, p1, (255, 255, 255), max(1, int(9 * s)), cv2.LINE_AA)
        bx = int(ix + 60 * s + 20 * s * np.sin(ph * 3))
        cv2.circle(u8, (bx, int(iy - 10 * s)), int(20 * s), (255, 50, 60), -1, cv2.LINE_AA)
        cv2.ellipse(u8, (bx, int(iy - 10 * s)), (int(8 * s), int(20 * s)), 0, 0, 360, (255, 255, 255), 1, cv2.LINE_AA)
    lay = u8.astype(np.float32)[..., ::-1] / 255
    lay = lay[..., ::-1]
    m = lay.max(axis=2, keepdims=True)
    im[..., :3] = im[..., :3] * (1 - m) + lay
    txt = text_rgba(label, "Rajdhani-Bold.ttf", 40, None, 2, (1, 1, 1))
    th_, tw_ = txt.shape[:2]
    y0, x0 = int(h * 0.5 - th_ / 2), int(34 * S)
    reg = im[y0:y0 + th_, x0:x0 + tw_]
    a = txt[..., 3:4][:reg.shape[0], :reg.shape[1]]
    reg[..., :3] = reg[..., :3] * (1 - a) + a
    return im


def lower_third(img, t):
    k = ease_out(u(t, T.LOWER3, T.LOWER3 + 0.45))
    out = ease_in(u(t, T.STINGER, T.STINGER + 0.35))
    if k <= 0 or out >= 1:
        return img
    y = 835 * S
    x_shift = (1 - k) * -W + out * W
    lay = Layer()
    # red block
    red_w = 470 * S
    lay.fillpoly(np.array([[80 * S + x_shift, y], [80 * S + red_w + x_shift, y], [80 * S + red_w + x_shift + 30 * S, y + 90 * S],
                           [80 * S + x_shift, y + 90 * S]]), RED)
    lay.fillpoly(np.array([[80 * S + red_w + 40 * S + x_shift * 1.2, y], [W - 80 * S + x_shift * 1.2, y],
                           [W - 80 * S + x_shift * 1.2, y + 90 * S], [80 * S + red_w + 70 * S + x_shift * 1.2, y + 90 * S]]),
                 np.array([0.96, 0.97, 1.0]))
    img = np.where(lay.im.max(axis=2, keepdims=True) > 0, lay.f(1.0), img)
    bn = text_rgba("BREAKING NEWS", "Anton-Regular.ttf", 58, None, 2, (1, 1, 1))
    img = place(img, bn, 80 * S + red_w / 2 + x_shift, y + 46 * S, 1.0, 1.0)
    head = text_rgba("RAJKOT  •  GUJARAT   |   LOCAL NEWS  24×7", "Rajdhani-Bold.ttf", 50, None, 1, (0.02, 0.08, 0.3))
    img = place(img, head, 80 * S + red_w + 70 * S + head.shape[1] / 2 + 10 * S + x_shift * 1.2, y + 46 * S, 1.0, 1.0)
    # ticker
    ty = 960 * S
    bar = np.zeros_like(img)
    band = slice(int(ty), int(ty + 56 * S))
    img[band] = img[band] * (1 - k * (1 - out)) + np.array([0.0, 0.04, 0.18]) * k * (1 - out)
    tick = text_rgba("LOCAL NEWS  •  TRAFFIC  •  WEATHER  •  COMMUNITY  •  POLITICS  •  SPORTS  •  BS9 NEWS  •  RAJKOT  •  ",
                     "Rajdhani-Bold.ttf", 36, None, 2, (1, 1, 1))
    tw = tick.shape[1]
    off = ((t - T.LOWER3) * 260 * S) % tw
    for rep in range(3):
        img = place(img, tick, W - off + rep * tw - tw / 2 + 200 * S, ty + 28 * S, 1.0, k * (1 - out))
    lay2 = Layer()
    lay2.fillpoly(np.array([[0, ty], [210 * S, ty], [210 * S, ty + 56 * S], [0, ty + 56 * S]]), RED * k * (1 - out))
    img = np.where(lay2.im.max(axis=2, keepdims=True) > 0, lay2.f(1.0), img)
    bs = text_rgba("BS9 NEWS", "Anton-Regular.ttf", 36, None, 2, (1, 1, 1))
    img = place(img, bs, 105 * S, ty + 28 * S, 1.0, k * (1 - out))
    return img


def live_bug(img, t, a):
    if a <= 0:
        return img
    lay = Layer()
    blink = 1.0 if int(t * 2) % 2 == 0 else 0.35
    lay.fillpoly(np.array([[70 * S, 60 * S], [230 * S, 60 * S], [230 * S, 116 * S], [70 * S, 116 * S]]), RED * a)
    lay.circle((98 * S, 88 * S), 10 * S, np.ones(3) * blink * a, fill=True)
    img = np.where(lay.im.max(axis=2, keepdims=True) > 0, lay.f(1.0), img)
    tx = text_rgba("LIVE", "Anton-Regular.ttf", 40, None, 3, (1, 1, 1))
    img = place(img, tx, 165 * S, 88 * S, 1.0, a)
    co = text_rgba("RAJKOT  22.30°N  70.80°E", "Rajdhani-SemiBold.ttf", 30, None, 2, (0.8, 0.9, 1.0))
    img = place(img, co, W - 80 * S - co.shape[1] / 2, 88 * S, 1.0, a)
    return img


def scene_news(t, fr):
    img = news_bg(t)
    beat = beat_pulse(t, T.LOCK, T.BEAT, 0.12)
    # rotating globe behind
    lay = Layer()
    gpos = ease_inout(u(t, T.WALL - 0.4, T.WALL + 0.3)) * (1 - ease_inout(u(t, T.LOWER3 - 0.4, T.LOWER3 + 0.2)))
    globe_wire(lay, t, CX, lerp(CY, CY + 40 * S, gpos), lerp(430, 700, gpos) * S, CYAN * (0.35 - 0.15 * gpos))
    img = lay.add_to(img, 1.0, 0.6)
    # horizontal streaks / flares
    xs, ys = grid()
    for j in range(3):
        yl = (250 + 290 * j) * S + 40 * S * np.sin(t + j)
        img += (np.exp(-((ys - yl) / (2.5 * S)) ** 2) * 0.12 * (0.5 + 0.5 * np.sin(t * 2 + j * 2)))[..., None] * CYAN
    # logo placement across the package
    if t < T.WALL:
        k = 0.0
    elif t < T.LOWER3:
        k = ease_inout(u(t, T.WALL - 0.2, T.WALL + 0.4))
    else:
        k = 1 - ease_inout(u(t, T.LOWER3 - 0.3, T.LOWER3 + 0.3))
    k2 = ease_inout(u(t, T.LOWER3 - 0.3, T.LOWER3 + 0.3)) * (1 - ease_inout(u(t, T.STINGER, T.STINGER + 0.4)))
    sc = lerp(1.0, 0.34, k) * lerp(1.0, 0.72, k2) * (1 + 0.025 * beat)
    ly = lerp(CY, 150 * S, k)
    ly = lerp(ly, CY - 110 * S, k2)
    if t >= T.STINGER:
        ks = u(t, T.STINGER, T.NEWS_END - 0.5)
        sc = lerp(0.72, 1.12, back_out(u(t, T.STINGER, T.STINGER + 0.5), 1.8)) + 0.06 * ks
        ly = CY
    spr = bs9_full()
    # backing glow
    img += np.exp(-(radial(CX, ly) * (3.2 / max(sc, 0.3))) ** 2)[..., None] * np.array([0.3, 0.6, 1.0]) * 0.6
    rgb, a = place(None, spr, CX, ly + 6 * S * np.sin(t * 2), sc, 1.0, return_layer=True)
    img = img * (1 - a) + rgb
    for t0 in (T.LOCK + 0.3, T.LOCK + 2.3, T.LOWER3 + 0.5, T.STINGER + 0.2, T.STINGER + 1.3):
        img = light_sweep(img, a, t, t0)
    # video wall of local beats
    if T.WALL - 0.1 <= t < T.LOWER3 + 0.3:
        out = ease_in(u(t, T.LOWER3 - 0.35, T.LOWER3 + 0.2))
        for i, (label, icon) in enumerate(TILES):
            t_in = T.WALL + i * T.BEAT
            kin = u(t, t_in, t_in + 0.35)
            if kin <= 0:
                continue
            col, row = i % 3, i // 3
            cx = CX + (col - 1) * 560 * S
            cy = 470 * S + row * 290 * S + out * (row * 2 - 1) * 900 * S
            ang = lerp(np.pi / 2, 0, back_out(kin, 1.5))
            spr_t = tile_sprite(label, icon, t)
            img = place_persp(img, spr_t, quad_rot_y(cx, cy, spr_t.shape[1], spr_t.shape[0], ang), 1.0)
    img = lower_third(img, t)
    img = live_bug(img, t, smooth(u(t, T.LOCK + 1.0, T.LOCK + 1.4)) * (1 - smooth(u(t, T.STINGER, T.STINGER + 0.3))))
    # stinger flash + zoom blur exit
    img += pulse(t, T.LOCK, 0.12) * 1.6 + pulse(t, T.STINGER, 0.12) * 1.4 + pulse(t, T.NEWS_END - 0.5, 0.1) * 1.8
    if t > T.NEWS_END - 0.45:
        k = u(t, T.NEWS_END - 0.45, T.NEWS_END)
        acc = img.copy()
        for j in range(1, 6):
            acc += transform(img, 1 + 0.06 * k * j)
        img = acc / 6 * (1 - ease_in(k, 2))
    return img


# =========================================================================== dispatcher
def render(t, fr):
    if t < T.CITY:
        return scene_zoom(t, fr)
    if t < T.FRACT:
        return scene_city(t, fr)
    if t < T.COLLIDE:
        return scene_fractal(t, fr)
    if t < T.GLOW:
        return scene_collide(t, fr)
    if t < T.CUTS:
        return scene_glow(t, fr)
    if t < T.LOCK:
        return scene_cuts(t, fr)
    return scene_news(t, fr)
