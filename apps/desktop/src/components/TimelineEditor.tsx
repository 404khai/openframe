import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTimelineStore } from '../stores/timelineStore';
import type { ImportedMedia } from '../types/media';
import type { TimelineClip } from '../types/timeline';

const trackHeight = 58;
const trackGap = 10;
const rulerHeight = 28;
const snapSeconds = 0.5;
const snapThresholdSeconds = 0.12;

type InteractionMode = 'move' | 'trim-start' | 'trim-end';

interface Interaction {
  clipId: string;
  mode: InteractionMode;
  pointerStartX: number;
  pointerStartY: number;
  originalClip: TimelineClip;
}

interface TimelineEditorProps {
  mediaItems: ImportedMedia[];
  onSelectMedia: (mediaId: string) => void;
}

function formatTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const minutes = Math.floor(clamped / 60);
  const remainingSeconds = Math.floor(clamped % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function snapTime(value: number, anchors: number[]): number {
  const grid = Math.round(value / snapSeconds) * snapSeconds;
  let best = Math.max(0, grid);
  let bestDistance = Math.abs(value - grid);

  for (const anchor of anchors) {
    const distance = Math.abs(value - anchor);

    if (distance < bestDistance && distance <= snapThresholdSeconds) {
      best = anchor;
      bestDistance = distance;
    }
  }

  return Math.max(0, best);
}

export function TimelineEditor({ mediaItems, onSelectMedia }: TimelineEditorProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const {
    tracks,
    clips,
    selectedClipId,
    playheadSeconds,
    pixelsPerSecond,
    selectClip,
    setPlayhead,
    setZoom,
    moveClip,
    trimClipStart,
    trimClipEnd,
    splitClip,
    deleteSelectedClip,
  } = useTimelineStore();
  const [interaction, setInteraction] = useState<Interaction>();
  const mediaById = useMemo(() => new Map(mediaItems.map((item) => [item.id, item])), [mediaItems]);
  const timelineDuration = Math.max(
    30,
    ...clips.map((clip) => clip.startSeconds + clip.durationSeconds + 4),
    playheadSeconds + 4,
  );
  const width = timelineDuration * pixelsPerSecond;
  const anchors = useMemo(
    () => clips.flatMap((clip) => [clip.startSeconds, clip.startSeconds + clip.durationSeconds, playheadSeconds]),
    [clips, playheadSeconds],
  );

  function pointerToSeconds(clientX: number): number {
    const rect = timelineRef.current?.getBoundingClientRect();

    if (!rect) {
      return 0;
    }

    return Math.max(0, (clientX - rect.left + (timelineRef.current?.scrollLeft ?? 0)) / pixelsPerSecond);
  }

  function pointerToTrackId(clientY: number): string | undefined {
    const rect = timelineRef.current?.getBoundingClientRect();

    if (!rect) {
      return undefined;
    }

    const y = clientY - rect.top - rulerHeight + (timelineRef.current?.scrollTop ?? 0);
    const index = Math.floor(y / (trackHeight + trackGap));

    return tracks[index]?.id;
  }

  function handleTimelinePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) {
      return;
    }

    selectClip(undefined);
    setPlayhead(snapTime(pointerToSeconds(event.clientX), anchors));
  }

  function startInteraction(event: PointerEvent<HTMLDivElement>, clip: TimelineClip, mode: InteractionMode) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    selectClip(clip.id);
    onSelectMedia(clip.mediaId);
    setInteraction({
      clipId: clip.id,
      mode,
      pointerStartX: event.clientX,
      pointerStartY: event.clientY,
      originalClip: clip,
    });
  }

  function handleClipPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!interaction) {
      return;
    }

    const deltaSeconds = (event.clientX - interaction.pointerStartX) / pixelsPerSecond;
    const clip = interaction.originalClip;

    if (interaction.mode === 'move') {
      const nextTrackId = pointerToTrackId(event.clientY);
      moveClip(interaction.clipId, snapTime(clip.startSeconds + deltaSeconds, anchors), nextTrackId);
      return;
    }

    if (interaction.mode === 'trim-start') {
      const nextStart = snapTime(clip.startSeconds + deltaSeconds, anchors);
      const maxStart = clip.startSeconds + clip.durationSeconds - 0.25;
      const clampedStart = Math.min(nextStart, maxStart);
      const trimDelta = clampedStart - clip.startSeconds;
      trimClipStart(
        interaction.clipId,
        clampedStart,
        clip.trimStartSeconds + trimDelta,
        clip.durationSeconds - trimDelta,
      );
      return;
    }

    trimClipEnd(interaction.clipId, clip.durationSeconds + deltaSeconds);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      deleteSelectedClip();
    }

    if ((event.key === 's' || event.key === 'S') && selectedClipId) {
      event.preventDefault();
      splitClip(selectedClipId, playheadSeconds);
    }

    if (event.key === '=' || event.key === '+') {
      event.preventDefault();
      setZoom(pixelsPerSecond + 8);
    }

    if (event.key === '-') {
      event.preventDefault();
      setZoom(pixelsPerSecond - 8);
    }
  }

  return (
    <section
      className="min-h-0 border-t border-[color-mix(in_srgb,var(--dust-grey)_12%,transparent)] bg-[var(--app-bg)] px-2 py-2"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="mb-2 flex items-center justify-between gap-4 border-b border-[color-mix(in_srgb,var(--dust-grey)_10%,transparent)] pb-2">
        <div className="flex items-center gap-2 text-xs text-[var(--dust-grey)]">
          {['+', '⌁', '↶', '↷', '⌫', '▱'].map((item) => (
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--app-panel)] hover:text-[var(--floral-white)]"
              key={item}
              type="button"
            >
              {item}
            </button>
          ))}
          <span className="ml-2 hidden text-[11px] sm:inline">
            Drag clips, trim edges, press S to split, Delete to remove.
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-[var(--dust-grey)]">
          <button
            className="rounded-md bg-[var(--light-caramel)] px-3 py-1.5 font-semibold text-[var(--app-bg)]"
            onClick={() => selectedClipId && splitClip(selectedClipId, playheadSeconds)}
            type="button"
          >
            Split
          </button>
          <button
            className="rounded-md border border-[color-mix(in_srgb,var(--dust-grey)_35%,transparent)] px-2 py-1.5"
            onClick={() => setZoom(pixelsPerSecond - 8)}
            type="button"
          >
            -
          </button>
          <span className="w-14 text-center">{pixelsPerSecond}px/s</span>
          <button
            className="rounded-md border border-[color-mix(in_srgb,var(--dust-grey)_35%,transparent)] px-2 py-1.5"
            onClick={() => setZoom(pixelsPerSecond + 8)}
            type="button"
          >
            +
          </button>
        </div>
      </div>

      <div
        className="relative h-[236px] overflow-auto rounded-lg border border-[color-mix(in_srgb,var(--dust-grey)_12%,transparent)] bg-[var(--app-panel)] p-2"
        onPointerDown={handleTimelinePointerDown}
        ref={timelineRef}
      >
        <div className="relative" style={{ height: rulerHeight + tracks.length * (trackHeight + trackGap), width }}>
          <div className="absolute left-0 top-0 h-7 border-b border-[color-mix(in_srgb,var(--dust-grey)_16%,transparent)]">
            {Array.from({ length: Math.ceil(timelineDuration / 5) + 1 }, (_, index) => index * 5).map((seconds) => (
              <div
                className="absolute top-0 h-7 border-l border-[color-mix(in_srgb,var(--dust-grey)_25%,transparent)] pl-1 text-[10px] text-[var(--dust-grey)]"
                key={seconds}
                style={{ left: seconds * pixelsPerSecond }}
              >
                {formatTime(seconds)}
              </div>
            ))}
          </div>

          <div
            className="absolute top-0 z-20 h-full w-px bg-[var(--light-caramel)]"
            style={{ left: playheadSeconds * pixelsPerSecond }}
          >
            <div className="-ml-1.5 h-3 w-3 rounded-full bg-[var(--light-caramel)]" />
          </div>

          {tracks.map((track, trackIndex) => {
            const top = rulerHeight + trackIndex * (trackHeight + trackGap);

            return (
              <div
                className="absolute left-0 rounded-md border border-[color-mix(in_srgb,var(--dust-grey)_10%,transparent)] bg-[var(--app-bg)]"
                key={track.id}
                style={{ height: trackHeight, top, width }}
              >
                <div className="sticky left-0 z-10 flex h-full w-28 items-center border-r border-[color-mix(in_srgb,var(--dust-grey)_14%,transparent)] bg-[var(--app-bg)] px-3 text-xs font-semibold text-[var(--dust-grey)]">
                  {track.name}
                </div>

                {clips
                  .filter((clip) => clip.trackId === track.id)
                  .map((clip) => {
                    const media = mediaById.get(clip.mediaId);
                    const isSelected = clip.id === selectedClipId;
                    const left = clip.startSeconds * pixelsPerSecond;
                    const clipWidth = Math.max(22, clip.durationSeconds * pixelsPerSecond);

                    return (
                      <div
                        className={`absolute top-2 flex h-10 cursor-grab items-center overflow-hidden rounded-lg border text-xs shadow-lg ${
                          isSelected
                            ? 'border-[var(--light-caramel)] bg-[color-mix(in_srgb,var(--light-caramel)_35%,var(--app-raised))]'
                            : 'border-[color-mix(in_srgb,var(--dust-grey)_18%,transparent)] bg-[var(--app-raised)]'
                        }`}
                        key={clip.id}
                        onPointerDown={(event) => startInteraction(event, clip, 'move')}
                        onPointerMove={handleClipPointerMove}
                        onPointerUp={() => setInteraction(undefined)}
                        style={{ left, width: clipWidth }}
                      >
                        <div
                          className="h-full w-2 cursor-ew-resize bg-[var(--light-caramel)]"
                          onPointerDown={(event) => startInteraction(event, clip, 'trim-start')}
                        />
                        <div className="min-w-0 flex-1 px-2">
                          <p className="truncate font-semibold text-[var(--floral-white)]">{media?.name ?? 'Missing media'}</p>
                          <p className="truncate text-[10px] text-[var(--dust-grey)]">
                            {formatTime(clip.startSeconds)} · {formatTime(clip.durationSeconds)}
                          </p>
                        </div>
                        <div
                          className="h-full w-2 cursor-ew-resize bg-[var(--light-caramel)]"
                          onPointerDown={(event) => startInteraction(event, clip, 'trim-end')}
                        />
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
