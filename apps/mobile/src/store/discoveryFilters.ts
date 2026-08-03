import { create } from 'zustand';

interface DiscoveryFiltersState {
  recentlyActive: boolean;
  newMembers: boolean;
  setRecentlyActive: (value: boolean) => void;
  setNewMembers: (value: boolean) => void;
}

export const useDiscoveryFiltersStore = create<DiscoveryFiltersState>((set) => ({
  recentlyActive: false,
  newMembers: false,
  setRecentlyActive: (value) => set({ recentlyActive: value }),
  setNewMembers: (value) => set({ newMembers: value })
}));
