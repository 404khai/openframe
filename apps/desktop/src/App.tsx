import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useMemo, useState, type DragEvent } from 'react';
import { useMediaStore } from './stores/mediaStore';
import type { FileMetadata, ImportedMedia, MediaKind } from './types/media';

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

function createImportedMedia(metadata: FileMetadata): ImportedMedia {
  return {
    id: metadata.path,
    path: metadata.path,
    previewUrl: convertFileSrc(metadata.path),
    name: metadata.name,
    extension: metadata.extension,
    kind: mediaKindFromName(metadata.name),
    sizeBytes: metadata.sizeBytes,
    modifiedMs: metadata.modifiedMs,
  };
}

async function metadataForPath(path: string): Promise<ImportedMedia> {
  const metadata = await invoke<FileMetadata>('get_file_metadata', { path });
  return createImportedMedia(metadata);
}

async function mediaFromBrowserFile(file: File): Promise<ImportedMedia> {
  const fileWithPath = file as File & { path?: string };

  if (fileWithPath.path) {
    return metadataForPath(fileWithPath.path);
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
  const [error, setError] = useState<string>();
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0],
    [items, selectedId],
  );

  async function importPaths(paths: string[]) {
    setError(undefined);

    try {
      const media = await Promise.all(paths.map(metadataForPath));
      addItems(media);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
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

    try {
      const media = await Promise.all(files.map(mediaFromBrowserFile));
      addItems(media);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <main className="grid h-screen grid-rows-[auto_1fr_auto] overflow-hidden bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">OpenFrame</p>
          <h1 className="text-2xl font-semibold tracking-tight">Creator Editing Shell</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
            onClick={clear}
            type="button"
          >
            Clear
          </button>
          <button
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            onClick={handlePickFiles}
            type="button"
          >
            Import Media
          </button>
        </div>
      </header>

      <section className="grid min-h-0 grid-cols-[320px_1fr]">
        <aside className="flex min-h-0 flex-col border-r border-slate-800 bg-slate-900/50">
          <div className="border-b border-slate-800 px-4 py-3">
            <h2 className="font-semibold">Media Bin</h2>
            <p className="text-sm text-slate-400">{items.length} imported item{items.length === 1 ? '' : 's'}</p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                Import or drag media into the app to start a local project.
              </p>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <button
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selectedItem?.id === item.id
                        ? 'border-cyan-300 bg-cyan-300/10'
                        : 'border-slate-800 bg-slate-900 hover:border-slate-600'
                    }`}
                    key={item.id}
                    onClick={() => selectItem(item.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <span className="rounded-full bg-slate-800 px-2 py-1 text-xs uppercase text-slate-300">
                        {item.kind}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{formatBytes(item.sizeBytes)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <div className="grid min-h-0 grid-rows-[1fr_180px]">
          <section
            className={`m-6 flex min-h-0 items-center justify-center rounded-2xl border ${
              isDragging ? 'border-cyan-300 bg-cyan-300/10' : 'border-slate-800 bg-slate-900/40'
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
                <p className="text-lg font-semibold">Drop media here</p>
                <p className="mt-2 text-sm text-slate-400">
                  OpenFrame supports local video, audio, and image imports for the Phase 1 desktop shell.
                </p>
              </div>
            )}
          </section>

          <section className="border-t border-slate-800 bg-slate-950 px-6 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Timeline Bootstrap</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Canvas in Phase 3</span>
            </div>
            <div className="flex h-24 items-center rounded-xl border border-dashed border-slate-700 bg-slate-900/60 px-4 text-sm text-slate-400">
              Imported clips will appear here when the timeline editor is implemented.
            </div>
          </section>
        </div>
      </section>

      {error ? (
        <footer className="border-t border-red-900/60 bg-red-950 px-6 py-2 text-sm text-red-100">{error}</footer>
      ) : null}
    </main>
  );
}

function Preview({ item }: { item: ImportedMedia }) {
  if (!item.previewUrl) {
    return <p className="text-sm text-slate-400">No preview available for {item.name}.</p>;
  }

  if (item.kind === 'video') {
    return <video className="max-h-full max-w-full rounded-xl" controls src={item.previewUrl} />;
  }

  if (item.kind === 'audio') {
    return (
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950 p-6">
        <p className="mb-4 font-medium">{item.name}</p>
        <audio className="w-full" controls src={item.previewUrl} />
      </div>
    );
  }

  if (item.kind === 'image') {
    return <img alt={item.name} className="max-h-full max-w-full rounded-xl object-contain" src={item.previewUrl} />;
  }

  return <p className="text-sm text-slate-400">Preview is not available for this file type.</p>;
}
