"""v2 render: python3 render.py still 5 12 ... | python3 render.py video [t0 t1]"""
import os
import sys
import subprocess
import multiprocessing as mp
import numpy as np
import cv2
import imageio_ffmpeg

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")
FF = imageio_ffmpeg.get_ffmpeg_exe()
FPS = 30


def frame(t, fr):
    import story
    from engine import finish
    return finish(story.render(t, fr), fr)


def still(ts):
    os.makedirs(BUILD, exist_ok=True)
    for t in ts:
        t = float(t)
        cv2.imwrite(os.path.join(BUILD, f"s_{t:06.2f}.jpg"), frame(t, int(t * FPS))[..., ::-1], [cv2.IMWRITE_JPEG_QUALITY, 92])
        print("still", t, flush=True)


def chunk(args):
    cv2.setNumThreads(1)
    from engine import W, H
    idx, f0, f1 = args
    path = os.path.join(BUILD, f"c_{idx:04d}.mp4")
    p = subprocess.Popen([FF, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                          "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "14",
                          "-pix_fmt", "yuv420p", path], stdin=subprocess.PIPE)
    for fr in range(f0, f1):
        p.stdin.write(frame(fr / FPS, fr).tobytes())
    p.stdin.close()
    p.wait()
    print("chunk", idx, "done", flush=True)
    return path


def video(t0=0.0, t1=None):
    import story
    t1 = t1 or story.TOTAL
    os.makedirs(BUILD, exist_ok=True)
    f0, f1 = int(round(t0 * FPS)), int(round(t1 * FPS))
    tasks = [(i, a, min(a + 30, f1)) for i, a in enumerate(range(f0, f1, 30))]
    with mp.Pool(int(os.environ.get("MG_JOBS", os.cpu_count()))) as pool:
        paths = pool.map(chunk, tasks, chunksize=1)
    lst = os.path.join(BUILD, "list.txt")
    open(lst, "w").write("".join(f"file '{p}'\n" for p in paths))
    silent = os.path.join(BUILD, "silent.mp4")
    subprocess.run([FF, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", silent], check=True)
    for p in paths:
        os.remove(p)
    song = os.path.join(HERE, "assets", "garba_source.wav")
    out = os.path.join(BUILD, "v2_master.mp4")
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", silent, "-ss", str(t0), "-t", str(t1 - t0), "-i", song,
                    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-af", f"afade=t=out:st={max(0, t1 - t0 - 1.5)}:d=1.5",
                    "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", out], check=True)
    print("wrote", out)


if __name__ == "__main__":
    if sys.argv[1] == "still":
        still(sys.argv[2:])
    else:
        a = [float(x) for x in sys.argv[2:4]]
        video(*a)
