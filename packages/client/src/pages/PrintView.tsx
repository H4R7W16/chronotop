import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import { useModuleData } from '../hooks/useModuleData.js';
import { useChronotopStore } from '../store/useChronotopStore.js';
import { sortEventsByDate, getEventDate } from '../lib/timelineUtils.js';
import { mapStyle, DEFAULT_CENTER, DEFAULT_ZOOM } from '../lib/mapStyle.js';
import type { Event } from '@chronotop/shared';

/* ------------------------------------------------------------------ */
/*  Helper: Lokalisierter String                                        */
/* ------------------------------------------------------------------ */
type LS = string | Record<string, string>;
function loc(v: LS | undefined | null, lang = 'de'): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  return v[lang] ?? v['de'] ?? Object.values(v).find(Boolean) ?? '';
}

/* ------------------------------------------------------------------ */
/*  Helper: Datumsanzeige                                               */
/* ------------------------------------------------------------------ */
function formatDate(event: Event): string {
  const to = event.timeObject;
  if (!to) return '–';
  if (to.label) return loc(to.label);
  if (to.type === 'instant' && to.date) return to.date;
  if (to.type === 'span') {
    const a = to.startDate ?? '?';
    const b = to.endDate ?? '?';
    return `${a} – ${b}`;
  }
  return '–';
}

/* ------------------------------------------------------------------ */
/*  Hauptkomponente                                                     */
/* ------------------------------------------------------------------ */
export function PrintView() {
  useModuleData();
  const { moduleId } = useParams<{ moduleId: string }>();

  const modules     = useChronotopStore(s => s.modules);
  const events      = useChronotopStore(s => s.events);

  const mod         = modules.find(m => m.id === moduleId);
  const sorted      = sortEventsByDate(events);

  /* Übersichtskarte: hidden Off-Screen-Container */
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [mapReady, setMapReady]       = useState(false);

  useEffect(() => {
    if (events.length === 0 || !mapContainerRef.current) return;
    if (mapReady) return; // bereits verarbeitet

    const mapOptions = {
      container: mapContainerRef.current,
      style: mapStyle,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      preserveDrawingBuffer: true,
      interactive: false,
      attributionControl: false,
    } as maplibregl.MapOptions & { preserveDrawingBuffer: boolean };

    const map = new maplibregl.Map(mapOptions);

    // Nummerierte Marker für alle Events mit Koordinaten
    const bounds = new maplibregl.LngLatBounds();
    let hasBounds = false;

    sorted.forEach((event, idx) => {
      if (!event.place) return;
      const { lng, lat } = event.place;
      bounds.extend([lng, lat]);
      hasBounds = true;

      // Marker-Element
      const el = document.createElement('div');
      el.style.cssText = [
        'width:22px', 'height:22px', 'border-radius:50%',
        'background:#7B2D42', 'color:white', 'font-size:11px',
        'font-weight:bold', 'display:flex', 'align-items:center',
        'justify-content:center', 'border:2px solid white',
        'box-shadow:0 1px 3px rgba(0,0,0,.4)',
      ].join(';');
      el.textContent = String(idx + 1);

      new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);
    });

    map.once('load', () => {
      if (hasBounds) {
        map.fitBounds(bounds, { padding: 40, maxZoom: 10, animate: false });
      }
      map.once('idle', () => {
        const dataUrl = map.getCanvas().toDataURL('image/png');
        setMapImageUrl(dataUrl);
        setMapReady(true);
        map.remove();
      });
    });

    return () => {
      try { map.remove(); } catch { /* already removed */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length]);

  const printDate = new Date().toLocaleDateString('de-DE', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <>
      {/* ---- Print-CSS (inline, damit es auch ohne externen Bundle wirkt) ---- */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .event-card { page-break-before: always; break-before: page; }
          .event-card:first-of-type { page-break-before: avoid; break-before: avoid; }
          body { font-size: 12pt; }
          a { text-decoration: none; color: inherit; }
        }
        @media screen {
          .event-card:first-of-type { margin-top: 0; }
        }
      `}</style>

      {/* ---- Off-Screen-Karte für Canvas-Capture ---- */}
      <div
        ref={mapContainerRef}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '900px',
          height: '400px',
          zIndex: -1,
        }}
        aria-hidden="true"
      />

      {/* ---- Druckbare Seite ---- */}
      <div className="min-h-screen bg-white text-gray-900 font-serif">

        {/* Steuerleiste (nur Bildschirm) */}
        <div className="no-print sticky top-0 z-50 bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-4 shadow-sm print:hidden">
          <Link
            to={`/learn/${moduleId}`}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            ← Zurück
          </Link>
          <span className="flex-1 text-sm text-gray-500">
            Druckvorschau — {sorted.length} Ereignis{sorted.length !== 1 ? 'se' : ''}
            {!mapReady && events.length > 0 && (
              <span className="ml-2 text-amber-600 text-xs">(Karte wird geladen …)</span>
            )}
          </span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-burgundy-600 hover:bg-burgundy-700 text-white text-sm rounded shadow transition-colors"
            style={{ backgroundColor: '#7B2D42' }}
          >
            🖨 Drucken / Als PDF speichern
          </button>
        </div>

        {/* Inhaltsbereich */}
        <div className="max-w-4xl mx-auto px-8 py-10">

          {/* Titelseite / Kopf */}
          <header className="mb-8 pb-6 border-b-2 border-gray-300">
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Chronotop · Lernmodul</p>
            <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-2">
              {loc(mod?.title) || 'Modul'}
            </h1>
            {loc(mod?.description) && (
              <p className="text-base text-gray-600 mb-4">{loc(mod?.description)}</p>
            )}
            <p className="text-xs text-gray-400">
              Exportiert am {printDate}
              {mod?.authorName ? ` · Autor: ${mod.authorName}` : ''}
            </p>
          </header>

          {/* Übersichtskarte */}
          {mapImageUrl && (
            <section className="mb-8">
              <h2 className="text-sm uppercase tracking-wider text-gray-500 mb-3">Übersichtskarte</h2>
              <img
                src={mapImageUrl}
                alt="Übersichtskarte aller Ereignisse"
                className="w-full rounded border border-gray-200 shadow-sm"
                style={{ maxHeight: '380px', objectFit: 'cover' }}
              />
            </section>
          )}

          {/* Ereignis-Legende (kompakt) */}
          {sorted.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm uppercase tracking-wider text-gray-500 mb-3">Ereignisse ({sorted.length})</h2>
              <ol className="text-sm text-gray-700 columns-2 gap-6 list-none p-0">
                {sorted.map((ev, idx) => (
                  <li key={ev.id} className="flex gap-2 mb-1">
                    <span
                      className="shrink-0 w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                      style={{ backgroundColor: '#7B2D42' }}
                    >
                      {idx + 1}
                    </span>
                    <span className="leading-tight">
                      <span className="font-medium">{loc(ev.title)}</span>
                      {getEventDate(ev) && (
                        <span className="text-gray-400 ml-1">({getEventDate(ev)!.slice(0, 4)})</span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Trennlinie */}
          <hr className="my-6 border-gray-200" />

          {/* Ereigniskarten */}
          {sorted.map((event, idx) => (
            <EventCard key={event.id} event={event} index={idx} />
          ))}

          {sorted.length === 0 && (
            <p className="text-gray-400 text-center py-16 text-sm italic">
              Dieses Modul enthält noch keine Ereignisse.
            </p>
          )}

          {/* Fußzeile */}
          <footer className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-400 text-center">
            Chronotop · Historisches Lernmodul · {printDate}
          </footer>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Ereigniskarte                                                       */
/* ------------------------------------------------------------------ */
function EventCard({ event, index }: { event: Event; index: number }) {
  const title       = loc(event.title);
  const description = loc(event.description);
  const placeName   = loc(event.place?.name);
  const dateLabel   = formatDate(event);
  const actors      = event.actors ?? [];
  const concepts    = event.concepts ?? [];
  const sources     = event.sources ?? [];

  return (
    <article className="event-card mb-12 py-8 border-b border-gray-100">
      {/* Nummer + Titel */}
      <div className="flex items-start gap-4 mb-4">
        <span
          className="shrink-0 w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center mt-0.5"
          style={{ backgroundColor: '#7B2D42' }}
        >
          {index + 1}
        </span>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 leading-tight">{title || '(ohne Titel)'}</h2>
          <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-500">
            {dateLabel !== '–' && (
              <span>🕐 {dateLabel}</span>
            )}
            {placeName && (
              <span>📍 {placeName}</span>
            )}
          </div>
        </div>
      </div>

      {/* Beschreibung */}
      {description && (
        <p className="text-sm text-gray-700 leading-relaxed mb-4 ml-12">{description}</p>
      )}

      {/* Metadaten */}
      <div className="ml-12 space-y-2">
        {actors.length > 0 && (
          <div className="text-sm">
            <span className="font-semibold text-gray-600">Akteure: </span>
            <span className="text-gray-700">
              {actors.map(a => {
                const name = loc(a.actor.name);
                return a.role ? `${name} (${a.role})` : name;
              }).join(', ')}
            </span>
          </div>
        )}

        {concepts.length > 0 && (
          <div className="text-sm">
            <span className="font-semibold text-gray-600">Begriffe: </span>
            <span className="text-gray-700">
              {concepts.map(c => loc(c.label)).join(', ')}
            </span>
          </div>
        )}

        {sources.length > 0 && (
          <div className="text-sm">
            <span className="font-semibold text-gray-600">Quellen: </span>
            <span className="text-gray-700">
              {sources.map((s, i) => (
                <span key={s.id ?? i}>
                  {i > 0 && ' · '}
                  {loc(s.title)}
                  {s.url && (
                    <span className="text-gray-400 text-xs ml-1">[{s.url}]</span>
                  )}
                </span>
              ))}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
