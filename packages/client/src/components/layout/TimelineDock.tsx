import { useEffect, useMemo, useState, type PointerEvent, type ReactNode } from 'react';

export type TimelineDockMode = 'mini' | 'full' | 'custom';

interface TimelineDockProps {
  storageKey: string;
  onHeightChange?: (height: number) => void;
  children: (mode: TimelineDockMode) => ReactNode;
}

const MINI_HEIGHT = 64;
const FULL_HEIGHT = 420;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function TimelineDock({ storageKey, onHeightChange, children }: TimelineDockProps) {
  const [mode, setMode] = useState<TimelineDockMode>('mini');
  const [height, setHeight] = useState(MINI_HEIGHT);
  const [viewportHeight, setViewportHeight] = useState(() => (
    typeof window === 'undefined' ? 900 : window.innerHeight
  ));

  const maxHeight = useMemo(() => Math.min(Math.round(viewportHeight * 0.6), 460), [viewportHeight]);

  useEffect(() => {
    const onResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setMode('mini');
    setHeight(MINI_HEIGHT);
  }, [storageKey]);

  useEffect(() => {
    onHeightChange?.(height);
  }, [height, onHeightChange]);

  function snap(nextMode: TimelineDockMode) {
    setMode(nextMode);
    if (nextMode === 'mini') setHeight(MINI_HEIGHT);
    if (nextMode === 'full') setHeight(Math.min(FULL_HEIGHT, maxHeight));
  }

  function beginDrag(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = height;
    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handleMove = (moveEvent: globalThis.PointerEvent) => {
      const nextHeight = clamp(startHeight + (startY - moveEvent.clientY), MINI_HEIGHT, maxHeight);
      setHeight(nextHeight);
      setMode(nextHeight <= MINI_HEIGHT + 16 ? 'mini' : nextHeight >= maxHeight - 18 ? 'full' : 'custom');
    };

    const handleEnd = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('pointercancel', handleEnd);
      setHeight(current => {
        if (current <= MINI_HEIGHT + 14) {
          setMode('mini');
          return MINI_HEIGHT;
        }
        if (current >= maxHeight - 18) {
          setMode('full');
          return maxHeight;
        }
        return current;
      });
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('pointercancel', handleEnd);
  }

  const expanded = mode !== 'mini';

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-2 pb-2 lg:px-4">
      <section
        data-chronotop-timeline-dock
        className="pointer-events-auto mx-auto flex w-full max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-t-md border border-white/45 bg-white/22 shadow-[0_-10px_28px_rgba(35,33,29,0.14)] backdrop-blur-[2px] transition-[height] duration-150 ease-out lg:rounded-md"
        style={{ height }}
        aria-label="Zeitleiste"
      >
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/45 bg-white/18 px-3">
          <div
            role="button"
            tabIndex={0}
            aria-label="Zeitleiste hochziehen oder herunterziehen"
            onPointerDown={beginDrag}
            className="flex min-h-[40px] min-w-0 flex-1 cursor-row-resize items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-burgundy-300"
          >
            <span className="h-1.5 w-11 shrink-0 rounded-full bg-ink-300" aria-hidden="true" />
            <span className="min-w-0 truncate font-serif text-sm italic text-ink-700">Zeitleiste</span>
            {!expanded && (
              <span className="hidden truncate text-xs text-ink-400 sm:block">ziehen oder öffnen</span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => snap('mini')}
              className={`min-h-[32px] rounded-md px-2.5 text-xs font-semibold ${mode === 'mini' ? 'bg-ink-800 text-white' : 'text-ink-500 hover:bg-parchment-100'}`}
            >
              Mini
            </button>
            <button
              type="button"
              onClick={() => snap('full')}
              className={`min-h-[32px] rounded-md px-2.5 text-xs font-semibold ${mode === 'full' || mode === 'custom' ? 'bg-burgundy-600 text-white' : 'text-ink-500 hover:bg-parchment-100'}`}
            >
              Groß
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {children(mode)}
        </div>
      </section>
    </div>
  );
}
