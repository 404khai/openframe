# Test Media

This directory contains small synthetic fixtures for Phase 0 validation and future media pipeline tests.

## Generated Assets

The generated files live in `test-media/synthetic`:

- `openframe-test-720p.mp4`: 6 second 1280x720 test pattern with AAC sine audio.
- `openframe-vertical-1080x1920.mp4`: 4 second vertical test pattern for social export validation.
- `openframe-tone-with-silence.wav`: 5 second WAV with initial silence followed by tone for silence detection tests.
- `openframe-still.png`: still image fixture for image import validation.
- `openframe-captions.srt`: short subtitle fixture for SRT import/export validation.
- `openframe-speech.wav`: synthetic spoken audio generated with the macOS `say` command for Whisper.cpp validation.
- `phase0-thumbnail.jpg`: thumbnail extraction output.
- `phase0-waveform.png`: waveform rendering output.
- `phase0-enhanced.wav`: FFmpeg audio enhancement output.
- `phase0-export-vertical.mp4`: vertical export smoke-test output.
- `phase0-export-youtube-1080p.mp4`: H.264/AAC export smoke-test output.
- `phase0-whisper.txt`: Whisper.cpp tiny.en transcription output.

## Regeneration

Run this from the repo root:

```sh
bash scripts/generate-test-media.sh
```

The assets are generated locally with FFmpeg filters and contain no third-party copyrighted media.

The Whisper speech fixture is generated locally with the macOS system voice. Recreate it with:

```sh
say --file-format=WAVE --data-format=LEI16@16000 \
  -o test-media/synthetic/openframe-speech.wav \
  "Welcome to OpenFrame. This is a local caption test."
```
