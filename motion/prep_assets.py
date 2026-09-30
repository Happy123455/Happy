"""Cut the supplied logos out of their backgrounds and save clean RGBA versions.

Outputs go to assets/logos/*.png (straight alpha, tightly cropped, upscaled).
"""
import os
import numpy as np
import cv2
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "assets", "src")
OUT = os.path.join(HERE, "assets", "logos")
os.makedirs(OUT, exist_ok=True)


def load(name):
    return np.asarray(Image.open(os.path.join(SRC, name)).convert("RGBA")).astype(np.float32) / 255.0


def unmultiply_white(rgb):
    a = 1.0 - rgb.min(axis=2)
    a = np.clip((a - 0.04) / 0.96, 0, 1)
    col = (rgb - (1.0 - a[..., None])) / np.maximum(a[..., None], 1e-4)
    return np.clip(col, 0, 1), a


def unmultiply_black(rgb):
    a = rgb.max(axis=2)
    a = np.clip((a - 0.06) / 0.94, 0, 1)
    col = rgb / np.maximum(rgb.max(axis=2, keepdims=True), 1e-4)
    col = np.clip(col * np.clip(rgb.max(axis=2, keepdims=True) / np.maximum(a[..., None], 1e-4), 0, 1), 0, 1)
    return col, a


def crop(rgba, pad=0.04):
    a = rgba[..., 3]
    ys, xs = np.where(a > 0.05)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    p = int(pad * max(y1 - y0, x1 - x0))
    out = np.zeros((y1 - y0 + 2 * p, x1 - x0 + 2 * p, 4), np.float32)
    out[p:p + y1 - y0, p:p + x1 - x0] = rgba[y0:y1, x0:x1]
    return out


def upscale(rgba, factor):
    h, w = rgba.shape[:2]
    # premultiply for clean edges
    pm = rgba.copy()
    pm[..., :3] *= pm[..., 3:4]
    big = cv2.resize(pm, (int(w * factor), int(h * factor)), interpolation=cv2.INTER_LANCZOS4)
    big = np.clip(big, 0, 1)
    # gentle unsharp mask
    blur = cv2.GaussianBlur(big, (0, 0), 1.2 * factor / 2)
    big = np.clip(big + 0.6 * (big - blur), 0, 1)
    a = big[..., 3:4]
    big[..., :3] = np.clip(big[..., :3] / np.maximum(a, 1e-4), 0, 1)
    return big


def save(name, rgba):
    Image.fromarray((np.clip(rgba, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA").save(os.path.join(OUT, name))
    print(name, rgba.shape)


# Khodaldham English + Gujarati wordmarks (flat colours on white)
for src, dst in [("khodal_eng.png", "khodal_eng.png"), ("khodal_guj.png", "khodal_guj.png")]:
    im = load(src)[..., :3]
    col, a = unmultiply_white(im)
    save(dst, upscale(crop(np.dstack([col, a])), 2.2))

# Khodaldham with the Maa Khodiyar medallion: keep medallion interior opaque
im = load("khodal_idol.jpg")[..., :3]
col, a = unmultiply_white(im)
nearwhite = im.min(axis=2) > 0.90
lab, _ = ndimage.label(nearwhite)
border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
bg = np.isin(lab, border[border > 0])
interior = ndimage.binary_erosion(~bg, iterations=1)
interior = ndimage.binary_fill_holes(interior)
soft = cv2.GaussianBlur(interior.astype(np.float32), (0, 0), 0.8)
alpha = np.maximum(a, soft)
color = np.where(soft[..., None] > a[..., None], im, col)
save("khodal_idol.png", upscale(crop(np.dstack([color, alpha])), 2.4))
# brighter variant for dark backgrounds: lift the deep maroon lettering
lum = color.mean(axis=2, keepdims=True)
lift = np.clip(color * (1.0 + 1.4 * np.clip((0.45 - lum) / 0.45, 0, 1)), 0, 1)
save("khodal_idol_lit.png", upscale(crop(np.dstack([lift, alpha])), 2.4))

# Wayonaa (on black)
im = load("wayonaa.jpg")[..., :3].copy()
im[:6] = 0; im[-6:] = 0; im[:, :6] = 0; im[:, -6:] = 0
col, a = unmultiply_black(im)
a = np.where(a < 0.08, 0, a)
save("wayonaa.png", upscale(crop(np.dstack([col, a]), 0.03), 2.6))

# BS9 already has alpha
im = load("bs9.png")
save("bs9.png", upscale(crop(im, 0.03), 2.8))
# variant with the black NEWS caption turned white (for dark backgrounds)
lum = im[..., :3].mean(axis=2)
sat = im[..., :3].max(axis=2) - im[..., :3].min(axis=2)
dark = (lum < 0.3) & (sat < 0.15)
im2 = im.copy()
im2[dark, :3] = 1.0
save("bs9_white.png", upscale(crop(im2, 0.03), 2.8))
