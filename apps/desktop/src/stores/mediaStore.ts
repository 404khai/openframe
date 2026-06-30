import { create } from 'zustand';
import type { ImportedMedia } from '../types/media';

interface MediaState {
  items: ImportedMedia[];
  selectedId?: string;
  addItems: (items: ImportedMedia[]) => void;
  selectItem: (id: string) => void;
  clear: () => void;
}

export const useMediaStore = create<MediaState>((set) => ({
  items: [],
  selectedId: undefined,
  addItems: (items) =>
    set((state) => {
      const existingPaths = new Set(state.items.map((item) => item.path ?? item.previewUrl ?? item.name));
      const nextItems = items.filter((item) => !existingPaths.has(item.path ?? item.previewUrl ?? item.name));

      return {
        items: [...state.items, ...nextItems],
        selectedId: state.selectedId ?? nextItems[0]?.id,
      };
    }),
  selectItem: (id) => set({ selectedId: id }),
  clear: () => set({ items: [], selectedId: undefined }),
}));
