#!/usr/bin/env bash
# Downloads the open-licensed Google Fonts used by the renderer into ./fonts
# (Gujarati: Hind Vadodara + Mukta Vaani; Latin: Barlow, Barlow Condensed, Chakra Petch).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p fonts
B=https://raw.githubusercontent.com/google/fonts/main/ofl
for p in hindvadodara/HindVadodara-{Light,Regular,SemiBold,Bold}.ttf \
  muktavaani/MuktaVaani-{Regular,Medium,Bold,ExtraBold}.ttf \
  barlowcondensed/BarlowCondensed-{Light,Medium,SemiBold,Bold,ExtraBold}.ttf \
  barlow/Barlow-{Regular,Medium}.ttf chakrapetch/ChakraPetch-{Medium,SemiBold}.ttf; do
  curl -sfL -o "fonts/$(basename "$p")" "$B/$p"
done
echo "fonts ready"
