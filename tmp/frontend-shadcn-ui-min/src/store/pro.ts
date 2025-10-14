import { create } from 'zustand';
import type { StylistPublic } from '@/lib/api';

export type ProSession = {
  stylist: StylistPublic;
  sessionExpiresAt: string;
};

type ProSessionState = {
  session: ProSession | null;
  setSession: (session: ProSession) => void;
  clearSession: () => void;
};

export const useProSession = create<ProSessionState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  clearSession: () => set({ session: null }),
}));
