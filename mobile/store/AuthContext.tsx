import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { api, setApiToken } from '@/lib/api';

const TOKEN_KEY = 'petticoat.auth.token';
const USER_KEY = 'petticoat.auth.user';
const DRAFT_KEY = 'petticoat.auth.draft';
const WARDROBE_LOCAL_KEY = 'petticoat.v2';

export type AuthUser = {
  id: string;
  phone: string | null;
  nickname: string;
  role: string;
};

/** Opaque draft restored after login (e.g. add form fields) */
export type LoginDraft = {
  returnTo?: string;
  payload?: Record<string, unknown>;
};

type AuthContextValue = {
  ready: boolean;
  user: AuthUser | null;
  token: string | null;
  pendingDraft: LoginDraft | null;
  login: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  sendCode: (phone: string) => Promise<string | undefined>;
  requireLogin: (draft?: LoginDraft) => void;
  consumeDraft: () => LoginDraft | null;
  loginPath: string | null;
  clearLoginPath: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [pendingDraft, setPendingDraft] = useState<LoginDraft | null>(null);
  const [loginPath, setLoginPath] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [t, u, d] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
          AsyncStorage.getItem(DRAFT_KEY),
        ]);
        if (t && u) {
          setApiToken(t);
          setToken(t);
          setUser(JSON.parse(u) as AuthUser);
        }
        if (d) setPendingDraft(JSON.parse(d) as LoginDraft);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const sendCode = useCallback(async (phone: string) => {
    const res = await api.sendCode(phone);
    if (res.hint) return res.hint;
    if (res.devCode) return `开发验证码 ${res.devCode}`;
    return undefined;
  }, []);

  const login = useCallback(async (phone: string, code: string) => {
    const res = await api.login(phone, code);
    // ADR-0009: cloud wins — discard local wardrobe cache
    await AsyncStorage.removeItem(WARDROBE_LOCAL_KEY);
    await AsyncStorage.setItem(TOKEN_KEY, res.accessToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setApiToken(res.accessToken);
    setToken(res.accessToken);
    setUser(res.user);
    setLoginPath(null);
  }, []);

  const logout = useCallback(async () => {
    setApiToken(null);
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, WARDROBE_LOCAL_KEY]);
  }, []);

  const requireLogin = useCallback((draft?: LoginDraft) => {
    if (draft) {
      setPendingDraft(draft);
      AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft)).catch(() => {});
    }
    setLoginPath('/login');
  }, []);

  const consumeDraft = useCallback(() => {
    const d = pendingDraft;
    setPendingDraft(null);
    AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
    return d;
  }, [pendingDraft]);

  const clearLoginPath = useCallback(() => setLoginPath(null), []);

  const value = useMemo(
    () => ({
      ready,
      user,
      token,
      pendingDraft,
      login,
      logout,
      sendCode,
      requireLogin,
      consumeDraft,
      loginPath,
      clearLoginPath,
    }),
    [
      ready,
      user,
      token,
      pendingDraft,
      login,
      logout,
      sendCode,
      requireLogin,
      consumeDraft,
      loginPath,
      clearLoginPath,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}
