#!/usr/bin/env bash
# Renders the full video in 4 parallel chunks, then joins them and adds the song.
# Needs: node 18+, ffmpeg with libx264, the fonts (./fetch_fonts.sh) and `npm install` in ./render.
# DejaVu Sans and Noto Color Emoji are taken from the system fonts.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
N=$(node -e "const f=require('./features.json'); console.log(Math.ceil(f.dur*30))")
CH=$(( (N + 3) / 4 ))
for i in 0 1 2 3; do
  a=$(( i * CH )); b=$(( (i + 1) * CH )); [ $b -gt $N ] && b=$N
  node render/main.js render $a $b out/part$i.mp4 &
done
wait
printf "file 'part%d.mp4'\n" 0 1 2 3 > out/list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i out/list.txt -i song.m4a -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart out/Low_Shear_High_Capacity.mp4
echo "wrote out/Low_Shear_High_Capacity.mp4"
