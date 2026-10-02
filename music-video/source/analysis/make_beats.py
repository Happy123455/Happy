# Builds beats.json (beat times + bass impacts) from beats.npy (analyze.py) and features.json (feats.py).
import json, numpy as np, scipy.signal as ss
F = json.load(open('features.json')); fps = 30
lo = np.array(F['low'])
d = np.maximum(0, np.diff(lo, prepend=lo[0]))
p, _ = ss.find_peaks(d, height=0.28, distance=int(0.22 * fps))
imp = [[round(i / fps, 3), round(float(min(1.5, lo[i])), 2)] for i in p]
b = np.load('beats.npy').round(3).tolist()
json.dump({'beats': b, 'impacts': imp}, open('beats.json', 'w'))
print(len(b), 'beats,', len(imp), 'impacts')
