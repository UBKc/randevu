import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, clearToken, getToken, setToken } from './api';
import { User } from './types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = () =>
    api
      .get<User & { staffProfile?: { id: number } | null }>('/auth/me')
      .then((me) => setUser({ ...me, staffProfileId: me.staffProfile?.id }));

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    loadMe()
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ token: string }>('/auth/login', { email, password });
    setToken(res.token);
    await loadMe(); // staffProfileId dahil tam kullanıcıyı yükle
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
