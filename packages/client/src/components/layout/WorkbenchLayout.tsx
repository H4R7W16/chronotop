import { type CSSProperties, type ReactNode } from 'react';
import { usePersistentPanelSize } from '../../hooks/usePersistentPanelSize.js';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';

export type WorkbenchPresetId = 'map' | 'analysis' | 'sources' | 'tasks';

interface WorkbenchPreset {
  id: WorkbenchPresetId;
  label: string;
  inspectorWidth: number;
  timelineHeight: number;
}

const PRESETS: WorkbenchPreset[] = [
  { id: 'map', label: 'Karte', inspectorWidth: 360, timelineHeight: 150 },
  { id: 'analysis', label: 'Analyse', inspectorWidth: 520, timelineHeight: 220 },
  { id: 'sources', label: 'Quellen', inspectorWidth: 640, timelineHeight: 180 },
  { id: 'tasks', label: 'Aufgaben', inspectorWidth: 520, timelineHeight: 260 },
];

interface WorkbenchLayoutProps {
  storageKey: string;
  map: ReactNode;
  timeline: ReactNode;
  inspector?: ReactNode;
  inspectorVisible: boolean;
  inspectorLabel: string;
  activePreset?: WorkbenchPresetId;
  onPresetSelect?: (preset: WorkbenchPresetId) => void;
  toolbarMeta?: ReactNode;
  inspectorMin?: number;
  inspectorMax?: number;
  timelineMin?: number;
  timelineMax?: number;
}

export function WorkbenchLayout({
  storageKey,
  map,
  timeline,
  inspector,
  inspectorVisible,
  inspectorLabel,
  activePreset = 'analysis',
  onPresetSelect,
  toolbarMeta,
  inspectorMin = 340,
  inspectorMax = 720,
  timelineMin = 128,
  timelineMax = 340,
}: WorkbenchLayoutProps) {
  const activePresetConfig = PRESETS.find(preset => preset.id === activePreset) ?? PRESETS[1];
  const inspectorSize = usePersistentPanelSize(`${storageKey}:inspector`, activePresetConfig.inspectorWidth, inspectorMin, inspectorMax);
  const timelineSize = usePersistentPanelSize(`${storageKey}:timeline`, activePresetConfig.timelineHeight, timelineMin, timelineMax);
  const isTabletStacked = useMediaQuery('(min-width: 640px) and (max-width: 1023px)');
  const isTabletLandscape = useMediaQuery('(min-width: 1024px) and (max-width: 1180px) and (max-height: 900px)');
  const tabletTimelineFloor =
    activePreset === 'map' ? 200
    : activePreset === 'sources' ? 240
    : 300;
  const effectiveTimelineHeight = isTabletStacked || isTabletLandscape
    ? Math.min(timelineMax, Math.max(timelineSize.size, tabletTimelineFloor))
    : timelineSize.size;

  function applyPreset(preset: WorkbenchPreset) {
    inspectorSize.setSize(preset.inspectorWidth);
    timelineSize.setSize(preset.timelineHeight);
    onPresetSelect?.(preset.id);
  }

  return (
    <div className="h-full min-h-0 flex flex-col bg-white">
      <div className="shrink-0 border-b border-parchment-200 bg-parchment-50/95 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-serif italic text-ink-500">Arbeitsfläche</span>
          {toolbarMeta && <span className="text-ink-400 truncate">{toolbarMeta}</span>}
        </div>
        <div className="flex items-center gap-1 rounded-md border border-parchment-300 bg-white p-0.5" aria-label="Layout-Presets">
          {PRESETS.map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                activePreset === preset.id
                  ? 'bg-burgundy-600 text-white'
                  : 'text-ink-500 hover:bg-parchment-100 hover:text-ink-800'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <div className="flex-1 min-w-0 min-h-[18rem] lg:min-h-0 relative">
          {map}
        </div>

        {inspectorVisible && inspector && (
          <>
            <button
              type="button"
              aria-label="Detailbereich verbreitern oder verkleinern"
              onPointerDown={event => inspectorSize.beginDrag(event, 'x', -1)}
              className="hidden lg:block w-1.5 shrink-0 cursor-col-resize border-x border-parchment-200 bg-parchment-100 hover:bg-burgundy-100 focus:outline-none focus:ring-2 focus:ring-burgundy-300"
              title="Detailbereich ziehen"
            />
            <aside
              className="w-full min-w-0 lg:w-[var(--inspector-width)] lg:min-w-[var(--inspector-min)] lg:max-w-[min(46vw,var(--inspector-max))] shrink-0 h-[34vh] sm:h-[27vh] lg:h-auto min-h-0 border-t lg:border-t-0 lg:border-l border-parchment-300 bg-white flex flex-col"
              aria-label={inspectorLabel}
              style={{
                '--inspector-width': `${inspectorSize.size}px`,
                '--inspector-min': `${inspectorMin}px`,
                '--inspector-max': `${inspectorMax}px`,
              } as CSSProperties}
            >
              {inspector}
            </aside>
          </>
        )}
      </div>

      <button
        type="button"
        aria-label="Zeitleiste höher oder niedriger ziehen"
        onPointerDown={event => timelineSize.beginDrag(event, 'y', -1)}
        className="h-1.5 shrink-0 cursor-row-resize border-y border-parchment-200 bg-parchment-100 hover:bg-burgundy-100 focus:outline-none focus:ring-2 focus:ring-burgundy-300"
        title="Zeitleiste ziehen"
      />
      <div
        className="shrink-0 min-h-[7rem] max-h-[22rem] border-t border-parchment-300 bg-white"
        style={{ height: effectiveTimelineHeight }}
      >
        {timeline}
      </div>
    </div>
  );
}
