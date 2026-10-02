#!/usr/bin/env bash
# Downloads the open-licensed Google Fonts used by the renderer into ./fonts
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p fonts
B=https://raw.githubusercontent.com/google/fonts/main
for p in ofl/anton/Anton-Regular.ttf ofl/bebasneue/BebasNeue-Regular.ttf apache/permanentmarker/PermanentMarker-Regular.ttf \
  ofl/cabinsketch/CabinSketch-Bold.ttf ofl/cabinsketch/CabinSketch-Regular.ttf ofl/architectsdaughter/ArchitectsDaughter-Regular.ttf \
  ofl/spacemono/SpaceMono-Bold.ttf ofl/spacemono/SpaceMono-Regular.ttf ofl/blackopsone/BlackOpsOne-Regular.ttf ofl/bungee/Bungee-Regular.ttf \
  ofl/archivoblack/ArchivoBlack-Regular.ttf ofl/gochihand/GochiHand-Regular.ttf ofl/rubikmonoone/RubikMonoOne-Regular.ttf \
  apache/specialelite/SpecialElite-Regular.ttf; do
  curl -sfL -o "fonts/$(basename "$p")" "$B/$p"
done
echo "fonts ready"
