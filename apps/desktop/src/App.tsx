import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useMemo, useRef, useState, type DragEvent } from 'react';
import { useMediaStore } from './stores/mediaStore';
import type { ImportedMedia, ImportedMediaMetadata, MediaKind } from './types/media';

const acceptedExtensions = [
  'mp4',
  'mov',
  'm4v',
  'webm',
  'mp3',
  'wav',
  'm4a',
  'aac',
  'flac',
  'png',
  'jpg',
  'jpeg',
  'webp',
];

function mediaKindFromName(name: string): MediaKind {
  const extension = name.split('.').pop()?.toLowerCase();

  if (!extension) {
    return 'unknown';
  }

  if (['mp4', 'mov', 'm4v', 'webm'].includes(extension)) {
    return 'video';
  }

  if (['mp3', 'wav', 'm4a', 'aac', 'flac'].includes(extension)) {
    return 'audio';
  }

  if (['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
    return 'image';
  }

  return 'unknown';
}

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDuration(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds)) {
    return '00:00';
  }

  const rounded = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function createImportedMedia(metadata: ImportedMediaMetadata): ImportedMedia {
  return {
    id: metadata.path,
    path: metadata.path,
    previewUrl: convertFileSrc(metadata.path),
    thumbnailUrl: metadata.thumbnailPath ? convertFileSrc(metadata.thumbnailPath) : undefined,
    waveformUrl: metadata.waveformPath ? convertFileSrc(metadata.waveformPath) : undefined,
    name: metadata.name,
    extension: metadata.extension,
    kind: metadata.kind,
    sizeBytes: metadata.sizeBytes,
    modifiedMs: metadata.modifiedMs,
    durationSeconds: metadata.durationSeconds,
    width: metadata.width,
    height: metadata.height,
    frameRate: metadata.frameRate,
    audioSampleRate: metadata.audioSampleRate,
    audioChannels: metadata.audioChannels,
  };
}

async function importMediaPath(path: string): Promise<ImportedMedia> {
  const metadata = await invoke<ImportedMediaMetadata>('import_media', { path });
  return createImportedMedia(metadata);
}

async function mediaFromBrowserFile(file: File): Promise<ImportedMedia> {
  const fileWithPath = file as File & { path?: string };

  if (fileWithPath.path) {
    return importMediaPath(fileWithPath.path);
  }

  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    name: file.name,
    previewUrl: URL.createObjectURL(file),
    kind: mediaKindFromName(file.name),
    sizeBytes: file.size,
    modifiedMs: file.lastModified,
  };
}

export default function App() {
  const { items, selectedId, addItems, selectItem, clear } = useMediaStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string>();
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0],
    [items, selectedId],
  );

  async function importPaths(paths: string[]) {
    setError(undefined);
    setIsImporting(true);

    try {
      const media = await Promise.all(paths.map(importMediaPath));
      addItems(media);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsImporting(false);
    }
  }

  async function handlePickFiles() {
    const selected = await open({
      multiple: true,
      filters: [
        {
          name: 'Media',
          extensions: acceptedExtensions,
        },
      ],
    });

    if (!selected) {
      return;
    }

    await importPaths(Array.isArray(selected) ? selected : [selected]);
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    const files = Array.from(event.dataTransfer.files);

    if (files.length === 0) {
      return;
    }

    setError(undefined);
    setIsImporting(true);

    try {
      const media = await Promise.all(files.map(mediaFromBrowserFile));
      addItems(media);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <main className="grid h-screen grid-rows-[auto_1fr_auto] overflow-hidden bg-[var(--carbon-black)] text-[var(--floral-white)]">
      <header className="flex items-center justify-between border-b border-[color-mix(in_srgb,var(--dust-grey)_22%,transparent)] bg-[var(--carbon-black)] px-6 py-4">
        <div className="flex items-center gap-4">
          <img alt="OpenFrame" className="h-12 w-12 rounded-2xl" src="/openframe-dark.png" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--light-caramel)]">
              OpenFrame
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">Media Pipeline</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="rounded-xl border border-[color-mix(in_srgb,var(--dust-grey)_45%,transparent)] px-4 py-2 text-sm text-[var(--dust-grey)] transition hover:border-[var(--floral-white)] hover:text-[var(--floral-white)]"
            onClick={clear}
            type="button"
          >
            Clear
          </button>
          <button
            className="rounded-xl bg-[var(--light-caramel)] px-4 py-2 text-sm font-semibold text-[var(--carbon-black)] shadow-lg shadow-black/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isImporting}
            onClick={handlePickFiles}
            type="button"
          >
            {isImporting ? 'Importing...' : 'Import Media'}
          </button>
        </div>
      </header>

      <section className="grid min-h-0 grid-cols-[340px_1fr]">
        <aside className="flex min-h-0 flex-col border-r border-[color-mix(in_srgb,var(--dust-grey)_20%,transparent)] bg-[var(--charcoal-brown)]">
          <div className="border-b border-[color-mix(in_srgb,var(--dust-grey)_20%,transparent)] px-4 py-3">
            <h2 className="font-semibold">Media Bin</h2>
            <p className="text-sm text-[var(--dust-grey)]">{items.length} imported item{items.length === 1 ? '' : 's'}</p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--dust-grey)_35%,transparent)] p-4 text-sm text-[var(--dust-grey)]">
                Import or drag media into the app to run FFprobe metadata extraction and generate previews.
              </p>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <button
                    className={`w-full overflow-hidden rounded-2xl border text-left transition ${
                      selectedItem?.id === item.id
                        ? 'border-[var(--light-caramel)] bg-[color-mix(in_srgb,var(--light-caramel)_16%,var(--carbon-black))]'
                        : 'border-[color-mix(in_srgb,var(--dust-grey)_18%,transparent)] bg-[color-mix(in_srgb,var(--carbon-black)_72%,var(--charcoal-brown))] hover:border-[color-mix(in_srgb,var(--light-caramel)_55%,transparent)]'
                    }`}
                    key={item.id}
                    onClick={() => selectItem(item.id)}
                    type="button"
                  >
                    {item.thumbnailUrl ? (
                      <img alt="" className="h-28 w-full object-cover" src={item.thumbnailUrl} />
                    ) : item.waveformUrl ? (
                      <img
                        alt=""
                        className="h-28 w-full bg-[var(--carbon-black)] object-contain p-3"
                        src={item.waveformUrl}
                      />
                    ) : null}
                    <div className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <span className="rounded-full bg-[var(--carbon-black)] px-2 py-1 text-xs uppercase text-[var(--light-caramel)]">
                          {item.kind}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[var(--dust-grey)]">
                        {formatBytes(item.sizeBytes)} · {formatDuration(item.durationSeconds)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <div className="grid min-h-0 grid-rows-[1fr_210px] bg-[color-mix(in_srgb,var(--carbon-black)_86%,black)]">
          <section
            className={`m-6 flex min-h-0 items-center justify-center rounded-[2rem] border ${
              isDragging
                ? 'border-[var(--light-caramel)] bg-[color-mix(in_srgb,var(--light-caramel)_16%,transparent)]'
                : 'border-[color-mix(in_srgb,var(--dust-grey)_20%,transparent)] bg-[color-mix(in_srgb,var(--charcoal-brown)_48%,black)]'
            }`}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDrop={handleDrop}
          >
            {selectedItem ? (
              <Preview item={selectedItem} />
            ) : (
              <div className="max-w-md text-center">
                <img alt="OpenFrame" className="mx-auto mb-5 h-24 w-24 rounded-[1.75rem]" src="/openframe-light.png" />
                <p className="text-lg font-semibold">Drop media here</p>
                <p className="mt-2 text-sm text-[var(--dust-grey)]">
                  OpenFrame now probes imported media, extracts duration, generates thumbnails, and creates waveform previews.
                </p>
              </div>
            )}
          </section>

          <Inspector item={selectedItem} />
        </div>
      </section>

      {error ? (
        <footer className="border-t border-red-900/60 bg-red-950 px-6 py-2 text-sm text-red-100">{error}</footer>
      ) : null}
    </main>
  );
}

function Preview({ item }: { item: ImportedMedia }) {
  const mediaRef = useRef<HTMLMediaElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const duration = item.durationSeconds ?? mediaRef.current?.duration ?? 0;

  function seek(value: number) {
    setCurrentTime(value);

    if (mediaRef.current) {
      mediaRef.current.currentTime = value;
    }
  }

  if (!item.previewUrl) {
    return <p className="text-sm text-[var(--dust-grey)]">No preview available for {item.name}.</p>;
  }

  if (item.kind === 'video') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4">
        <video
          className="min-h-0 max-h-full max-w-full rounded-3xl border border-[color-mix(in_srgb,var(--dust-grey)_18%,transparent)] bg-black"
          controls
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          ref={(node) => {
            mediaRef.current = node;
          }}
          src={item.previewUrl}
        />
        <Scrubber currentTime={currentTime} duration={duration} onSeek={seek} waveformUrl={item.waveformUrl} />
      </div>
    );
  }

  if (item.kind === 'audio') {
    return (
      <div className="w-full max-w-3xl rounded-[2rem] border border-[color-mix(in_srgb,var(--dust-grey)_20%,transparent)] bg-[var(--carbon-black)] p-6">
        <p className="mb-4 font-medium">{item.name}</p>
        {item.waveformUrl ? (
          <img
            alt="Audio waveform"
            className="mb-5 h-32 w-full rounded-2xl bg-black object-contain p-3"
            src={item.waveformUrl}
          />
        ) : null}
        <audio
          className="w-full"
          controls
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          ref={(node) => {
            mediaRef.current = node;
          }}
          src={item.previewUrl}
        />
        <Scrubber currentTime={currentTime} duration={duration} onSeek={seek} waveformUrl={item.waveformUrl} />
      </div>
    );
  }

  if (item.kind === 'image') {
    return (
      <img
        alt={item.name}
        className="max-h-full max-w-full rounded-3xl border border-[color-mix(in_srgb,var(--dust-grey)_18%,transparent)] object-contain"
        src={item.previewUrl}
      />
    );
  }

  return <p className="text-sm text-[var(--dust-grey)]">Preview is not available for this file type.</p>;
}

function Scrubber({
  currentTime,
  duration,
  onSeek,
  waveformUrl,
}: {
  currentTime: number;
  duration: number;
  onSeek: (value: number) => void;
  waveformUrl?: string;
}) {
  if (!duration || !Number.isFinite(duration)) {
    return null;
  }

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-[color-mix(in_srgb,var(--dust-grey)_18%,transparent)] bg-[color-mix(in_srgb,var(--carbon-black)_82%,black)] p-3">
      {waveformUrl ? <img alt="" className="mb-2 h-12 w-full object-cover opacity-80" src={waveformUrl} /> : null}
      <div className="flex items-center gap-3">
        <span className="w-12 text-xs tabular-nums text-[var(--dust-grey)]">{formatDuration(currentTime)}</span>
        <input
          className="accent-[var(--light-caramel)]"
          max={duration}
          min={0}
          onChange={(event) => onSeek(Number(event.target.value))}
          step={0.01}
          type="range"
          value={Math.min(currentTime, duration)}
        />
        <span className="w-12 text-right text-xs tabular-nums text-[var(--dust-grey)]">{formatDuration(duration)}</span>
      </div>
    </div>
  );
}

function Inspector({ item }: { item?: ImportedMedia }) {
  return (
    <section className="border-t border-[color-mix(in_srgb,var(--dust-grey)_20%,transparent)] bg-[var(--carbon-black)] px-6 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Media Pipeline</h2>
        <span className="text-xs uppercase tracking-[0.2em] text-[var(--light-caramel)]">Phase 2</span>
      </div>
      {item ? (
        <div className="grid h-32 grid-cols-[1fr_280px] gap-4">
          <div className="grid grid-cols-4 gap-3 text-sm">
            <MetadataCard label="Duration" value={formatDuration(item.durationSeconds)} />
            <MetadataCard label="Video" value={item.width && item.height ? `${item.width}×${item.height}` : 'None'} />
            <MetadataCard label="Frame Rate" value={item.frameRate ? `${item.frameRate.toFixed(2)} fps` : 'N/A'} />
            <MetadataCard
              label="Audio"
              value={item.audioSampleRate ? `${item.audioSampleRate} Hz · ${item.audioChannels ?? 0} ch` : 'None'}
            />
          </div>
          <div className="rounded-2xl border border-[color-mix(in_srgb,var(--dust-grey)_18%,transparent)] bg-[color-mix(in_srgb,var(--charcoal-brown)_45%,black)] p-3">
            <p className="mb-2 truncate text-sm font-medium">{item.path ?? item.name}</p>
            {item.waveformUrl ? (
              <img alt="Waveform preview" className="h-16 w-full rounded-lg object-cover" src={item.waveformUrl} />
            ) : (
              <p className="text-xs text-[var(--dust-grey)]">No waveform generated for this asset.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-32 items-center rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--dust-grey)_30%,transparent)] bg-[color-mix(in_srgb,var(--charcoal-brown)_45%,black)] px-4 text-sm text-[var(--dust-grey)]">
          Import media to see FFprobe metadata, thumbnail previews, waveform previews, and playback controls.
        </div>
      )}
    </section>
  );
}

function MetadataCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color-mix(in_srgb,var(--dust-grey)_18%,transparent)] bg-[color-mix(in_srgb,var(--charcoal-brown)_45%,black)] p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--dust-grey)]">{label}</p>
      <p className="mt-2 truncate font-semibold text-[var(--floral-white)]">{value}</p>
    </div>
  );
}
