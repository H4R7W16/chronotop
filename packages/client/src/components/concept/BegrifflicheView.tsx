import { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModuleData } from '../../hooks/useModuleData.js';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { sortEventsByDate } from '../../lib/timelineUtils.js';
import { useLocalized } from '../../i18n/useLocalized.js';
import type { ConceptKind } from '@chronotop/shared';

const kindMeta: Record<ConceptKind, { label: string; color: string; bg: string; ring: string }> = {
  analytical: {
    label: 'Analysebegriff',
    color: 'var(--color-verdigris-500)',
    bg: 'var(--color-verdigris-50)',
    ring: 'var(--color-verdigris-200)',
  },
  source: {
    label: 'Quellenbegriff',
    color: 'var(--color-gold-500)',
    bg: 'var(--color-gold-50)',
    ring: 'var(--color-gold-200)',
  },
  narrative: {
    label: 'narrativer Begriff',
    color: 'var(--color-burgundy-500)',
    bg: 'var(--color-burgundy-50)',
    ring: 'var(--color-burgundy-200)',
  },
};

const NODE_HEIGHT = 36;
const NODE_GAP = 6;
const PADDING_TOP = 32;
const COL_WIDTH_MIN = 220;

export function BegrifflicheView() {
  useModuleData();
  const navigate = useNavigate();
  const concepts = useChronotopStore(s => s.concepts);
  const events = useChronotopStore(s => s.events);
  const currentModuleId = useChronotopStore(s => s.currentModuleId);
  const selectEvent = useChronotopStore(s => s.selectEvent);
  const loc = useLocalized();

  // Begriffe gruppiert nach Art
  const byKind = useMemo(() => {
    const groups: Record<ConceptKind, typeof concepts> = { analytical: [], source: [], narrative: [] };
    concepts.forEach(c => groups[c.kind].push(c));
    Object.values(groups).forEach(arr => arr.sort((a, b) => loc(a.label).localeCompare(loc(b.label))));
    return groups;
  }, [concepts, loc]);

  // Ereignisse zeitlich sortiert
  const sortedEvents = useMemo(() => sortEventsByDate(events), [events]);

  // Verbindungs-Map: conceptId → eventIds
  const connections = useMemo(() => {
    const map = new Map<string, Set<string>>();
    sortedEvents.forEach(ev => {
      ev.concepts?.forEach(c => {
        if (!map.has(c.id)) map.set(c.id, new Set());
        map.get(c.id)!.add(ev.id);
      });
    });
    return map;
  }, [sortedEvents]);

  // Hover/Selektion
  const [hoveredConceptId, setHoveredConceptId] = useState<string | null>(null);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);

  // Layout: kombinierte Liste der Begriffe (für vertikale Anordnung links)
  const conceptList = useMemo(
    () => [...byKind.analytical, ...byKind.source, ...byKind.narrative],
    [byKind],
  );

  // Container-Größe
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Höhe ergibt sich aus der größeren der beiden Seiten
  const totalRows = Math.max(conceptList.length, sortedEvents.length, 1);
  const trackHeight = totalRows * (NODE_HEIGHT + NODE_GAP);
  const totalHeight = PADDING_TOP + trackHeight + 32;

  // Spaltenbreiten
  const conceptColWidth = Math.max(COL_WIDTH_MIN, Math.min(320, width * 0.32));
  const eventColWidth = Math.max(COL_WIDTH_MIN, Math.min(360, width * 0.36));
  const conceptColX = 16;
  const eventColX = width - eventColWidth - 16;

  // Y-Position pro Begriff/Ereignis
  const conceptY = (i: number) => PADDING_TOP + i * (NODE_HEIGHT + NODE_GAP);
  const eventY = (i: number) => PADDING_TOP + i * (NODE_HEIGHT + NODE_GAP);

  // Status, ob ein Element hervorgehoben ist
  const isConceptDimmed = (id: string) => {
    if (hoveredConceptId) return id !== hoveredConceptId;
    if (hoveredEventId) {
      const ev = events.find(e => e.id === hoveredEventId);
      const ids = new Set(ev?.concepts?.map(c => c.id) ?? []);
      return !ids.has(id);
    }
    return false;
  };

  const isEventDimmed = (id: string) => {
    if (hoveredEventId) return id !== hoveredEventId;
    if (hoveredConceptId) return !connections.get(hoveredConceptId)?.has(id);
    return false;
  };

  const isLineHighlighted = (conceptId: string, eventId: string) => {
    if (hoveredConceptId === conceptId) return true;
    if (hoveredEventId === eventId) return true;
    return false;
  };

  if (concepts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-ink-400 bg-parchment-50 text-center px-6">
        <div>
          <div className="text-4xl mb-3 opacity-40">🕸</div>
          <p className="font-serif italic">
            Noch keine Begriffe in diesem Modul.<br />
            Im Erstellen-Modus können Begriffe definiert und Ereignissen zugeordnet werden.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-parchment-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-6">
          <h1 className="font-serif text-3xl font-semibold text-ink-800">Begriffliche Ansicht</h1>
          <p className="text-ink-500 mt-1 max-w-2xl">
            Verbindungen zwischen Begriffen und Ereignissen. Bewege den Mauszeiger über einen Knoten,
            um seine Beziehungen hervorzuheben — klicke auf ein Ereignis, um es in der Karte zu öffnen.
          </p>
          <div className="flex flex-wrap gap-2 mt-3 text-xs">
            {(['analytical', 'source', 'narrative'] as ConceptKind[]).map(k => {
              const m = kindMeta[k];
              return (
                <span key={k} className="inline-flex items-center gap-1.5 px-2 py-1 rounded border"
                  style={{ background: m.bg, borderColor: m.ring, color: m.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                  {m.label}
                </span>
              );
            })}
          </div>
        </header>

        {/* Diagramm */}
        <div className="bg-white border border-parchment-200 rounded-lg p-4 shadow-sm overflow-x-auto">
          <div ref={containerRef} className="relative" style={{ minWidth: 700 }}>
            <svg width={width} height={totalHeight} style={{ display: 'block' }}>
              {/* Spaltenbeschriftung */}
              <text x={conceptColX + conceptColWidth / 2} y={20}
                textAnchor="middle"
                style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fill: 'var(--color-ink-500)', fontStyle: 'italic' }}>
                Begriffe
              </text>
              <text x={eventColX + eventColWidth / 2} y={20}
                textAnchor="middle"
                style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fill: 'var(--color-ink-500)', fontStyle: 'italic' }}>
                Ereignisse (chronologisch)
              </text>

              {/* Verbindungslinien */}
              {conceptList.map((c, ci) => {
                const linkedEvents = connections.get(c.id);
                if (!linkedEvents) return null;
                const m = kindMeta[c.kind];
                return [...linkedEvents].map(eid => {
                  const ei = sortedEvents.findIndex(e => e.id === eid);
                  if (ei < 0) return null;
                  const x1 = conceptColX + conceptColWidth;
                  const y1 = conceptY(ci) + NODE_HEIGHT / 2;
                  const x2 = eventColX;
                  const y2 = eventY(ei) + NODE_HEIGHT / 2;
                  const cx = (x1 + x2) / 2;
                  const path = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
                  const highlighted = isLineHighlighted(c.id, eid);
                  const dimmed = (hoveredConceptId && hoveredConceptId !== c.id) || (hoveredEventId && hoveredEventId !== eid);
                  return (
                    <path key={`${c.id}-${eid}`} d={path}
                      fill="none"
                      stroke={highlighted ? m.color : 'var(--color-parchment-300)'}
                      strokeWidth={highlighted ? 2 : 1}
                      opacity={dimmed ? 0.15 : highlighted ? 1 : 0.45}
                      style={{ transition: 'opacity 0.15s ease, stroke-width 0.15s ease' }}
                    />
                  );
                });
              })}

              {/* Begriffe */}
              {conceptList.map((c, i) => {
                const m = kindMeta[c.kind];
                const dimmed = isConceptDimmed(c.id);
                const linkedCount = connections.get(c.id)?.size ?? 0;
                return (
                  <g key={c.id}
                    onMouseEnter={() => setHoveredConceptId(c.id)}
                    onMouseLeave={() => setHoveredConceptId(null)}
                    style={{ cursor: 'pointer', transition: 'opacity 0.15s ease' }}
                    opacity={dimmed ? 0.35 : 1}>
                    <rect x={conceptColX} y={conceptY(i)}
                      width={conceptColWidth} height={NODE_HEIGHT} rx={6}
                      fill={m.bg}
                      stroke={hoveredConceptId === c.id ? m.color : m.ring}
                      strokeWidth={hoveredConceptId === c.id ? 2 : 1} />
                    <circle cx={conceptColX + 14} cy={conceptY(i) + NODE_HEIGHT / 2} r={5}
                      fill={m.color} />
                    <text x={conceptColX + 26} y={conceptY(i) + NODE_HEIGHT / 2 + 4}
                      style={{ fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 500, fill: 'var(--color-ink-700)' }}>
                      {truncate(loc(c.label), 26)}
                    </text>
                    <text x={conceptColX + conceptColWidth - 10} y={conceptY(i) + NODE_HEIGHT / 2 + 4}
                      textAnchor="end"
                      style={{ fontSize: 10, fill: m.color, fontWeight: 600 }}>
                      {linkedCount}
                    </text>
                  </g>
                );
              })}

              {/* Ereignisse */}
              {sortedEvents.map((ev, i) => {
                const dimmed = isEventDimmed(ev.id);
                return (
                  <g key={ev.id}
                    onMouseEnter={() => setHoveredEventId(ev.id)}
                    onMouseLeave={() => setHoveredEventId(null)}
                    onClick={() => {
                      selectEvent(ev.id, { origin: 'concept' });
                      if (currentModuleId) navigate(`/learn/${currentModuleId}`);
                    }}
                    style={{ cursor: 'pointer', transition: 'opacity 0.15s ease' }}
                    opacity={dimmed ? 0.35 : 1}>
                    <rect x={eventColX} y={eventY(i)}
                      width={eventColWidth} height={NODE_HEIGHT} rx={6}
                      fill="white"
                      stroke={hoveredEventId === ev.id ? 'var(--color-burgundy-500)' : 'var(--color-parchment-300)'}
                      strokeWidth={hoveredEventId === ev.id ? 2 : 1} />
                    <circle cx={eventColX + 16} cy={eventY(i) + NODE_HEIGHT / 2} r={11}
                      fill="var(--color-parchment-100)" stroke="var(--color-burgundy-500)" strokeWidth={1.5} />
                    <text x={eventColX + 16} y={eventY(i) + NODE_HEIGHT / 2 + 4}
                      textAnchor="middle"
                      style={{ fontFamily: 'var(--font-serif)', fontSize: 11, fontWeight: 600, fill: 'var(--color-burgundy-500)' }}>
                      {i + 1}
                    </text>
                    <text x={eventColX + 32} y={eventY(i) + NODE_HEIGHT / 2 - 2}
                      style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fontWeight: 500, fill: 'var(--color-ink-700)' }}>
                      {truncate(loc(ev.title), 32)}
                    </text>
                    <text x={eventColX + 32} y={eventY(i) + NODE_HEIGHT / 2 + 12}
                      style={{ fontSize: 10, fill: 'var(--color-ink-400)' }}>
                      {loc(ev.timeObject?.label)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Begriffstabelle mit Beschreibungen */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {(['analytical', 'source', 'narrative'] as ConceptKind[]).map(k => {
            const m = kindMeta[k];
            const items = byKind[k];
            return (
              <section key={k}
                className="bg-white rounded-lg border border-parchment-200 overflow-hidden">
                <header className="px-4 py-2 border-b border-parchment-200"
                  style={{ background: m.bg, color: m.color }}>
                  <h2 className="font-serif font-semibold text-sm uppercase tracking-wider">
                    {m.label}
                    <span className="ml-2 opacity-60">({items.length})</span>
                  </h2>
                </header>
                <div className="p-4 space-y-3">
                  {items.length === 0 && (
                    <p className="text-xs text-ink-300 italic">— keine —</p>
                  )}
                  {items.map(c => {
                    const linked = connections.get(c.id);
                    return (
                      <div key={c.id}
                        className="text-sm cursor-pointer hover:bg-parchment-50 -m-2 p-2 rounded"
                        onMouseEnter={() => setHoveredConceptId(c.id)}
                        onMouseLeave={() => setHoveredConceptId(null)}>
                        <div className="font-serif font-semibold text-ink-700 flex items-center justify-between">
                          {loc(c.label)}
                          {linked && (
                            <span className="text-[10px] font-sans text-ink-400">
                              {linked.size} Ereignis{linked.size === 1 ? '' : 'se'}
                            </span>
                          )}
                        </div>
                        {loc(c.description) && (
                          <p className="text-xs text-ink-500 mt-1 leading-relaxed">{loc(c.description)}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
