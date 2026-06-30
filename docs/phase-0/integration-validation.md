# Integration Validation

This document captures Phase 0 validation for Tauri, Whisper.cpp, and RNNoise before the app scaffold exists.

## Tauri

Validation status: ready for Phase 1 bootstrap.

Checked package versions:

- `@tauri-apps/cli`: 2.11.4
- `@tauri-apps/api`: 2.11.1

Local prerequisites are present:

- Node 24.16.0
- npm 11.13.0
- Rust 1.96.0
- Cargo 1.96.0
- CMake 4.3.4

Phase 1 should initialize the app under `apps/desktop` and keep Tauri commands thin: the UI should call into Rust job orchestration rather than directly managing FFmpeg processes.

## Whisper.cpp

Validation status: local CPU transcription passed.

Actions completed:

- Installed `whisper-cpp` 1.9.1 with Homebrew.
- Downloaded `ggml-tiny.en.bin` outside the repository at `/tmp/openframe-models/ggml-tiny.en.bin`.
- Generated a synthetic speech fixture at `test-media/synthetic/openframe-speech.wav`.
- Ran `whisper-cli --no-gpu` against the fixture.

Result:

```text
Welcome to Open Frame, this is a local caption test.
```

Measured timings:

- Model load: 53.03 ms
- Encode: 347.39 ms
- Total Whisper processing: 530.27 ms
- Wall time: 0.62 s
- Model memory size reported by Whisper: 77.11 MB

Risk found:

- The default GPU/Metal path crashed once during sandboxed validation with a Metal buffer allocation error. The CPU path succeeded and should be the MVP fallback. Phase 4 should explicitly support CPU mode and treat Metal acceleration as an optimization after app-level testing.

## RNNoise

Validation status: integration path documented; Rust integration deferred until the `crates/audio` scaffold exists.

Findings:

- Homebrew exposes `rnnoise` as a macOS Audio Unit/VST plugin package, not as the library integration OpenFrame needs.
- FFmpeg 8.1.2 includes relevant MVP audio filters: `acompressor`, `loudnorm`, `silencedetect`, and `arnndn`.
- The Phase 0 FFmpeg audio enhancement chain passed locally and preserved 48 kHz mono WAV output after adding `aresample=48000`.

Phase 1/5 recommendation:

- Treat FFmpeg audio filters as the baseline MVP audio enhancement path.
- Add RNNoise through a source build or Rust FFI strategy inside `crates/audio` when that crate exists.
- Do not depend on the Homebrew Audio Unit/VST package for product integration.
- Keep RNNoise failure non-blocking; expose FFmpeg-only enhancement when RNNoise is unavailable.

## Deferred Validation

- Tauri app startup and memory measurement.
- Rust command bridge for FFmpeg jobs.
- Whisper.cpp model management inside app storage.
- RNNoise source build and Rust FFI smoke test.
- Background job cancellation and progress reporting.
