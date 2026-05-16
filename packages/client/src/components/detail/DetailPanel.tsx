import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { toast } from '../system/toast.js';
import { QuelleCard } from './QuelleCard.js';
import { IiifViewer } from './IiifViewer.js';
import { EventAnnotations } from './EventAnnotations.js';
import { sortEventsByDate, isEventInTimeRange } from '../../lib/timelineUtils.js';
import {
  analysisFocusEquals,
  analysisFocusSummary,
  eventMatchesAnalysisFocus,
  type AnalysisFocus,
  type AnalysisFocusKind,
} from '../../lib/analysisFocus.js';
import { certaintyLabel } from '../../lib/themeFilters.js';
import { useLocalized } from '../../i18n/useLocalized.js';
import type { Concept, Event as ChronotopEvent, Source } from '@chronotop/shared';

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
  const analysisFocus = useChronotopStore(s => s.analysisFocus);
  const selectEvent = useChronotopStore(s => s.selectEvent);
  const hoverEvent = useChronotopStore(s => s.hoverEvent);
  const setAnalysisFocus = useChronotopStore(s => s.setAnalysisFocus);
  const requestAnalysisFocusMapFit = useChronotopStore(s => s.requestAnalysisFocusMapFit);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [iiifSource, setIiifSource] = useState<Source | null>(null);

  useEffect(() => {
    setActiveTab(preferredTab ?? 'overview');
    setIiifSource(null);
  }, [preferredTab, selectedEventId]);

  const orderedEvents = useMemo(() => sortEventsByDate(events), [events]);
  const orderIndex = useMemo(() => {
    const m = new Map<string, number>();
    orderedEvents
      .filter(e => e.place && isEventInTimeRange(e, timeFilter.from, timeFilter.to))
      .forEach((e, i) => m.set(e.id, i + 1));
    return m;
  }, [orderedEvents, timeFilter]);

  const event = events.find(e => e.id === selectedEventId);

  const focusMatches = useMemo(
    () => analysisFocus ? orderedEvents.filter(candidate => eventMatchesAnalysisFocus(candidate, analysisFocus)) : [],
    [analysisFocus, orderedEvents],
  );

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      toast.success('Permalink kopiert');
    }).catch(() => {
      toast.error('Kopieren fehlgeschlagen');
    });
  };

  if (!event) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-parchment-50 p-8 text-center text-sm text-ink-400">
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
  const sourceById = new Map(sources.map(source => [source.id, source]));
  const relatedEvents = analysisFocus
    ? focusMatches.filter(candidate => candidate.id !== event.id)
    : findRelatedEvents(event, orderedEvents);
  const focusActiveForEvent = analysisFocus ? eventMatchesAnalysisFocus(event, analysisFocus) : false;

  const applyFocus = (kind: AnalysisFocusKind, id: string, label: string) => {
    const next: AnalysisFocus = { kind, id, label, originEventId: event.id };
    setAnalysisFocus(analysisFocusEquals(analysisFocus, next) ? null : next);
  };

  const applyFocusAndFit = (kind: AnalysisFocusKind, id: string, label: string) => {
    const next: AnalysisFocus = { kind, id, label, originEventId: event.id };
    setAnalysisFocus(next);
    requestAnalysisFocusMapFit();
  };

  const tabs: Array<{ id: DetailTab; label: string; count?: number }> = [
    { id: 'overview', label: 'Deutung' },
    { id: 'context', label: 'Zusammenhänge', count: actorCount + conceptCount },
    { id: 'sources', label: 'Quellen', count: sourceCount },
    { id: 'notes', label: 'Auswertung' },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <header className="shrink-0 border-b border-parchment-200 bg-parchment-100 px-5 py-4">
        <div className="flex items-start gap-3">
          {num != null && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-burgundy-600 font-serif font-semibold text-white shadow-sm">
              {num}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {event.timeObject && <CertBadge meta={timeCert} />}
              {event.place?.certainty && event.place.certainty !== 'certain' && <CertBadge meta={placeCert} />}
              {event.place?.geometry && <MiniBadge>{geometryLabel(event.place.geometry.type)}</MiniBadge>}
            </div>
            <h2 className="mt-1 font-serif text-xl font-semibold leading-tight text-ink-900">
              {loc(event.title)}
            </h2>
            {event.timeObject && (
              <p className="mt-1 text-sm italic text-ink-500">{loc(event.timeObject.label)}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={handleCopyLink}
              className="rounded border border-parchment-300 bg-white px-2 py-1 text-[11px] font-medium text-ink-500 hover:border-burgundy-200 hover:text-burgundy-700"
              title="Permalink fuer diese Ereignisauswahl kopieren"
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

        {analysisFocus && (
          <div className={`mt-3 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs ${
            focusActiveForEvent
              ? 'border-gold-200 bg-gold-100 text-gold-600'
              : 'border-parchment-300 bg-white text-ink-500'
          }`}>
            <span className="font-semibold">{analysisFocusSummary(analysisFocus.kind)}: {analysisFocus.label}</span>
            <span>{focusMatches.length} passende Einträge</span>
            <button type="button" onClick={requestAnalysisFocusMapFit} className="ml-auto rounded border border-gold-200 bg-white px-2 py-0.5 font-semibold text-gold-600 hover:bg-gold-50">
              Karte fokussieren
            </button>
            <button type="button" onClick={() => setAnalysisFocus(null)} className="rounded border border-parchment-300 bg-white px-2 py-0.5 font-semibold text-ink-500 hover:bg-parchment-50">
              Lösen
            </button>
          </div>
        )}
      </header>

      <nav className="flex shrink-0 border-b border-parchment-200 bg-white px-2" aria-label="Detailbereich">
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

      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="space-y-5 p-5">
            <section className="rounded-md border border-parchment-200 bg-parchment-50 p-4">
              <SectionTitle>Kernaussage</SectionTitle>
              {loc(event.description) ? (
                <p className="max-w-[44rem] font-serif text-[15px] leading-relaxed text-ink-800">
                  {loc(event.description)}
                </p>
              ) : (
                <p className="text-sm italic text-ink-400">Noch keine Beschreibung hinterlegt.</p>
              )}
            </section>

            <div className="grid gap-2 text-sm sm:grid-cols-2">
              {event.place && (
                <FocusMetaCard
                  label="Raumbezug"
                  value={loc(event.place.name)}
                  detail={validity ? `gültig: ${validity}` : undefined}
                  badge={event.place.certainty !== 'certain' ? placeCert : undefined}
                  onFocus={() => applyFocus('place', event.place!.id, loc(event.place!.name))}
                  onFit={() => applyFocusAndFit('place', event.place!.id, loc(event.place!.name))}
                />
              )}
              {event.timeObject && (
                <FocusMetaCard
                  label="Zeitbezug"
                  value={loc(event.timeObject.label)}
                  badge={timeCert}
                  onFocus={() => applyFocus('time', event.timeObject!.id, loc(event.timeObject!.label))}
                  onFit={() => applyFocusAndFit('time', event.timeObject!.id, loc(event.timeObject!.label))}
                />
              )}
              {event.place?.geometry && (
                <MetaCard
                  label="Kartengeometrie"
                  value={geometryLabel(event.place.geometry.type)}
                  detail={geometrySource ? `Quelle: ${loc(geometrySource.title)}` : 'Beleglage im Quellen-Tab prüfen'}
                />
              )}
              <MetaCard
                label="Beleglage"
                value={`${sourceCount} Quellen · ${actorCount} Akteure · ${conceptCount} Begriffe`}
                detail={event.place?.certainty && event.place.certainty !== 'certain' ? `Raumangabe: ${certaintyLabel(event.place.certainty)}` : undefined}
              />
            </div>

            {event.concepts && event.concepts.length > 0 && (
              <section>
                <SectionTitle>Deutungsbegriffe</SectionTitle>
                <div className="flex flex-wrap gap-1.5">
                  {event.concepts.map(concept => (
                    <FocusChip
                      key={concept.id}
                      active={analysisFocus?.kind === 'concept' && analysisFocus.id === concept.id}
                      label={loc(concept.label)}
                      count={countEventsForFocus(orderedEvents, { kind: 'concept', id: concept.id, label: loc(concept.label) })}
                      tone={conceptTone(concept)}
                      onClick={() => applyFocus('concept', concept.id, loc(concept.label))}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-md border border-parchment-200 bg-white p-3">
              <SectionTitle>Arbeitsimpuls</SectionTitle>
              <p className="text-sm leading-relaxed text-ink-700">
                Ordne den Eintrag über Karte, Zeitleiste und Quellen ein: Welche räumliche Lage ist historisch bedeutsam, welche anderen Einträge teilen denselben Zusammenhang, und welche Quelle trägt deine Deutung?
              </p>
            </section>

            <RelatedEventsList
              title={analysisFocus ? 'Passende Einträge zum Fokus' : 'Naheliegende Zusammenhänge'}
              events={relatedEvents}
              selectedEventId={event.id}
              onSelect={id => selectEvent(id, { origin: 'detail' })}
              onHover={hoverEvent}
            />
          </div>
        )}

        {activeTab === 'context' && (
          <div className="space-y-5 p-5">
            <section>
              <SectionTitle>Begriffe, Akteure und Belege</SectionTitle>
              <div className="space-y-3">
                {event.concepts && event.concepts.length > 0 && (
                  <FocusGroup label="Begriffe">
                    {event.concepts.map(concept => (
                      <FocusCardButton
                        key={concept.id}
                        active={analysisFocus?.kind === 'concept' && analysisFocus.id === concept.id}
                        title={loc(concept.label)}
                        meta={`${concept.kind} · ${countEventsForFocus(orderedEvents, { kind: 'concept', id: concept.id, label: loc(concept.label) })} Einträge`}
                        description={loc(concept.description)}
                        onClick={() => applyFocus('concept', concept.id, loc(concept.label))}
                        onFit={() => applyFocusAndFit('concept', concept.id, loc(concept.label))}
                      />
                    ))}
                  </FocusGroup>
                )}

                {event.actors && event.actors.length > 0 && (
                  <FocusGroup label="Akteure">
                    {event.actors.map(({ actor, role, certainty: linkCert }) => {
                      const effective = weaker(actor.certainty, linkCert);
                      const cert = effective && effective !== 'certain' ? certaintyMeta[effective] : null;
                      return (
                        <FocusCardButton
                          key={actor.id}
                          active={analysisFocus?.kind === 'actor' && analysisFocus.id === actor.id}
                          title={loc(actor.name)}
                          meta={[role, `${countEventsForFocus(orderedEvents, { kind: 'actor', id: actor.id, label: loc(actor.name) })} Einträge`].filter(Boolean).join(' · ')}
                          description={loc(actor.description)}
                          badge={cert}
                          href={actor.wikidataId ? `https://www.wikidata.org/wiki/${actor.wikidataId}` : undefined}
                          onClick={() => applyFocus('actor', actor.id, loc(actor.name))}
                          onFit={() => applyFocusAndFit('actor', actor.id, loc(actor.name))}
                        />
                      );
                    })}
                  </FocusGroup>
                )}

                {event.sources && event.sources.length > 0 && (
                  <FocusGroup label="Quellen">
                    {event.sources.map(source => (
                      <FocusCardButton
                        key={source.id}
                        active={analysisFocus?.kind === 'source' && analysisFocus.id === source.id}
                        title={loc(source.title)}
                        meta={[source.type, source.license, `${countEventsForFocus(orderedEvents, { kind: 'source', id: source.id, label: loc(source.title) })} Einträge`].filter(Boolean).join(' · ')}
                        description={loc(source.description)}
                        href={source.url}
                        onClick={() => applyFocus('source', source.id, loc(source.title))}
                        onFit={() => applyFocusAndFit('source', source.id, loc(source.title))}
                      />
                    ))}
                  </FocusGroup>
                )}
              </div>
            </section>

            <section>
              <SectionTitle>Ort und Geometrie</SectionTitle>
              <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm">
                {event.place && (
                  <>
                    <dt className="text-ink-400">Name</dt>
                    <dd className="text-ink-800">{loc(event.place.name)}</dd>
                    <dt className="text-ink-400">Koordinaten</dt>
                    <dd className="font-mono text-xs text-ink-500">
                      {event.place.lat.toFixed(4)}°N, {event.place.lng.toFixed(4)}°E
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
                <SectionTitle>Direkte Beziehungen</SectionTitle>
                <div className="space-y-2 text-sm">
                  {event.followsId && <RelationButton label="folgt auf" eventId={event.followsId} />}
                  {event.partOfId && <RelationButton label="Teil von" eventId={event.partOfId} />}
                </div>
              </section>
            )}

            <RelatedEventsList
              title={analysisFocus ? 'Weitere Einträge im Analysefokus' : 'Verwandte Einträge'}
              events={relatedEvents}
              selectedEventId={event.id}
              onSelect={id => selectEvent(id, { origin: 'detail' })}
              onHover={hoverEvent}
            />
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
              <div className="space-y-3">
                {event.sources.map(source => (
                  <div key={source.id} className="rounded-md border border-parchment-200 bg-white p-3">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      {sourceEvidenceLabels(event, source, sourceById).map(label => (
                        <MiniBadge key={label}>{label}</MiniBadge>
                      ))}
                      <button
                        type="button"
                        onClick={() => applyFocus('source', source.id, loc(source.title))}
                        className="ml-auto rounded border border-parchment-300 bg-parchment-50 px-2 py-0.5 text-[11px] font-semibold text-ink-600 hover:border-gold-200 hover:bg-gold-50"
                      >
                        Quellenfokus
                      </button>
                    </div>
                    <QuelleCard source={source} onViewIiif={setIiifSource} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-xs italic text-ink-400">Keine Quellen verknüpft.</p>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-4 p-5">
            <section className="rounded-md border border-parchment-200 bg-parchment-50 p-4">
              <SectionTitle>Deutung sichern</SectionTitle>
              <p className="text-sm leading-relaxed text-ink-700">
                Eine belastbare Auswertung verbindet mindestens einen Kartenbeleg, einen Zeitbezug und eine Quelle. Unsichere oder rekonstruierte Geometrien sollten ausdrücklich benannt werden.
              </p>
            </section>
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

function FocusMetaCard(props: {
  label: string;
  value: string;
  detail?: string;
  badge?: { label: string; color: string };
  onFocus: () => void;
  onFit: () => void;
}) {
  return (
    <div className="rounded-md border border-parchment-200 bg-parchment-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{props.label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={props.onFocus} className="text-left text-sm font-semibold text-ink-800 hover:text-burgundy-700">
          {props.value}
        </button>
        {props.badge && <CertBadge meta={props.badge} />}
      </div>
      {props.detail && <p className="mt-1 text-xs text-ink-500">{props.detail}</p>}
      <button type="button" onClick={props.onFit} className="mt-2 rounded border border-parchment-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-500 hover:border-gold-200 hover:bg-gold-50">
        auf Karte zeigen
      </button>
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

function MiniBadge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded border border-parchment-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-ink-500">
      {children}
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

function FocusChip({
  active,
  label,
  count,
  tone,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${active ? 'border-gold-400 bg-gold-100 text-gold-600' : 'border-parchment-300 bg-white text-ink-700 hover:border-gold-200 hover:bg-gold-50'}`}
    >
      <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: tone }} />
      {label}
      {count > 1 && <span className="ml-1 text-[10px] text-ink-400">{count}</span>}
    </button>
  );
}

function FocusGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{label}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function FocusCardButton({
  active,
  title,
  meta,
  description,
  badge,
  href,
  onClick,
  onFit,
}: {
  active: boolean;
  title: string;
  meta: string;
  description?: string;
  badge?: { label: string; color: string } | null;
  href?: string;
  onClick: () => void;
  onFit: () => void;
}) {
  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${active ? 'border-gold-200 bg-gold-50' : 'border-parchment-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onClick} className="text-left font-semibold text-ink-800 hover:text-burgundy-700">
          {title}
        </button>
        {badge && <CertBadge meta={badge} />}
      </div>
      {meta && <p className="mt-0.5 text-xs text-ink-500">{meta}</p>}
      {description && <p className="mt-1 text-xs leading-relaxed text-ink-500">{description}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={onFit} className="rounded border border-parchment-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-500 hover:border-gold-200 hover:bg-gold-50">
          auf Karte zeigen
        </button>
        {href && (
          <a href={href} target="_blank" rel="noopener noreferrer" className="rounded border border-parchment-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-burgundy-700 hover:bg-burgundy-50">
            extern
          </a>
        )}
      </div>
    </div>
  );
}

function RelatedEventsList({
  title,
  events,
  selectedEventId,
  onSelect,
  onHover,
}: {
  title: string;
  events: ChronotopEvent[];
  selectedEventId: string;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const loc = useLocalized();
  if (events.length === 0) return null;
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <div className="space-y-1.5">
        {events.slice(0, 8).map(related => (
          <button
            key={related.id}
            type="button"
            onClick={() => onSelect(related.id)}
            onMouseEnter={() => onHover(related.id)}
            onMouseLeave={() => onHover(null)}
            className={`block w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
              related.id === selectedEventId
                ? 'border-burgundy-300 bg-burgundy-50 text-burgundy-800'
                : 'border-parchment-200 bg-white text-ink-700 hover:border-burgundy-200 hover:bg-burgundy-50/30'
            }`}
          >
            <span className="font-semibold">{loc(related.title)}</span>
            {related.timeObject && <span className="ml-2 text-xs text-ink-400">{loc(related.timeObject.label)}</span>}
          </button>
        ))}
      </div>
    </section>
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

function countEventsForFocus(events: ChronotopEvent[], focus: AnalysisFocus): number {
  return events.filter(event => eventMatchesAnalysisFocus(event, focus)).length;
}

function findRelatedEvents(event: ChronotopEvent, events: ChronotopEvent[]): ChronotopEvent[] {
  const conceptIds = new Set(event.concepts?.map(concept => concept.id) ?? []);
  const actorIds = new Set(event.actors?.map(link => link.actor.id) ?? []);
  const sourceIds = new Set(event.sources?.map(source => source.id) ?? []);
  return events
    .filter(candidate => candidate.id !== event.id)
    .map(candidate => {
      let score = 0;
      candidate.concepts?.forEach(concept => { if (conceptIds.has(concept.id)) score += 4; });
      candidate.actors?.forEach(link => { if (actorIds.has(link.actor.id)) score += 3; });
      candidate.sources?.forEach(source => { if (sourceIds.has(source.id)) score += 2; });
      if (candidate.placeId === event.placeId) score += 2;
      if (candidate.timeObjectId === event.timeObjectId) score += 1;
      return { candidate, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.candidate);
}

function sourceEvidenceLabels(event: ChronotopEvent, source: Source, sourceById: Map<string, Source>): string[] {
  const labels = ['Ereignisbeleg'];
  if (event.place?.sourceOfClaim === source.id) labels.push('Raumbeleg');
  if (event.actors?.some(link => link.sourceOfClaim === source.id || link.actor.sourceOfClaim === source.id)) labels.push('Akteursbeleg');
  if (event.timeObject?.certainty && event.timeObject.certainty !== 'certain') labels.push(`Zeit: ${certaintyLabel(event.timeObject.certainty)}`);
  if (event.place?.certainty && event.place.certainty !== 'certain') labels.push(`Ort: ${certaintyLabel(event.place.certainty)}`);
  if (source.iiifImageUrl || source.iiifManifestUrl) labels.push('Bild/IIIF');
  const geometrySource = event.place?.sourceOfClaim ? sourceById.get(event.place.sourceOfClaim) : null;
  if (geometrySource?.id === source.id && event.place?.geometry) labels.push('Geometrie');
  return Array.from(new Set(labels));
}

function conceptTone(concept: Concept): string {
  switch (concept.kind) {
    case 'source':
      return '#245b7d';
    case 'narrative':
      return '#7b2331';
    default:
      return '#3f6d62';
  }
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
  if (type === 'Point') return 'Punkt';
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
