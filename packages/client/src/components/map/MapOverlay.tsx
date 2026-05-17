import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { type MapStyleOption } from '../../lib/mapStyle.js';
import type { ThemeFilter, ThemeFilterId, ThemeOption } from '../../lib/themeFilters.js';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { useIsTablet } from '../../hooks/useMediaQuery.js';

export type { ThemeFilter, ThemeFilterId, ThemeOption };
type TimePreset = { label: string; from?: string; to?: string };

const TIME_PRESETS: TimePreset[] = [
  { label: 'Alle' },
  { label: 'bis 1800', to: '1800' },
  { label: '1800-1914', from: '1800', to: '1914' },
  { label: '1914-45', from: '1914', to: '1945' },
  { label: 'ab 1945', from: '1945' },
];

interface MapOverlayProps {
  availableStyles: MapStyleOption[];
  styleId: MapStyleOption['id'];
  onStyleChange: (id: MapStyleOption['id']) => void;
  themeOptions: ThemeOption[];
  themeFilter: ThemeFilter;
  onThemeFilterChange: (filter: ThemeFilter) => void;
  showMarkers: boolean;
  onToggleMarkers: () => void;
  showShapes: boolean;
  onToggleShapes: () => void;
  showMovements: boolean;
  onToggleMovements: () => void;
  layerStats: { markers: number; shapes: number; movements: number };
}

export function MapOverlay(props: MapOverlayProps) {
  const isTablet = useIsTablet();
  const [open, setOpen] = useState(false);
  const [themesOpen, setThemesOpen] = useState(true);
  const [timeOpen, setTimeOpen] = useState(true);
  const [legendOpen, setLegendOpen] = useState(false);
  const fullscreen = useChronotopStore(s => s.fullscreen);
  const setFullscreen = useChronotopStore(s => s.setFullscreen);
  const timeFilter = useChronotopStore(s => s.timeFilter);
  const setTimeFilter = useChronotopStore(s => s.setTimeFilter);
  const activeThemeCount = props.themeFilter.length;
  const hasTimeFilter = !!(timeFilter.from || timeFilter.to);
  const objectCount = props.layerStats.markers + props.layerStats.shapes + props.layerStats.movements;
  const systemThemes = props.themeOptions.filter(option => option.kind === 'system');
  const conceptThemes = props.themeOptions.filter(option => option.kind === 'concept');
  const activeFilterCount = activeThemeCount + (hasTimeFilter ? 1 : 0);

  function toggleTheme(theme: ThemeFilterId) {
    props.onThemeFilterChange(
      props.themeFilter.includes(theme)
        ? props.themeFilter.filter(t => t !== theme)
        : [...props.themeFilter, theme],
    );
  }

  // Auf Tablet beim Wechsel zur Desktop-Breite Drawer schließen, damit der Zustand sauber bleibt.
  useEffect(() => {
    if (!isTablet) setOpen(false);
  }, [isTablet]);

  const styleSwitcher = (
    <div
      className="flex overflow-hidden rounded-md border border-ink-100 bg-white/95 shadow-md backdrop-blur pointer-events-auto"
      role="radiogroup"
      aria-label="Kartenstil"
    >
      {props.availableStyles.map(s => (
        <button
          key={s.id}
          role="radio"
          aria-checked={s.id === props.styleId}
          onClick={() => props.onStyleChange(s.id)}
          title={s.description}
          className={`min-h-[40px] px-3 text-sm font-medium transition-colors ${
            s.id === props.styleId
              ? 'bg-ink-800 text-white'
              : 'text-ink-600 hover:bg-ink-50'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );

  const fullscreenButton = (
    <button
      onClick={() => setFullscreen(!fullscreen)}
      title={fullscreen ? 'Vollbild beenden' : 'Karte im Vollbild anzeigen'}
      className="pointer-events-auto min-h-[40px] rounded-md border border-ink-100 bg-white/95 px-3 text-sm font-medium text-ink-600 shadow-md backdrop-blur hover:bg-ink-50"
      aria-label={fullscreen ? 'Vollbild beenden' : 'Vollbild'}
    >
      {fullscreen ? 'Verkleinern' : 'Vollbild'}
    </button>
  );

  const filterPanelBody = (
    <FilterPanelBody
      props={props}
      themesOpen={themesOpen}
      onToggleThemes={() => setThemesOpen(v => !v)}
      timeOpen={timeOpen}
      onToggleTime={() => setTimeOpen(v => !v)}
      legendOpen={legendOpen}
      onToggleLegend={() => setLegendOpen(v => !v)}
      systemThemes={systemThemes}
      conceptThemes={conceptThemes}
      activeThemeCount={activeThemeCount}
      objectCount={objectCount}
      timeFilter={timeFilter}
      setTimeFilter={setTimeFilter}
      onToggleTheme={toggleTheme}
    />
  );

  if (isTablet) {
    return (
      <>
        <div className="pointer-events-none absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-controls="map-filter-drawer"
            className="pointer-events-auto inline-flex min-h-[40px] items-center gap-2 rounded-md border border-ink-100 bg-white/95 px-3 text-sm font-semibold text-ink-700 shadow-md backdrop-blur hover:bg-ink-50"
          >
            <span>Karte &amp; Filter</span>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-burgundy-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          {fullscreenButton}
        </div>

        {open && (
          <div
            className="absolute inset-0 z-20 flex"
            role="dialog"
            aria-modal="true"
            aria-label="Karten- und Filtereinstellungen"
          >
            <button
              type="button"
              aria-label="Schließen"
              onClick={() => setOpen(false)}
              className="flex-1 bg-ink-800/30"
            />
            <aside
              id="map-filter-drawer"
              className="flex h-full w-[22rem] max-w-[92vw] flex-col border-l border-ink-100 bg-white shadow-2xl"
            >
              <header className="flex items-center justify-between gap-3 border-b border-parchment-200 px-4 py-3">
                <div>
                  <p className="font-serif text-base font-semibold text-ink-800">Karten-Einstellungen</p>
                  <p className="text-xs text-ink-400">{objectCount} Objekte sichtbar</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="min-h-[40px] min-w-[40px] rounded-md border border-parchment-300 bg-white px-3 text-sm font-semibold text-ink-600 hover:bg-parchment-50"
                  aria-label="Schließen"
                >
                  Fertig
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm">
                <section className="pb-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                    Kartenstil
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {props.availableStyles.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => props.onStyleChange(s.id)}
                        aria-pressed={s.id === props.styleId}
                        className={`min-h-[44px] rounded-md border px-3 text-left text-sm font-medium transition-colors ${
                          s.id === props.styleId
                            ? 'border-ink-800 bg-ink-800 text-white'
                            : 'border-parchment-300 bg-white text-ink-700 hover:bg-parchment-50'
                        }`}
                      >
                        <div>{s.label}</div>
                        {s.description && (
                          <div className={`text-[11px] font-normal ${s.id === props.styleId ? 'text-white/80' : 'text-ink-400'}`}>
                            {s.description}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </section>

                {filterPanelBody}
              </div>
            </aside>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="pointer-events-none absolute top-3 left-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2">
        {styleSwitcher}
        {fullscreenButton}
      </div>

      <div className="pointer-events-none absolute right-3 top-14 bottom-3 z-10 flex items-end">
        <div className="pointer-events-auto flex max-h-full w-[18rem] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-md border border-ink-100 bg-white/95 shadow-lg backdrop-blur">
          <button
            onClick={() => setOpen(o => !o)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-ink-800 hover:bg-ink-50"
            aria-expanded={open}
          >
            <span>{open ? 'Kartenfilter' : 'Filter'}</span>
            <span className="text-[11px] font-medium text-ink-400">
              {activeThemeCount > 0 ? `${activeThemeCount} Themen` : `${objectCount} Objekte`}
            </span>
          </button>
          {open && (
            <div className="min-h-0 overflow-y-auto border-t border-ink-100 px-3 py-3 text-xs">
              {filterPanelBody}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

interface FilterPanelBodyProps {
  props: MapOverlayProps;
  themesOpen: boolean;
  onToggleThemes: () => void;
  timeOpen: boolean;
  onToggleTime: () => void;
  legendOpen: boolean;
  onToggleLegend: () => void;
  systemThemes: ThemeOption[];
  conceptThemes: ThemeOption[];
  activeThemeCount: number;
  objectCount: number;
  timeFilter: { from?: string; to?: string };
  setTimeFilter: (filter: { from?: string; to?: string }) => void;
  onToggleTheme: (theme: ThemeFilterId) => void;
}

function FilterPanelBody({
  props,
  themesOpen,
  onToggleThemes,
  timeOpen,
  onToggleTime,
  legendOpen,
  onToggleLegend,
  systemThemes,
  conceptThemes,
  activeThemeCount,
  objectCount,
  timeFilter,
  setTimeFilter,
  onToggleTheme,
}: FilterPanelBodyProps) {
  return (
    <>
      <div className="space-y-2 pb-3">
        <LayerToggle
          checked={props.showMarkers}
          onChange={props.onToggleMarkers}
          label="Punktmarker"
          count={props.layerStats.markers}
          swatch={<span className="inline-block h-4 w-4 rounded-full border-2 border-burgundy-600 bg-white" />}
        />
        <LayerToggle
          checked={props.showShapes}
          onChange={props.onToggleShapes}
          label="Geometrien"
          count={props.layerStats.shapes}
          swatch={<span className="inline-block h-4 w-4 rounded-sm border border-verdigris-500 bg-verdigris-100" />}
        />
        <LayerToggle
          checked={props.showMovements}
          onChange={props.onToggleMovements}
          label="Historische Achsen"
          count={props.layerStats.movements}
          swatch={<span className="inline-block h-1.5 w-5 rounded-full bg-burgundy-600" />}
        />
      </div>

      {props.themeOptions.length > 0 && (
        <FilterSection
          title="Themen"
          open={themesOpen}
          onToggle={onToggleThemes}
          action={(
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); props.onThemeFilterChange([]); }}
              className={`min-h-[32px] rounded px-2.5 text-xs font-medium transition-colors ${
                activeThemeCount === 0
                  ? 'bg-ink-800 text-white'
                  : 'text-ink-500 hover:bg-ink-50 hover:text-ink-700'
              }`}
              aria-pressed={activeThemeCount === 0}
            >
              Alle
            </button>
          )}
        >
          {systemThemes.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {systemThemes.map(option => (
                <ThemeToggle
                  key={option.id}
                  option={option}
                  active={props.themeFilter.includes(option.id)}
                  onChange={() => onToggleTheme(option.id)}
                />
              ))}
            </div>
          )}
          {conceptThemes.length > 0 && (
            <>
              <p className="pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                Modulbegriffe
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {conceptThemes.map(option => (
                  <ThemeToggle
                    key={option.id}
                    option={option}
                    active={props.themeFilter.includes(option.id)}
                    onChange={() => onToggleTheme(option.id)}
                  />
                ))}
              </div>
            </>
          )}
          <div className="flex items-center justify-between text-xs text-ink-500">
            <span>{activeThemeCount === 0 ? 'alle Themen' : `${activeThemeCount} aktiv`}</span>
            {activeThemeCount > 0 && (
              <button
                type="button"
                onClick={() => props.onThemeFilterChange([])}
                className="min-h-[32px] font-medium hover:text-ink-800"
              >
                löschen
              </button>
            )}
          </div>
        </FilterSection>
      )}

      <FilterSection
        title="Zeit"
        open={timeOpen}
        onToggle={onToggleTime}
        action={(timeFilter.from || timeFilter.to) ? (
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); setTimeFilter({}); }}
            className="min-h-[32px] text-xs font-medium text-ink-500 hover:text-ink-800"
          >
            löschen
          </button>
        ) : undefined}
      >
        <div className="grid grid-cols-2 gap-1.5">
          {TIME_PRESETS.map(preset => (
            <ThemeButton
              key={preset.label}
              active={isTimePresetActive(timeFilter, preset)}
              onClick={() => setTimeFilter({ from: preset.from, to: preset.to })}
            >
              {preset.label}
            </ThemeButton>
          ))}
        </div>
      </FilterSection>

      <FilterSection
        title="Legende"
        open={legendOpen}
        onToggle={onToggleLegend}
      >
        <div className="grid grid-cols-2 gap-2 text-xs text-ink-500">
          <LegendSwatch color="#7b2331" label="Verfolgung" />
          <LegendSwatch color="#6f3b87" label="NS-Medizin" />
          <LegendSwatch color="#8a5a2b" label="Zwangsarbeit" />
          <LegendSwatch color="#245b7d" label="Kriegsende" />
          <LegendSwatch color="#236f8f" label="Flussraum" />
          <LegendSwatch color="#5f3a2e" label="Eisenbahn" />
          <LegendSwatch color="#a8781c" label="Schem. Achse" dashed />
          <LegendSwatch color="#6f8f7f" label="Fläche" fill />
        </div>
      </FilterSection>

      <p className="pt-3 text-xs leading-relaxed text-ink-400">
        Sichtbar: {objectCount} Kartenobjekte nach Thema, Zeit und Suche.
      </p>
    </>
  );
}

function isTimePresetActive(timeFilter: { from?: string; to?: string }, preset: TimePreset): boolean {
  return (timeFilter.from ?? '') === (preset.from ?? '') && (timeFilter.to ?? '') === (preset.to ?? '');
}

function FilterSection({
  title,
  open,
  onToggle,
  action,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-ink-100 py-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-h-[40px] min-w-0 flex-1 items-center justify-between gap-2 text-left"
          aria-expanded={open}
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">{title}</span>
          <span className="text-ink-300">{open ? '−' : '+'}</span>
        </button>
        {action && (
          <span className="shrink-0">
            {action}
          </span>
        )}
      </div>
      {open && <div className="mt-2 space-y-2">{children}</div>}
    </section>
  );
}

function ThemeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[40px] rounded border px-3 text-sm font-medium transition-colors ${
        active
          ? 'border-ink-800 bg-ink-800 text-white'
          : 'border-ink-100 bg-white text-ink-700 hover:bg-ink-50'
      }`}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function ThemeToggle({
  option,
  active,
  onChange,
}: {
  option: ThemeOption;
  active: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex min-h-[40px] cursor-pointer items-center gap-2 rounded border px-2.5 py-1.5 text-sm font-medium transition-colors ${
        active ? 'shadow-sm' : 'bg-white text-ink-700 hover:bg-ink-50'
      }`}
      style={{
        borderColor: active ? option.color : '#e8ddc8',
        background: active ? option.tint : undefined,
        color: active ? option.color : undefined,
      }}
    >
      <input
        type="checkbox"
        checked={active}
        onChange={onChange}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2"
        style={{ borderColor: option.color, background: active ? option.color : '#fffaf0' }}
      />
      <span className="truncate">{option.label}</span>
    </label>
  );
}

function LayerToggle({
  checked,
  onChange,
  label,
  count,
  swatch,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  count: number;
  swatch: ReactNode;
}) {
  return (
    <label className="-mx-1 flex min-h-[40px] cursor-pointer items-center justify-between gap-3 rounded px-1 hover:bg-ink-50">
      <span className="flex min-w-0 items-center gap-2">
        {swatch}
        <span className="truncate text-sm text-ink-700">{label}</span>
        {count > 0 && <span className="text-xs text-ink-400">{count}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-5 w-5 rounded border-ink-200 accent-burgundy-500"
      />
    </label>
  );
}

function LegendSwatch({ color, label, fill, dashed }: { color: string; label: string; fill?: boolean; dashed?: boolean }) {
  const lineStyle = dashed
    ? { backgroundImage: `repeating-linear-gradient(to right, ${color} 0 7px, transparent 7px 11px)` }
    : { background: color };
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={fill ? 'inline-block w-4 h-3 rounded-sm border' : 'inline-block w-4 h-1.5 rounded-full'}
        style={fill ? { background: `${color}44`, borderColor: color } : lineStyle}
      />
      <span>{label}</span>
    </span>
  );
}
