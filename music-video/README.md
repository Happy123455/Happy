# Low Shear, High Capacity: music video

`Low_Shear_High_Capacity.mp4` is a 1920×1080, 30 fps, 3:48 lyric/motion-graphics video for the song.
Every frame is drawn in code and timed to the song. The lyrics appear word-by-word as they are sung, and the
diagrams draw themselves on the matching words. The camera punches and shakes on the kicks and big hits.

## What happens when

| Time | Section | On screen |
|---|---|---|
| 0:00 | Cold open | Chalk title writes itself; three chalk taps, then the chalk snaps |
| 0:09 | Roll call | 5TH SEMESTER, a phone gets slapped away, eyes on the board |
| 0:14 | Midterm | Half the class gets an F; PIN (2 reactions) ≠ ROLLER (1 reaction) |
| 0:19 | Today | "Lateral stability check" plus a 3D ISMB 300 flying in |
| 0:24 | Real world | Roof beam cracks and collapses on the bass hit |
| 0:29 | Hit the track | Silence, a spotlight, then the drop |
| 0:32 | Title drop | Spinning 3D steel beam, spec chips on every beat, match-cut to the chalk beam |
| 0:41 | Verse 1 | Problem card, simply supported beam, 40 kN/m UDL, deflection, BMD → 125 kNm, SFD → 100 kN, EXIT-sign gag, "difficulty: first-year" card |
| 1:13 | Pre-chorus | Notebook, warp-speed "staring into space", building inspector chase, boundary conditions, eye zoom |
| 1:24 | Chorus | 3D beam with the compression flange lit up, lateral braces slam on, red LTB "ghost" crossed out, the LTB equations get bypassed, elastic → fully plastic stress block, FACT. |
| 1:45 | Verse 2 | IS 800:2007 opens to page 18; blueprint section classification: b/t_f = 5.64 < 9.4ε, d/t_w = 32.96 < 84ε, β_b = 1.0, plastic hinge forms |
| 2:12 | Bridge | Tempo dial winds down, breathing circle, web shear element, V_d = 295.27 kN, low-shear zone (100 < 177.2 kN) |
| 2:42 | Drop | High-shear reduction formula crossed out → NO REDUCTION, full-strength battery, X-braces for "BRACE YOURSELVES" |
| 2:51 | Verse 3 | Plastic modulus Z_p = 651.7×10³ mm³, M_d = 148.1 kNm hero shot, DEMAND vs CAPACITY, ADEQUATE (0.84), elastic limit 156.4 kNm |
| 3:14 | Verdict | Design report with every check ticked, PASSED, safe & secure, change-of-major form, CLASS DISMISSED + mic drop |
| 3:29 | Finale | Recap cards cut on the beat, end card on the last three hits |

## How it was made

1. **Song analysis** (`source/analysis/`): librosa gives the tempo (≈ 90.6 BPM), beat times, per-frame
   loudness and drum hits. The line timings come from the lyric track inside the Suno file. `pocketsphinx`
   then force-aligns every word inside each line, so each word has its own start time (`source/lyrics.json`).
2. **Rendering** (`source/render/`): a Node script draws each frame with `@napi-rs/canvas`. Each frame depends
   only on its timestamp, so four workers can render chunks in parallel. ffmpeg encodes the frames and adds the song.

## Re-running the analysis

Run these from `music-video/source`. They read `song.m4a` and write the JSON files next to it:
`python analysis/analyze.py` (beats.npy), `python analysis/feats.py` (features.json),
`python analysis/make_beats.py` (beats.json), `ffmpeg -i song.m4a -map 0:s:0 subs.srt`,
`python analysis/align.py` and then `python analysis/build_lyrics.py` (lyrics.json).
These need `librosa`, `scipy` and `pocketsphinx`.

## Re-rendering

```bash
cd music-video/source
./fetch_fonts.sh                 # open-licensed Google Fonts
(cd render && npm install)
node render/main.js still preview.png 63.6        # one frame at 63.6 s
node render/main.js still sheet.png 10 50 90 130   # contact sheet of several times
./render.sh                      # full video -> out/Low_Shear_High_Capacity.mp4
```

The system also needs `ffmpeg` (libx264), DejaVu Sans and Noto Color Emoji. The scene timings are taken
from the lyric words, for example `WT(13, 'demand')` is the moment "demand" is sung in line 13. Retiming a
lyric in `lyrics.json` moves every effect tied to that word.
