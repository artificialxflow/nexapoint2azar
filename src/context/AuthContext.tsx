'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthUserPayload } from '@/src/lib/auth/auth-user';
import { createDemoAuthUser } from '@/src/lib/auth/auth-user';
import {
  FRONTEND_ONLY,
  MOCK_DEMO_PASSWORD,
  MOCK_DEMO_USERNAME,
  MOCK_SESSION_COOKIE,
  MOCK_USER_STORAGE_KEY,
} from '@/src/lib/frontend-config';

type AuthContextValue = {
  user: AuthUserPayload | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  loginWithCredentials: (username: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  requestOtp: (
    mobile: string
  ) => Promise<
    | { ok: true; pending?: boolean; message?: string }
    | { ok: false; message: string }
  >;
  verifyOtp: (mobile: string, code: string) => Promise<{ ok: true } | { ok: false; message: string }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUserPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(MOCK_USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUserPayload;
  } catch {
    return null;
  }
}

function persistSession(user: AuthUserPayload | null) {
  if (typeof window === 'undefined') return;
  if (user) {
    window.localStorage.setItem(MOCK_USER_STORAGE_KEY, JSON.stringify(user));
    document.cookie = `${MOCK_SESSION_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  } else {
    window.localStorage.removeItem(MOCK_USER_STORAGE_KEY);
    document.cookie = `${MOCK_SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUserPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (FRONTEND_ONLY) {
      setUser(readStoredUser());
      return;
    }
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const json = await res.json();
      setUser(json.data?.user ?? null);
    } catch {
      setUser(null);
    }
  }, []);

  const loginWithCredentials = useCallback(async (username: string, password: string) => {
    if (FRONTEND_ONLY) {
      const u = username.trim();
      const p = password;
      if (u !== MOCK_DEMO_USERNAME || p !== MOCK_DEMO_PASSWORD) {
        return { ok: false as const, message: 'نام کاربری یا رمز عبور نادرست است.' };
      }
      const demo = createDemoAuthUser();
      persistSession(demo);
      setUser(demo);
      return { ok: true as const };
    }
    try {
      const res = await fetch('/api/auth/password/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ login: username.trim(), password }),
      });
      const json = await res.json();
      if (!res.ok) {
        return { ok: false as const, message: json.error?.message ?? 'ورود ناموفق بود.' };
      }
      setUser(json.data?.user ?? null);
      return { ok: true as const };
    } catch {
      return { ok: false as const, message: 'خطا در ارتباط با سرور.' };
    }
  }, []);

  const requestOtp = useCallback(async (mobile: string) => {
    if (FRONTEND_ONLY) {
      return { ok: false as const, message: 'حالت نمایشی — OTP واقعی فعال نیست.' };
    }
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mobile }),
      });
      const json = await res.json();
      if (!res.ok) {
        return { ok: false as const, message: json.error?.message ?? 'ارسال کد ناموفق بود.' };
      }
      if (json.data?.pending) {
        return {
          ok: true as const,
          pending: true as const,
          message: json.data.message as string,
        };
      }
      return { ok: true as const, pending: false as const };
    } catch {
      return { ok: false as const, message: 'خطا در ارتباط با سرور.' };
    }
  }, []);

  const verifyOtp = useCallback(async (mobile: string, code: string) => {
    if (FRONTEND_ONLY) {
      return { ok: false as const, message: 'حالت نمایشی — OTP واقعی فعال نیست.' };
    }
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mobile, code }),
      });
      const json = await res.json();
      if (!res.ok) {
        return { ok: false as const, message: json.error?.message ?? 'کد نامعتبر است.' };
      }
      setUser(json.data?.user ?? null);
      return { ok: true as const };
    } catch {
      return { ok: false as const, message: 'خطا در ارتباط با سرور.' };
    }
  }, []);

  const logout = useCallback(async () => {
    if (!FRONTEND_ONLY) {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } else {
      persistSession(null);
    }
    setUser(null);
    window.location.href = '/login';
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const value = useMemo(
    () => ({
      user,
      loading,
      refresh,
      logout,
      loginWithCredentials,
      requestOtp,
      verifyOtp,
    }),
    [user, loading, refresh, logout, loginWithCredentials, requestOtp, verifyOtp]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useAuthOptional() {
  return useContext(AuthContext);
}
