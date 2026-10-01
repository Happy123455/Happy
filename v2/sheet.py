import sys, glob, os
import numpy as np, cv2
files = sys.argv[2:]
ims = [cv2.imread(f) for f in files]
w = 640; h = int(w * 9 / 16)
cols = 2
rows = (len(ims) + cols - 1) // cols
sheet = np.zeros((rows * (h + 24), cols * w, 3), np.uint8)
for i, (f, im) in enumerate(zip(files, ims)):
    r, c = divmod(i, cols)
    im = cv2.resize(im, (w, h), interpolation=cv2.INTER_AREA)
    sheet[r * (h + 24) + 24: r * (h + 24) + 24 + h, c * w:(c + 1) * w] = im
    cv2.putText(sheet, os.path.basename(f), (c * w + 6, r * (h + 24) + 18), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)
cv2.imwrite(sys.argv[1], sheet, [cv2.IMWRITE_JPEG_QUALITY, 88])
