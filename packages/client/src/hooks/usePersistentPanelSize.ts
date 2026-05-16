import { useCallback, useEffect, useState, type PointerEvent } from 'react';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readStoredSize(storageKey: string, fallback: number, min: number, max: number): number {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(storageKey);
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback;
}

export function usePersistentPanelSize(storageKey: string, fallback: number, min: number, max: number) {
  const [size, setSizeState] = useState(() => readStoredSize(storageKey, fallback, min, max));

  const setSize = useCallback((next: number) => {
    setSizeState(clamp(next, min, max));
  }, [max, min]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, String(Math.round(size)));
    }
  }, [size, storageKey]);

  const beginDrag = useCallback((
    event: PointerEvent,
    axis: 'x' | 'y',
    multiplier: 1 | -1 = 1,
  ) => {
    event.preventDefault();
    const startPointer = axis === 'x' ? event.clientX : event.clientY;
    const startSize = size;
    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    const handleMove = (moveEvent: globalThis.PointerEvent) => {
      const currentPointer = axis === 'x' ? moveEvent.clientX : moveEvent.clientY;
      setSize(startSize + (currentPointer - startPointer) * multiplier);
    };

    const handleEnd = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('pointercancel', handleEnd);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('pointercancel', handleEnd);
  }, [setSize, size]);

  return { size, setSize, beginDrag };
}
