'use client';

import { useRouter } from 'next/navigation';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStorage } from './api';
import { Profile } from './types';

interface AuthContextValue {
  user: Profile | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStorage.get()) {
      setReady(true);
      return;
    }
    api<Profile>('/auth/me')
      .then(setUser)
      .catch(() => tokenStorage.clear())
      .finally(() => setReady(true));
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ token: string; user: Profile }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    tokenStorage.set(res.token);
    setUser(res.user);
  }, []);

  return <AuthContext.Provider value={{ user, ready, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
