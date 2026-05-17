import { useEffect, useRef, useState, type ReactNode } from 'react';

export type BottomInspectorSnap = 'peek' | 'half' | 'full';

interface BottomInspectorProps {
  children: ReactNode;
  ariaLabel: string;
  // Eindeutiger Schlüssel, der ein Auto-Open auslöst, wenn er sich ändert
  // (z. B. selectedEventId). null/undefined => peek.
  triggerKey?: string | null;
  // Optionales Peek-Label, das im Griff-Balken erscheint, wenn peek aktiv ist.
  peekLabel?: ReactNode;
}

const SNAP_ORDER: BottomInspectorSnap[] = ['peek', 'half', 'full'];

export function BottomInspector({ children, ariaLabel, triggerKey, peekLabel }: BottomInspectorProps) {
  // Wenn beim ersten Render bereits ein Trigger gesetzt ist (z. B. Permalink mit
  // ausgewaehltem Event), gleich auf 'half' starten - sonst peek.
  const [snap, setSnap] = useState<BottomInspectorSnap>(triggerKey ? 'half' : 'peek');
  const prevTriggerRef = useRef<string | null | undefined>(triggerKey);

  // Wenn ein neuer Trigger (z. B. Event-Auswahl) reinkommt, auf 'half' öffnen.
  // Wenn auf null gewechselt wird, zurück auf 'peek'.
  useEffect(() => {
    const prev = prevTriggerRef.current;
    prevTriggerRef.current = triggerKey;
    if (triggerKey && triggerKey !== prev) {
      setSnap(current => (current === 'peek' ? 'half' : current));
    } else if (!triggerKey && prev) {
      setSnap('peek');
    }
  }, [triggerKey]);

  const next = SNAP_ORDER[(SNAP_ORDER.indexOf(snap) + 1) % SNAP_ORDER.length];
  // Hoehe relativ zur Karten-Flaeche (parent). Peek = fester Handle-Streifen.
  // CSS-Transition wuerde zwischen rem und % nicht zuverlaessig aufloesen,
  // daher wechseln wir hier hart - die Snap-States sind ohnehin klar getrennt.
  const heightStyle =
    snap === 'peek' ? { height: '3.25rem' }
    : snap === 'half' ? { height: '55%' }
    : { height: '92%' };

  const cycleLabel =
    snap === 'peek' ? 'Detailbereich öffnen'
    : snap === 'half' ? 'Detailbereich vergrößern'
    : 'Detailbereich verkleinern';

  return (
    <>
      {snap === 'full' && (
        <button
          type="button"
          aria-label="Detailbereich schließen"
          onClick={() => setSnap('peek')}
          className="absolute inset-0 z-10 bg-ink-800/30"
        />
      )}
      <aside
        aria-label={ariaLabel}
        style={heightStyle}
        className="absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-xl border-t border-parchment-300 bg-white shadow-[0_-8px_24px_rgba(35,33,29,0.18)]"
      >
        <button
          type="button"
          onClick={() => setSnap(next)}
          aria-label={cycleLabel}
          className="flex shrink-0 items-center justify-between gap-3 border-b border-parchment-200 bg-parchment-50 px-4 py-2 text-left hover:bg-parchment-100"
        >
          <span className="flex flex-1 items-center gap-3 min-w-0">
            <span className="block h-1 w-10 rounded-full bg-ink-200" aria-hidden="true" />
            {peekLabel && snap === 'peek' && (
              <span className="truncate text-sm font-medium text-ink-700">{peekLabel}</span>
            )}
          </span>
          <span className="shrink-0 text-xs font-semibold text-ink-500">
            {snap === 'peek' ? 'Aufklappen' : snap === 'half' ? 'Mehr' : 'Schließen'}
          </span>
        </button>
        {snap !== 'peek' && (
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        )}
      </aside>
    </>
  );
}
