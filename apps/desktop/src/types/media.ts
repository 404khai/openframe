export type MediaKind = 'video' | 'audio' | 'image' | 'unknown';

export interface ImportedMedia {
  id: string;
  name: string;
  path?: string;
  previewUrl?: string;
  kind: MediaKind;
  sizeBytes: number;
  extension?: string;
  modifiedMs?: number;
}

export interface FileMetadata {
  path: string;
  name: string;
  extension?: string;
  sizeBytes: number;
  modifiedMs?: number;
}
