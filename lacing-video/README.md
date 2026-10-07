# ડિઝાઇન સેફ છે (The Design Is Safe): single lacing music video

`Design_Safe_Che.mp4` is a 1920×1080, 60 fps, 2:56 lyric and 3D motion-graphics video for the Gujarati song about this
design problem:

> Design a single lacing system for a column made of 2 × ISMC 350 placed back-to-back at a clear spacing of 240 mm,
> carrying an axial compressive load of 1000 kN. The effective length of the column is 5 m. (IS 800:2007, limit state method)

Every frame is drawn in code. The built-up column, the lacing flats and the M16 bolts are real 3D models at true
scale (ISMC 350, a = 680 mm, flats 50 × 14 mm), lit with key, rim and fill lights, and finished with bloom, haze, light shafts and a film grade.
The camera, cuts, flashes and pulses follow the song's 150 BPM beat grid. Each lyric line appears at the bottom with a
karaoke sweep and an English translation underneath.

## What happens when

| Time | Section | On screen |
|---|---|---|
| 0:00 | Cold open | Title "ડિઝાઇન સેફ છે / THE DESIGN IS SAFE" resolves out of a blur |
| 0:04 | Input data | Two ISMC 350 channels forge upward in sparks; s = 240 mm; LIMIT STATE METHOD; 1000 kN × 1.5 → 1500 kN; L = 5 m; Fe 410; INPUT DATA card |
| 0:20 | Verse 1 | γm0 = 1.10 and γmb = 1.25; top view with section properties and the rz/ry ellipse; gauge lines g = 50 and a₁ = 340; the 45° angle; lacing bars cascade up the column; a = 680 mm; SLENDERNESS CHECK → 24.03 |
| 0:45 | Break | Slow-motion bolt, "24.03 ≤ 50 ?" |
| 0:49 | Checks | Gauges for 24.03 vs 50 and vs 0.7 × 36.6 = 25.62; NO LOCAL BUCKLING; clause 7.6.6.1; Vt = 37.5 kN; 18.75 kN per lacing plane; F = V / sin θ force triangle → 26.52 kN in every bar |
| 1:18 | Instrumental | Flythrough inside the column, then the SINGLE LACING title reveal and a white-out |
| 1:34 | Chorus | Hero shot of one flat: l = 480.83, t = 14, b = 50; bolts drive in (CONNECTION SET); r = 4.04, λ = 119; Pd = 59.36 kN > 26.52 kN → PASS; orbit of the whole column and a final PASS |
| 2:02 | Breakdown | The flat in tension: net section (50 − 18) × 14, Tdn = 132.23 kN, "બધું છે સુરક્ષિત"; then the full column builds |
| 2:15 | Verse 3 | Macro of the M16 bolt: shear plane 28.98 kN, bearing 86.8 kN, 26.52 / 28.98 = 0.92 → 1 bolt; FINAL DESIGN SUMMARY card; labels on the column; end distance e = 30 mm; title drop with gold sparks |
| 2:44 | Outro | Slow orbit of the backlit column, the spec line, fade to black |

## Notes on the content

- The lyric sings "F = V sin theta", but the force in a lacing bar is F = V / sin θ. The video shows the correct
  formula, and the on-screen lyric caption for that line uses it too.
- A few lyric captions have small display fixes: the γ symbols the subtitles dropped, × for "ગુણ્યા", 45°, a₁.
- The Tdn value is shown as 132.23 kN because that is what the song sings. Working it through,
  0.9 × 448 × 410 / 1.25 comes to about 132.25 kN.

## How it was made

1. **Song analysis** (`source/analysis/`). The subtitle file only gives evenly spaced placeholder times, so the
   timing comes from the audio. `grid.py` fits a 150 BPM beat grid (`grid.json`). The song is built from 2-bar
   "slots", and every lyric line starts on one. `slots.py`, `center.py` (centre-channel vocal isolation and
   spectrograms), `selfsim.py` and `vsim.py` (slot self-similarity) show where the vocals sit and which slots repeat.
   `build_data.py` then writes `features.json` (loudness, bass, kick and snare at 60 fps, 24 spectrum bands) and
   `timeline.json` (line times, captions, translations and song sections).
2. **Rendering** (`source/render/`). This is a Node renderer on `@napi-rs/canvas`:
   - `world.js` is a small 3D engine: camera, painter's algorithm with clipping and culling, Blinn-Phong lights, fog and edge lines. It also holds the column, flat and bolt models.
   - `post.js` does the bloom, grade, chromatic aberration, flashes, vignette, letterbox and grain.
   - `kit.js` holds the shared pieces: stage, callouts, gauges, cards and the lyric rail.
   - `sc_a.js`, `sc_b.js` and `sc_c.js` are the scenes.

   Each frame depends only on its timestamp, so four workers render chunks in parallel. ffmpeg encodes them and adds the song.

## Re-running the analysis

Run these from `lacing-video/source` (they need `librosa`, `scipy`, `soundfile` and `matplotlib`):
`python analysis/grid.py` (grid.json), then `python analysis/build_data.py` (features.json and timeline.json).
The other scripts only print tables or draw spectrograms for checking the timing.

To move a lyric line, change its slot number in the `slots` list in `build_data.py`, or edit the `t`/`end` times in
`timeline.json` directly. Every effect tied to that line moves with it, because the scenes are timed from the
line starts (`LT(i)`).

## Re-rendering

```bash
cd lacing-video/source
./fetch_fonts.sh                     # open-licensed Google Fonts (Hind Vadodara, Mukta Vaani, Barlow, Chakra Petch)
(cd render && npm install)
node render/main.js still preview.png 113.5        # one frame at 113.5 s
node render/main.js still sheet.png 10 50 90 130   # contact sheet of several times
./render.sh                          # full video -> out/Design_Safe_Che.mp4
```

The system also needs `ffmpeg` (libx264) and DejaVu Sans.
