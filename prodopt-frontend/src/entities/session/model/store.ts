import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/entities/user/model/types';

interface SessionState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuth: boolean;
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuth: false,
      setTokens: (accessToken, refreshToken) => 
        set({ accessToken, refreshToken, isAuth: true }),
      setUser: (user) => set({ user }),
      logout: () => 
        set({ accessToken: null, refreshToken: null, user: null, isAuth: false }),
    }),
    {
      name: 'session-storage',
    }
  )
);