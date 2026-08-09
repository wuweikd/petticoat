import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, type StaffUser } from './api';

type AuthState = {
  user: StaffUser | null;
  token: string | null;
  login: (phone: string, code: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

function readUser(): StaffUser | null {
  const raw = localStorage.getItem('petticoat_admin_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StaffUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('petticoat_admin_token'),
  );
  const [user, setUser] = useState<StaffUser | null>(() => readUser());

  const login = useCallback(async (phone: string, code: string) => {
    const res = await api.adminLogin(phone, code);
    localStorage.setItem('petticoat_admin_token', res.accessToken);
    localStorage.setItem('petticoat_admin_user', JSON.stringify(res.user));
    setToken(res.accessToken);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('petticoat_admin_token');
    localStorage.removeItem('petticoat_admin_user');
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, login, logout }),
    [user, token, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside provider');
  return ctx;
}
