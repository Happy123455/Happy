"""v2 rendering engine: crisp vector drawing (cairo), editorial type (PIL/raqm),
logo sprites from 4K vector renders, the hero spark, and film finishing."""
import os
import json
import functools
import numpy as np
import cv2
import cairo
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, "assets")
VEC = os.path.join(HERE, "..", "motion", "assets", "vector")

W = int(os.environ.get("MG_W", 1920))
H = int(os.environ.get("MG_H", 1080))
S = W / 1920.0
CX, CY = W / 2, H / 2
FPS = 30

# ------------------------------------------------------------------ palette (strict)
BG = np.array([0.030, 0.028, 0.026], np.float32)
INK = np.array([0.94, 0.92, 0.88], np.float32)
MUTE = INK * 0.38
FAINT = INK * 0.14
SAFFRON = np.array([1.0, 0.40, 0.08], np.float32)
BLUE = np.array([0.16, 0.48, 1.0], np.float32)
RED = np.array([0.93, 0.16, 0.20], np.float32)
GREEN = np.array([0.20, 0.86, 0.44], np.float32)
YELLOW = np.array([0.98, 0.74, 0.10], np.float32)
SPARK = np.array([1.0, 0.82, 0.55], np.float32)

CUES = json.load(open(os.path.join(A, "cues.json")))
BEATS = np.array(CUES["beats"])


# ------------------------------------------------------------------ easing
def clamp(x, a=0.0, b=1.0):
    return float(min(max(x, a), b))


def u(t, a, b):
    return clamp((t - a) / (b - a))


def smooth(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def eo(x, p=3):
    return 1 - (1 - clamp(x)) ** p


def ei(x, p=3):
    return clamp(x) ** p


def eio(x):
    x = clamp(x)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def expo_out(x):
    x = clamp(x)
    return 1 - 2 ** (-10 * x) if x < 1 else 1.0


def back(x, s=1.4):
    x = clamp(x) - 1
    return x * x * ((s + 1) * x + s) + 1


def lerp(a, b, x):
    return a + (b - a) * x


def beat_env(t, decay=0.16, t0=0.0, t1=1e9):
    """1.0 on every detected beat, decaying."""
    if t < t0 or t > t1:
        return 0.0
    i = np.searchsorted(BEATS, t) - 1
    if i < 0:
        return 0.0
    return float(np.exp(-(t - BEATS[i]) / decay))


def beat_index(t):
    return int(np.searchsorted(BEATS, t))


def pulse(t, t0, d=0.2):
    return 0.0 if t < t0 else float(np.exp(-(t - t0) / d))


def window(t, a, b, fin=0.25, fout=0.25):
    return smooth(u(t, a, a + fin)) * (1 - smooth(u(t, b - fout, b)))


# ------------------------------------------------------------------ frame
def new_frame():
    img = np.empty((H, W, 3), np.float32)
    img[:] = BG
    return img


_grid = None


def grid():
    global _grid
    if _grid is None:
        ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
        _grid = (xs, ys)
    return _grid


def rdist(cx, cy):
    xs, ys = grid()
    return np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2)


# ------------------------------------------------------------------ cairo vector layer
class Vec:
    """A transparent cairo surface; draw in design px (1920x1080 space)."""

    def __init__(self):
        self.surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
        self.c = cairo.Context(self.surf)
        self.c.scale(S, S)
        self.c.set_line_cap(cairo.LINE_CAP_ROUND)
        self.c.set_line_join(cairo.LINE_JOIN_ROUND)

    def _src(self, col, a=1.0):
        col = np.clip(np.asarray(col, float), 0, 1)
        self.c.set_source_rgba(col[0], col[1], col[2], clamp(a))

    def line(self, p, q, col, w=1.0, a=1.0, dash=None):
        self.c.move_to(*p)
        self.c.line_to(*q)
        self.stroke(col, w, a, dash)

    def poly(self, pts, col, w=1.0, a=1.0, closed=False, dash=None, fill=None, fill_a=1.0):
        pts = np.asarray(pts, float)
        if len(pts) < 2:
            return
        self.c.move_to(*pts[0])
        for p in pts[1:]:
            self.c.line_to(*p)
        if closed:
            self.c.close_path()
        if fill is not None:
            self._src(fill, fill_a)
            self.c.fill_preserve()
        if w > 0:
            self.stroke(col, w, a, dash)
        else:
            self.c.new_path()

    def circle(self, c, r, col, w=1.0, a=1.0, fill=False, dash=None, a0=0.0, a1=2 * np.pi):
        self.c.new_sub_path()
        self.c.arc(c[0], c[1], max(r, 0.01), a0, a1)
        if fill:
            self._src(col, a)
            self.c.fill()
        else:
            self.stroke(col, w, a, dash)

    def rect(self, x, y, w_, h_, col, a=1.0, fill=True, w=1.0):
        self.c.rectangle(x, y, w_, h_)
        if fill:
            self._src(col, a)
            self.c.fill()
        else:
            self.stroke(col, w, a)

    def stroke(self, col, w, a=1.0, dash=None):
        self._src(col, a)
        self.c.set_line_width(w)
        self.c.set_dash(dash or [])
        self.c.stroke()

    def rgba(self):
        buf = np.ndarray((H, W, 4), np.uint8, self.surf.get_data(), strides=(self.surf.get_stride(), 4, 1))
        f = buf.astype(np.float32) / 255.0
        return f[..., [2, 1, 0]], f[..., 3:4]  # premultiplied rgb, alpha

    def over(self, img, gain=1.0):
        rgb, a = self.rgba()
        img *= 1 - a
        img += rgb * gain
        return img

    def add(self, img, gain=1.0, glow_amt=0.0):
        rgb, a = self.rgba()
        img += rgb * gain
        if glow_amt:
            img += bloom_of(rgb, glow_amt)
        return img


def bloom_of(src, amt, radii=(3, 9, 24), weights=(0.5, 0.35, 0.25)):
    small = cv2.resize(src, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
    acc = np.zeros_like(small)
    for r, w in zip(radii, weights):
        acc += cv2.GaussianBlur(small, (0, 0), r * S) * w
    return cv2.resize(acc, (W, H), interpolation=cv2.INTER_LINEAR) * amt


# ------------------------------------------------------------------ type
FONTS = {
    "sans": ("InterTight.ttf", 800), "sans_med": ("InterTight.ttf", 500), "sans_reg": ("InterTight.ttf", 400),
    "black": ("Archivo.ttf", 900), "mono": ("JetBrainsMono.ttf", 500), "mono_b": ("JetBrainsMono.ttf", 700),
    "serif": ("InstrumentSerif-Italic.ttf", None), "serif_r": ("InstrumentSerif-Regular.ttf", None),
    "guj": ("AnekGujarati.ttf", 700), "guj_light": ("AnekGujarati.ttf", 400), "guj_serif": ("NotoSerifGujarati.ttf", 500),
}


@functools.lru_cache(maxsize=64)
def _font(key, px):
    fname, wght = FONTS[key]
    f = ImageFont.truetype(os.path.join(A, "fonts", fname), max(4, int(px)), layout_engine=ImageFont.Layout.RAQM)
    if wght is not None:
        axes = f.get_variation_axes()
        vals = []
        for ax in axes:
            n = ax.get("name", b"")
            n = n.decode() if isinstance(n, bytes) else str(n)
            vals.append(wght if "eight" in n or n.lower().startswith("w") and "idth" not in n else ax["default"])
        try:
            f.set_variation_by_axes(vals)
        except Exception:
            pass
    return f


@functools.lru_cache(maxsize=512)
def text_sprite(s, key, size, tracking=0.0):
    """White text alpha mask (float32), rendered at final pixel size."""
    px = size * S
    f = _font(key, px)
    if tracking:
        widths = [f.getlength(ch) for ch in s]
        total = int(sum(widths) + tracking * px * (len(s) - 1) + px)
        asc, desc = f.getmetrics()
        im = Image.new("L", (total, asc + desc + int(px * 0.6)), 0)
        d = ImageDraw.Draw(im)
        x = px * 0.3
        for ch, w in zip(s, widths):
            d.text((x, px * 0.3), ch, font=f, fill=255)
            x += w + tracking * px
    else:
        l, t_, r, b = f.getbbox(s)
        pad = int(px * 0.3)
        im = Image.new("L", (r - l + 2 * pad, b - t_ + 2 * pad), 0)
        ImageDraw.Draw(im).text((pad - l, pad - t_), s, font=f, fill=255)
    a = np.asarray(im).astype(np.float32) / 255
    ys, xs = np.where(a > 0.004)
    if len(xs):
        a = a[max(0, ys.min() - 2):ys.max() + 3, max(0, xs.min() - 2):xs.max() + 3]
    return a


def put_alpha(img, alpha_spr, x, y, col, a=1.0, anchor="lm", scale=1.0, blur=0.0, add=False):
    """Composite a single-channel sprite tinted with col. (x, y) in design px."""
    if a <= 0.003:
        return img
    spr = alpha_spr
    if scale != 1.0:
        spr = cv2.resize(spr, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC)
    if blur > 0.3:
        k = blur * S
        spr = cv2.GaussianBlur(np.pad(spr, int(k * 3) + 1), (0, 0), k)
    h, w = spr.shape
    px, py = x * S, y * S
    ox = {"l": 0, "m": w / 2, "r": w}[anchor[0]]
    oy = {"t": 0, "m": h / 2, "b": h}[anchor[1]]
    x0, y0 = int(round(px - ox)), int(round(py - oy))
    xa, ya = max(0, x0), max(0, y0)
    xb, yb = min(W, x0 + w), min(H, y0 + h)
    if xa >= xb or ya >= yb:
        return img
    m = spr[ya - y0:yb - y0, xa - x0:xb - x0, None] * a
    reg = img[ya:yb, xa:xb]
    if add:
        reg += m * np.asarray(col, np.float32)
    else:
        reg *= 1 - m
        reg += m * np.asarray(col, np.float32)
    return img


def text(img, s, x, y, key="sans", size=60, col=INK, a=1.0, anchor="lm", tracking=0.0, blur=0.0, add=False):
    return put_alpha(img, text_sprite(s, key, size, tracking), x, y, col, a, anchor, 1.0, blur, add)


def text_w(s, key, size, tracking=0.0):
    return text_sprite(s, key, size, tracking).shape[1] / S


def words(img, t, t0, items, x, y, key="sans", size=80, gap=0.28, stagger=0.09, dur=0.35, col=INK,
          a=1.0, anchor_x="l", rise=26, blur=6.0):
    """Kinetic line: items is a list of (word, color|None, start_offset|None). Words slide up and unblur."""
    sp = size * 0.24
    widths = [text_w(w_[0], key, size) for w_ in items]
    total = sum(widths) + sp * (len(items) - 1)
    cx0 = x - (total / 2 if anchor_x == "m" else (total if anchor_x == "r" else 0))
    cur = cx0
    for i, (wd, c, off) in enumerate(items):
        st = t0 + (off if off is not None else i * stagger)
        k = eo(u(t, st, st + dur), 4)
        if k > 0:
            text(img, wd, cur, y + rise * (1 - k), key, size, c if c is not None else col, a * k, "lm",
                 blur=blur * (1 - k))
        cur += widths[i] + sp
    return img


# ------------------------------------------------------------------ logos (from vector renders)
LOGO_FILES = {"k_eng": "khodaldham_english_4k.png", "k_guj": "khodaldham_gujarati_4k.png",
              "k_med": "khodaldham_medallion_4k.png", "bs9": "bs9_news_4k.png", "way": "wayonaa_4k.png"}


@functools.lru_cache(maxsize=8)
def logo_full(name):
    im = cv2.imread(os.path.join(VEC, LOGO_FILES[name]), cv2.IMREAD_UNCHANGED).astype(np.float32) / 255
    rgb = im[..., [2, 1, 0]]
    a = im[..., 3:4]
    if name == "bs9":  # NEWS caption -> white for dark backgrounds
        lum = rgb.mean(axis=2, keepdims=True)
        sat = rgb.max(axis=2, keepdims=True) - rgb.min(axis=2, keepdims=True)
        hh, ww = lum.shape[:2]
        yy, xx = np.mgrid[0:hh, 0:ww]
        cand = ((sat[..., 0] < 0.15) & (a[..., 0] > 0.3)).astype(np.uint8)
        n, lab, st, _ = cv2.connectedComponentsWithStats(cand)
        keep = np.zeros(n, bool)
        for i in range(1, n):
            x_, y_, w_, h_, ar = st[i]
            keep[i] = h_ < 0.12 * hh and y_ > 0.70 * hh and x_ > 0.45 * ww
        dark = cv2.dilate(keep[lab].astype(np.uint8), np.ones((3, 3), np.uint8)).astype(np.float32)[..., None]
        rgb = rgb * (1 - dark) + INK * dark
    if name in ("way", "k_eng", "k_guj"):
        # crisp vector alpha, but colours from the smooth original raster (keeps the gradients)
        src = cv2.imread(os.path.join(HERE, "..", "motion", "assets", "logos",
                                      {"way": "wayonaa.png", "k_eng": "khodal_eng.png", "k_guj": "khodal_guj.png"}[name]),
                         cv2.IMREAD_UNCHANGED).astype(np.float32) / 255
        src = cv2.resize(src, (im.shape[1], im.shape[0]), interpolation=cv2.INTER_CUBIC)
        sa = np.clip(src[..., 3:4], 0, 1)
        pm = src[..., [2, 1, 0]] * sa
        k = 6
        num = cv2.GaussianBlur(pm, (0, 0), k)
        den = cv2.GaussianBlur(sa, (0, 0), k)[..., None]
        smooth_rgb = np.clip(num / np.maximum(den, 1e-3), 0, 1)
        if name == "way":
            # wordmark stays pure white; chevrons get smooth gradients; tagline is re-set in type
            rgb = np.where(rgb.min(axis=2, keepdims=True) > 0.8, rgb, smooth_rgb)
            hh, ww = a.shape[:2]
            cut = int(0.80 * hh)
            a = a.copy()
            a[cut:, int(0.3 * ww):] = 0
            f = ImageFont.truetype(os.path.join(HERE, "..", "motion", "assets", "fonts", "Montserrat.ttf"), int(hh * 0.085))
            try:
                f.set_variation_by_axes([650])
            except Exception:
                pass
            tag = Image.new("L", (ww, hh - cut), 0)
            dd = ImageDraw.Draw(tag)
            msg = "THE SMART WAY TO MOVE"
            tw = dd.textlength(msg, font=f) + 0.09 * f.size * (len(msg) - 1)
            x = 0.657 * ww - tw / 2
            for ch in msg:
                dd.text((x, (hh - cut) * 0.12), ch, font=f, fill=255)
                x += dd.textlength(ch, font=f) + 0.09 * f.size
            ta = np.asarray(tag).astype(np.float32)[..., None] / 255
            a[cut:] = np.maximum(a[cut:], ta)
            rgb[cut:] = np.where(ta > 0, np.array([0.93, 0.78, 0.36], np.float32), rgb[cut:])
        else:
            rgb = smooth_rgb
    return np.concatenate([rgb * a, a], axis=2)  # premultiplied


@functools.lru_cache(maxsize=64)
def logo_at(name, width_px):
    im = logo_full(name)
    sc = width_px / im.shape[1]
    return cv2.resize(im, (max(1, int(im.shape[1] * sc)), max(1, int(im.shape[0] * sc))), interpolation=cv2.INTER_AREA)


def logo(img, name, cx, cy, width, a=1.0, mask=None, tint=None, rot=0.0, add=False, scale_y=1.0):
    """width in design px. mask: optional function(xs_local, ys_local)->[0,1] (full-frame)."""
    if a <= 0.003 or width < 2:
        return img
    wpx = int(round(width * S / 4)) * 4
    spr = logo_at(name, max(4, wpx))
    h, w = spr.shape[:2]
    if rot != 0.0 or scale_y != 1.0:
        M = cv2.getRotationMatrix2D((w / 2, h / 2), rot, 1.0)
        M[1] *= scale_y
        M[1, 2] += h * (1 - scale_y) / 2
        spr = cv2.warpAffine(spr, M, (w, h), flags=cv2.INTER_LINEAR)
    x0, y0 = int(round(cx * S - w / 2)), int(round(cy * S - h / 2))
    xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x0 + w), min(H, y0 + h)
    if xa >= xb or ya >= yb:
        return img
    s = spr[ya - y0:yb - y0, xa - x0:xb - x0]
    rgb, al = s[..., :3] * a, s[..., 3:4] * a
    if mask is not None:
        m = mask[ya:yb, xa:xb, None]
        rgb, al = rgb * m, al * m
    if tint is not None:
        rgb = al * np.asarray(tint, np.float32)
    reg = img[ya:yb, xa:xb]
    if add:
        reg += rgb
    else:
        reg *= 1 - al
        reg += rgb
    return img


def logo_height(name, width):
    im = logo_full(name)
    return width * im.shape[0] / im.shape[1]


# ------------------------------------------------------------------ vector outlines of the logos
@functools.lru_cache(maxsize=8)
def logo_outline(name):
    """Polylines (in normalised 0..1 width units) of every traced contour of the logo SVG."""
    import re
    svg = {"k_eng": "khodaldham_english.svg", "k_guj": "khodaldham_gujarati.svg", "bs9": "bs9_news.svg",
           "way": "wayonaa.svg"}[name]
    txt = open(os.path.join(VEC, svg)).read()
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', txt).group(1).split()]
    polys = []
    for d in re.findall(r' d="([^"]+)"', txt):
        for sub in d.split("M")[1:]:
            toks = re.findall(r"[LCZ]|-?\d+\.?\d*", "M" + sub)
            pts = []
            i = 0
            cur = None
            mode = "M"
            nums = []
            for tk in toks[1:] if toks and toks[0] == "M" else toks:
                if tk in "LCZ":
                    mode = tk
                    if tk == "Z" and pts:
                        pts.append(pts[0])
                    continue
                nums.append(float(tk))
                if mode == "M" and len(nums) == 2:
                    cur = np.array(nums)
                    pts.append(cur)
                    nums = []
                elif mode == "L" and len(nums) == 2:
                    cur = np.array(nums)
                    pts.append(cur)
                    nums = []
                elif mode == "C" and len(nums) == 6:
                    p1, p2, p3 = np.array(nums[0:2]), np.array(nums[2:4]), np.array(nums[4:6])
                    for s_ in np.linspace(0.25, 1, 4):
                        pts.append((1 - s_) ** 3 * cur + 3 * (1 - s_) ** 2 * s_ * p1 + 3 * (1 - s_) * s_ ** 2 * p2 + s_ ** 3 * p3)
                    cur = p3
                    nums = []
            if len(pts) > 3:
                p = np.array(pts) / vb[2]
                polys.append(p)
    # keep the meaningful contours, sorted left->right for a writing order
    polys = [p for p in polys if np.ptp(p[:, 0]) + np.ptp(p[:, 1]) > 0.012]
    polys.sort(key=lambda p: p[:, 0].min())
    return polys, vb[3] / vb[2]


def draw_outline(v, name, cx, cy, width, k, col, w=1.4, a=1.0):
    """Write the logo's outline progressively (k 0..1). Returns the pen tip position (design px)."""
    polys, aspect = logo_outline(name)
    lens = np.array([np.sum(np.hypot(*np.diff(p, axis=0).T)) for p in polys])
    total = lens.sum()
    # contours are written in parallel groups for speed while the tip follows the main one
    budget = k * total
    tip = None
    ox, oy = cx - width / 2, cy - width * aspect / 2
    done = 0.0
    n_par = 6
    order = np.argsort([p[:, 0].min() for p in polys])
    groups = [order[i::n_par] for i in range(n_par)]
    for gi, g in enumerate(groups):
        gl = lens[g]
        gk = k * gl.sum()
        for idx in g:
            p = polys[idx]
            L = lens[idx]
            if gk <= 0:
                break
            seg = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(p, axis=0).T))])
            m = seg <= gk
            q = p[m]
            if gk < L and m.sum() < len(p):
                j = m.sum()
                f = (gk - seg[j - 1]) / max(seg[j] - seg[j - 1], 1e-9)
                q = np.vstack([q, p[j - 1] + (p[j] - p[j - 1]) * f])
                if gi == 0:
                    tip = (ox + q[-1, 0] * width, oy + q[-1, 1] * width)
            v.poly(np.stack([ox + q[:, 0] * width, oy + q[:, 1] * width], -1), col, w, a)
            gk -= L
    return tip


# ------------------------------------------------------------------ the hero spark
def spark(img, x, y, t, size=1.0, col=SPARK, a=1.0, trail=None, flicker=True):
    """Bright core + tight halo + soft bloom, in design px. trail: list of (x, y) older positions."""
    if a <= 0.003 or size <= 0.02:
        return img
    fl = 1.0 + (0.08 * np.sin(t * 31.0) + 0.05 * np.sin(t * 57.0 + 1.3) if flicker else 0)
    col = np.asarray(col, np.float32)
    px, py = x * S, y * S
    r = 4.5 * S * size
    R = int(r * 30) + 4
    x0, y0 = int(px) - R, int(py) - R
    xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x0 + 2 * R), min(H, y0 + 2 * R)
    if xa < xb and ya < yb:
        ys, xs = np.mgrid[ya:yb, xa:xb].astype(np.float32)
        d = np.sqrt((xs - px) ** 2 + (ys - py) ** 2)
        core = np.exp(-(d / r) ** 2 * 1.6)
        halo = np.exp(-d / (r * 2.6)) * 0.55
        bloom = np.exp(-d / (r * 11)) * 0.16
        val = (core * 2.4 + halo + bloom) * a * fl
        hot = core[..., None] * np.array([1.0, 1.0, 1.0]) * 1.2 * a
        img[ya:yb, xa:xb] += val[..., None] * col + hot
    if trail:
        v = Vec()
        pts = [(x, y)] + list(trail)
        for i in range(len(pts) - 1):
            f = 1 - i / len(pts)
            v.line(pts[i], pts[i + 1], col, 2.2 * size * f, a * 0.85 * f)
        img = v.add(img, 1.0, 0.6)
    return img


# ------------------------------------------------------------------ frame furniture (consistent across the film)
def furniture(img, t, label, accent=SAFFRON, a=1.0):
    if a <= 0:
        return img
    v = Vec()
    m, L = 34, 22
    for (x, y, dx, dy) in [(m, m, 1, 1), (1920 - m, m, -1, 1), (m, 1080 - m, 1, -1), (1920 - m, 1080 - m, -1, -1)]:
        v.line((x, y), (x + dx * L, y), INK, 1.2, 0.45 * a)
        v.line((x, y), (x, y + dy * L), INK, 1.2, 0.45 * a)
    img = v.over(img)
    text(img, label, 70, 58, "mono", 15, MUTE, a, tracking=0.12)
    tc = f"{int(t // 60):02d}:{int(t % 60):02d}:{int((t % 1) * FPS):02d}"
    text(img, tc, 1850, 58, "mono", 15, MUTE, a, anchor="rm", tracking=0.12)
    text(img, "NAVRATRI 2026", 70, 1022, "mono", 15, MUTE, a, tracking=0.12)
    text(img, "22.30°N  70.80°E", 1850, 1022, "mono", 15, MUTE, a, anchor="rm", tracking=0.12)
    return img


# ------------------------------------------------------------------ finishing
_grain = None


def finish(img, fr, grain=0.022, vig=0.42):
    global _grain
    if _grain is None:
        rng = np.random.default_rng(5)
        _grain = [cv2.GaussianBlur(rng.standard_normal((H, W)).astype(np.float32), (0, 0), 0.6 * S + 0.2) for _ in range(6)]
    # gentle bloom of highlights
    hi = np.maximum(img - 0.75, 0)
    img = img + bloom_of(hi, 0.55)
    d = rdist(CX, CY) / (0.62 * np.hypot(W, H))
    img = img * (1 - vig * np.clip(d, 0, 1) ** 2.2)[..., None]
    lum = img.mean(axis=2, keepdims=True)
    img = img + _grain[fr % 6][..., None] * grain * (0.35 + 0.65 * np.exp(-lum * 2.5))
    k = 0.86
    img = np.where(img < k, img, k + (1 - k) * (1 - np.exp(-(img - k) / (1 - k))))
    img = np.clip(img, 0, 1) ** (1 / 1.0)
    return (img * 255 + 0.5).astype(np.uint8)
