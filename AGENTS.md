# AGENTS.md — OpenFrame MVP Execution Plan

## Project Overview

OpenFrame is a free and open-source desktop video editor focused on:

* creator workflows
* clean UX
* fast editing
* AI-assisted audio cleanup
* subtitles and captions
* social-media-first exports

The MVP targets:

* macOS first
* Apple Silicon optimization
* offline-first workflows
* lightweight architecture
* minimal RAM usage

Primary development machine:

* MacBook Pro M3 Pro
* 16GB RAM
* 512GB SSD

The MVP MUST prioritize:

* smooth playback
* low memory usage
* responsive UI
* reliable exports
* simplicity over feature bloat

The MVP is NOT:

* After Effects
* DaVinci Resolve
* collaborative
* cloud-based
* motion graphics software
* enterprise tooling

The MVP goal:
Build a stable CapCut-like editor for creators with strong audio enhancement features.

---

# Core MVP Features

## Timeline Editing

* video import
* audio import
* image import
* drag-and-drop timeline
* split clips
* trim clips
* delete clips
* move clips
* zoom timeline
* multiple tracks
* playback controls
* playhead scrubbing

---

## Text & Subtitle Features

* subtitle track
* manual subtitle editing
* auto captions
* subtitle styling
* subtitle export (.srt)

---

## AI Audio Features

* basic noise suppression
* voice isolation
* silence removal
* audio boost up to +20dB
* speech enhancement
* normalize audio

---

## Export Features

* MP4 export
* social media presets:

  * TikTok
  * YouTube Shorts
  * Instagram Reels
  * YouTube 16:9
* bitrate presets
* resolution presets
* progress bar
* cancel export

---

# Tech Stack

## Frontend

* React
* TypeScript
* Vite
* TailwindCSS

---

## Desktop Framework

* Tauri

Reason:

* lightweight
* low RAM usage
* better than Electron for this project
* native Rust backend support

---

## Backend/Core Engine

* Rust

Reason:

* performance
* memory safety
* GPU ecosystem
* media tooling ecosystem

---

## Media Processing

* FFmpeg

Responsibilities:

* decoding
* encoding
* export pipeline
* audio processing
* subtitle burn-in

---

## State Management

* Zustand

---

## Timeline Rendering

* HTML Canvas initially
* move to GPU later if needed

DO NOT build GPU rendering initially.

Canvas is enough for MVP.

---

## Database / Storage

* SQLite
* local project files

---

## Audio AI / Processing

### Noise Suppression

Use:

* RNNoise

Reason:

* lightweight
* real-time capable
* free
* open source

---

### Voice Isolation

Use:

* Demucs

IMPORTANT:
DO NOT run this locally initially.

Use:

* Hugging Face Spaces free inference
  OR
* optional local processing later

Reason:

* user hardware limitations
* RAM limitations
* no paid inference budget

Fallback:
Allow users to:

* download model manually
* process clips individually

---

### Auto Captions

Use:

* Whisper.cpp

Recommended model:

* tiny.en
  OR
* base.en

Reason:

* low RAM usage
* runs locally
* fast enough on M3 Pro

IMPORTANT:
DO NOT use large Whisper models initially.

---

### Silence Detection

Use:

* FFmpeg silence detection filters

---

### Audio Enhancement

Use:

* FFmpeg filters
* compressors
* normalization
* EQ chain
* gain filters

DO NOT over-engineer this.

CapCut-like enhancement can mostly be approximated with:

* normalization
* compression
* gain
* EQ
* RNNoise

---

# AI Strategy (IMPORTANT)

## Rule 1

Avoid paid APIs entirely for MVP.

---

## Rule 2

Prefer:

* lightweight local inference
* open-source models
* CPU-compatible models

---

## Rule 3

Only use cloud inference optionally.

Never make the editor dependent on paid cloud APIs.

---

## Rule 4

All AI features should degrade gracefully.

Example:
If Demucs unavailable:

* disable voice isolation button
* editor still functions normally

---

# Architecture Overview

## Frontend Layer

React/Tauri UI

Responsibilities:

* timeline UI
* controls
* panels
* user interaction

---

## Core Rust Engine

Responsibilities:

* playback coordination
* file management
* export jobs
* FFmpeg orchestration

---

## Media Pipeline

FFmpeg subprocess execution.

DO NOT build custom encoders.

---

## AI Worker Layer

Separate processing workers for:

* captions
* audio cleanup
* voice isolation

IMPORTANT:
AI jobs MUST NOT block UI thread.

---

# Folder Structure

/apps/desktop
/crates/core
/crates/media
/crates/audio
/crates/subtitles
/crates/export
/crates/ai
/assets
/test-media
/docs

---

# Development Principles

## Rule 1

Ship functionality first.

NOT perfect architecture.

---

## Rule 2

Avoid premature optimization.

---

## Rule 3

Avoid GPU rendering until necessary.

---

## Rule 4

Playback smoothness matters more than fancy UI.

---

## Rule 5

Use existing tools instead of reinventing media systems.

---

# MVP Execution Phases

# Phase 0 — Research & Planning

## Goals

* validate architecture
* benchmark FFmpeg workflows
* test Tauri performance
* test Whisper.cpp locally
* test RNNoise integration

---

## Deliverables

* architecture diagram
* technical constraints document
* benchmark notes
* sample media assets
* finalized stack

---

## Cursor Model Recommendation

### Best Model

* GPT-5.5

Use for:

* architecture planning
* systems reasoning
* technical decisions

---

# Phase 1 — Project Bootstrap

## Goals

Initialize:

* Tauri app
* React frontend
* Rust backend
* Tailwind setup
* Zustand store
* project structure

---

## Deliverables

* working desktop shell
* file import
* dev scripts
* build pipeline

---

## Requirements

* drag-drop support
* local filesystem access
* media preview panel

---

## Cursor Models

### GPT-5.5

Use for:

* setup
* architecture
* debugging

### Claude Sonnet

Use for:

* UI scaffolding
* React components

---

# Phase 2 — Media Pipeline

## Goals

Implement:

* media import
* metadata extraction
* thumbnails
* waveform generation
* playback system

---

## FFmpeg Responsibilities

* probe files
* extract duration
* generate preview frames
* generate waveforms

---

## Deliverables

* playable media
* scrubber
* thumbnails
* waveform previews

---

## Risks

* desynchronized playback
* laggy scrubbing
* memory spikes

---

## Cursor Models

### GPT-5.5

Use for:

* FFmpeg commands
* Rust integration
* debugging

### Claude Sonnet

Use for:

* UI polishing

---

# Phase 3 — Timeline Editor

## Goals

Build:

* multi-track timeline
* clip dragging
* trimming
* splitting
* snapping
* zooming

---

## IMPORTANT

This is the MOST IMPORTANT phase.

Prioritize:

* responsiveness
* stability
* intuitive UX

---

## Deliverables

* working NLE timeline
* smooth interactions
* keyboard shortcuts

---

## Constraints

DO NOT:

* add effects
* add animations
* add keyframes yet

---

## Cursor Models

### GPT-5.5

Use for:

* timeline math
* synchronization logic
* state management

### Claude Sonnet

Use for:

* interaction UX
* component cleanup

---

# Phase 4 — Subtitle System

## Goals

Implement:

* subtitle track
* manual subtitle editing
* subtitle rendering
* SRT export/import

---

## Auto Captions

Integrate:

* Whisper.cpp

---

## Requirements

* background processing
* progress indicators
* editable captions

---

## Deliverables

* auto captions
* subtitle timeline
* subtitle export

---

## Cursor Models

### GPT-5.5

Use for:

* Whisper integration
* processing pipeline

### Claude Sonnet

Use for:

* editor UI

---

# Phase 5 — Audio AI Features

## Goals

Implement:

* RNNoise cleanup
* silence removal
* audio enhancement
* gain boost
* normalization

Optional:

* Demucs voice isolation

---

## IMPORTANT

Voice isolation can initially:

* process offline
* use external worker
* use Hugging Face inference

DO NOT block MVP on this feature.

---

## Deliverables

* one-click cleanup
* silence remover
* enhanced dialogue

---

## Cursor Models

### GPT-5.5

Use for:

* DSP logic
* Rust processing
* FFmpeg chains

---

# Phase 6 — Export System

## Goals

Implement:

* export queue
* MP4 rendering
* presets
* progress UI

---

## Export Presets

Required:

* TikTok
* Reels
* Shorts
* YouTube 1080p

---

## FFmpeg

Use FFmpeg fully here.

---

## Deliverables

* reliable exports
* cancel export
* progress tracking

---

## Cursor Models

### GPT-5.5

Use for:

* rendering pipeline
* FFmpeg orchestration

---

# Phase 7 — Optimization & Stabilization

## Goals

Improve:

* RAM usage
* playback smoothness
* export reliability
* crash handling

---

## Add

* proxy generation
* caching
* lazy loading

---

## Deliverables

* stable beta release

---

## Cursor Models

### GPT-5.5

Use for:

* optimization
* profiling
* debugging

---

# Phase 8 — Packaging & Release

## Goals

Prepare:

* DMG build
* GitHub release
* documentation
* onboarding

---

## Deliverables

* downloadable beta
* install instructions
* demo video
* screenshots

---

# Future Features (NOT MVP)

DO NOT BUILD YET:

* cloud sync
* collaboration
* motion graphics
* node compositing
* advanced VFX
* GPU shader systems
* plugins
* marketplace
* mobile app
* advanced color grading

---

# Recommended Development Order

1. media playback
2. timeline
3. export
4. subtitles
5. audio AI
6. polish

NOT the other way around.

---

# Performance Targets

## Startup Time

< 3 seconds

---

## Timeline FPS

30 FPS minimum

---

## RAM Target

< 3GB typical usage

---

## Export Stability

No crashes during exports

---

# Open Source Strategy

License:

* MIT
  OR
* Apache 2.0

DO NOT use GPL initially unless necessary.

---

# Git Strategy

Branches:

* main
* develop
* feature/*

---

# Commit Convention

feat:
fix:
refactor:
perf:
docs:
build:

---

# Example Commit Messages

feat: implement timeline clip splitting

feat: add whisper.cpp subtitle generation

fix: resolve playback desync during scrubbing

perf: optimize waveform generation caching

---

# Recommended Learning Resources

## Video Editing Architecture

Study:

* Kdenlive
* Olive Editor
* Shotcut

---

## Media Pipelines

Study:

* FFmpeg
* mpv
* OBS Studio

---

## Timeline UX

Study:

* CapCut
* Final Cut Pro
* DaVinci Resolve

---

# Final Notes

The MVP goal is NOT:
“replace DaVinci Resolve.”

The MVP goal is:
“make creator editing dramatically easier.”

Focus on:

* speed
* simplicity
* usability
* creator workflows
* reliable exports
* excellent audio cleanup

If the editor:

* feels fast
* exports reliably
* cleans audio well
* generates captions easily

then the MVP succeeds.
