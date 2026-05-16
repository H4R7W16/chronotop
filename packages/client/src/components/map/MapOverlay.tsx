import { useState } from 'react';
import type { ReactNode } from 'react';
import { type MapStyleOption } from '../../lib/mapStyle.js';
import type { ThemeFilter, ThemeFilterId, ThemeOption } from '../../lib/themeFilters.js';
import { useChronotopStore } from '../../store/useChronotopStore.js';

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
  const [open, setOpen] = useState(false);
  const [themesOpen, setThemesOpen] = useState(true);
  const [timeOpen, setTimeOpen] = useState(true);
  const [legendOpen, setLegendOpen] = useState(false);
  const fullscreen = useChronotopStore(s => s.fullscreen);
  const setFullscreen = useChronotopStore(s => s.setFullscreen);
  const timeFilter = useChronotopStore(s => s.timeFilter);
  const setTimeFilter = useChronotopStore(s => s.setTimeFilter);
  const activeThemeCount = props.themeFilter.length;
  const objectCount = props.layerStats.markers + props.layerStats.shapes + props.layerStats.movements;
  const systemThemes = props.themeOptions.filter(option => option.kind === 'system');
  const conceptThemes = props.themeOptions.filter(option => option.kind === 'concept');

  function toggleTheme(theme: ThemeFilterId) {
    props.onThemeFilterChange(
      props.themeFilter.includes(theme)
        ? props.themeFilter.filter(t => t !== theme)
        : [...props.themeFilter, theme],
    );
  }

  return (
    <>
      <div className="absolute top-3 left-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2 pointer-events-none">
        <div
          className="bg-white/95 backdrop-blur rounded-md shadow-md border border-ink-100 flex overflow-hidden pointer-events-auto"
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
              className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                s.id === props.styleId
                  ? 'bg-ink-800 text-white'
                  : 'text-ink-600 hover:bg-ink-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setFullscreen(!fullscreen)}
          title={fullscreen ? 'Vollbild beenden' : 'Karte im Vollbild anzeigen'}
          className="bg-white/95 backdrop-blur rounded-md shadow-md border border-ink-100 px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50 pointer-events-auto"
          aria-label={fullscreen ? 'Vollbild beenden' : 'Vollbild'}
        >
          {fullscreen ? 'Verkleinern' : 'Vollbild'}
        </button>
      </div>

      <div className="absolute right-3 top-14 bottom-3 z-10 flex items-end pointer-events-none">
        <div
          className="w-[18rem] max-w-[calc(100vw-1.5rem)] max-h-full bg-white/96 backdrop-blur rounded-md shadow-lg border border-ink-100 overflow-hidden flex flex-col pointer-events-auto"
        >
          <button
            onClick={() => setOpen(o => !o)}
            className="w-full px-3 py-2 text-xs font-semibold text-ink-800 hover:bg-ink-50 flex items-center justify-between gap-2"
            aria-expanded={open}
          >
            <span>{open ? 'Kartenfilter' : 'Filter'}</span>
            <span className="text-[11px] font-medium text-ink-400">
              {activeThemeCount > 0 ? `${activeThemeCount} Themen` : `${objectCount} Objekte`}
            </span>
          </button>
          {open && (
            <div className="min-h-0 overflow-y-auto border-t border-ink-100 px-3 py-3 text-xs">
              <div className="space-y-2 pb-3">
                <LayerToggle
                  checked={props.showMarkers}
                  onChange={props.onToggleMarkers}
                  label="Punktmarker"
                  count={props.layerStats.markers}
                  swatch={<span className="inline-block w-4 h-4 rounded-full border-2 border-burgundy-600 bg-white" />}
                />
                <LayerToggle
                  checked={props.showShapes}
                  onChange={props.onToggleShapes}
                  label="Geometrien"
                  count={props.layerStats.shapes}
                  swatch={<span className="inline-block w-4 h-4 rounded-sm border border-verdigris-500 bg-verdigris-100" />}
                />
                <LayerToggle
                  checked={props.showMovements}
                  onChange={props.onToggleMovements}
                  label="Historische Achsen"
                  count={props.layerStats.movements}
                  swatch={<span className="inline-block w-5 h-1.5 rounded-full bg-burgundy-600" />}
                />
              </div>

              {props.themeOptions.length > 0 && (
                <FilterSection
                  title="Themen"
                  open={themesOpen}
                  onToggle={() => setThemesOpen(v => !v)}
                  action={(
                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); props.onThemeFilterChange([]); }}
                      className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                        activeThemeCount === 0
                          ? 'bg-ink-800 text-white'
                          : 'text-ink-400 hover:bg-ink-50 hover:text-ink-700'
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
                          onChange={() => toggleTheme(option.id)}
                        />
                      ))}
                    </div>
                  )}
                  {conceptThemes.length > 0 && (
                    <>
                      <p className="pt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-300">
                        Modulbegriffe
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {conceptThemes.map(option => (
                          <ThemeToggle
                            key={option.id}
                            option={option}
                            active={props.themeFilter.includes(option.id)}
                            onChange={() => toggleTheme(option.id)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-ink-400">
                    <span>{activeThemeCount === 0 ? 'alle Themen' : `${activeThemeCount} aktiv`}</span>
                    {activeThemeCount > 0 && (
                      <button
                        type="button"
                        onClick={() => props.onThemeFilterChange([])}
                        className="font-medium hover:text-ink-700"
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
                onToggle={() => setTimeOpen(v => !v)}
                action={(timeFilter.from || timeFilter.to) ? (
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); setTimeFilter({}); }}
                    className="text-[10px] font-medium text-ink-400 hover:text-ink-700"
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
                onToggle={() => setLegendOpen(v => !v)}
              >
                <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-500">
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

              <p className="pt-3 text-[11px] leading-relaxed text-ink-400">
                Sichtbar: {objectCount} Kartenobjekte nach Thema, Zeit und Suche.
              </p>
            </div>
          )}
        </div>
      </div>
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
          className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
          aria-expanded={open}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{title}</span>
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
      className={`rounded border px-2 py-1.5 text-[11px] font-medium transition-colors ${
        active
          ? 'border-ink-800 bg-ink-800 text-white'
          : 'border-ink-100 bg-white text-ink-600 hover:bg-ink-50'
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
      className={`flex min-h-[2rem] cursor-pointer items-center gap-2 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors ${
        active ? 'shadow-sm' : 'bg-white text-ink-600 hover:bg-ink-50'
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
    <label className="flex items-center justify-between gap-3 cursor-pointer hover:bg-ink-50 -mx-1 px-1 py-0.5 rounded">
      <span className="flex items-center gap-2 min-w-0">
        {swatch}
        <span className="text-ink-700 truncate">{label}</span>
        {count > 0 && <span className="text-[10px] text-ink-400">{count}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="rounded border-ink-200 accent-burgundy-500"
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
