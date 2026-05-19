import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { localized, type Place } from '@chronotop/shared';
import { eventMatchesSearch, dateToYear, isEventInTimeRange, isPlaceValidInRange } from '../../lib/timelineUtils.js';
import {
  buildThemeOptions,
  eventMatchesTheme,
  movementMatchesTheme,
  placeMatchesTheme,
  type ThemeFilterId,
  type ThemeOption,
} from '../../lib/themeFilters.js';
import { useChronotopStore } from '../../store/useChronotopStore.js';

const TIME_PRESETS: Array<{ label: string; from?: string; to?: string }> = [
  { label: 'Alle' },
  { label: 'bis 1800', to: '1800-01-01' },
  { label: '1800-1914', from: '1800-01-01', to: '1914-01-01' },
  { label: '1914-45', from: '1914-01-01', to: '1945-01-01' },
  { label: 'ab 1945', from: '1945-01-01' },
];

interface ModulePanelProps {
  compact?: boolean;
  embedded?: boolean;
  onDone?: () => void;
}

export function ModulePanel({ compact = false, embedded = false, onDone }: ModulePanelProps) {
  const { i18n } = useTranslation();
  const [localOpen, setLocalOpen] = useState(false);
  const lang = i18n.language;
  const open = embedded || localOpen;

  const currentModule = useChronotopStore(s => s.currentModule);
  const events = useChronotopStore(s => s.events);
  const places = useChronotopStore(s => s.places);
  const concepts = useChronotopStore(s => s.concepts);
  const movements = useChronotopStore(s => s.movements);
  const searchQuery = useChronotopStore(s => s.searchQuery);
  const setSearchQuery = useChronotopStore(s => s.setSearchQuery);
  const timeFilter = useChronotopStore(s => s.timeFilter);
  const setTimeFilter = useChronotopStore(s => s.setTimeFilter);
  const themeFilter = useChronotopStore(s => s.themeFilter);
  const setThemeFilter = useChronotopStore(s => s.setThemeFilter);
  const mapLayerVisibility = useChronotopStore(s => s.mapLayerVisibility);
  const setMapLayerVisibility = useChronotopStore(s => s.setMapLayerVisibility);

  const themeOptions = useMemo(
    () => buildThemeOptions(events, places, movements, concepts, lang),
    [concepts, events, lang, movements, places],
  );
  const eventById = useMemo(() => new Map(events.map(event => [event.id, event])), [events]);
  const activeThemeCount = themeFilter.length;
  const activeTimeCount = timeFilter.from || timeFilter.to ? 1 : 0;
  const activeSearchCount = searchQuery.trim() ? 1 : 0;
  const activeFilterCount = activeThemeCount + activeTimeCount + activeSearchCount;

  useEffect(() => {
    const available = new Set(themeOptions.map(option => option.id));
    setThemeFilter(current => {
      const next = current.filter(id => available.has(id));
      return next.length === current.length ? current : next;
    });
  }, [setThemeFilter, themeOptions]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePanel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const visibleEvents = events.filter(event =>
    isEventInTimeRange(event, timeFilter.from, timeFilter.to)
    && eventMatchesSearch(event, searchQuery, lang)
    && eventMatchesTheme(event, themeFilter, lang)
  );
  const visiblePlaceCount = places.filter(place =>
    isPlaceValidInRange(place.validFrom, place.validTo, timeFilter.from, timeFilter.to)
    && placeMatchesSearch(place, searchQuery, lang)
    && placeMatchesTheme(place, themeFilter, lang)
  ).length;
  const visibleMovementCount = movements.filter(movement =>
    movementMatchesTheme(movement, themeFilter, eventById.get(movement.eventId ?? ''), lang)
  ).length;

  function toggleTheme(themeId: ThemeFilterId) {
    setThemeFilter(current =>
      current.includes(themeId)
        ? current.filter(id => id !== themeId)
        : [...current, themeId],
    );
  }

  function resetFilters() {
    setSearchQuery('');
    setTimeFilter({});
    setThemeFilter([]);
  }

  function closePanel() {
    if (embedded) {
      onDone?.();
      return;
    }
    setLocalOpen(false);
  }

  const panelContent = (
    <>
      <header className="flex items-start justify-between gap-3 border-b border-white/40 bg-white/24 px-4 py-3 backdrop-blur-[2px]">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Filter</p>
          <h2 className="truncate font-serif text-lg font-semibold text-ink-900">
            {currentModule ? localized(currentModule.title, lang) : 'Chronotop'}
          </h2>
          <p className="mt-0.5 text-xs text-ink-500">
            {visibleEvents.length} Ereignisse · {visiblePlaceCount} Orte · {visibleMovementCount} Achsen
          </p>
        </div>
        <button
          type="button"
          onClick={closePanel}
          className="min-h-[36px] rounded-md border border-white/50 bg-white/46 px-3 text-sm font-semibold text-ink-600 backdrop-blur-[2px] hover:bg-white/70"
        >
          Einklappen
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <section className="space-y-2">
          <PanelLabel>Suche</PanelLabel>
          <div className="relative">
            <input
              type="search"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Im Modul suchen..."
              className="w-full rounded-md border border-white/50 bg-white/54 px-3 py-2 text-sm text-ink-800 placeholder-ink-300 shadow-sm backdrop-blur-[2px] focus:border-burgundy-400 focus:bg-white/78 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 min-h-[32px] -translate-y-1/2 rounded px-2 text-xs font-semibold text-ink-400 hover:bg-white/70 hover:text-ink-700"
                aria-label="Suche zurücksetzen"
              >
                x
              </button>
            )}
          </div>
        </section>

        <section className="mt-5 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <PanelLabel>Zeit</PanelLabel>
            {(timeFilter.from || timeFilter.to) && (
              <button
                type="button"
                onClick={() => setTimeFilter({})}
                className="min-h-[32px] rounded px-2 text-xs font-semibold text-ink-600 hover:bg-white/40 hover:text-ink-800"
              >
                löschen
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {TIME_PRESETS.map(preset => {
              const active = (timeFilter.from ?? '') === (preset.from ?? '') && (timeFilter.to ?? '') === (preset.to ?? '');
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setTimeFilter({ from: preset.from, to: preset.to })}
                  aria-pressed={active}
                  className={`min-h-[40px] rounded-md border px-3 text-sm font-medium transition-colors ${
                    active
                      ? 'border-ink-800 bg-ink-800 text-white'
                      : 'border-white/50 bg-white/46 text-ink-700 backdrop-blur-[2px] hover:bg-white/70'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          {(timeFilter.from || timeFilter.to) && (
            <p className="text-xs text-ink-500">Aktiv: {formatTimeFilter(timeFilter)}</p>
          )}
        </section>

        <section className="mt-5 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <PanelLabel>Themen</PanelLabel>
            {themeFilter.length > 0 && (
              <button
                type="button"
                onClick={() => setThemeFilter([])}
                className="min-h-[32px] rounded px-2 text-xs font-semibold text-ink-600 hover:bg-white/40 hover:text-ink-800"
              >
                alle
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {themeOptions.map(option => (
              <ThemeButton
                key={option.id}
                option={option}
                active={themeFilter.includes(option.id)}
                onClick={() => toggleTheme(option.id)}
              />
            ))}
          </div>
        </section>

        <section className="mt-5 space-y-2">
          <PanelLabel>Layer</PanelLabel>
          <div className="space-y-1 rounded-md border border-white/45 bg-white/30 p-1.5 backdrop-blur-[2px]">
            <LayerToggle
              label="Punktmarker"
              count={visibleEvents.filter(event => event.place && !event.place.geometry).length}
              checked={mapLayerVisibility.markers}
              onChange={() => setMapLayerVisibility(current => ({ markers: !current.markers }))}
            />
            <LayerToggle
              label="Geometrien"
              count={visiblePlaceCount}
              checked={mapLayerVisibility.shapes}
              onChange={() => setMapLayerVisibility(current => ({ shapes: !current.shapes }))}
            />
            <LayerToggle
              label="Historische Achsen"
              count={visibleMovementCount}
              checked={mapLayerVisibility.movements}
              onChange={() => setMapLayerVisibility(current => ({ movements: !current.movements }))}
            />
          </div>
        </section>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            className="mt-5 min-h-[40px] w-full rounded-md border border-white/55 bg-white/42 px-3 text-sm font-semibold text-ink-700 backdrop-blur-[2px] hover:bg-white/68"
          >
            Filter zurücksetzen
          </button>
        )}
      </div>
    </>
  );

  if (embedded) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
        {panelContent}
      </div>
    );
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setLocalOpen(v => !v)}
        aria-expanded={open}
        className={`inline-flex min-h-[40px] items-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors ${
          open || activeFilterCount > 0
            ? 'border-burgundy-200 bg-burgundy-50 text-burgundy-700'
            : 'border-burgundy-200 bg-burgundy-50 text-burgundy-700 hover:bg-burgundy-100'
        }`}
      >
        <span>Filter</span>
        {activeFilterCount > 0 && (
          <span className="rounded-full bg-burgundy-600 px-2 py-0.5 text-[11px] font-semibold text-white">
            {activeFilterCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Filter schließen"
            onClick={closePanel}
            className="fixed inset-0 z-40 bg-ink-900/18"
          />
          <aside
            className={`fixed z-50 flex max-h-[calc(100vh-4.5rem)] flex-col overflow-hidden rounded-md border border-parchment-200 bg-white/80 shadow-2xl backdrop-blur-md ${
              compact
                ? 'left-3 right-3 top-14'
                : 'left-3 right-3 top-16 sm:left-auto sm:right-4 sm:w-[25rem]'
            }`}
            aria-label="Filter und Kartensteuerung"
          >
            {panelContent}
          </aside>
        </>
      )}
    </div>
  );
}

function PanelLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
      {children}
    </p>
  );
}

function ThemeButton({ option, active, onClick }: { option: ThemeOption; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex min-h-[40px] items-center gap-2 rounded-md border px-2.5 text-left text-sm font-medium shadow-sm transition-colors hover:bg-white/70"
      style={{
        borderColor: active ? option.color : 'rgba(255,255,255,0.5)',
        background: active ? option.tint : 'rgba(255,255,255,0.46)',
        color: active ? option.color : '#4a4842',
      }}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: option.color }} />
      <span className="min-w-0 truncate">{option.label}</span>
    </button>
  );
}

function LayerToggle({ label, count, checked, onChange }: {
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex min-h-[40px] cursor-pointer items-center justify-between gap-3 rounded-md px-2 hover:bg-white/40">
      <span className="min-w-0 text-sm font-medium text-ink-700">
        {label}
        <span className="ml-1.5 text-xs font-normal text-ink-500">{count}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-5 w-5 rounded border-ink-200 accent-burgundy-600"
      />
    </label>
  );
}

function placeMatchesSearch(place: Place, query: string, lang: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    localized(place.name, lang),
    place.description ? localized(place.description, lang) : '',
    place.wikidataId ?? '',
  ].some(value => value.toLowerCase().includes(q));
}

function formatTimeFilter(filter: { from?: string; to?: string }): string {
  if (filter.from && filter.to) return `${formatYear(dateToYear(filter.from))} bis ${formatYear(dateToYear(filter.to))}`;
  if (filter.from) return `ab ${formatYear(dateToYear(filter.from))}`;
  if (filter.to) return `bis ${formatYear(dateToYear(filter.to))}`;
  return 'alle Zeiten';
}

function formatYear(year: number): string {
  return Math.round(year).toString();
}
