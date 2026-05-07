#!/usr/bin/env bash
# Run this once before building for Windows to generate icon.ico
# Requires: ImageMagick (sudo apt-get install imagemagick)
echo "Converting icon.png → icon.ico..."
convert assets/icon.png \
  -define icon:auto-resize=256,128,64,48,32,16 \
  assets/icon.ico
echo "Done! assets/icon.ico created."
