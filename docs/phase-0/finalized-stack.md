# Finalized MVP Stack

This stack is selected for a lightweight macOS-first desktop editor with local project files, reliable exports, and practical audio/caption features.

## Frontend

- React
- TypeScript
- Vite
- TailwindCSS
- Zustand
- HTML Canvas timeline rendering

Rationale: this keeps the UI familiar, fast to build, and easy to iterate while avoiding a heavy renderer before timeline requirements are proven.

## Desktop Shell

- Tauri

Rationale: Tauri gives OpenFrame a native desktop shell, filesystem access, Rust integration, and lower memory overhead than an Electron-style architecture.

## Core Backend

- Rust workspace with focused crates:
  - `core` for project and job orchestration
  - `media` for metadata, thumbnails, waveform, and preview helpers
  - `audio` for cleanup and audio processing commands
  - `subtitles` for SRT and caption workflows
  - `export` for render/export orchestration
  - `ai` for local AI worker integration

Rationale: Rust is a good fit for process orchestration, file handling, long-running jobs, and memory-conscious desktop work.

## Media Processing

- FFmpeg
- FFprobe

Rationale: FFmpeg already covers decoding, encoding, metadata extraction, thumbnails, waveform-style visualizations, audio filters, subtitle burn-in, and MP4 export. The MVP should orchestrate FFmpeg instead of building custom media internals.

## Storage

- SQLite
- Local project files
- Local cache folders for generated previews, waveforms, proxies, and captions

Rationale: OpenFrame is offline-first and should not require cloud project state.

## Subtitles

- Manual subtitle editing in the UI
- SRT import/export
- Whisper.cpp for local auto captions
- tiny.en or base.en model first

Rationale: small Whisper models match the memory target and can run locally on Apple Silicon without paid APIs.

## Audio AI and Enhancement

- FFmpeg filters for gain, normalization, compression, EQ, and silence detection
- RNNoise for noise suppression
- Optional Demucs voice isolation, not required for MVP completion

Rationale: most creator audio cleanup can be approximated with reliable local filters plus lightweight denoising. Voice isolation is valuable but too heavy to make a hard MVP dependency.

## Export

- FFmpeg MP4 output
- Presets for TikTok, Instagram Reels, YouTube Shorts, and YouTube 16:9
- Progress and cancel support through Rust job management

Rationale: FFmpeg gives predictable output paths and broad codec support while keeping OpenFrame focused on editor UX.

## Deferred Technologies

- GPU timeline renderer
- Custom decoders or encoders
- Cloud sync
- Paid AI APIs
- Plugin marketplace
- Motion graphics and advanced VFX
- Advanced color grading
