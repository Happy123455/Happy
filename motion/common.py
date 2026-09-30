"""Shared rendering helpers: canvas, easing, glow, particles, text, logos, 3D."""
import os
import functools
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets")

W = int(os.environ.get("MG_W", 1920))
H = int(os.environ.get("MG_H", 1080))
S = W / 1920.0  # layout designed at 1920 wide
CX, CY = W / 2, H / 2


# ---------------------------------------------------------------- easing
def clamp01(x):
    return np.clip(x, 0.0, 1.0)


def u(t, a, b):
    """Normalised progress of t through [a, b], clamped."""
    return float(clamp01((t - a) / (b - a)))


def smooth(x):
    x = clamp01(x)
    return x * x * (3 - 2 * x)


def ease_out(x, p=3):
    return 1 - (1 - clamp01(x)) ** p


def ease_in(x, p=3):
    return clamp01(x) ** p


def ease_inout(x):
    x = clamp01(x)
    return np.where(x < 0.5, 4 * x ** 3, 1 - (-2 * x + 2) ** 3 / 2) if np.ndim(x) else (4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2)


def back_out(x, s=1.7):
    x = clamp01(x) - 1
    return x * x * ((s + 1) * x + s) + 1


def elastic_out(x):
    x = clamp01(x)
    return 2 ** (-10 * x) * np.sin((x * 10 - 0.75) * (2 * np.pi / 3)) + 1 if 0 < x < 1 else x


def lerp(a, b, x):
    return a + (b - a) * x


def pulse(t, t0, decay=0.25):
    """1 at t0 decaying afterwards, 0 before."""
    if t < t0:
        return 0.0
    return float(np.exp(-(t - t0) / decay))


def beat_pulse(t, start, period=0.5, decay=0.12):
    if t < start:
        return 0.0
    ph = (t - start) % period
    return float(np.exp(-ph / decay))


def hexcol(h, k=1.0):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)], np.float32) * k


# ---------------------------------------------------------------- canvas
def blank(c=(0, 0, 0)):
    img = np.empty((H, W, 3), np.float32)
    img[:] = c
    return img


_grid = None


def grid():
    global _grid
    if _grid is None:
        ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
        _grid = (xs, ys)
    return _grid


def radial(cx=CX, cy=CY, r=None):
    xs, ys = grid()
    d = np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2)
    return d / (r or (0.5 * np.hypot(W, H)))


def radial_bg(inner, outer, cx=CX, cy=CY, r=None, power=1.4):
    d = clamp01(radial(cx, cy, r)) ** power
    return (np.asarray(inner, np.float32)[None, None] * (1 - d[..., None]) +
            np.asarray(outer, np.float32)[None, None] * d[..., None]).astype(np.float32)


def glow(img, strength=1.0, thresh=0.0, radii=(2, 6, 18, 40), weights=(0.6, 0.45, 0.35, 0.3)):
    src = np.maximum(img - thresh, 0) if thresh > 0 else img
    small = cv2.resize(src, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
    acc = np.zeros_like(small)
    for r, w in zip(radii, weights):
        acc += cv2.GaussianBlur(small, (0, 0), r * S) * w
    return img + cv2.resize(acc, (W, H), interpolation=cv2.INTER_LINEAR) * strength


def soft_blur(img, sigma):
    if sigma <= 0.3:
        return img
    if sigma > 6:
        f = 4
        small = cv2.resize(img, (W // f, H // f), interpolation=cv2.INTER_AREA)
        small = cv2.GaussianBlur(small, (0, 0), sigma / f)
        return cv2.resize(small, (W, H), interpolation=cv2.INTER_LINEAR)
    return cv2.GaussianBlur(img, (0, 0), sigma)


def vignette(img, amount=0.55, power=2.2):
    d = clamp01(radial(r=0.62 * np.hypot(W, H)))
    return img * (1 - amount * d ** power)[..., None]


_grain = None


def grain(img, amount, frame, mono=True):
    global _grain
    if _grain is None:
        rng = np.random.default_rng(3)
        _grain = [rng.standard_normal((H // 2, W // 2)).astype(np.float32) for _ in range(8)]
    g = cv2.resize(_grain[frame % 8], (W, H), interpolation=cv2.INTER_LINEAR)
    return img + g[..., None] * amount


def chroma(img, px):
    """Radial-ish chromatic aberration by shifting R and B channels."""
    if abs(px) < 0.3:
        return img
    out = img.copy()
    M = np.float32([[1 + px / W, 0, -px / 2], [0, 1 + px / W, -px * H / W / 2]])
    out[..., 0] = cv2.warpAffine(img[..., 0], M, (W, H), borderMode=cv2.BORDER_REFLECT)
    M2 = np.float32([[1 - px / W, 0, px / 2], [0, 1 - px / W, px * H / W / 2]])
    out[..., 2] = cv2.warpAffine(img[..., 2], M2, (W, H), borderMode=cv2.BORDER_REFLECT)
    return out


def transform(img, scale=1.0, rot=0.0, dx=0.0, dy=0.0, cx=CX, cy=CY, border=cv2.BORDER_CONSTANT):
    if scale == 1 and rot == 0 and dx == 0 and dy == 0:
        return img
    M = cv2.getRotationMatrix2D((cx, cy), rot, scale)
    M[0, 2] += dx
    M[1, 2] += dy
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=border)


def shake(t, amp, seed=0):
    rng = np.random.default_rng(int(t * 1000) + seed)
    return rng.uniform(-amp, amp) * S, rng.uniform(-amp, amp) * S


def tonemap(img):
    # linear up to 0.85, then a soft exponential shoulder towards 1.0
    x = np.maximum(img, 0)
    k = 0.85
    return np.where(x < k, x, k + (1 - k) * (1 - np.exp(-(x - k) / (1 - k)))).astype(np.float32)


def to_u8(img):
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)


def over(dst, rgb, a):
    """Alpha composite (straight alpha, a is HxW or HxWx1)."""
    if a.ndim == 2:
        a = a[..., None]
    dst *= (1 - a)
    dst += rgb * a
    return dst


# ---------------------------------------------------------------- drawing
class Layer:
    """8-bit anti-aliased drawing surface that is added onto the float frame."""

    def __init__(self):
        self.im = np.zeros((H, W, 3), np.uint8)

    @staticmethod
    def _c(col):
        c = np.clip(np.asarray(col, float), 0, 1) * 255
        return (float(c[2]), float(c[1]), float(c[0]))[::-1]  # we keep RGB order in arrays

    def poly(self, pts, col, th=1, closed=False):
        if len(pts) < 2:
            return
        p = (np.asarray(pts, np.float64) * 16).astype(np.int32)
        cv2.polylines(self.im, [p], closed, self._c(col), max(1, int(round(th))), cv2.LINE_AA, shift=4)

    def polys(self, list_pts, col, th=1, closed=False):
        ps = [(np.asarray(p, np.float64) * 16).astype(np.int32) for p in list_pts if len(p) >= 2]
        if ps:
            cv2.polylines(self.im, ps, closed, self._c(col), max(1, int(round(th))), cv2.LINE_AA, shift=4)

    def line(self, a, b, col, th=1):
        cv2.line(self.im, (int(a[0] * 16), int(a[1] * 16)), (int(b[0] * 16), int(b[1] * 16)),
                 self._c(col), max(1, int(round(th))), cv2.LINE_AA, shift=4)

    def circle(self, c, r, col, th=1, fill=False):
        cv2.circle(self.im, (int(c[0] * 16), int(c[1] * 16)), max(1, int(r * 16)), self._c(col),
                   -1 if fill else max(1, int(round(th))), cv2.LINE_AA, shift=4)

    def fillpoly(self, pts, col):
        p = (np.asarray(pts, np.float64) * 16).astype(np.int32)
        cv2.fillPoly(self.im, [p], self._c(col), cv2.LINE_AA, shift=4)

    def text(self, s, org, scale, col, th=1):
        cv2.putText(self.im, s, (int(org[0]), int(org[1])), cv2.FONT_HERSHEY_SIMPLEX, scale * S,
                    self._c(col), max(1, int(th)), cv2.LINE_AA)

    def f(self, gain=1.0):
        return self.im.astype(np.float32) * (gain / 255.0)

    def add_to(self, img, gain=1.0, glow_amt=0.0):
        f = self.f(gain)
        if glow_amt:
            f = glow(f, glow_amt)
        img += f
        return img


def splat(img, x, y, col, gain=1.0):
    """Additively splat points (bilinear) into img. col: (N,3) or (3,)."""
    x = np.asarray(x, np.float32)
    y = np.asarray(y, np.float32)
    col = np.broadcast_to(np.asarray(col, np.float32), (len(x), 3)) * gain
    m = (x >= 0) & (x < W - 1) & (y >= 0) & (y < H - 1)
    x, y, col = x[m], y[m], col[m]
    x0 = x.astype(np.int32)
    y0 = y.astype(np.int32)
    fx = x - x0
    fy = y - y0
    flat = img.reshape(-1, 3)
    for dx, dy, w in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)), (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
        idx = (y0 + dy) * W + (x0 + dx)
        for c in range(3):
            flat[:, c] += np.bincount(idx, weights=col[:, c] * w, minlength=H * W).astype(np.float32)
    return img


# ---------------------------------------------------------------- text
FONTS = os.path.join(ASSETS, "fonts")


@functools.lru_cache(maxsize=64)
def font(name, size, weight=None):
    f = ImageFont.truetype(os.path.join(FONTS, name), int(size))
    if weight is not None:
        try:
            f.set_variation_by_axes([weight] + ([100] if "wdth" in str(f.get_variation_axes()) else []))
        except Exception:
            try:
                f.set_variation_by_axes([weight])
            except Exception:
                pass
    return f


@functools.lru_cache(maxsize=256)
def text_rgba(s, fname, size, weight=None, spacing=0, col=(1, 1, 1)):
    """Render text to a float RGBA array (tight crop, with small margin)."""
    f = font(fname, int(size * S), weight)
    if spacing:
        # manual letter spacing
        widths = [f.getlength(ch) for ch in s]
        total = int(sum(widths) + spacing * S * (len(s) - 1)) + 20
        asc, desc = f.getmetrics()
        im = Image.new("L", (total, asc + desc + 20), 0)
        d = ImageDraw.Draw(im)
        x = 10
        for ch, w in zip(s, widths):
            d.text((x, 10), ch, font=f, fill=255)
            x += w + spacing * S
    else:
        bbox = f.getbbox(s)
        im = Image.new("L", (bbox[2] - bbox[0] + 20, bbox[3] - bbox[1] + 20), 0)
        ImageDraw.Draw(im).text((10 - bbox[0], 10 - bbox[1]), s, font=f, fill=255)
    a = np.asarray(im).astype(np.float32) / 255.0
    ys, xs = np.where(a > 0)
    if len(xs):
        a = a[max(0, ys.min() - 4):ys.max() + 5, max(0, xs.min() - 4):xs.max() + 5]
    rgba = np.zeros(a.shape + (4,), np.float32)
    rgba[..., :3] = col
    rgba[..., 3] = a
    return rgba


# ---------------------------------------------------------------- logos / sprites
@functools.lru_cache(maxsize=32)
def logo(name):
    im = np.asarray(Image.open(os.path.join(ASSETS, "logos", name)).convert("RGBA")).astype(np.float32) / 255.0
    return im


def place(img, rgba, cx, cy, scale=1.0, alpha=1.0, rot=0.0, mode="over", tint=None, gain=1.0,
          return_layer=False):
    """Composite a straight-alpha RGBA sprite centred at (cx, cy)."""
    if alpha <= 0.001 or scale <= 0.001:
        if return_layer:
            return np.zeros((H, W, 3), np.float32), np.zeros((H, W, 1), np.float32)
        return img
    h, w = rgba.shape[:2]
    M = cv2.getRotationMatrix2D((w / 2, h / 2), rot, scale)
    M[0, 2] += cx - w / 2
    M[1, 2] += cy - h / 2
    pm = rgba.copy()
    pm[..., :3] *= pm[..., 3:4]
    lay = cv2.warpAffine(pm, M, (W, H), flags=cv2.INTER_LINEAR if scale < 1.5 else cv2.INTER_CUBIC,
                         borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    a = np.clip(lay[..., 3:4], 0, 1) * alpha
    rgb = np.clip(lay[..., :3], 0, None) * alpha
    if tint is not None:
        rgb = a * np.asarray(tint, np.float32)
    if return_layer:
        return rgb * gain, a
    if mode == "add":
        img += rgb * gain
    else:
        img *= (1 - a)
        img += rgb * gain
    return img


def place_persp(img, rgba, quad, alpha=1.0, gain=1.0):
    """Warp sprite onto destination quad (4x2: tl, tr, br, bl)."""
    h, w = rgba.shape[:2]
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    M = cv2.getPerspectiveTransform(src, np.float32(quad))
    pm = rgba.copy()
    pm[..., :3] *= pm[..., 3:4]
    lay = cv2.warpPerspective(pm, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    a = np.clip(lay[..., 3:4], 0, 1) * alpha
    img *= (1 - a)
    img += np.clip(lay[..., :3], 0, None) * alpha * gain
    return img


def quad_rot_y(cx, cy, w, h, ang, f=1800.0):
    """Screen quad of a w x h card rotated by ang (radians) about its vertical axis."""
    pts = []
    for x, y in [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]:
        X = x * np.cos(ang)
        Z = x * np.sin(ang)
        k = f * S / (f * S + Z)
        pts.append((cx + X * k, cy + y * k))
    return np.float32(pts)


# ---------------------------------------------------------------- 3D
def rot_x(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def rot_y(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def rot_z(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


class Camera:
    """Look-at pinhole camera. World: z up."""

    def __init__(self, eye, target, fov_deg=50, up=(0, 0, 1), cx=CX, cy=CY):
        eye = np.asarray(eye, float)
        target = np.asarray(target, float)
        fwd = target - eye
        fwd /= np.linalg.norm(fwd)
        right = np.cross(fwd, up)
        right /= np.linalg.norm(right)
        upv = np.cross(right, fwd)
        self.R = np.stack([right, upv, fwd])
        self.eye = eye
        self.f = (W / 2) / np.tan(np.radians(fov_deg) / 2)
        self.cx, self.cy = cx, cy

    def project(self, P):
        P = np.asarray(P, float)
        X = (P - self.eye) @ self.R.T
        z = np.maximum(X[..., 2], 1e-3)
        x = self.cx + self.f * X[..., 0] / z
        y = self.cy - self.f * X[..., 1] / z
        return np.stack([x, y], -1), X[..., 2]


# ---------------------------------------------------------------- misc
def value_noise(shape, scale, seed=0, octaves=4):
    rng = np.random.default_rng(seed)
    out = np.zeros(shape, np.float32)
    amp = 1.0
    tot = 0
    for o in range(octaves):
        s = max(2, int(scale * 2 ** o))
        small = rng.standard_normal((s, int(s * shape[1] / shape[0]) + 1)).astype(np.float32)
        out += cv2.resize(small, (shape[1], shape[0]), interpolation=cv2.INTER_CUBIC) * amp
        tot += amp
        amp *= 0.5
    return out / tot


def lightning(a, b, rng, depth=6, disp=0.25):
    """Midpoint displacement bolt between points a and b -> (N,2)."""
    pts = np.array([a, b], float)
    d = disp * np.linalg.norm(np.subtract(b, a))
    for _ in range(depth):
        mids = (pts[:-1] + pts[1:]) / 2
        seg = pts[1:] - pts[:-1]
        nrm = np.stack([-seg[:, 1], seg[:, 0]], -1)
        nrm /= np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-9
        mids += nrm * rng.uniform(-d, d, (len(mids), 1))
        out = np.empty((len(pts) + len(mids), 2))
        out[0::2] = pts
        out[1::2] = mids
        pts = out
        d *= 0.55
    return pts
