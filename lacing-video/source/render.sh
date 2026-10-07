#!/usr/bin/env bash
# Renders the full video in 4 parallel chunks (near-lossless intermediates), joins them,
# then makes the final 2-pass H.264 encode with the song (sized to stay under GitHub's 100 MB limit).
# Needs: node 18+, ffmpeg with libx264, the fonts (./fetch_fonts.sh) and `npm install` in ./render.
# DejaVu Sans is taken from the system fonts.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
N=$(node -e "const t=require('./timeline.json'); console.log(Math.ceil(t.dur*60))")
CH=$(( (N + 3) / 4 ))
for i in 0 1 2 3; do
  a=$(( i * CH )); b=$(( (i + 1) * CH )); [ $b -gt $N ] && b=$N
  PRESET=veryfast CRF=15 node render/main.js render $a $b out/part$i.mp4 &
done
wait
printf "file 'part%d.mp4'\n" 0 1 2 3 > out/list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i out/list.txt -c copy out/master.mp4
VB=${VB:-4000k}
ffmpeg -y -loglevel error -i out/master.mp4 -c:v libx264 -preset slow -b:v $VB -pass 1 -passlogfile out/x264 -an -f null /dev/null
ffmpeg -y -loglevel error -i out/master.mp4 -i song.mp3 -map 0:v -map 1:a -c:v libx264 -preset slow -b:v $VB -pass 2 -passlogfile out/x264 \
  -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart out/Design_Safe_Che.mp4
echo "wrote out/Design_Safe_Che.mp4"
