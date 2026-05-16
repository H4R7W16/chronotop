import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { sortEventsByDate } from '../../lib/timelineUtils.js';
import { useLocalized } from '../../i18n/useLocalized.js';
import type { Event } from '@chronotop/shared';

interface EventListProps {
  onNewEvent: () => void;
  onEditEvent: (event: Event) => void;
}

export function EventList({ onNewEvent, onEditEvent }: EventListProps) {
  const { t } = useTranslation();
  const loc = useLocalized();
  const events = useChronotopStore(s => s.events);
  const selectedEventId = useChronotopStore(s => s.selectedEventId);
  const selectEvent = useChronotopStore(s => s.selectEvent);
  const deleteEvent = useChronotopStore(s => s.deleteEvent);

  const sortedEvents = useMemo(
    () => sortEventsByDate(events).filter(e => e.place),
    [events],
  );

  const handleDelete = async (id: string) => {
    if (confirm('Ereignis wirklich löschen?')) await deleteEvent(id);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Sticky Header */}
      <div className="px-4 py-3 border-b border-parchment-200 bg-parchment-50 shrink-0">
        <button
          onClick={onNewEvent}
          className="w-full bg-burgundy-500 hover:bg-burgundy-600 text-white px-4 py-2.5 rounded-md font-medium transition-colors shadow-sm"
        >
          + {t('event.create')}
        </button>
        <p className="text-[10px] text-ink-400 italic mt-2 text-center">
          Tipp: Klick auf die Karte, um einen Ort direkt zu setzen
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {sortedEvents.length === 0 && (
          <div className="text-center py-12 text-ink-300">
            <div className="text-3xl mb-2 opacity-40">📜</div>
            <p className="text-sm">{t('event.noEvents')}</p>
          </div>
        )}

        {sortedEvents.map((event, idx) => {
          const num = idx + 1;
          const isSelected = event.id === selectedEventId;
          return (
            <article
              key={event.id}
              onClick={() => selectEvent(event.id, { origin: 'author' })}
              className={`group relative pl-11 pr-2 py-2.5 rounded-md cursor-pointer transition-all border ${
                isSelected
                  ? 'border-burgundy-300 bg-burgundy-50'
                  : 'border-parchment-200 bg-white hover:border-parchment-300 hover:bg-parchment-50'
              }`}
            >
              <span className={`absolute left-2 top-2.5 w-7 h-7 rounded-full font-serif font-semibold text-xs flex items-center justify-center ${
                isSelected
                  ? 'bg-burgundy-500 text-white'
                  : 'bg-parchment-100 border border-parchment-300 text-burgundy-600'
              }`}>{num}</span>

              <div className="min-w-0">
                <div className="font-serif font-semibold text-ink-700 truncate text-sm leading-snug">
                  {loc(event.title)}
                </div>
                <div className="text-[11px] text-ink-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                  {event.place?.name && <span>📍 {loc(event.place.name)}</span>}
                  {event.timeObject && (
                    <>
                      <span className="text-ink-200">·</span>
                      <span>{loc(event.timeObject.label)}</span>
                    </>
                  )}
                </div>
                <div className="text-[10px] mt-0.5 flex flex-wrap gap-x-2 text-ink-400">
                  {event.sources && event.sources.length > 0 && (
                    <span className="text-verdigris-600">{event.sources.length} Quelle{event.sources.length === 1 ? '' : 'n'}</span>
                  )}
                  {event.actors && event.actors.length > 0 && (
                    <span>{event.actors.length} Akteur{event.actors.length === 1 ? '' : 'e'}</span>
                  )}
                  {event.concepts && event.concepts.length > 0 && (
                    <span>{event.concepts.length} Begriff{event.concepts.length === 1 ? '' : 'e'}</span>
                  )}
                </div>
              </div>

              <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={e => { e.stopPropagation(); onEditEvent(event); }}
                  className="text-[11px] px-1.5 py-0.5 text-ink-500 hover:text-burgundy-600 bg-white border border-parchment-200 rounded hover:bg-burgundy-50"
                  aria-label={t('common.edit')}>✎</button>
                <button onClick={e => { e.stopPropagation(); handleDelete(event.id); }}
                  className="text-[11px] px-1.5 py-0.5 text-ink-500 hover:text-burgundy-700 bg-white border border-parchment-200 rounded hover:bg-burgundy-50"
                  title={t('common.delete')}
                  aria-label={t('common.delete')}>✕</button>
              </div>
            </article>
          );
        })}
      </div>

      {sortedEvents.length > 0 && (
        <div className="px-4 py-2 border-t border-parchment-200 bg-parchment-50 text-[11px] text-ink-400 italic shrink-0">
          {sortedEvents.length} Ereignis{sortedEvents.length === 1 ? '' : 'se'}
        </div>
      )}
    </div>
  );
}
