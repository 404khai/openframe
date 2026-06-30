import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useMemo, useRef, useState, type DragEvent } from 'react';
import { TimelineEditor } from './components/TimelineEditor';
import { useMediaStore } from './stores/mediaStore';
import { useTimelineStore } from './stores/timelineStore';
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

const toolTabs = ['Media', 'Audio', 'Text', 'Stickers', 'Effects', 'Transitions', 'Captions'];

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
  const { addMediaClip, clearTimeline } = useTimelineStore();
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
      media.forEach(addMediaClip);
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
      media.forEach(addMediaClip);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsImporting(false);
    }
  }

  function clearProject() {
    clear();
    clearTimeline();
  }

  return (
    <main className="grid h-screen grid-rows-[48px_minmax(0,1fr)_300px] overflow-hidden bg-[var(--app-bg)] text-[var(--floral-white)]">
      <header className="flex items-center gap-3 border-b border-[color-mix(in_srgb,var(--dust-grey)_12%,transparent)] bg-[var(--app-bg)] px-3">
        <div className="flex items-center gap-2 pr-2">
          <img alt="OpenFrame" className="h-8 w-8 rounded-lg" src="/openframe-dark.png" />
          <span className="text-sm font-semibold">OpenFrame</span>
        </div>

        <nav className="flex h-full items-center gap-1 overflow-hidden">
          {toolTabs.map((tab) => (
            <button
              className={`flex h-full min-w-14 flex-col items-center justify-center border-b-2 px-2 text-[11px] transition ${
                tab === 'Media'
                  ? 'border-[var(--light-caramel)] text-[var(--light-caramel)]'
                  : 'border-transparent text-[var(--dust-grey)] hover:text-[var(--floral-white)]'
              }`}
              key={tab}
              type="button"
            >
              <span className="text-sm">{tab === 'Media' ? '▣' : '◇'}</span>
              {tab}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            className="rounded-md border border-[color-mix(in_srgb,var(--dust-grey)_20%,transparent)] bg-[var(--app-panel)] px-3 py-1.5 text-xs text-[var(--dust-grey)] hover:text-[var(--floral-white)]"
            onClick={clearProject}
            type="button"
          >
            Clear
          </button>
          <button className="rounded-md bg-[var(--app-raised)] px-3 py-1.5 text-xs text-[var(--floral-white)]" type="button">
            Share
          </button>
          <button className="rounded-md bg-[var(--light-caramel)] px-3 py-1.5 text-xs font-semibold text-[var(--app-bg)]" type="button">
            Export
          </button>
        </div>
      </header>

      <section className="grid min-h-0 grid-cols-[320px_minmax(360px,1fr)_300px] border-b border-[color-mix(in_srgb,var(--dust-grey)_12%,transparent)]">
        <MediaLibrary
          handlePickFiles={handlePickFiles}
          isImporting={isImporting}
          items={items}
          selectedId={selectedItem?.id}
          selectItem={selectItem}
        />

        <PlayerPanel
          handleDrop={handleDrop}
          handlePickFiles={handlePickFiles}
          isDragging={isDragging}
          isImporting={isImporting}
          selectedItem={selectedItem}
          setIsDragging={setIsDragging}
        />

        <ProjectPanel item={selectedItem} />
      </section>

      <TimelineEditor mediaItems={items} onSelectMedia={selectItem} />

      {error ? (
        <footer className="fixed bottom-3 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-red-900/60 bg-red-950 px-4 py-2 text-sm text-red-100 shadow-xl">
          {error}
        </footer>
      ) : null}
    </main>
  );
}

function MediaLibrary({
  handlePickFiles,
  isImporting,
  items,
  selectedId,
  selectItem,
}: {
  handlePickFiles: () => void;
  isImporting: boolean;
  items: ImportedMedia[];
  selectedId?: string;
  selectItem: (id: string) => void;
}) {
  return (
    <aside className="grid min-h-0 grid-cols-[92px_1fr] border-r border-[color-mix(in_srgb,var(--dust-grey)_12%,transparent)] bg-[var(--app-bg)]">
      <div className="border-r border-[color-mix(in_srgb,var(--dust-grey)_10%,transparent)] p-3 text-xs">
        <p className="mb-3 font-semibold text-[var(--light-caramel)]">Import</p>
        {['Media', 'Subprojects', 'Yours', 'Spaces', 'Library'].map((item) => (
          <button
            className={`mb-2 w-full rounded-md px-2 py-2 text-left ${
              item === 'Media'
                ? 'bg-[var(--app-raised)] text-[var(--floral-white)]'
                : 'text-[var(--dust-grey)] hover:bg-[var(--app-panel)]'
            }`}
            key={item}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      <div className="min-h-0 overflow-hidden p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Media</h2>
          <button
            className="rounded-md bg-[var(--light-caramel)] px-3 py-1.5 text-xs font-semibold text-[var(--app-bg)] disabled:opacity-60"
            disabled={isImporting}
            onClick={handlePickFiles}
            type="button"
          >
            {isImporting ? 'Importing' : 'Import'}
          </button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color-mix(in_srgb,var(--dust-grey)_22%,transparent)] bg-[var(--app-panel)] p-4 text-sm text-[var(--dust-grey)]">
            <p>Add video, audio, or images to begin editing.</p>
            <button
              className="mt-4 w-full rounded-lg bg-[var(--light-caramel)] px-3 py-2 text-sm font-semibold text-[var(--app-bg)]"
              onClick={handlePickFiles}
              type="button"
            >
              Import Media
            </button>
          </div>
        ) : (
          <div className="grid max-h-full grid-cols-2 gap-3 overflow-y-auto pr-1">
            {items.map((item) => (
              <button
                className={`overflow-hidden rounded-lg border bg-[var(--app-panel)] text-left transition ${
                  selectedId === item.id
                    ? 'border-[var(--light-caramel)]'
                    : 'border-[color-mix(in_srgb,var(--dust-grey)_12%,transparent)] hover:border-[color-mix(in_srgb,var(--light-caramel)_60%,transparent)]'
                }`}
                key={item.id}
                onClick={() => selectItem(item.id)}
                type="button"
              >
                <div className="relative h-20 bg-black">
                  {item.thumbnailUrl ? (
                    <img alt="" className="h-full w-full object-cover" src={item.thumbnailUrl} />
                  ) : item.waveformUrl ? (
                    <img alt="" className="h-full w-full object-contain p-2" src={item.waveformUrl} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[var(--dust-grey)]">{item.kind}</div>
                  )}
                  <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[10px]">
                    {formatDuration(item.durationSeconds)}
                  </span>
                </div>
                <div className="p-2">
                  <p className="truncate text-xs font-medium">{item.name}</p>
                  <p className="mt-1 text-[10px] text-[var(--dust-grey)]">{formatBytes(item.sizeBytes)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function PlayerPanel({
  handleDrop,
  handlePickFiles,
  isDragging,
  isImporting,
  selectedItem,
  setIsDragging,
}: {
  handleDrop: (event: DragEvent<HTMLDivElement>) => void;
  handlePickFiles: () => void;
  isDragging: boolean;
  isImporting: boolean;
  selectedItem?: ImportedMedia;
  setIsDragging: (isDragging: boolean) => void;
}) {
  return (
    <section className="grid min-h-0 grid-rows-[36px_1fr_52px] bg-[var(--app-bg)]">
      <div className="flex items-center justify-between border-b border-[color-mix(in_srgb,var(--dust-grey)_10%,transparent)] px-4 text-xs text-[var(--dust-grey)]">
        <span className="font-semibold text-[var(--floral-white)]">Player-Timeline 01</span>
        <span>☰</span>
      </div>

      <div
        className={`m-4 flex min-h-0 items-center justify-center rounded-xl border ${
          isDragging
            ? 'border-[var(--light-caramel)] bg-[color-mix(in_srgb,var(--light-caramel)_12%,var(--app-panel))]'
            : 'border-[color-mix(in_srgb,var(--dust-grey)_12%,transparent)] bg-black'
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
          <div className="max-w-sm text-center">
            <img alt="OpenFrame" className="mx-auto mb-4 h-20 w-20 rounded-2xl" src="/openframe-light.png" />
            <p className="text-base font-semibold">Drop media here</p>
            <p className="mt-2 text-sm text-[var(--dust-grey)]">Import clips to preview, probe metadata, and place them on the timeline.</p>
            <button
              className="mt-5 rounded-lg bg-[var(--light-caramel)] px-4 py-2 text-sm font-semibold text-[var(--app-bg)] disabled:opacity-60"
              disabled={isImporting}
              onClick={handlePickFiles}
              type="button"
            >
              {isImporting ? 'Importing...' : 'Import Media'}
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 border-t border-[color-mix(in_srgb,var(--dust-grey)_10%,transparent)] px-4 text-xs text-[var(--dust-grey)]">
        <span className="text-[var(--light-caramel)]">00:00:00</span>
        <span>{formatDuration(selectedItem?.durationSeconds)}</span>
        <button className="text-lg text-[var(--floral-white)]" type="button">
          ▶
        </button>
        <span>Fit</span>
        <span>Ratio</span>
        <span>⛶</span>
      </div>
    </section>
  );
}

function ProjectPanel({ item }: { item?: ImportedMedia }) {
  return (
    <aside className="border-l border-[color-mix(in_srgb,var(--dust-grey)_12%,transparent)] bg-[var(--app-panel)]">
      <div className="flex border-b border-[color-mix(in_srgb,var(--dust-grey)_10%,transparent)] text-sm">
        <button className="border-b-2 border-[var(--light-caramel)] px-4 py-3 text-[var(--light-caramel)]" type="button">
          Project
        </button>
        <button className="px-4 py-3 text-[var(--dust-grey)]" type="button">
          Details
        </button>
      </div>

      <div className="space-y-5 p-5">
        <section className="rounded-xl bg-[var(--app-raised)] p-4">
          <p className="text-xs text-[var(--dust-grey)]">Smart suggestions</p>
          <h3 className="mt-2 text-lg font-semibold">Find out how your video can be improved</h3>
          <button className="mt-4 rounded-lg bg-[var(--light-caramel)] px-3 py-2 text-xs font-semibold text-[var(--app-bg)]" type="button">
            Analyze
          </button>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Global edits</h3>
            <span className="text-[var(--light-caramel)]">◆</span>
          </div>
          {['Make colors better', 'Make colors consistent', 'Make volume consistent', 'Make voice clearer'].map((label) => (
            <label
              className="mb-2 flex items-center justify-between rounded-lg bg-[var(--app-raised)] px-3 py-3 text-sm"
              key={label}
            >
              <span>{label}</span>
              <input className="accent-[var(--light-caramel)]" type="checkbox" />
            </label>
          ))}
        </section>

        <section className="rounded-xl bg-[var(--app-raised)] p-4 text-sm text-[var(--dust-grey)]">
          <p className="mb-2 font-semibold text-[var(--floral-white)]">Selected asset</p>
          {item ? (
            <div className="space-y-1">
              <p className="truncate">{item.name}</p>
              <p>{item.kind} · {formatBytes(item.sizeBytes)}</p>
              <p>{item.width && item.height ? `${item.width}×${item.height}` : 'No video stream'}</p>
            </div>
          ) : (
            <p>No media selected.</p>
          )}
        </section>
      </div>
    </aside>
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
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
        <video
          className="min-h-0 max-h-full max-w-full rounded-lg bg-black"
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
      <div className="w-full max-w-2xl rounded-xl bg-[var(--app-panel)] p-5">
        <p className="mb-4 font-medium">{item.name}</p>
        {item.waveformUrl ? (
          <img alt="Audio waveform" className="mb-5 h-28 w-full rounded-lg bg-black object-contain p-3" src={item.waveformUrl} />
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
    return <img alt={item.name} className="max-h-full max-w-full rounded-lg object-contain" src={item.previewUrl} />;
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
    <div className="w-full max-w-3xl rounded-lg bg-[var(--app-raised)] p-2">
      {waveformUrl ? <img alt="" className="mb-2 h-10 w-full object-cover opacity-80" src={waveformUrl} /> : null}
      <div className="flex items-center gap-3">
        <span className="w-12 text-xs tabular-nums text-[var(--light-caramel)]">{formatDuration(currentTime)}</span>
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
