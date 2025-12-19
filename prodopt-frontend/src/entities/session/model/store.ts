import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuth: boolean;
  setTokens: (access: string, refresh: string) => void;
  logout: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      isAuth: false,
      setTokens: (accessToken, refreshToken) => 
        set({ accessToken, refreshToken, isAuth: true }),
      logout: () => 
        set({ accessToken: null, refreshToken: null, isAuth: false }),
    }),
    {
      name: 'session-storage', // имя ключа в localStorage
    }
  )
);