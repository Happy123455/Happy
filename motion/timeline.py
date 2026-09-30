"""Shared timeline (seconds). Visuals and soundtrack are both driven from here.

Tempo is 120 BPM, so one beat = 0.5 s and one bar = 2 s.
"""

FPS = 30
BPM = 120
BEAT = 60.0 / BPM
BAR = 4 * BEAT

# ---- Act 1: Shree Khodaldham --------------------------------------------
INTRO = 0.0          # dark sci-fi 3D graphs / contours / loops
BUILD1 = 5.0         # riser, graphs accelerate
GAP1 = 7.75          # breath before the drop
DROP1 = 8.0          # points snap together into logo v1
TAPESTOP = 10.25     # music winds down like a tape stop
FILM = 10.5          # logo rolls like an old film strip, dot falls

# bouncing ball = plucked string hits (gravity: each flight shorter by E)
HIT1 = 11.5
FLIGHT0 = 1.4
RESTITUTION = 0.68


def ball_hits():
    hits, t, f = [HIT1], HIT1, FLIGHT0
    while f > 0.045:
        t += f
        hits.append(t)
        f *= RESTITUTION
    return hits


HITS = ball_hits()
DROP2 = 16.0         # Navratri celebration (garba EDM), 6 bars
TEMPLE = 18.0        # Khodaldham temple (Kagvad) rises in light
COLORS9 = 22.0       # nine Navratri colours, one per beat (22.0 .. 26.0)
FINALE1 = 28.0       # last big hit of the celebration
FADE1 = 29.0         # slowly goes silent
BLACK1 = 31.0        # full black / silence

# ---- Act 2: BS9 News -------------------------------------------------------
DOT = 32.0           # single blue dot + sonar ping
ZOOM = 32.5          # dot -> earth -> India -> Gujarat -> Rajkot
MAPX = 35.7          # crossfade from satellite texture to vector map
CITY = 37.5          # Rajkot rises: zones, buildings, data-flow roads
FRACT = 41.0         # blue & red 3D fractals emerge
COLLIDE = 43.0       # collision shockwave
GLOW = 43.5          # giant monitoring glow soaks everything in
CUTS = 45.5          # jump cuts of logo parts
LOCK = 47.0          # BS9 logo rotates into place, blue background
WALL = 49.0          # local news video wall (city, traffic, weather...)
LOWER3 = 53.0        # breaking-news lower third + ticker
STINGER = 57.0       # final news stinger
NEWS_END = 59.0

# ---- Act 3: Wayonaa EV -----------------------------------------------------
WAY = 59.0           # electric spark, power up
WAY_RIDE = 61.0      # beat kicks in, scooter drawn in light, rides
WAY_CHARGE = 66.0    # battery charge riser
WAY_LOGO = 68.0      # logo reveal
ENDCARD = 72.0       # all three together
TOTAL = 78.0
