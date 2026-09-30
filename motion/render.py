"""Render the motion graphic.

    python3 render.py still 3.2 9.1 ...     -> build/still_<t>.jpg (quick look)
    python3 render.py video [t0 t1]         -> build/khodaldham_bs9_wayonaa.mp4
Environment: MG_W / MG_H set the resolution (default 1920x1080), MG_JOBS workers.
"""
import os
import sys
import subprocess
import multiprocessing as mp
import numpy as np
import imageio_ffmpeg

import timeline as T
import common as C

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def frame(t, fr):
    import s1_khodal, s2_bs9, s3_way  # noqa: E401
    if t < T.DOT - 0.05:
        img = s1_khodal.render(t, fr)
    elif t < T.WAY:
        img = s2_bs9.render(t, fr)
    else:
        img = s3_way.render(t, fr)
    img = C.tonemap(img)
    img = C.grain(img, 0.012, fr)
    img = C.vignette(img, 0.35, 2.4)
    return C.to_u8(img)


def still(ts):
    import cv2
    os.makedirs(BUILD, exist_ok=True)
    for t in ts:
        t = float(t)
        im = frame(t, int(round(t * T.FPS)))
        cv2.imwrite(os.path.join(BUILD, f"still_{t:06.2f}.jpg"), im[..., ::-1], [cv2.IMWRITE_JPEG_QUALITY, 92])
        print("still", t)


def chunk(args):
    import cv2
    cv2.setNumThreads(1)
    idx, f0, f1 = args
    path = os.path.join(BUILD, f"chunk_{idx:03d}.mp4")
    cmd = [FFMPEG, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{C.W}x{C.H}",
           "-r", str(T.FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16",
           "-pix_fmt", "yuv420p", path]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for fr in range(f0, f1):
        p.stdin.write(frame(fr / T.FPS, fr).tobytes())
        if fr % 30 == 0:
            print(f"[{idx}] frame {fr}", flush=True)
    p.stdin.close()
    p.wait()
    return path


def video(t0=0.0, t1=T.TOTAL, out="khodaldham_bs9_wayonaa.mp4"):
    os.makedirs(BUILD, exist_ok=True)
    f0, f1 = int(round(t0 * T.FPS)), int(round(t1 * T.FPS))
    jobs = int(os.environ.get("MG_JOBS", os.cpu_count()))
    step = 45  # frames per chunk
    tasks = [(i, a, min(a + step, f1)) for i, a in enumerate(range(f0, f1, step))]
    with mp.Pool(jobs) as pool:
        paths = pool.map(chunk, tasks, chunksize=1)
    lst = os.path.join(BUILD, "chunks.txt")
    with open(lst, "w") as f:
        for p in paths:
            f.write(f"file '{p}'\n")
    silent = os.path.join(BUILD, "silent.mp4")
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", silent], check=True)
    wav = os.path.join(BUILD, "soundtrack.wav")
    final = os.path.join(BUILD, out)
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", silent, "-ss", str(t0), "-t", str(t1 - t0), "-i", wav,
                    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest",
                    "-movflags", "+faststart", final], check=True)
    for p in paths:
        os.remove(p)
    # shareable delivery encode (~85 MB): two-pass 8.5 Mbps
    share = os.path.join(BUILD, "final.mp4")
    rate = ["-c:v", "libx264", "-preset", "slow", "-b:v", "8500k", "-maxrate", "12M", "-bufsize", "17M", "-r", str(T.FPS)]
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", silent, *rate, "-pass", "1", "-an", "-f", "mp4", os.devnull],
                   check=True, cwd=BUILD)
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", silent, "-ss", str(t0), "-t", str(t1 - t0), "-i", wav,
                    "-map", "0:v", "-map", "1:a", *rate, "-pass", "2", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k",
                    "-movflags", "+faststart", "-shortest", share], check=True, cwd=BUILD)
    print("wrote", final, "and", share)


if __name__ == "__main__":
    if sys.argv[1] == "still":
        still(sys.argv[2:])
    else:
        a = [float(x) for x in sys.argv[2:4]]
        video(*a) if a else video()
