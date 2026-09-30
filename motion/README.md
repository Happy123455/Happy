# Khodaldham → BS9 News → Wayonaa EV — motion graphic

A 78-second, 1920×1080 / 30 fps motion graphic with its own synthesised soundtrack.
Everything — visuals, music and sound effects — is generated in code from the three
brands' logos, so it can be re-timed or re-rendered at any resolution.

## Storyboard

| Time | Segment | What happens | Sound |
|---|---|---|---|
| 0–8 s | Intro | Dark sci-fi 3D field: wireframe surface, contour lines, orbit loops, HUD graphs; particles swirl and implode | Pad, data ticks, heartbeat, riser, snare roll |
| 8 s | **Drop** | Points burst out and join point to point into the **Shree Khodaldham** logo | Boom + drop groove |
| 10.5 s | Film strip | The music stops like a tape; the logo rolls like old film and a glowing dot falls into the next frame | Projector rattle, falling whistle |
| 11.5–15.9 s | Guitar strings | The dot bounces under gravity on guitar strings. Each hit plucks the strings, the logo vibrates like a guitar note and turns into its next version (English → Gujarati → Maa Khodal medallion). Bounces get faster and add more strings | Karplus-Strong guitar chords rising, drone crescendo |
| 16–28 s | Navratri | Ball bursts into a mandala. **Khodaldham temple (Kagvad)** is drawn in light with its flag, garba rings dance, fireworks go off. Then the **nine colours of Navratri** play one per beat, leading to a finale with "NAVRATRI 2026" | EDM garba: dhol, dandiya, shehnai lead, conch and temple bell, manjira |
| 28–32 s | Fade | The logo burns into embers → black silence | Tail fades to silence |
| 32–37.5 s | BS9: Earth | A single blue dot becomes Earth, rotates to India, zooms to Gujarat/Saurashtra, locks onto **Rajkot 22.30°N 70.80°E** | Sonar ping, whoosh, heartbeat |
| 37.5–41 s | Rajkot 3D | City rises: zones (Race Course, Kalawad Rd, Gondal Rd, Raiya, Mavdi, Aji Dam…), buildings, roads carrying blue/red data like circuit traces | Data arps, pulse bass |
| 41–43 s | Fractals | Blue and red 3D fractals grow and collide | Converging tones, riser |
| 43 s | Collision | Shockwave, meter readings spike | Massive impact |
| 43.5–45.5 s | Glow | A giant monitoring glow pulls everything in | Reverse swell, heartbeat |
| 45.5–47 s | Jump cuts | The BS9 logo is built part by part in glitch cuts, then rotates into place on blue | Glitch hits |
| 47–59 s | News package | Logo on blue with globe; video wall (Local news, Politics, Traffic, Weather, Community, Sports); BREAKING NEWS lower third, ticker, LIVE bug; final stinger | News theme: staccato, brass, timpani, bells |
| 59–61 s | Wayonaa power-up | Electric arcs charge a ring to 100% | Zaps, power-up whine |
| 61–66 s | Ride | A neon scooter is drawn in light and rides through a night city; **G-RAZOR / G-ONE / G-LITE**; 80 KM range | Synthwave groove, drive-by |
| 66–68 s | Charge | Battery fills to 100% | Charging blips, riser |
| 68–72 s | Logo | The W chevrons slash in, WAYONAA wipes on, "THE SMART WAY TO MOVE" | Hit + shimmer |
| 72–78 s | End card | NAVRATRI 2026, with all three logos | Final D-major chord |

## Build

```bash
pip install numpy scipy pillow opencv-python-headless scikit-image numba imageio-ffmpeg
python3 prep_assets.py          # cut logos out of their backgrounds -> assets/logos
python3 audio.py                # -> build/soundtrack.wav
python3 render.py video         # -> build/khodaldham_bs9_wayonaa.mp4 (uses all cores)
python3 render.py still 8.7 20  # quick look at single frames
MG_W=960 MG_H=540 python3 render.py video   # fast low-res preview
```

Timings live in `timeline.py`; both `audio.py` and the scene files (`s1_khodal.py`,
`s2_bs9.py`, `s3_way.py`) read from it, so moving a cue keeps picture and sound in sync.

## Credits for assets
- Logos: supplied by the client (`assets/src`).
- Earth textures: three.js example textures (NASA Blue Marble / Black Marble derived).
- Coastlines: Natural Earth (public domain).
- Fonts: Google Fonts (SIL Open Font License): Orbitron, Montserrat, Rajdhani, Anton, Oswald, Teko, Noto Sans Gujarati.
