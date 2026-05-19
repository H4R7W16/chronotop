import { useEffect, useState, type ReactNode } from 'react';
import { useModuleData } from '../../hooks/useModuleData.js';
import { useUrlSync } from '../../hooks/useUrlSync.js';
import { MapView } from '../map/MapView.js';
import { TimelineView } from '../timeline/TimelineView.js';
import { DetailPanel } from '../detail/DetailPanel.js';
import { TaskPanel } from '../tasks/TaskPanel.js';
import { WorkbenchLayout } from './WorkbenchLayout.js';
import { ModulePanel } from './ModulePanel.js';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { useLocalized } from '../../i18n/useLocalized.js';
import type { TimelineDockMode } from './TimelineDock.js';

type ContextTab = 'details' | 'sources' | 'tasks';

export function LearningLayout() {
  useModuleData();
  useUrlSync();
  const loc = useLocalized();
  const selectedEventId = useChronotopStore(s => s.selectedEventId);
  const selectionRevision = useChronotopStore(s => s.selectionRevision);
  const selectEvent = useChronotopStore(s => s.selectEvent);
  const events = useChronotopStore(s => s.events);
  const tasks = useChronotopStore(s => s.tasks);
  const searchQuery = useChronotopStore(s => s.searchQuery);
  const timeFilter = useChronotopStore(s => s.timeFilter);
  const themeFilter = useChronotopStore(s => s.themeFilter);
  const fullscreen = useChronotopStore(s => s.fullscreen);
  const moduleId = useChronotopStore(s => s.currentModuleId);
  const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : null;
  const taskCount = tasks.length;
  const activeFilterCount = themeFilter.length + (timeFilter.from || timeFilter.to ? 1 : 0) + (searchQuery.trim() ? 1 : 0);

  const [contextOpen, setContextOpen] = useState(false);
  const [contextTab, setContextTab] = useState<ContextTab>('details');
  const [filterOpen, setFilterOpen] = useState(false);
  const [timelineContentHeight, setTimelineContentHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!selectedEventId) return;
    setContextTab('details');
    setContextOpen(true);
  }, [selectedEventId, selectionRevision]);

  const closeContext = () => {
    if (contextTab === 'tasks') {
      setContextOpen(false);
      return;
    }
    selectEvent(null, { origin: 'detail' });
    setContextOpen(false);
  };

  const showContext = !fullscreen && contextOpen && (contextTab === 'tasks' || !!selectedEventId);
  const inspectorLabel = contextTab === 'tasks'
    ? 'Aufgaben'
    : contextTab === 'sources'
      ? 'Quellen'
      : selectedEvent
        ? loc(selectedEvent.title)
        : 'Details';

  return (
    <WorkbenchLayout
      storageKey={`learn:${moduleId ?? 'module'}`}
      map={<MapView />}
      timeline={(mode: TimelineDockMode) => (
        <TimelineView
          density={mode === 'mini' ? 'mini' : 'full'}
          onContentHeightChange={setTimelineContentHeight}
        />
      )}
      timelineContentHeight={timelineContentHeight}
      inspectorVisible={showContext && !filterOpen}
      inspectorLabel={inspectorLabel}
      onInspectorClose={closeContext}
      stageActions={(
        <button
          type="button"
          onClick={() => setFilterOpen(current => !current)}
          aria-expanded={filterOpen}
          className={`pointer-events-auto inline-flex min-h-[42px] items-center gap-2 rounded-md border px-3 text-sm font-semibold shadow-xl backdrop-blur-md transition-colors ${
            filterOpen || activeFilterCount > 0
              ? 'border-burgundy-200 bg-burgundy-600 text-white'
              : 'border-white/60 bg-white/82 text-ink-700 hover:bg-white'
          }`}
        >
          <span
            className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${
              filterOpen || activeFilterCount > 0
                ? 'border-white/35 bg-white/14'
                : 'border-ink-200 bg-white/56'
            }`}
            aria-hidden="true"
          >
            <span className="block h-2.5 w-3.5 border-y-2 border-current" />
          </span>
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              filterOpen ? 'bg-white/22 text-white' : 'bg-burgundy-600 text-white'
            }`}>
              {activeFilterCount}
            </span>
          )}
        </button>
      )}
      sidePanelVisible={filterOpen}
      sidePanelLabel="Filter und Kartensteuerung"
      sidePanel={<ModulePanel embedded onDone={() => setFilterOpen(false)} />}
      inspector={(
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
          <nav className="flex shrink-0 border-b border-parchment-200 bg-parchment-50 px-2" aria-label="Kontextbereich">
            <ContextTabButton
              active={contextTab === 'details'}
              disabled={!selectedEventId}
              onClick={() => selectedEventId && setContextTab('details')}
            >
              Details
            </ContextTabButton>
            <ContextTabButton
              active={contextTab === 'sources'}
              disabled={!selectedEventId}
              onClick={() => selectedEventId && setContextTab('sources')}
            >
              Quellen
            </ContextTabButton>
            <ContextTabButton
              active={contextTab === 'tasks'}
              onClick={() => setContextTab('tasks')}
            >
              Aufgaben
              {taskCount > 0 && (
                <span className="ml-1 rounded-full bg-parchment-200 px-1.5 py-0.5 text-[10px] text-ink-500">
                  {taskCount}
                </span>
              )}
            </ContextTabButton>
          </nav>

          <div className="min-h-0 flex-1 overflow-hidden">
            {contextTab === 'tasks'
              ? <TaskPanel />
              : <DetailPanel preferredTab={contextTab === 'sources' ? 'sources' : 'overview'} />
            }
          </div>
        </div>
      )}
    />
  );
}

function ContextTabButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[44px] min-w-0 flex-1 border-b-2 px-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'border-burgundy-600 bg-white text-burgundy-700'
          : 'border-transparent text-ink-500 hover:bg-white/70 hover:text-ink-800'
      }`}
    >
      <span className="truncate">{children}</span>
    </button>
  );
}
