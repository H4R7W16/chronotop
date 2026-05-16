import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChronotopStore } from '../store/useChronotopStore.js';

/**
 * Hook der URL-Query-Params ↔ Zustand synchronisiert.
 *
 * Beim Laden: Liest Query-Params und schreibt sie in den Store.
 * Beim Ändern von selectedEventId/timeFilter: Aktualisiert URL-Params (debounced).
 *
 * URL-Format: /learn/:moduleId?event=:eventId&from=:from&to=:to
 * (Weitere Parameter wie `filter=point|range` sind für zukünftige Erweiterungen reserviert.)
 */
export function useUrlSync() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedEventId = useChronotopStore(s => s.selectedEventId);
  const timeFilter = useChronotopStore(s => s.timeFilter);
  const searchKey = searchParams.toString();

  // Debounce-Timer für URL-Updates
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Phase 1: Beim Mount/URL-Änderung → Store aus Params füllen
  useEffect(() => {
    const eventId = searchParams.get('event');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const state = useChronotopStore.getState();

    if (eventId && eventId !== state.selectedEventId) {
      state.selectEvent(eventId, { origin: 'url' });
    } else if (!eventId && state.selectedEventId) {
      state.selectEvent(null, { origin: 'url' });
    }

    if ((from ?? undefined) !== state.timeFilter.from || (to ?? undefined) !== state.timeFilter.to) {
      state.setTimeFilter({
        from: from ?? undefined,
        to: to ?? undefined,
      });
    }
  }, [searchKey, searchParams]);

  // Phase 2: Wenn Store-Werte ändern → URL aktualisieren (debounced)
  useEffect(() => {
    // Debounce: Sammle Änderungen für 500ms, dann einmalig Update
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }

    updateTimerRef.current = setTimeout(() => {
      const newParams = new URLSearchParams(searchParams);

      // selectedEventId
      if (selectedEventId) {
        newParams.set('event', selectedEventId);
      } else {
        newParams.delete('event');
      }

      // timeFilter
      if (timeFilter.from) {
        newParams.set('from', timeFilter.from);
      } else {
        newParams.delete('from');
      }

      if (timeFilter.to) {
        newParams.set('to', timeFilter.to);
      } else {
        newParams.delete('to');
      }

      if (newParams.toString() !== searchKey) {
        setSearchParams(newParams, { replace: true });
      }
    }, 500);

    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, [selectedEventId, timeFilter.from, timeFilter.to, searchKey, searchParams, setSearchParams]);
}
