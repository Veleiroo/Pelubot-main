import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { StylistPublic } from '@/types/stylist';

export type ProSession = {
  stylist: StylistPublic;
  sessionExpiresAt: string;
  sessionToken?: string | null;
};

type ProSessionState = {
  session: ProSession | null;
  setSession: (session: ProSession) => void;
  clearSession: () => void;
};

const noopStorage = {
  length: 0,
  clear: () => undefined,
  getItem: () => null,
  key: () => null,
  removeItem: () => undefined,
  setItem: () => undefined,
} as Storage;

export const useProSession = create<ProSessionState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
    }),
    {
      name: 'pelubot-pro-session',
      storage: createJSONStorage(() => (typeof window === 'undefined' ? noopStorage : window.sessionStorage)),
      partialize: (state) => ({ session: state.session }),
    }
  )
);
