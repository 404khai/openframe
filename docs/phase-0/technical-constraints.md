# Technical Constraints

OpenFrame is constrained by creator workflows, local-first operation, and modest laptop resources. These constraints are part of the product shape, not temporary limitations.

## Product Boundaries

The MVP is a fast CapCut-like desktop video editor for creators. It is not a professional compositing suite, collaboration platform, cloud editor, motion graphics system, plugin marketplace, or enterprise product.

## Platform

- Target macOS first.
- Optimize for Apple Silicon.
- Treat a 16 GB RAM machine as the normal development and usage class.
- Keep startup under 3 seconds once the app shell exists.
- Keep typical memory use under 3 GB.

## Media Pipeline

- Use FFmpeg and FFprobe for media processing.
- Prefer subprocess orchestration over custom decoding or encoding.
- Keep generated previews, thumbnails, waveforms, and proxies cacheable.
- Use small fixture media for repeatable local validation.
- Delay GPU rendering until Canvas has been measured and proven insufficient.

## Timeline and Playback

- Timeline responsiveness is more important than advanced effects.
- Target at least 30 FPS timeline interaction.
- Avoid keyframes, effects, animation systems, and advanced color workflows in the MVP.
- Keep clip math deterministic and independent from rendering details.

## Storage

- Store project metadata locally in SQLite.
- Keep source media as local files.
- Avoid cloud sync and remote project state.
- Design imports around references to local files, with later proxy/cache support.

## AI and Audio

- Avoid paid APIs entirely for the MVP.
- Prefer small local models and CPU-compatible workflows.
- Use Whisper.cpp with tiny.en or base.en for captions.
- Use RNNoise for local noise suppression.
- Use FFmpeg filters for normalization, gain, compression, EQ, silence detection, and export audio chains.
- Treat Demucs voice isolation as optional. If unavailable, disable or hide the feature without blocking normal editing.

## Dependency and Licensing Constraints

- Prefer permissive licenses such as MIT, Apache 2.0, BSD, and similarly compatible licenses.
- Avoid GPL dependencies in the initial app where practical, especially for code linked into the product.
- FFmpeg builds may include GPL codecs such as x264; packaging decisions must be reviewed before release.
- Keep synthetic test media generated locally to avoid asset licensing issues.

## Phase 0 Validation Limits

Because the repo is pre-bootstrap, Phase 0 can validate command-line media workflows and document integration requirements. It should not create the Tauri app, Rust workspace, React frontend, or production worker implementations; those belong to Phase 1 and later.
