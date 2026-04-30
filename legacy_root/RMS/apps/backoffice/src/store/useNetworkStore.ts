import { create } from 'zustand';

export type NetworkState = 'online' | 'reconnecting' | 'offline_mode';

interface NetworkStore {
  status: NetworkState;
  isOnline: boolean;
  setStatus: (status: NetworkState) => void;
  forceOffline: () => void;
  setOnline: () => void;
}

export const useNetworkStore = create<NetworkStore>((set) => ({
  status: 'online',
  isOnline: true,
  
  setStatus: (status) => set({ 
    status, 
    // isOnline is true ONLY when strictly online. 
    isOnline: status === 'online' 
  }),

  forceOffline: () => set({ status: 'offline_mode', isOnline: false }),
  
  setOnline: () => set({ status: 'online', isOnline: true }),
}));
