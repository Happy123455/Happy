"""Trace the raster logos into layered vector SVGs (one filled path per colour).

    python3 vectorize.py  ->  assets/vector/*.svg  (+ build/vector_preview.jpg)

Each logo is colour-separated with k-means, every colour layer is smoothed at
2x resolution and traced with potrace into Bezier curves. Layers are stacked
largest-first and grown by a hair so adjacent colours meet without seams.
"""
import os
import numpy as np
import cv2
import potrace
from PIL import Image
from sklearn.cluster import KMeans

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "assets", "logos")
OUT = os.path.join(HERE, "assets", "vector")
os.makedirs(OUT, exist_ok=True)

LOGOS = {  # name: (source png, colours)
    "khodaldham_english": ("khodal_eng.png", 5),
    "khodaldham_gujarati": ("khodal_guj.png", 5),
    "khodaldham_medallion": ("khodal_idol.png", 14),
    "bs9_news": ("bs9.png", 6),
    "wayonaa": ("wayonaa.png", 8),
}
UP = 2  # trace at 2x of the cleaned raster


def curve_to_d(curve, s):
    p = curve.start_point
    d = [f"M{p.x / s:.2f},{p.y / s:.2f}"]
    for seg in curve.segments:
        if seg.is_corner:
            d.append(f"L{seg.c.x / s:.2f},{seg.c.y / s:.2f}L{seg.end_point.x / s:.2f},{seg.end_point.y / s:.2f}")
        else:
            d.append(f"C{seg.c1.x / s:.2f},{seg.c1.y / s:.2f} {seg.c2.x / s:.2f},{seg.c2.y / s:.2f} "
                     f"{seg.end_point.x / s:.2f},{seg.end_point.y / s:.2f}")
    d.append("Z")
    return "".join(d)


def trace(mask):
    big = cv2.resize(mask.astype(np.float32), None, fx=UP, fy=UP, interpolation=cv2.INTER_CUBIC)
    big = cv2.GaussianBlur(big, (0, 0), UP * 0.9) > 0.5
    plist = potrace.Bitmap(~big).trace(turdsize=12 * UP, alphamax=1.05, opticurve=True, opttolerance=0.3)
    return " ".join(curve_to_d(c, UP) for c in plist)


def vectorize(name, src, k):
    im = np.asarray(Image.open(os.path.join(SRC, src)).convert("RGBA")).astype(np.float32) / 255
    h, w = im.shape[:2]
    a = im[..., 3]
    solid = a > 0.5
    lab = cv2.cvtColor(im[..., :3], cv2.COLOR_RGB2LAB)
    X = lab[solid]
    km = KMeans(k, n_init=4, random_state=0).fit(X[:: max(1, len(X) // 60000)])
    labels = np.full((h, w), -1)
    labels[solid] = km.predict(X)
    # clean speckles: median filter on the label map
    lm = cv2.medianBlur((labels + 1).astype(np.uint8), 5).astype(int) - 1
    lm[~solid] = -1
    layers = []
    for c in range(k):
        m = lm == c
        if m.sum() < 30:
            continue
        rgb = np.median(im[..., :3][m], axis=0)
        layers.append((m.sum(), m, rgb))
    layers.sort(key=lambda x: -x[0])
    paths = []
    for i, (area, m, rgb) in enumerate(layers):
        grow = m if i == len(layers) - 1 else cv2.dilate(m.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
        grow &= cv2.dilate(solid.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
        d = trace(grow)
        hexc = "#%02x%02x%02x" % tuple(int(round(v * 255)) for v in rgb)
        paths.append(f'  <path fill="{hexc}" d="{d}"/>')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">\n'
           + "\n".join(paths) + "\n</svg>\n")
    path = os.path.join(OUT, name + ".svg")
    open(path, "w").write(svg)
    print(name, f"{len(paths)} layers, {os.path.getsize(path) / 1024:.0f} KB")
    return path


if __name__ == "__main__":
    import cairosvg
    rows = []
    for name, (src, k) in LOGOS.items():
        p = vectorize(name, src, k)
        png = cairosvg.svg2png(url=p, output_width=1400, background_color="#1a1a28")
        arr = cv2.imdecode(np.frombuffer(png, np.uint8), cv2.IMREAD_COLOR)
        cv2.imwrite(os.path.join(OUT, name + "_4k.png"), cv2.imdecode(np.frombuffer(
            cairosvg.svg2png(url=p, output_width=3840), np.uint8), cv2.IMREAD_UNCHANGED))
        rows.append(arr)
    sheet = np.vstack([cv2.copyMakeBorder(r, 10, 10, 0, 0, cv2.BORDER_CONSTANT, value=(26, 26, 40)) for r in rows])
    cv2.imwrite(os.path.join(HERE, "build", "vector_preview.jpg"), sheet, [cv2.IMWRITE_JPEG_QUALITY, 90])
