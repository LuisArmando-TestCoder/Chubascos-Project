import { create } from 'zustand';

interface BatchCache {
  items: any[];
  lastId: string | null;
  hasMore: boolean;
}

interface DataState {
  cache: Record<string, BatchCache>;
  setCache: (key: string, data: BatchCache) => void;
  getCache: (key: string) => BatchCache | undefined;
  clearCache: () => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  cache: {},
  setCache: (key, data) => set((state) => ({
    cache: { ...state.cache, [key]: data }
  })),
  getCache: (key) => get().cache[key],
  clearCache: () => set({ cache: {} }),
}));
