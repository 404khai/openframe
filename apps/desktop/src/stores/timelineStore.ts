import { create } from 'zustand';
import type { ImportedMedia } from '../types/media';
import type { TimelineClip, TimelineTrack } from '../types/timeline';

const minClipDuration = 0.25;

const initialTracks: TimelineTrack[] = [
  { id: 'video-1', name: 'Video 1', kind: 'video' },
  { id: 'video-2', name: 'Overlay', kind: 'video' },
  { id: 'audio-1', name: 'Audio 1', kind: 'audio' },
];

interface TimelineState {
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  selectedClipId?: string;
  playheadSeconds: number;
  pixelsPerSecond: number;
  addMediaClip: (media: ImportedMedia) => void;
  selectClip: (clipId?: string) => void;
  setPlayhead: (seconds: number) => void;
  setZoom: (pixelsPerSecond: number) => void;
  moveClip: (clipId: string, startSeconds: number, trackId?: string) => void;
  trimClipStart: (clipId: string, startSeconds: number, trimStartSeconds: number, durationSeconds: number) => void;
  trimClipEnd: (clipId: string, durationSeconds: number) => void;
  splitClip: (clipId: string, atSeconds: number) => void;
  deleteSelectedClip: () => void;
  clearTimeline: () => void;
}

function defaultDuration(media: ImportedMedia): number {
  if (media.durationSeconds && Number.isFinite(media.durationSeconds)) {
    return media.durationSeconds;
  }

  return media.kind === 'image' ? 5 : 10;
}

function trackForMedia(media: ImportedMedia): string {
  return media.kind === 'audio' ? 'audio-1' : 'video-1';
}

function nextStartForTrack(clips: TimelineClip[], trackId: string): number {
  return clips
    .filter((clip) => clip.trackId === trackId)
    .reduce((latest, clip) => Math.max(latest, clip.startSeconds + clip.durationSeconds), 0);
}

export const useTimelineStore = create<TimelineState>((set) => ({
  tracks: initialTracks,
  clips: [],
  selectedClipId: undefined,
  playheadSeconds: 0,
  pixelsPerSecond: 52,
  addMediaClip: (media) =>
    set((state) => {
      if (state.clips.some((clip) => clip.mediaId === media.id)) {
        return state;
      }

      const trackId = trackForMedia(media);
      const duration = Math.max(defaultDuration(media), minClipDuration);
      const clip: TimelineClip = {
        id: `${media.id}-${Date.now()}`,
        mediaId: media.id,
        trackId,
        startSeconds: nextStartForTrack(state.clips, trackId),
        durationSeconds: duration,
        trimStartSeconds: 0,
        sourceDurationSeconds: duration,
      };

      return {
        clips: [...state.clips, clip],
        selectedClipId: clip.id,
      };
    }),
  selectClip: (clipId) => set({ selectedClipId: clipId }),
  setPlayhead: (seconds) => set({ playheadSeconds: Math.max(0, seconds) }),
  setZoom: (pixelsPerSecond) => set({ pixelsPerSecond: Math.min(Math.max(pixelsPerSecond, 24), 160) }),
  moveClip: (clipId, startSeconds, trackId) =>
    set((state) => ({
      clips: state.clips.map((clip) =>
        clip.id === clipId
          ? {
              ...clip,
              startSeconds: Math.max(0, startSeconds),
              trackId: trackId ?? clip.trackId,
            }
          : clip,
      ),
    })),
  trimClipStart: (clipId, startSeconds, trimStartSeconds, durationSeconds) =>
    set((state) => ({
      clips: state.clips.map((clip) =>
        clip.id === clipId
          ? {
              ...clip,
              startSeconds: Math.max(0, startSeconds),
              trimStartSeconds: Math.max(0, trimStartSeconds),
              durationSeconds: Math.max(minClipDuration, durationSeconds),
            }
          : clip,
      ),
    })),
  trimClipEnd: (clipId, durationSeconds) =>
    set((state) => ({
      clips: state.clips.map((clip) =>
        clip.id === clipId ? { ...clip, durationSeconds: Math.max(minClipDuration, durationSeconds) } : clip,
      ),
    })),
  splitClip: (clipId, atSeconds) =>
    set((state) => {
      const clip = state.clips.find((candidate) => candidate.id === clipId);

      if (!clip) {
        return state;
      }

      const localSplit = atSeconds - clip.startSeconds;

      if (localSplit <= minClipDuration || localSplit >= clip.durationSeconds - minClipDuration) {
        return state;
      }

      const leftClip: TimelineClip = {
        ...clip,
        durationSeconds: localSplit,
      };
      const rightClip: TimelineClip = {
        ...clip,
        id: `${clip.id}-split-${Math.round(atSeconds * 1000)}`,
        startSeconds: atSeconds,
        trimStartSeconds: clip.trimStartSeconds + localSplit,
        durationSeconds: clip.durationSeconds - localSplit,
      };

      return {
        clips: state.clips.flatMap((candidate) => (candidate.id === clipId ? [leftClip, rightClip] : [candidate])),
        selectedClipId: rightClip.id,
      };
    }),
  deleteSelectedClip: () =>
    set((state) => ({
      clips: state.clips.filter((clip) => clip.id !== state.selectedClipId),
      selectedClipId: undefined,
    })),
  clearTimeline: () => set({ clips: [], selectedClipId: undefined, playheadSeconds: 0 }),
}));
