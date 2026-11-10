import { useSyncExternalStore } from 'react';

export interface Toast {
  id: number;
  text: string;
  kind?: 'info' | 'error';
  action?: { label: string; run: () => void };
  ms?: number;
}
let toasts: Toast[] = [];
const ls = new Set<() => void>();
let n = 0;
const emit = () => ls.forEach((l) => l());

export function toast(t: Omit<Toast, 'id'>): number {
  const id = ++n;
  toasts = [...toasts.slice(-1), { ...t, id }];
  emit();
  setTimeout(() => dismissToast(id), t.ms ?? (t.action ? 6000 : 2600));
  return id;
}
export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}
export function useToasts(): Toast[] {
  return useSyncExternalStore((l) => (ls.add(l), () => ls.delete(l)), () => toasts);
}
export function clearToasts() {
  toasts = toasts.filter((t) => !t.action);
  emit();
}
