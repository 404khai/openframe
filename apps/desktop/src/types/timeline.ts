export type TrackKind = 'video' | 'audio';

export interface TimelineTrack {
  id: string;
  name: string;
  kind: TrackKind;
}

export interface TimelineClip {
  id: string;
  mediaId: string;
  trackId: string;
  startSeconds: number;
  durationSeconds: number;
  trimStartSeconds: number;
  sourceDurationSeconds: number;
}
