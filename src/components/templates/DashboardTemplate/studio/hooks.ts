'use client';
import { useEffect, useRef, useState } from 'react';

/** Ask before leaving the page while a form has unsaved changes. */
export function useUnsavedGuard(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);
}

/** ⌘/Ctrl + Enter (or ⌘/Ctrl + S) inside `scope` runs `onSave`. */
export function useSaveShortcut(scope: React.RefObject<HTMLElement | null>, onSave: () => void, enabled = true): void {
  const saveRef = useRef(onSave);
  useEffect(() => { saveRef.current = onSave; }, [onSave]);
  useEffect(() => {
    const el = scope.current;
    if (!el || !enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === 'Enter' || e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveRef.current();
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [scope, enabled]);
}

/**
 * A draft kept in this browser only (never sent anywhere). Storage may be
 * missing or throw (private mode, blocked site data): the form still works.
 */
export function useLocalDraft<T>(key: string | null, value: T, isEmpty: (v: T) => boolean) {
  const [restored, setRestored] = useState<T | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!key || loadedRef.current) return;
    loadedRef.current = true;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { v: T; t: number };
      if (parsed && parsed.v && !isEmpty(parsed.v)) setRestored(parsed.v);
    } catch {
      /* no storage: nothing to restore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!key || !loadedRef.current) return;
    const id = window.setTimeout(() => {
      try {
        if (isEmpty(value)) window.localStorage.removeItem(key);
        else {
          window.localStorage.setItem(key, JSON.stringify({ v: value, t: Date.now() }));
          setSavedAt(Date.now());
        }
      } catch {
        /* storage full or blocked */
      }
    }, 600);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value]);

  const clear = () => {
    setRestored(null);
    setSavedAt(null);
    if (!key) return;
    try { window.localStorage.removeItem(key); } catch { /* ignore */ }
  };

  return { restored, dismissRestored: () => setRestored(null), clear, savedAt };
}

/** Value that only settles after `ms` without changes. */
export function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setSettled(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return settled;
}

export function scrollToStage(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  const focusable = el.querySelector<HTMLElement>('input, textarea, select, button');
  focusable?.focus({ preventScroll: true });
}
