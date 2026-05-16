import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { toast } from '../system/toast.js';
import { QuelleCard } from './QuelleCard.js';
import { IiifViewer } from './IiifViewer.js';
import { EventAnnotations } from './EventAnnotations.js';
import { sortEventsByDate, isEventInTimeRange } from '../../lib/timelineUtils.js';
import { useLocalized } from '../../i18n/useLocalized.js';
import type { Source } from '@chronotop/shared';

type DetailTab = 'overview' | 'context' | 'sources' | 'notes';

const certaintyMeta: Record<string, { label: string; color: string }> = {
  certain:        { label: 'gesichert',      color: 'bg-verdigris-50 text-verdigris-700 border-verdigris-200' },
  probable:       { label: 'wahrscheinlich', color: 'bg-gold-100 text-gold-700 border-gold-200' },
  contested:      { label: 'umstritten',     color: 'bg-burgundy-50 text-burgundy-700 border-burgundy-200' },
  reconstructed:  { label: 'rekonstruiert',  color: 'bg-ink-100 text-ink-600 border-ink-200' },
};

interface DetailPanelProps {
  preferredTab?: DetailTab;
}

export function DetailPanel({ preferredTab }: DetailPanelProps = {}) {
  const { t } = useTranslation();
  const loc = useLocalized();
  const events = useChronotopStore(s => s.events);
  const sources = useChronotopStore(s => s.sources);
  const timeFilter = useChronotopStore(s => s.timeFilter);
  const selectedEventId = useChronotopStore(s => s.selectedEventId);
  const selectEvent = useChronotopStore(s => s.selectEvent);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [iiifSource, setIiifSource] = useState<Source | null>(null);

  useEffect(() => {
    setActiveTab(preferredTab ?? 'overview');
    setIiifSource(null);
  }, [preferredTab, selectedEventId]);

  const orderIndex = useMemo(() => {
    const m = new Map<string, number>();
    sortEventsByDate(events)
      .filter(e => e.place && isEventInTimeRange(e, timeFilter.from, timeFilter.to))
      .forEach((e, i) => m.set(e.id, i + 1));
    return m;
  }, [events, timeFilter]);

  const event = events.find(e => e.id === selectedEventId);

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      toast.success('Permalink kopiert');
    }).catch(() => {
      toast.error('Kopieren fehlgeschlagen');
    });
  };

  if (!event) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-ink-400 text-sm p-8 text-center bg-parchment-50">
        <p className="max-w-[20rem] leading-relaxed">{t('event.selectOnMap')}</p>
      </div>
    );
  }

  const num = orderIndex.get(event.id);
  const sourceCount = event.sources?.length ?? 0;
  const actorCount = event.actors?.length ?? 0;
  const conceptCount = event.concepts?.length ?? 0;
  const timeCert = certaintyMeta[event.timeObject?.certainty ?? 'certain'];
  const placeCert = certaintyMeta[event.place?.certainty ?? 'certain'];
  const validity = event.place ? formatValidity(event.place.validFrom, event.place.validTo) : null;
  const geometrySource = event.place?.sourceOfClaim
    ? sources.find(s => s.id === event.place!.sourceOfClaim)
    : null;

  const tabs: Array<{ id: DetailTab; label: string; count?: number }> = [
    { id: 'overview', label: 'Überblick' },
    { id: 'context', label: 'Kontext', count: actorCount + conceptCount },
    { id: 'sources', label: 'Quellen', count: sourceCount },
    { id: 'notes', label: 'Notizen' },
  ];

  return (
    <div className="h-full min-h-0 flex flex-col bg-white">
      <header className="shrink-0 border-b border-parchment-200 bg-parchment-100 px-5 py-4">
        <div className="flex items-start gap-3">
          {num != null && (
            <span className="shrink-0 w-8 h-8 rounded-full bg-burgundy-600 text-white font-serif font-semibold flex items-center justify-center shadow-sm">
              {num}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-xl font-semibold text-ink-900 leading-tight">
              {loc(event.title)}
            </h2>
            {event.timeObject && (
              <p className="mt-1 text-sm text-ink-500 italic">{loc(event.timeObject.label)}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={handleCopyLink}
              className="rounded border border-parchment-300 bg-white px-2 py-1 text-[11px] font-medium text-ink-500 hover:border-burgundy-200 hover:text-burgundy-700"
              title="Permalink für diese Ereignisauswahl kopieren"
            >
              Link
            </button>
            <button
              onClick={() => selectEvent(null, { origin: 'detail' })}
              className="rounded border border-parchment-300 bg-white px-2 py-1 text-[11px] font-medium text-ink-500 hover:border-burgundy-200 hover:text-burgundy-700"
            >
              Schließen
            </button>
          </div>
        </div>
      </header>

      <nav className="shrink-0 flex border-b border-parchment-200 bg-white px-2" aria-label="Detailbereich">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`min-w-0 flex-1 border-b-2 px-2 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-burgundy-600 text-burgundy-700'
                : 'border-transparent text-ink-500 hover:bg-parchment-50 hover:text-ink-800'
            }`}
          >
            <span className="truncate">{tab.label}</span>
            {tab.count != null && tab.count > 0 && (
              <span className="ml-1 rounded-full bg-parchment-200 px-1.5 py-0.5 text-[10px] text-ink-500">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="space-y-5 p-5">
            {loc(event.description) && (
              <p className="max-w-[42rem] font-serif text-[15px] leading-relaxed text-ink-800">
                {loc(event.description)}
              </p>
            )}

            <div className="grid gap-2 text-sm sm:grid-cols-2">
              {event.place && (
                <MetaCard label="Ort" value={loc(event.place.name)} detail={validity ? `gültig: ${validity}` : undefined} badge={event.place.certainty !== 'certain' ? placeCert : undefined} />
              )}
              {event.timeObject && (
                <MetaCard label="Zeit" value={loc(event.timeObject.label)} badge={timeCert} />
              )}
              {event.place?.geometry && (
                <MetaCard
                  label="Kartengeometrie"
                  value={geometryLabel(event.place.geometry.type)}
                  detail={geometrySource ? `Quelle: ${loc(geometrySource.title)}` : undefined}
                />
              )}
              <MetaCard
                label="Material"
                value={`${sourceCount} Quellen · ${actorCount} Akteure · ${conceptCount} Begriffe`}
              />
            </div>

            {event.concepts && event.concepts.length > 0 && (
              <section>
                <SectionTitle>Deutungsbegriffe</SectionTitle>
                <div className="flex flex-wrap gap-1.5">
                  {event.concepts.slice(0, 8).map(concept => (
                    <span key={concept.id} className="rounded-full border border-parchment-300 bg-parchment-50 px-2.5 py-1 text-xs font-medium text-ink-700">
                      {loc(concept.label)}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {event.sources && event.sources.length > 0 && (
              <section>
                <SectionTitle>Erste Quellenhinweise</SectionTitle>
                <div className="space-y-2">
                  {event.sources.slice(0, 3).map(source => (
                    <button
                      key={source.id}
                      type="button"
                      onClick={() => setActiveTab('sources')}
                      className="block w-full rounded-md border border-parchment-200 bg-white px-3 py-2 text-left text-sm text-ink-700 hover:border-burgundy-200 hover:bg-burgundy-50/30"
                    >
                      <span className="font-medium">{loc(source.title)}</span>
                      {source.url && <span className="ml-2 text-xs text-burgundy-600">Webquelle</span>}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'context' && (
          <div className="space-y-5 p-5">
            <section>
              <SectionTitle>Ort und Geometrie</SectionTitle>
              <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm">
                {event.place && (
                  <>
                    <dt className="text-ink-400">Name</dt>
                    <dd className="text-ink-800">{loc(event.place.name)}</dd>
                    <dt className="text-ink-400">Koordinaten</dt>
                    <dd className="font-mono text-xs text-ink-500">
                      {event.place.lat.toFixed(3)}°N, {event.place.lng.toFixed(3)}°E
                    </dd>
                    {validity && (
                      <>
                        <dt className="text-ink-400">Gültigkeit</dt>
                        <dd className="text-ink-700">{validity}</dd>
                      </>
                    )}
                    {event.place.wikidataId && (
                      <>
                        <dt className="text-ink-400">Wikidata</dt>
                        <dd>
                          <a href={`https://www.wikidata.org/wiki/${event.place.wikidataId}`} target="_blank" rel="noopener noreferrer" className="text-burgundy-700 hover:underline">
                            {event.place.wikidataId}
                          </a>
                        </dd>
                      </>
                    )}
                  </>
                )}
              </dl>
            </section>

            {(event.followsId || event.partOfId) && (
              <section>
                <SectionTitle>Beziehungen</SectionTitle>
                <div className="space-y-2 text-sm">
                  {event.followsId && <RelationButton label="folgt auf" eventId={event.followsId} />}
                  {event.partOfId && <RelationButton label="Teil von" eventId={event.partOfId} />}
                </div>
              </section>
            )}

            {event.actors && event.actors.length > 0 && (
              <section>
                <SectionTitle>Akteure ({event.actors.length})</SectionTitle>
                <div className="space-y-2">
                  {event.actors.map(({ actor, role, certainty: linkCert }) => {
                    const effective = weaker(actor.certainty, linkCert);
                    const cert = effective && effective !== 'certain' ? certaintyMeta[effective] : null;
                    return (
                      <div key={actor.id} className="rounded-md border border-parchment-200 bg-parchment-50 px-3 py-2 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-ink-800">{loc(actor.name)}</p>
                            {role && <p className="text-xs italic text-ink-500">{role}</p>}
                          </div>
                          {cert && <CertBadge meta={cert} />}
                        </div>
                        {actor.wikidataId && (
                          <a href={`https://www.wikidata.org/wiki/${actor.wikidataId}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-burgundy-700 hover:underline">
                            Wikidata {actor.wikidataId}
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {event.concepts && event.concepts.length > 0 && (
              <section>
                <SectionTitle>Begriffe ({event.concepts.length})</SectionTitle>
                <div className="space-y-2">
                  {event.concepts.map(concept => (
                    <div key={concept.id} className="rounded-md border border-parchment-200 bg-white px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-ink-800">{loc(concept.label)}</p>
                        <span className="rounded bg-parchment-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink-400">
                          {concept.kind}
                        </span>
                      </div>
                      {loc(concept.description) && <p className="mt-1 text-xs leading-relaxed text-ink-500">{loc(concept.description)}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'sources' && (
          <div className="space-y-4 p-5">
            {iiifSource && (
              <div className="rounded-md border border-parchment-200 bg-parchment-50 p-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-ink-600">{loc(iiifSource.title)}</span>
                  <button onClick={() => setIiifSource(null)} className="text-xs text-ink-400 hover:text-ink-700">
                    Schließen
                  </button>
                </div>
                <IiifViewer imageUrl={iiifSource.iiifImageUrl} manifestUrl={iiifSource.iiifManifestUrl} />
              </div>
            )}

            {event.sources && event.sources.length > 0 ? (
              <div className="space-y-2">
                {event.sources.map(source => (
                  <QuelleCard key={source.id} source={source} onViewIiif={setIiifSource} />
                ))}
              </div>
            ) : (
              <p className="text-center text-xs italic text-ink-400">Keine Quellen verknüpft.</p>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="p-5">
            <EventAnnotations eventId={event.id} />
          </div>
        )}
      </div>
    </div>
  );
}

function MetaCard({
  label,
  value,
  detail,
  badge,
}: {
  label: string;
  value: string;
  detail?: string;
  badge?: { label: string; color: string };
}) {
  return (
    <div className="rounded-md border border-parchment-200 bg-parchment-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <p className="text-sm font-medium text-ink-800">{value}</p>
        {badge && <CertBadge meta={badge} />}
      </div>
      {detail && <p className="mt-1 text-xs text-ink-500">{detail}</p>}
    </div>
  );
}

function CertBadge({ meta }: { meta: { label: string; color: string } }) {
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${meta.color}`}>
      {meta.label}
    </span>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2 font-serif text-xs uppercase tracking-wider text-ink-500">
      {children}
    </h3>
  );
}

function RelationButton({ label, eventId }: { label: string; eventId: string }) {
  const loc = useLocalized();
  const events = useChronotopStore(s => s.events);
  const selectEvent = useChronotopStore(s => s.selectEvent);
  const target = events.find(e => e.id === eventId);
  if (!target) return null;
  return (
    <button
      type="button"
      onClick={() => selectEvent(target.id, { origin: 'detail' })}
      className="block w-full rounded-md border border-parchment-200 bg-white px-3 py-2 text-left hover:border-burgundy-200 hover:bg-burgundy-50/30"
    >
      <span className="mr-2 text-xs uppercase tracking-wide text-ink-400">{label}</span>
      <span className="font-medium text-burgundy-700">{loc(target.title)}</span>
    </button>
  );
}

function formatValidity(from?: string, to?: string): string | null {
  if (!from && !to) return null;
  const fromShort = from ? formatHistoricYear(from) : 'offen';
  const toShort = to ? formatHistoricYear(to) : 'heute';
  return `${fromShort} bis ${toShort}`;
}

function formatHistoricYear(d: string): string {
  const m = d.match(/^(\d{1,4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!m) return d;
  const year = Number.parseInt(m[1], 10);
  return year < 1000 ? year.toString().padStart(4, '0') : year.toString();
}

function geometryLabel(type: string): string {
  if (type === 'Polygon') return 'Fläche';
  if (type === 'MultiPolygon') return 'Flächengruppe';
  if (type === 'LineString') return 'Linie';
  if (type === 'MultiLineString') return 'Liniengruppe';
  return type;
}

const order: Record<string, number> = {
  certain: 0, probable: 1, contested: 2, reconstructed: 3,
};

function weaker(a?: string, b?: string): string | undefined {
  const ao = a ? order[a] ?? 0 : 0;
  const bo = b ? order[b] ?? 0 : 0;
  if (Math.max(ao, bo) === 0) return undefined;
  return order[a ?? 'certain'] >= order[b ?? 'certain'] ? a : b;
}
