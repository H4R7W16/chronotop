import { create } from 'zustand';

export type ToastKind = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastStore {
  toasts: Toast[];
  push: (kind: ToastKind, message: string, ttlMs?: number) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (kind, message, ttlMs = 5000) => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, kind, message }] });
    if (ttlMs > 0) {
      setTimeout(() => get().dismiss(id), ttlMs);
    }
  },
  dismiss: (id) =>
    set({ toasts: get().toasts.filter(t => t.id !== id) }),
}));

// Komfort-Helfer ohne Hook (z. B. aus dem API-Client)
export const toast = {
  info: (msg: string) => useToastStore.getState().push('info', msg),
  success: (msg: string) => useToastStore.getState().push('success', msg),
  error: (msg: string, ttlMs = 8000) => useToastStore.getState().push('error', msg, ttlMs),
};
