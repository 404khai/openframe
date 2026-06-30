export type MediaKind = 'video' | 'audio' | 'image' | 'unknown';

export interface ImportedMedia {
  id: string;
  name: string;
  path?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  waveformUrl?: string;
  kind: MediaKind;
  sizeBytes: number;
  extension?: string;
  modifiedMs?: number;
  durationSeconds?: number;
  width?: number;
  height?: number;
  frameRate?: number;
  audioSampleRate?: number;
  audioChannels?: number;
}

export interface ImportedMediaMetadata {
  path: string;
  name: string;
  extension?: string;
  kind: MediaKind;
  sizeBytes: number;
  modifiedMs?: number;
  durationSeconds?: number;
  width?: number;
  height?: number;
  frameRate?: number;
  audioSampleRate?: number;
  audioChannels?: number;
  thumbnailPath?: string;
  waveformPath?: string;
}
