import { create } from 'zustand';
import { api } from '../api/client.js';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

const ROLE_LEVEL: Record<string, number> = {
  viewer: 0, learner: 1, author: 2, framework_dev: 3,
};

export function hasMinRole(role: string | undefined, minRole: string): boolean {
  return (ROLE_LEVEL[role ?? ''] ?? 0) >= (ROLE_LEVEL[minRole] ?? 0);
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;

  /** Effektive Rolle des Users für ein Modul (lazy-cached). */
  moduleRoles: Record<string, string>;
  fetchModuleRole: (moduleId: string) => Promise<string>;

  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,
  moduleRoles: {},

  fetchModuleRole: async (moduleId: string) => {
    const cached = get().moduleRoles[moduleId];
    if (cached) return cached;
    try {
      const { role } = await api.myModuleRole(moduleId);
      set(s => ({ moduleRoles: { ...s.moduleRoles, [moduleId]: role } }));
      return role;
    } catch {
      const fallback = get().user?.role ?? 'viewer';
      set(s => ({ moduleRoles: { ...s.moduleRoles, [moduleId]: fallback } }));
      return fallback;
    }
  },

  init: async () => {
    try {
      const user = await api.authMe();
      set({ user, initialized: true });
    } catch {
      set({ user: null, initialized: true });
    }
  },

  login: async (email, password) => {
    set({ loading: true });
    try {
      const user = await api.authLogin({ email, password });
      set({ user, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  register: async (email, password, displayName) => {
    set({ loading: true });
    try {
      const user = await api.authRegister({ email, password, displayName });
      set({ user, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout: async () => {
    await api.authLogout();
    set({ user: null, moduleRoles: {} });
  },
}));
