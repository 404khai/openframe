#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/test-media/synthetic"

mkdir -p "$OUT_DIR"

echo "Generating synthetic OpenFrame test media in $OUT_DIR"

ffmpeg -hide_banner -y \
  -f lavfi -i testsrc2=size=1280x720:rate=30:duration=6 \
  -f lavfi -i sine=frequency=440:sample_rate=48000:duration=6 \
  -c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 128k \
  "$OUT_DIR/openframe-test-720p.mp4"

ffmpeg -hide_banner -y \
  -f lavfi -i testsrc2=size=1080x1920:rate=30:duration=4 \
  -f lavfi -i sine=frequency=880:sample_rate=48000:duration=4 \
  -c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 128k \
  "$OUT_DIR/openframe-vertical-1080x1920.mp4"

ffmpeg -hide_banner -y \
  -f lavfi -i "aevalsrc=if(lt(t\,1.5)\,0\,0.25*sin(2*PI*220*t)):sample_rate=48000:duration=5" \
  -c:a pcm_s16le \
  "$OUT_DIR/openframe-tone-with-silence.wav"

ffmpeg -hide_banner -y \
  -f lavfi -i "color=c=0x101820:size=1280x720" \
  -frames:v 1 \
  -update 1 \
  "$OUT_DIR/openframe-still.png"

cat > "$OUT_DIR/openframe-captions.srt" <<'SRT'
1
00:00:00,000 --> 00:00:02,000
Welcome to OpenFrame.

2
00:00:02,000 --> 00:00:04,500
This is a synthetic subtitle fixture.

3
00:00:04,500 --> 00:00:06,000
It is safe to commit.
SRT

echo "Generated:"
printf '%s\n' \
  "$OUT_DIR/openframe-test-720p.mp4" \
  "$OUT_DIR/openframe-vertical-1080x1920.mp4" \
  "$OUT_DIR/openframe-tone-with-silence.wav" \
  "$OUT_DIR/openframe-still.png" \
  "$OUT_DIR/openframe-captions.srt"
