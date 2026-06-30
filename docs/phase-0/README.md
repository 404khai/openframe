# Phase 0 — Research and Planning

Phase 0 validates the OpenFrame MVP direction before app bootstrap. The goal is to reduce risk around the media pipeline, desktop shell, AI/audio dependencies, and local-first constraints while keeping the project scoped to a fast creator-focused editor.

## Status

| Deliverable | Status | Notes |
| --- | --- | --- |
| Architecture diagram | Complete | See [architecture.md](architecture.md). |
| Technical constraints document | Complete | See [technical-constraints.md](technical-constraints.md). |
| Benchmark notes | Complete | See [benchmarks.md](benchmarks.md). |
| Sample media assets | Complete | See [../../test-media/README.md](../../test-media/README.md). |
| Finalized stack | Complete | See [finalized-stack.md](finalized-stack.md). |
| Tauri, Whisper.cpp, and RNNoise validation | Complete | See [integration-validation.md](integration-validation.md). |

## Phase 0 Decisions

- Build the MVP as a macOS-first Tauri desktop app using React, TypeScript, Vite, TailwindCSS, Zustand, and Rust.
- Use FFmpeg/FFprobe subprocesses for media metadata, previews, audio filters, subtitle burn-in, and export.
- Keep timeline rendering on HTML Canvas for the MVP; defer GPU rendering until profiling proves it is needed.
- Store project data locally with SQLite and sidecar project files.
- Run captions locally through Whisper.cpp using tiny.en or base.en models.
- Use RNNoise and FFmpeg filter chains for audio cleanup. Treat Demucs voice isolation as optional and non-blocking.
- Avoid paid APIs and design all AI features to degrade gracefully.

## Local Baseline

- Host OS: macOS Darwin 25.5.0
- Primary target: Apple Silicon, 16 GB RAM class machine
- Node: 24.16.0
- npm: 11.13.0
- Rust: 1.96.0
- Cargo: 1.96.0
- Python: 3.14.6
- CMake: 4.3.4
- Homebrew: 6.0.5
- FFmpeg: 8.1.2
- FFprobe: 8.1.2
- Whisper.cpp: 1.9.1

## Phase 1 Readiness

Phase 1 can begin with desktop bootstrap under `apps/desktop`, followed by file import and media preview. The first implementation step should be the desktop shell and media import path, not timeline editing or AI features.
