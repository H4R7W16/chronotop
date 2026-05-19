import type { ReactNode } from 'react';

interface ContextSheetProps {
  title: string;
  timelineHeight: number;
  avoidLeftPanel?: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function ContextSheet({ title, timelineHeight, avoidLeftPanel = false, onClose, children }: ContextSheetProps) {
  const positionClass = avoidLeftPanel
    ? 'left-3 right-3 top-16 max-h-none lg:w-[29rem]'
    : 'left-3 right-3 max-h-[min(54vh,34rem)] lg:left-auto lg:right-4 lg:top-4 lg:w-[29rem] lg:max-h-none';

  return (
    <aside
      data-chronotop-context-sheet
      data-chronotop-avoid-left-panel={avoidLeftPanel ? 'true' : undefined}
      className={`absolute z-30 flex min-w-0 flex-col overflow-hidden rounded-md border border-parchment-200 bg-white/94 shadow-2xl backdrop-blur-xl transition-[left,right,opacity] duration-200 ease-out ${positionClass}`}
      style={{
        bottom: `calc(${timelineHeight}px + 0.75rem)`,
      }}
      aria-label={title}
    >
      <header className="flex min-h-[48px] shrink-0 items-center justify-between gap-3 border-b border-parchment-200 bg-parchment-50/95 px-4">
        <h2 className="min-w-0 truncate font-serif text-base font-semibold text-ink-900">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[36px] rounded-md border border-parchment-300 bg-white px-3 text-sm font-semibold text-ink-600 hover:bg-parchment-50"
        >
          Schließen
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        {children}
      </div>
    </aside>
  );
}
