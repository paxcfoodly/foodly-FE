'use client';

import { create } from 'zustand';
import type { User } from '@/types';
import { usePermissionStore } from '@/stores/permissionStore';

/* ── 상수 ──────────────────────────────────────────── */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;        // 30분
const SESSION_WARNING_MS = 25 * 60 * 1000;         // 25분 (5분 전 경고)
const TOKEN_REFRESH_MARGIN_MS = 2 * 60 * 1000;     // 만료 2분 전 갱신

/* ── 타입 ──────────────────────────────────────────── */
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  /** 세션 타임아웃 경고 표시 여부 */
  showSessionWarning: boolean;

  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  hydrate: () => void;

  /** 세션 타임아웃 타이머 시작 */
  startSessionTimer: () => void;
  /** 사용자 활동 감지 시 타이머 리셋 */
  resetSessionTimer: () => void;
  /** 세션 경고 닫기 (활동 연장) */
  dismissSessionWarning: () => void;
  /** 토큰 자동 갱신 스케줄 */
  scheduleTokenRefresh: () => void;
  /** 정리 */
  cleanup: () => void;
}

/* ── 내부 타이머 ID (store 외부) ────────────────────── */
let sessionWarningTimer: ReturnType<typeof setTimeout> | null = null;
let sessionTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
let tokenRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let activityListenersAttached = false;

function clearAllTimers() {
  if (sessionWarningTimer) { clearTimeout(sessionWarningTimer); sessionWarningTimer = null; }
  if (sessionTimeoutTimer) { clearTimeout(sessionTimeoutTimer); sessionTimeoutTimer = null; }
  if (tokenRefreshTimer) { clearTimeout(tokenRefreshTimer); tokenRefreshTimer = null; }
}

/** JWT payload에서 exp 추출 */
function getTokenExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null; // ms
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  showSessionWarning: false,

  login: (user, accessToken, refreshToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
    }
    set({ user, accessToken, isAuthenticated: true, showSessionWarning: false });
    get().startSessionTimer();
    get().scheduleTokenRefresh();
  },

  logout: () => {
    clearAllTimers();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
    usePermissionStore.getState().clearPermissions();
    set({ user: null, accessToken: null, isAuthenticated: false, showSessionWarning: false });
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const accessToken = localStorage.getItem('accessToken');
    const userJson = localStorage.getItem('user');
    if (accessToken && userJson) {
      try {
        const user = JSON.parse(userJson) as User;
        // 토큰 만료 확인
        const exp = getTokenExp(accessToken);
        if (exp && exp < Date.now()) {
          // 만료됨 — refreshToken으로 갱신 시도
          get().logout();
          return;
        }
        set({ user, accessToken, isAuthenticated: true });
        get().startSessionTimer();
        get().scheduleTokenRefresh();
      } catch {
        localStorage.removeItem('user');
        set({ user: null, accessToken: null, isAuthenticated: false });
      }
    }
  },

  startSessionTimer: () => {
    if (typeof window === 'undefined') return;
    clearAllTimers();

    // 25분 후 경고
    sessionWarningTimer = setTimeout(() => {
      set({ showSessionWarning: true });
    }, SESSION_WARNING_MS);

    // 30분 후 자동 로그아웃
    sessionTimeoutTimer = setTimeout(() => {
      get().logout();
      window.location.href = '/login?reason=timeout';
    }, SESSION_TIMEOUT_MS);

    // 활동 리스너 등록 (한 번만)
    if (!activityListenersAttached) {
      const resetTimer = () => get().resetSessionTimer();
      window.addEventListener('mousedown', resetTimer);
      window.addEventListener('keydown', resetTimer);
      window.addEventListener('scroll', resetTimer);
      window.addEventListener('touchstart', resetTimer);
      activityListenersAttached = true;
    }
  },

  resetSessionTimer: () => {
    const state = get();
    if (!state.isAuthenticated) return;
    set({ showSessionWarning: false });
    state.startSessionTimer();
  },

  dismissSessionWarning: () => {
    set({ showSessionWarning: false });
    get().resetSessionTimer();
  },

  scheduleTokenRefresh: () => {
    if (typeof window === 'undefined') return;
    if (tokenRefreshTimer) { clearTimeout(tokenRefreshTimer); tokenRefreshTimer = null; }

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    const exp = getTokenExp(accessToken);
    if (!exp) return;

    const refreshIn = exp - Date.now() - TOKEN_REFRESH_MARGIN_MS;
    if (refreshIn <= 0) {
      // 이미 만료 임박 — 즉시 갱신
      void refreshTokenNow(get, set);
      return;
    }

    tokenRefreshTimer = setTimeout(() => {
      void refreshTokenNow(get, set);
    }, refreshIn);
  },

  cleanup: () => {
    clearAllTimers();
  },
}));

/** 토큰 갱신 실행 */
async function refreshTokenNow(
  get: () => AuthState,
  set: (partial: Partial<AuthState>) => void,
) {
  if (typeof window === 'undefined') return;
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    get().logout();
    return;
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api';
    const res = await fetch(`${baseUrl}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      get().logout();
      window.location.href = '/login?reason=expired';
      return;
    }

    const json = await res.json();
    const { accessToken: newAccess, refreshToken: newRefresh } = json.data;

    localStorage.setItem('accessToken', newAccess);
    if (newRefresh) localStorage.setItem('refreshToken', newRefresh);
    set({ accessToken: newAccess });
    get().scheduleTokenRefresh();
  } catch {
    console.error('[Auth] Token refresh failed');
  }
}
