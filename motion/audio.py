"""Synthesises the whole soundtrack (music + sound design) in sync with timeline.py.

Everything is generated from scratch: supersaw pads, Karplus-Strong guitar
strings, dhol / dandiya / EDM drums, shehnai-style lead, impacts, risers,
sonar pings, glitch stutters, electric zaps and an EV motor whine.

    python3 audio.py  ->  build/soundtrack.wav
"""
import os
import numpy as np
import numba
from scipy import signal
from scipy.io import wavfile

import timeline as T

SR = 48000
N = int((T.TOTAL + 1.0) * SR)
RNG = np.random.default_rng(7)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build")


def midi(m):
    return 440.0 * 2 ** ((np.asarray(m, float) - 69) / 12)


def secs(n):
    return np.arange(n) / SR


def ns(t):
    return int(round(t * SR))


# --------------------------------------------------------------------------
# buses
class Bus:
    def __init__(self):
        self.x = np.zeros((2, N))

    def add(self, sig, t, gain=1.0, pan=0.0):
        sig = np.asarray(sig, float)
        if sig.ndim == 1:
            a = (pan + 1) * np.pi / 4
            sig = np.vstack([sig * np.cos(a), sig * np.sin(a)]) * np.sqrt(2)
        i = ns(t)
        if i < 0:
            sig = sig[:, -i:]
            i = 0
        n = min(sig.shape[1], N - i)
        if n > 0:
            self.x[:, i:i + n] += gain * sig[:, :n]


music, fx, verb, longverb = Bus(), Bus(), Bus(), Bus()


def send(sig, t, gain=1.0, pan=0.0, wet=0.3, bus=None, big=False):
    (bus or music).add(sig, t, gain, pan)
    if wet > 0:
        (longverb if big else verb).add(sig, t, gain * wet, pan)


# --------------------------------------------------------------------------
# DSP primitives
@numba.njit(cache=True)
def _svf(x, cut, q, mode):
    out = np.empty_like(x)
    ic1 = 0.0
    ic2 = 0.0
    k = 1.0 / q
    for i in range(x.shape[0]):
        c = min(max(cut[i], 10.0), 0.45 * 48000.0)
        g = np.tan(np.pi * c / 48000.0)
        a1 = 1.0 / (1.0 + g * (g + k))
        a2 = g * a1
        a3 = g * a2
        v3 = x[i] - ic2
        v1 = a1 * ic1 + a2 * v3
        v2 = ic2 + a2 * ic1 + a3 * v3
        ic1 = 2 * v1 - ic1
        ic2 = 2 * v2 - ic2
        if mode == 0:
            out[i] = v2
        elif mode == 1:
            out[i] = v1
        else:
            out[i] = x[i] - k * v1 - v2
    return out


def svf(x, cut, q=0.707, mode="lp"):
    cut = np.broadcast_to(np.asarray(cut, float), x.shape).copy()
    return _svf(np.ascontiguousarray(x, dtype=np.float64), cut, float(q), {"lp": 0, "bp": 1, "hp": 2}[mode])


@numba.njit(cache=True)
def _ks(exc, n, period, decay, damp):
    out = np.zeros(n)
    L = int(period)
    frac = period - L
    buf = np.zeros(n + L + 4)
    for i in range(n):
        e = exc[i] if i < exc.shape[0] else 0.0
        j = i - L
        a = buf[j] if j >= 0 else 0.0
        b = buf[j - 1] if j - 1 >= 0 else 0.0
        c = buf[j - 2] if j - 2 >= 0 else 0.0
        d1 = a * (1 - frac) + b * frac
        d2 = b * (1 - frac) + c * frac
        y = e + decay * ((1 - damp) * d1 + damp * 0.5 * (d1 + d2))
        buf[i] = y
        out[i] = y
    return out


def pluck(freq, dur, bright=0.7, decay=0.998, pickpos=0.18, seed=0):
    """Karplus-Strong guitar string."""
    rng = np.random.default_rng(seed)
    period = SR / freq
    n = ns(dur)
    exc = rng.uniform(-1, 1, int(period) + 1)
    exc = svf(exc, 800 + 9000 * bright, 0.7)
    # pick position comb
    d = max(1, int(pickpos * period))
    exc = exc - np.concatenate([np.zeros(d), exc[:-d]])
    y = _ks(exc, n, period - 0.5, decay, 0.35)
    y /= np.max(np.abs(y)) + 1e-9
    return y * np.exp(-secs(n) / (dur * 0.45))


def saw(freq, n, phase0=None):
    f = np.broadcast_to(np.asarray(freq, float), (n,))
    dt = f / SR
    ph = ((RNG.random() if phase0 is None else phase0) + np.cumsum(dt)) % 1.0
    y = 2 * ph - 1
    m = ph < dt
    t = ph[m] / dt[m]
    y[m] -= t + t - t * t - 1
    m = ph > 1 - dt
    t = (ph[m] - 1) / dt[m]
    y[m] -= t * t + t + t + 1
    return y


def square(freq, n):
    p = RNG.random()
    return 0.5 * (saw(freq, n, p) - saw(freq, n, (p + 0.5) % 1))


def sine(freq, n, phase0=0.0):
    f = np.broadcast_to(np.asarray(freq, float), (n,))
    return np.sin(2 * np.pi * (phase0 + np.cumsum(f) / SR))


def noise(n):
    return RNG.uniform(-1, 1, n)


def env_adsr(n, a=0.01, d=0.1, s=0.7, r=0.2):
    t = secs(n)
    dur = n / SR
    e = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    rel = np.clip((dur - t) / max(r, 1e-4), 0, 1)
    return e * rel


def expdec(n, tau):
    return np.exp(-secs(n) / tau)


def supersaw(notes, dur, voices=7, detune=0.18, cut=2500, a=0.3, r=0.6, q=0.8):
    n = ns(dur)
    L = np.zeros(n)
    R = np.zeros(n)
    for m in np.atleast_1d(notes):
        f0 = midi(m)
        for v in range(voices):
            dv = (v - (voices - 1) / 2) / ((voices - 1) / 2 + 1e-9)
            s = saw(f0 * 2 ** (dv * detune / 12), n)
            pan = dv * 0.8
            L += s * np.cos((pan + 1) * np.pi / 4)
            R += s * np.sin((pan + 1) * np.pi / 4)
    e = env_adsr(n, a, 0.5, 0.85, r)
    k = 1.0 / (len(np.atleast_1d(notes)) * voices) ** 0.5
    return np.vstack([svf(L, cut, q) * e * k, svf(R, cut, q) * e * k])


def softclip(x, drive=1.0):
    return np.tanh(x * drive) / np.tanh(drive)


# --------------------------------------------------------------------------
# drums / percussion
def kick(punch=1.0, dur=0.45, lo=45):
    n = ns(dur)
    t = secs(n)
    f = lo + (150 * punch) * np.exp(-t / 0.035)
    y = sine(f, n) * np.exp(-t / (dur * 0.35))
    click = svf(noise(n), 3500, 0.7, "hp") * np.exp(-t / 0.004) * 0.4
    return softclip((y + click) * 1.4, 1.5)


def snare(dur=0.25, tone=190):
    n = ns(dur)
    t = secs(n)
    body = sine(tone * (1 + 0.3 * np.exp(-t / 0.01)), n) * np.exp(-t / 0.05)
    nz = svf(noise(n), 5000, 0.6, "lp")
    nz = svf(nz, 1200, 0.7, "hp") * np.exp(-t / 0.08)
    return 0.6 * body + 0.8 * nz


def clap(dur=0.35):
    n = ns(dur)
    t = secs(n)
    e = np.zeros(n)
    for k, off in enumerate([0, 0.011, 0.022, 0.034]):
        i = ns(off)
        e[i:] += np.exp(-(t[: n - i]) / (0.006 if k < 3 else 0.12))
    return svf(noise(n), 1400, 1.6, "bp") * e * 1.3


def hat(dur=0.06, open_=False):
    n = ns(0.35 if open_ else dur)
    t = secs(n)
    y = svf(noise(n), 8000, 0.8, "hp") * np.exp(-t / (0.09 if open_ else 0.018))
    return y * 0.5


def crash(dur=3.0):
    n = ns(dur)
    t = secs(n)
    y = svf(noise(n), 4000, 0.6, "hp")
    ring = sum(sine(f, n) for f in [3120, 4470, 5310, 6800]) * 0.05
    return (y + ring) * np.exp(-t / (dur * 0.3)) * 0.6


def dhol_low(dur=0.45):
    n = ns(dur)
    t = secs(n)
    f = 70 + 60 * np.exp(-t / 0.04)
    y = sine(f, n) * np.exp(-t / 0.16)
    slap = svf(noise(n), 900, 1.2, "bp") * np.exp(-t / 0.015)
    return softclip(y * 1.3 + 0.5 * slap, 1.4)


def dhol_high(dur=0.18):
    n = ns(dur)
    t = secs(n)
    y = sine(380 * (1 + 0.2 * np.exp(-t / 0.01)), n) * np.exp(-t / 0.05)
    crack = svf(noise(n), 3000, 1.5, "bp") * np.exp(-t / 0.012)
    return 0.6 * y + 0.9 * crack


def dandiya(dur=0.12):
    """Two wooden sticks striking: stiff resonant clicks."""
    n = ns(dur)
    t = secs(n)
    y = np.zeros(n)
    for f, a, tau in [(1850, 1.0, 0.02), (2730, 0.7, 0.014), (4150, 0.5, 0.009), (960, 0.4, 0.03)]:
        y += a * np.sin(2 * np.pi * f * t) * np.exp(-t / tau)
    y += svf(noise(n), 3500, 2.0, "bp") * np.exp(-t / 0.004) * 1.2
    return y * 0.5


def timpani(note=38, dur=1.6):
    n = ns(dur)
    t = secs(n)
    f = midi(note)
    y = sum(a * sine(f * h * (1 + 0.02 * np.exp(-t / 0.05)), n) * np.exp(-t / (dur * d))
            for h, a, d in [(1, 1, 0.35), (1.5, 0.5, 0.2), (1.98, 0.35, 0.15), (2.44, 0.2, 0.1)])
    y += svf(noise(n), 300, 1, "bp") * np.exp(-t / 0.03) * 0.8
    return y


def boom(dur=3.5, lo=28, hi=70, dist=2.5):
    n = ns(dur)
    t = secs(n)
    f = lo + (hi - lo) * np.exp(-t / 0.25)
    y = sine(f, n) * np.exp(-t / (dur * 0.35))
    body = svf(noise(n), 180, 0.8) * np.exp(-t / 0.4) * 1.5
    return softclip((y + body) * dist, 1.0)


def riser(dur, f0=300, f1=9000, q=3.0, tonal=True):
    n = ns(dur)
    t = secs(n) / dur
    cut = f0 * (f1 / f0) ** (t ** 1.6)
    y = svf(noise(n), cut, q, "bp") * (t ** 2)
    if tonal:
        y += 0.25 * saw(80 * 2 ** (4 * t ** 2), n) * t ** 2
        y = svf(y, cut * 1.5, 0.7)
    return y


def whoosh(dur=0.8, up=True):
    n = ns(dur)
    t = secs(n) / dur
    shape = np.sin(np.pi * t) ** 2
    cut = 400 + 6000 * (t if up else 1 - t)
    return svf(noise(n), cut, 2.5, "bp") * shape


def reverse_crash(dur=1.5):
    return crash(dur)[::-1] * 0.8


def ping(freq=1400, dur=2.5):
    n = ns(dur)
    t = secs(n)
    y = (np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * freq * 2.01 * t)) * np.exp(-t / 0.25)
    out = y.copy()
    for k in range(1, 6):  # sonar echoes
        d = ns(0.38 * k)
        out[d:] += y[: n - d] * (0.45 ** k)
    return out * 0.5


def fm_bell(note, dur=1.8):
    n = ns(dur)
    t = secs(n)
    f = midi(note)
    mod = np.sin(2 * np.pi * f * 3.5 * t) * 2.5 * np.exp(-t / 0.4)
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t / (dur * 0.35))


def manjira(dur=1.2):
    """Small brass hand cymbals used in garba."""
    n = ns(dur)
    t = secs(n)
    y = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / tau)
            for f, a, tau in [(3150, 1, 0.35), (4730, 0.7, 0.25), (5890, 0.5, 0.2), (7420, 0.35, 0.12), (2410, 0.3, 0.3)])
    y += svf(noise(n), 7000, 1, "hp") * np.exp(-t / 0.01)
    return y * 0.35


def temple_bell(dur=4.0, f0=520):
    n = ns(dur)
    t = secs(n)
    y = sum(a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t / (dur * d)) * (1 + 0.15 * np.sin(2 * np.pi * 3.1 * t))
            for r, a, d in [(0.5, 0.6, 0.45), (1, 1, 0.35), (1.19, 0.6, 0.25), (1.56, 0.5, 0.2), (2.0, 0.4, 0.18), (2.74, 0.3, 0.1)])
    y += svf(noise(n), 2000, 2, "bp") * np.exp(-t / 0.01) * 0.5
    return y * 0.4


def shankh(dur=3.0, note=57):
    """Conch-shell horn: breathy, slow attack, slight upward bend."""
    n = ns(dur)
    t = secs(n)
    f = midi(note) * (1 + 0.03 * (1 - np.exp(-t / 0.4))) * (1 + 0.004 * np.sin(2 * np.pi * 5 * t))
    y = sum(sine(f * h, n) / h ** 1.3 for h in range(1, 9))
    y = svf(y, 2200, 1.5) + svf(noise(n), f * 3, 4, "bp") * 0.15
    return y * env_adsr(n, 0.35, 0.6, 0.8, 0.9) * 0.4


def blip(freq, dur=0.07):
    n = ns(dur)
    t = secs(n)
    return square(freq, n) * np.exp(-t / (dur * 0.3)) * 0.4


def glitch(dur=0.12, seed=0):
    rng = np.random.default_rng(seed)
    n = ns(dur)
    t = secs(n)
    f = rng.uniform(80, 900)
    y = square(f * (1 + 2 * rng.random() * t / dur), n)
    y = np.round(y * 4) / 4  # bitcrush
    y = y * (rng.random(n // 200 + 1).repeat(200)[:n] > 0.25)
    return (y + 0.4 * noise(n)) * np.exp(-t / (dur * 0.5)) * 0.5


def zap(dur=0.4, seed=0):
    rng = np.random.default_rng(seed)
    n = ns(dur)
    t = secs(n)
    f = 2000 * np.exp(-t / 0.08) + 120
    y = np.sin(2 * np.pi * np.cumsum(f + 900 * rng.standard_normal(n)) / SR)
    crack = svf(noise(n), 5000, 0.8, "hp") * (rng.random(n) > 0.9)
    return (0.5 * y + crack) * np.exp(-t / (dur * 0.3))


def tape_stop(sig, t0, t1):
    """Slow a stereo bus region down to zero like a tape stop."""
    i0, i1 = ns(t0), ns(t1)
    u = np.arange(i1 - i0) / (i1 - i0)
    rate = (1 - u) ** 1.2
    pos = i0 + np.cumsum(rate)
    for c in range(2):
        seg = np.interp(pos, np.arange(N), sig[c])
        sig[c, i0:i1] = seg * (1 - u ** 3)
        sig[c, i1:] = 0


def ir(rt60, n_sec, bright=6000, predelay=0.02, seed=1):
    rng = np.random.default_rng(seed)
    n = ns(n_sec)
    t = secs(n)
    out = []
    for c in range(2):
        nz = rng.standard_normal(n) * np.exp(-6.9 * t / rt60)
        nz = svf(nz, bright * np.exp(-t / (rt60 * 0.6)) + 300, 0.6)
        nz = np.concatenate([np.zeros(ns(predelay)), nz])
        out.append(nz / np.sqrt(np.sum(nz ** 2)))
    return np.array(out)


def pump(times, n_total, depth=0.7, rel=0.28):
    """Sidechain gain envelope (ducks on every kick)."""
    g = np.ones(n_total)
    for t in times:
        i = ns(t)
        m = min(ns(rel), n_total - i)
        if m <= 0:
            continue
        x = np.arange(m) / m
        g[i:i + m] = np.minimum(g[i:i + m], 1 - depth * (1 - x) ** 2)
    return g


def beats(t0, t1, step=T.BEAT, offset=0.0):
    return list(np.arange(t0 + offset, t1 - 1e-6, step))


# ==========================================================================
# ACT 1 — Khodaldham
def act1():
    # --- intro pad: Dm Bb Gm A, filter opening, swelling
    chords = [[50, 53, 57, 62], [46, 50, 53, 58], [43, 50, 55, 58], [45, 49, 52, 57]]
    for k, ch in enumerate(chords):
        t0 = T.INTRO + k * T.BAR
        dur = T.BAR + (0.0 if k < 3 else -0.25)
        p = supersaw(ch, dur + 0.02, cut=500 + 700 * k, a=0.6 if k == 0 else 0.05, r=0.05 if k == 3 else 0.3)
        send(p, t0, 0.22 + 0.05 * k, wet=0.5, big=True)
        sub = sine(midi(ch[0] - 12), ns(dur)) * env_adsr(ns(dur), 0.3, 0.5, 0.8, 0.1)
        send(sub, t0, 0.25 * min(1, k / 2 + 0.3), wet=0)

    # data ticks — "complex graphs computing"
    t = 0.5
    while t < T.GAP1:
        dens = 0.125 if t < 4 else (0.0625 if t < 6.5 else 0.03125)
        f = RNG.choice([1760, 2093, 2349, 2637, 3136, 3520])
        send(blip(f, 0.03), t, 0.10 + 0.08 * t / 8, pan=RNG.uniform(-0.8, 0.8), wet=0.25)
        t += dens
    # heartbeat sub pulses
    for b in beats(2.0, T.GAP1):
        send(kick(0.4, 0.5, 40), b, 0.35 + 0.35 * (b / 8), wet=0.1)
    # riser + snare roll build
    send(riser(T.GAP1 - T.BUILD1, 200, 12000), T.BUILD1, 0.55, wet=0.3)
    t, step = 6.0, 0.125
    while t < T.GAP1 - 0.01:
        send(snare(0.12), t, 0.12 + 0.35 * ((t - 6) / 1.75) ** 2, pan=RNG.uniform(-0.2, 0.2), wet=0.2)
        t += step
        if t > 7.0:
            step = 0.0625
    send(reverse_crash(1.0), T.DROP1 - 1.0, 0.5, wet=0.2)

    # --- DROP 1
    send(boom(3.0), T.DROP1, 0.9, wet=0.3, big=True)
    send(kick(1.2), T.DROP1, 1.0, wet=0.1)
    send(crash(3.0), T.DROP1, 0.55, wet=0.4, big=True)
    groove = Bus()
    kicks = beats(T.DROP1, T.FILM)
    for b in kicks:
        groove.add(kick(1.0), b, 0.95)
    for b in beats(T.DROP1 + T.BEAT, T.FILM, 2 * T.BEAT):
        groove.add(clap(), b, 0.5, 0.1)
    for b in beats(T.DROP1, T.FILM, T.BEAT, T.BEAT / 2):
        groove.add(hat(open_=True), b, 0.35, 0.3)
    for b in beats(T.DROP1, T.FILM, T.BEAT / 4):
        groove.add(hat(), b, 0.18, -0.3)
    # bass 8ths (octave jumps)
    for i, b in enumerate(beats(T.DROP1, T.FILM, T.BEAT / 2)):
        m = 38 if i % 2 == 0 else 50
        n = ns(0.24)
        s = svf(saw(midi(m), n), 900, 1.2) * env_adsr(n, 0.005, 0.1, 0.6, 0.05)
        groove.add(s, b, 0.55)
    # pluck arp 16ths D F A D
    arp = [62, 65, 69, 74, 69, 65]
    for i, b in enumerate(beats(T.DROP1, T.FILM, T.BEAT / 4)):
        s = pluck(midi(arp[i % len(arp)] + 12), 0.4, 0.9, 0.996, seed=i)
        groove.add(s, b, 0.16, pan=0.5 * np.sin(i))
        verb.add(s, b, 0.08)
    # pad with sidechain
    pad = supersaw([50, 53, 57, 62, 65], T.FILM - T.DROP1, cut=3500, a=0.01, r=0.1)
    g = pump(kicks, pad.shape[1])
    groove.add(pad * g, T.DROP1, 0.4)
    tape_stop(groove.x, T.TAPESTOP, T.FILM)
    music.x += groove.x
    verb.x += groove.x * 0.15

    # --- FILM / guitar-string section
    # projector rattle
    t = T.FILM
    while t < T.HIT1 + 0.4:
        send(svf(noise(ns(0.02)), 2500, 2, "bp") * expdec(ns(0.02), 0.004), t, 0.12 * (1 - (t - T.FILM) / 1.5), wet=0.05)
        t += 1 / 18
    send(whoosh(0.9, False), T.FILM, 0.35, wet=0.3)
    # falling dot whistle
    n = ns(T.HIT1 - T.FILM - 0.3)
    fall = sine(2200 * np.exp(-np.linspace(0, 1.4, n)), n) * np.linspace(0, 1, n) ** 2 * 0.15
    send(fall, T.FILM + 0.3, 1.0, wet=0.4)
    # rising drone under the strings
    d0, d1 = T.HIT1, T.DROP2
    n = ns(d1 - d0)
    u = np.linspace(0, 1, n)
    dr = np.zeros(n)
    for m in [38, 45, 50, 57]:
        dr += saw(midi(m) * (1 + 0.003 * RNG.standard_normal()), n)
    dr = svf(dr, 200 + 5000 * u ** 2, 1.5) * (0.1 + 0.9 * u ** 2)
    send(dr * 0.12, d0, 1.0, wet=0.4, big=True)
    send(riser(d1 - 13.5 - 0.1, 300, 14000), 13.5, 0.6, wet=0.3)

    scale = [50, 53, 57, 60, 62, 64, 65, 67, 69, 70, 72, 74, 76, 77, 79, 81, 82, 84, 86]
    for k, h in enumerate(T.HITS):
        strength = 1.0 if k < 3 else max(0.35, 1.0 - 0.05 * k)
        if k < 3:  # big strummed chords on the first three hits
            chord = [[38, 45, 50, 57, 62], [41, 48, 53, 60, 65], [45, 52, 57, 64, 69]][k]
            for j, m in enumerate(chord):
                s = pluck(midi(m), 4.0, 0.75, 0.9985, seed=100 + 10 * k + j)
                s = softclip(s * 1.6, 1.2)
                send(s, h + j * 0.018, 0.30, pan=-0.5 + j * 0.25, wet=0.7, big=True)
            send(kick(0.6, 0.6, 38), h, 0.7, wet=0.2)
            send(boom(2.0, 30, 55, 1.5), h, 0.45, wet=0.3, big=True)
            # shimmer: octave-up sustained sine cluster = goosebumps
            n = ns(3.0)
            sh = sum(sine(midi(m + 24), n) for m in chord[2:]) * env_adsr(n, 0.4, 0.8, 0.5, 1.5) * 0.05
            send(sh, h, 1.0, wet=1.0, big=True)
        else:
            m = scale[min(k + 1, len(scale) - 1)]
            s = pluck(midi(m), 1.6, 0.85, 0.997, seed=300 + k)
            send(s, h, 0.26 * strength, pan=0.3 * np.sin(k * 1.7), wet=0.6, big=True)
            send(kick(0.5, 0.25, 50), h, 0.35 * strength, wet=0.1)
    # --- DROP 2: Navratri garba EDM
    navratri()


def shehnai(notes, t0):
    """notes: list of (step16, len16, midi). Continuous legato line with glide + vibrato."""
    st = T.BEAT / 4
    end = max(s + l for s, l, _ in notes) * st
    n = ns(end + 0.3)
    f = np.zeros(n)
    amp = np.zeros(n)
    for s, l, m in notes:
        i0, i1 = ns(s * st), ns((s + l) * st)
        f[i0:] = midi(m)
        seg = np.arange(i1 - i0) / SR
        amp[i0:i1] = np.minimum(1, seg / 0.02) * np.clip(((i1 - i0) / SR - seg) / 0.03, 0.25, 1)
        # grace note from above on longer notes
        if l >= 2:
            g = ns(0.035)
            f[i0:i0 + g] = midi(m + 1)
    amp[ns(end):] = 0
    # glide
    f = signal.lfilter([0.004], [1, -0.996], f, zi=[f[0] * 0.996])[0]
    t = secs(n)
    vib = 1 + 0.012 * np.sin(2 * np.pi * 5.6 * t) * np.clip(t % 0.5 / 0.25, 0, 1)
    ff = f * vib
    y = 0.6 * saw(ff, n) + 0.5 * square(ff, n)
    y = svf(y, 1250, 2.5, "bp") * 1.6 + svf(y, 3600, 0.7) * 0.35
    amp = svf(amp, 40, 0.7)
    return y * amp, t0


def navratri():
    t0, t1 = T.DROP2, T.FINALE1
    send(boom(3.0), t0, 0.9, wet=0.3, big=True)
    send(crash(3.0), t0, 0.6, wet=0.4, big=True)
    st = T.BEAT / 4
    kicks = beats(t0, t1)
    for b in kicks:
        send(kick(1.1), b, 0.9, wet=0.05)
    for bar in range(6):
        b0 = t0 + bar * T.BAR
        fill = bar == 5
        for s in range(16):
            tt = b0 + s * st
            if s in (0, 3, 6, 10, 12) or (fill and s >= 8):
                send(dhol_low(), tt, 0.55 if not fill else 0.45 + 0.03 * (s - 8), pan=-0.15, wet=0.15)
            if s in (2, 5, 8, 9, 11, 14, 15) or (fill and s % 2 == 1):
                send(dhol_high(), tt, 0.35, pan=0.25, wet=0.15)
            if s in (2, 6, 10, 14):
                send(dandiya(), tt, 0.6, pan=RNG.uniform(-0.6, 0.6), wet=0.2)
            if s in (4, 12):
                send(clap(), tt, 0.45, wet=0.25)
            send(hat(), tt, 0.10 if s % 2 else 0.16, pan=0.4, wet=0)
            if s % 4 == 2:
                send(hat(open_=True), tt, 0.18, pan=-0.4, wet=0.05)
        # bass tresillo
        root = [38, 39, 38, 36, 38, 39][bar]
        for s in (0, 3, 6, 8, 11, 14):
            n = ns(0.2)
            m = root + (12 if s in (6, 14) else 0)
            y = svf(saw(midi(m), n) + 0.6 * square(midi(m), n), 700, 1.3) * env_adsr(n, 0.004, 0.08, 0.5, 0.04)
            send(y, b0 + s * st, 0.5, wet=0)
        # chord stabs on offbeats with sidechain feel
        chord = [[62, 66, 69], [63, 67, 70], [62, 66, 69], [60, 63, 67], [62, 66, 69], [63, 67, 70]][bar]
        for s in (2, 6, 10, 14):
            p = supersaw(chord, 0.22, voices=5, cut=4200, a=0.003, r=0.08)
            send(p, b0 + s * st, 0.28, wet=0.35)
        pad = supersaw([c - 12 for c in chord] + [chord[0] + 12], T.BAR, cut=1800, a=0.05, r=0.2)
        g = pump(beats(b0, b0 + T.BAR), pad.shape[1], 0.8)
        send(pad * g, b0, 0.22, wet=0.3)
    # shehnai-like lead melody (phrygian dominant)
    mel = [(0, 2, 74), (2, 2, 75), (4, 2, 74), (6, 1, 72), (7, 1, 70), (8, 4, 69), (12, 2, 70), (14, 2, 72),
           (16, 3, 74), (19, 1, 75), (20, 2, 78), (22, 2, 75), (24, 2, 74), (26, 2, 72), (28, 4, 74),
           (32, 2, 81), (34, 2, 79), (36, 2, 78), (38, 2, 79), (40, 2, 81), (42, 2, 82), (44, 4, 81),
           (48, 2, 79), (50, 2, 78), (52, 2, 75), (54, 2, 74), (56, 8, 74),
           (64, 2, 74), (66, 2, 75), (68, 2, 74), (70, 1, 72), (71, 1, 70), (72, 4, 69), (76, 2, 70), (78, 2, 72),
           (80, 1, 74), (81, 1, 75), (82, 1, 78), (83, 1, 79), (84, 1, 81), (85, 1, 82), (86, 1, 84), (87, 1, 86),
           (88, 8, 86)]
    lead, _ = shehnai(mel, t0)
    send(lead, t0, 0.26, wet=0.35)
    # bell doubling one octave up (pluck)
    for s, l, m in mel:
        send(pluck(midi(m + 12), 0.5, 1.0, 0.995, seed=int(s)), t0 + s * st, 0.07, pan=0.4, wet=0.3)
    # temple reveal: conch + temple bell
    send(shankh(3.2, 57), T.TEMPLE, 0.55, wet=0.6, big=True)
    send(temple_bell(4.0, 520), T.TEMPLE, 0.45, pan=-0.3, wet=0.6, big=True)
    send(temple_bell(3.0, 780), T.TEMPLE + 1.0, 0.25, pan=0.4, wet=0.6, big=True)
    # nine Navratri colours: manjira on every beat
    for k in range(9):
        send(manjira(), T.COLORS9 + k * T.BEAT, 0.4, pan=0.5 * (-1) ** k, wet=0.4)
    # fill riser + roll into the finale
    send(riser(1.5, 400, 12000), t1 - 1.5, 0.45, wet=0.2)
    send(reverse_crash(0.8), t1 - 0.8, 0.5)
    # FINALE hit + long fade into silence
    send(boom(4.0, 26, 70, 2.8), T.FINALE1, 1.0, wet=0.4, big=True)
    send(kick(1.3), T.FINALE1, 1.0)
    send(crash(4.0), T.FINALE1, 0.7, wet=0.6, big=True)
    for m, pn in [(50, -0.3), (54, 0.3), (57, -0.1), (62, 0.1), (66, 0.2), (74, -0.2)]:
        s = pluck(midi(m), 4.5, 0.8, 0.9988, seed=int(m))
        send(softclip(s * 1.5, 1.2), T.FINALE1, 0.2, pan=pn, wet=0.8, big=True)
    n = ns(T.BLACK1 - T.FINALE1)
    u = np.linspace(0, 1, n)
    tail = supersaw([50, 57, 62, 66, 69], T.BLACK1 - T.FINALE1, cut=2500, a=0.02, r=0.1)
    tail[0] = svf(tail[0], 2500 * (1 - u) ** 3 + 120, 0.8)
    tail[1] = svf(tail[1], 2500 * (1 - u) ** 3 + 120, 0.8)
    send(tail * (1 - u) ** 2, T.FINALE1, 0.35, wet=0.6, big=True)


# ==========================================================================
# ACT 2 — BS9 News
def act2():
    send(ping(1400), T.DOT, 0.45, wet=0.5, big=True)
    # zoom whoosh + rumble + airy pad
    zdur = T.CITY - T.ZOOM
    send(riser(zdur, 150, 7000, 1.5, tonal=False), T.ZOOM, 0.75, wet=0.3)
    n = ns(zdur)
    u = np.linspace(0, 1, n)
    rumble = svf(noise(n), 90 + 150 * u, 0.8) * (u ** 1.5) * 1.6
    send(rumble, T.ZOOM, 0.9, wet=0.1)
    pad = supersaw([50, 57, 64, 65, 69], zdur + 1.0, cut=1600, a=1.5, r=1.0)
    send(pad, T.ZOOM, 0.4, wet=0.8, big=True)
    for b in beats(T.ZOOM + 1.0, T.CITY, 1.0):  # slow heartbeat while diving to earth
        send(kick(0.5, 0.5, 40), b, 0.5, wet=0.2)
        send(kick(0.4, 0.4, 40), b + 0.22, 0.3, wet=0.2)
    for k in range(4):  # target-lock beeps during map
        send(blip(2637, 0.05), T.MAPX + 0.9 + 0.18 * k, 0.28, pan=0.3, wet=0.3)
    send(fm_bell(81, 2.5), T.CITY - 0.6, 0.18, wet=0.6, big=True)

    # city: pulse bass, data arps, kick
    t0, t1 = T.CITY, T.FRACT
    arp = [62, 65, 69, 72, 74, 72, 69, 65]
    for i, b in enumerate(beats(t0, T.COLLIDE - 0.1, T.BEAT / 4)):
        u = (b - t0) / (T.COLLIDE - t0)
        send(blip(midi(arp[i % 8] + 12), 0.06), b, 0.12 + 0.12 * u, pan=0.6 * np.sin(i * 0.7), wet=0.3)
    for i, b in enumerate(beats(t0, T.COLLIDE - 0.1, T.BEAT / 2)):
        n = ns(0.22)
        send(svf(saw(midi(38), n), 400 + 1500 * (b - t0) / 5.5, 1.5) * env_adsr(n, 0.004, 0.1, 0.5, 0.05), b, 0.45, wet=0)
    for b in beats(t0 + 1.0, T.COLLIDE - 0.1):
        send(kick(0.9), b, 0.75, wet=0.05)
    for k in range(26):  # random data blips (roads carrying data)
        tt = t0 + RNG.uniform(0, 5.3)
        send(blip(RNG.choice([3520, 4186, 2960]), 0.025), tt, 0.1, pan=RNG.uniform(-1, 1), wet=0.3)
    n = ns(T.COLLIDE - t0)
    hum = sum(sine(50 * h, n) / h for h in (1, 2, 3, 5)) * 0.05
    send(hum, t0, 1.0, wet=0)

    # fractals: two tones converge (blue sine up, red saw down), snare roll, riser
    fd = T.COLLIDE - T.FRACT - 0.1
    n = ns(fd)
    u = np.linspace(0, 1, n)
    blue = sine(midi(62) * 2 ** (-7 * (1 - u) / 12), n) * u
    red = svf(saw(midi(74) * 2 ** (7 * (1 - u) / 12), n), 3000, 1) * u
    send(blue, T.FRACT, 0.2, pan=-0.6, wet=0.4)
    send(red, T.FRACT, 0.12, pan=0.6, wet=0.4)
    send(riser(fd, 300, 15000), T.FRACT, 0.55, wet=0.3)
    t, step = T.FRACT + 0.5, 0.125
    while t < T.COLLIDE - 0.1:
        send(snare(0.12), t, 0.12 + 0.3 * ((t - T.FRACT) / fd) ** 2, wet=0.2)
        t += step
        if t > T.COLLIDE - 1.0:
            step = 0.0625
    send(reverse_crash(1.2), T.COLLIDE - 1.2, 0.6)

    # COLLISION
    send(boom(4.0, 24, 80, 3.5), T.COLLIDE, 1.1, wet=0.5, big=True)
    send(kick(1.4), T.COLLIDE, 1.0)
    send(crash(4.0), T.COLLIDE, 0.8, wet=0.6, big=True)
    n = ns(0.9)  # "multimeter" buzz
    buzz = np.round(square(60, n) * 3) / 3 * expdec(n, 0.25)
    send(svf(buzz, 3000, 0.7), T.COLLIDE, 0.25, wet=0.2)
    for k in range(6):
        send(glitch(0.08, k), T.COLLIDE + 0.12 + 0.1 * k, 0.35, pan=RNG.uniform(-0.8, 0.8), wet=0.2)

    # giant glow soaks everything in: reverse swell + accelerating heartbeat
    gd = T.CUTS - T.GLOW
    sw = crash(gd)[::-1]
    send(svf(sw, 2000, 0.7) * 1.2, T.GLOW, 0.8, wet=0.5, big=True)
    n = ns(gd)
    u = np.linspace(0, 1, n)
    send(sine(55 * 2 ** (2 * u ** 2), n) * u * 0.5, T.GLOW, 0.5, wet=0.3)
    t, step = T.GLOW + 0.2, 0.5
    while t < T.CUTS - 0.05:
        send(kick(0.5, 0.35, 42), t, 0.55, wet=0.1)
        t += step
        step = max(0.14, step * 0.82)

    # jump cuts
    for k, b in enumerate(beats(T.CUTS, T.LOCK, T.BEAT / 4)):
        send(glitch(0.11, 50 + k), b, 0.5, pan=0.7 * (-1) ** k, wet=0.15)
        send(kick(0.8, 0.12, 60), b, 0.3)
    send(riser(T.LOCK - T.CUTS, 800, 16000, 2.0, tonal=False), T.CUTS, 0.35)

    news()


def news():
    t0, t1 = T.LOCK, T.NEWS_END
    # BWAAM
    send(boom(3.0, 30, 70, 2.5), t0, 0.9, wet=0.3, big=True)
    send(crash(3.5), t0, 0.6, wet=0.5, big=True)
    send(timpani(38, 2.0), t0, 0.8, wet=0.4, big=True)
    Dm, Bb, Gm, A = [38, 50, 53, 57, 62, 65, 69], [34, 46, 50, 53, 58, 62, 65], [31, 43, 50, 55, 58, 62, 67], [33, 45, 49, 52, 57, 61, 64]
    chords = [(t0, Dm), (t0 + 2, Bb), (t0 + 4, Gm), (t0 + 6, Dm), (t0 + 8, Bb), (T.STINGER, A)]
    for i, (tt, ch) in enumerate(chords):
        dur = 2.0
        brass = supersaw(ch, dur, voices=5, cut=3500 if i in (0, 3) else 2600, a=0.02, r=0.4, q=1.2)
        send(softclip(brass * 1.5, 1.3), tt, 0.33 if i in (0, 3, 5) else 0.22, wet=0.4, big=True)
        send(timpani(ch[0] + 12, 1.2), tt, 0.5, wet=0.4)
        last = i == len(chords) - 1
        for k, b in enumerate(beats(tt, tt + (1.0 if last else dur), T.BEAT / 4)):
            m = ch[0] + 24 + (12 if k % 4 == 2 else 0)
            n = ns(0.09)
            y = svf(saw(midi(m), n) + saw(midi(m) * 1.005, n), 3000, 1.0) * env_adsr(n, 0.002, 0.03, 0.3, 0.03)
            send(y, b, 0.14, pan=0.35 * (-1) ** k, wet=0.1)
        for b in beats(tt, tt + (1.0 if last else dur)):
            send(kick(1.0), b, 0.7)
        for b in beats(tt + T.BEAT, tt + dur, 2 * T.BEAT):
            send(snare(), b, 0.35, wet=0.2)
    # news bell motif (twice)
    for rep in (0, 6):
        for k, m in enumerate([81, 77, 74, 69, 81, 77, 74, 76]):
            send(fm_bell(m, 1.5), t0 + rep + 0.5 + k * 0.5, 0.11, pan=0.5 * np.sin(k), wet=0.5)
    # video wall: card flips
    for k, b in enumerate(beats(T.WALL, T.LOWER3, T.BEAT)):
        send(whoosh(0.25), b - 0.1, 0.25, pan=0.6 * np.sin(k * 1.3), wet=0.2)
        send(blip(2093 + 200 * (k % 4), 0.03), b, 0.15, pan=0.6 * np.sin(k * 1.3), wet=0.2)
    # lower third swoosh
    send(whoosh(0.7), T.LOWER3 - 0.3, 0.5, pan=-0.5, wet=0.3)
    send(boom(1.5, 35, 70, 1.5), T.LOWER3, 0.4, wet=0.3)
    # ticker ticks
    for b in beats(T.LOWER3, T.STINGER, T.BEAT / 2):
        send(blip(4186, 0.015), b, 0.07, pan=0.8, wet=0)
    # final stinger
    send(boom(3.0, 28, 70, 2.8), T.STINGER, 0.9, wet=0.4, big=True)
    send(crash(3.0), T.STINGER, 0.6, wet=0.5, big=True)
    send(timpani(45, 1.5), T.STINGER, 0.8, wet=0.5, big=True)
    t = T.STINGER + 1.0
    while t < t1 - 0.5:
        send(timpani(45, 0.3), t, 0.2 + 0.2 * (t - T.STINGER - 1.0), wet=0.2)
        t += 0.0625
    send(boom(2.0, 30, 80, 2.5), t1 - 0.5, 0.8, wet=0.4, big=True)
    send(crash(2.0), t1 - 0.5, 0.5, wet=0.4, big=True)
    send(whoosh(0.8), t1 - 0.4, 0.5, wet=0.3)


# ==========================================================================
# ACT 3 — Wayonaa EV
def act3():
    t0 = T.WAY
    send(boom(2.5, 30, 60, 2.0), t0, 0.6, wet=0.4, big=True)
    for k in range(8):
        send(zap(0.3, k), t0 + 0.1 + k * 0.23 + RNG.uniform(0, 0.08), 0.35, pan=RNG.uniform(-0.8, 0.8), wet=0.3)
    # power-up whine
    pd = T.WAY_RIDE - t0
    n = ns(pd)
    u = np.linspace(0, 1, n)
    f = 80 * 2 ** (4.5 * u ** 1.5)
    wh = (sine(f, n) + 0.3 * sine(2 * f, n) + 0.15 * sine(3 * f, n)) * u ** 1.5
    send(wh, t0, 0.16, wet=0.3)
    send(riser(pd, 300, 12000), t0, 0.35, wet=0.2)

    # synthwave groove, D major: D A Bm G | D G A D
    D, A, Bm, G = [50, 54, 57, 62], [45, 49, 52, 57], [47, 50, 54, 59], [43, 47, 50, 55]
    r = T.WAY_RIDE
    prog = [(r, 2.0, D), (r + 2, 2.0, A), (r + 4, 1.0, Bm),
            (T.WAY_CHARGE, 1.0, G), (T.WAY_CHARGE + 1, 1.0, A),
            (T.WAY_LOGO, 2.0, D), (T.WAY_LOGO + 2, 1.0, G), (T.WAY_LOGO + 3, 1.0, A)]
    # model name hits (G-Razor / G-One / G-Lite)
    for k in range(3):
        tt = r + 2.0 + k * 1.0
        send(whoosh(0.3), tt - 0.15, 0.35, pan=0.5, wet=0.2)
        send(zap(0.25, 40 + k), tt, 0.22, pan=0.4, wet=0.3)
    kicks = beats(T.WAY_RIDE, T.ENDCARD)
    for b in kicks:
        send(kick(1.0), b, 0.85)
    for b in beats(T.WAY_RIDE + T.BEAT, T.ENDCARD, 2 * T.BEAT):
        send(clap(), b, 0.45, wet=0.3)
    for b in beats(T.WAY_RIDE, T.ENDCARD, T.BEAT / 2, T.BEAT / 4):
        send(hat(), b, 0.16, pan=0.3)
    for tt, dur, ch in prog:
        pad = supersaw([c + 12 for c in ch], dur, cut=3200, a=0.01, r=0.1)
        g = pump(beats(tt, tt + dur), pad.shape[1], 0.75)
        send(pad * g, tt, 0.3, wet=0.3)
        for k, b in enumerate(beats(tt, tt + dur, T.BEAT / 2)):
            n = ns(0.22)
            m = ch[0] - 12 + (12 if k % 2 else 0)
            send(svf(saw(midi(m), n), 1100, 1.2) * env_adsr(n, 0.003, 0.1, 0.5, 0.05), b, 0.5)
        arp = [ch[0] + 24, ch[1] + 24, ch[2] + 24, ch[3] + 24]
        for k, b in enumerate(beats(tt, tt + dur, T.BEAT / 4)):
            send(pluck(midi(arp[k % 4]), 0.35, 1.0, 0.995, seed=k), b, 0.1, pan=0.5 * (-1) ** k, wet=0.3)
    # scooter drive-by (doppler)
    n = ns(2.0)
    u = np.linspace(-1, 1, n)
    f = 420 * (1 - 0.25 * np.tanh(3 * u))
    mot = (sine(f, n) + 0.4 * sine(2 * f, n) + 0.2 * saw(3 * f, n)) * np.exp(-3 * u ** 2)
    fx.add(mot * 0.22, T.WAY_RIDE + 1.6, 1.0, 0)
    send(whoosh(1.2), T.WAY_RIDE + 2.0, 0.4, wet=0.3)
    # charging blips rising
    t = T.WAY_CHARGE
    k = 0
    while t < T.WAY_LOGO - 0.05:
        send(blip(600 * 2 ** (k / 8), 0.05), t, 0.18, pan=0.2, wet=0.2)
        t += 0.125
        k += 1
    send(riser(2.0, 300, 14000), T.WAY_CHARGE, 0.45, wet=0.2)
    send(reverse_crash(0.8), T.WAY_LOGO - 0.8, 0.5)
    # logo hit
    send(boom(3.0, 30, 75, 2.5), T.WAY_LOGO, 0.9, wet=0.4, big=True)
    send(crash(3.5), T.WAY_LOGO, 0.6, wet=0.5, big=True)
    for k in range(3):
        send(zap(0.35, 20 + k), T.WAY_LOGO + 0.05 * k, 0.3, pan=(k - 1) * 0.6, wet=0.3)
    n = ns(3.0)
    shim = sum(sine(midi(m), n) for m in (86, 90, 93, 98)) * env_adsr(n, 0.2, 1.0, 0.4, 1.5) * 0.04
    send(shim, T.WAY_LOGO, 1.0, wet=1.0, big=True)

    # end card: resolve on D major, long tail
    e0 = T.ENDCARD
    send(boom(3.0, 30, 60, 2.0), e0, 0.8, wet=0.4, big=True)
    send(crash(4.5), e0, 0.5, wet=0.6, big=True)
    fin = supersaw([38, 50, 57, 62, 66, 69, 74], T.TOTAL - e0, cut=3000, a=0.01, r=3.0)
    send(fin, e0, 0.3, wet=0.6, big=True)
    for j, m in enumerate([50, 57, 62, 66, 69, 74, 78]):
        s = pluck(midi(m), 5.0, 0.8, 0.9988, seed=500 + j)
        send(s, e0 + j * 0.02, 0.16, pan=-0.6 + j * 0.2, wet=0.8, big=True)
    send(fm_bell(86, 3.0), e0 + 1.0, 0.12, wet=0.8, big=True)
    for i, m in enumerate([74, 78, 81]):  # the three logos popping in
        send(fm_bell(m, 2.0), e0 + 0.3 + i * T.BEAT, 0.16, pan=(i - 1) * 0.5, wet=0.6, big=True)
        send(kick(0.6, 0.3, 50), e0 + 0.3 + i * T.BEAT, 0.3, wet=0.2)


def main():
    os.makedirs(OUT, exist_ok=True)
    act1()
    act2()
    act3()
    wet = np.zeros_like(music.x)
    for bus, rt, bright, amt in [(verb, 1.6, 7000, 0.9), (longverb, 4.5, 5000, 1.0)]:
        h = ir(rt, rt * 1.3, bright)
        for c in range(2):
            wet[c] += signal.fftconvolve(bus.x[c], h[c])[:N] * amt
    mix = music.x + fx.x + wet
    # master automation: celebration slowly sinks into total silence before the blue dot
    tt = np.arange(N) / SR
    g = np.ones(N)
    m = (tt >= T.FADE1) & (tt < T.DOT - 0.02)
    g[m] = np.clip(1 - (tt[m] - T.FADE1) / (T.BLACK1 + 0.3 - T.FADE1), 0, 1) ** 2
    mix *= g
    # gentle bus glue + limiter-ish soft clip
    mix = svf(mix[0], 30, 0.7, "hp"), svf(mix[1], 30, 0.7, "hp")
    mix = np.vstack(mix)
    peak = np.percentile(np.abs(mix), 99.95)
    mix = softclip(mix / peak * 0.9, 1.3) * 0.93
    # fade ends
    fo = ns(1.5)
    end = ns(T.TOTAL)
    mix[:, end - fo:end] *= np.linspace(1, 0, fo)
    mix[:, end:] = 0
    mix = mix[:, :end]
    wavfile.write(os.path.join(OUT, "soundtrack.wav"), SR, (mix.T * 32767).astype(np.int16))
    print("wrote soundtrack", mix.shape[1] / SR, "s; hits:", [round(h, 3) for h in T.HITS])


if __name__ == "__main__":
    main()
