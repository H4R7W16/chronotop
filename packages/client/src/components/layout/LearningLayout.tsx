import { useEffect, useState } from 'react';
import { useModuleData } from '../../hooks/useModuleData.js';
import { useUrlSync } from '../../hooks/useUrlSync.js';
import { MapView } from '../map/MapView.js';
import { TimelineView } from '../timeline/TimelineView.js';
import { DetailPanel } from '../detail/DetailPanel.js';
import { TaskPanel } from '../tasks/TaskPanel.js';
import { WorkbenchLayout, type WorkbenchPresetId } from './WorkbenchLayout.js';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { useLocalized } from '../../i18n/useLocalized.js';
import { api } from '../../api/client.js';

type RightTab = 'detail' | 'tasks';
type DetailTab = 'overview' | 'context' | 'sources' | 'notes';

export function LearningLayout() {
  useModuleData();
  useUrlSync();
  const loc = useLocalized();
  const selectedEventId = useChronotopStore(s => s.selectedEventId);
  const events         = useChronotopStore(s => s.events);
  const fullscreen      = useChronotopStore(s => s.fullscreen);
  const moduleId        = useChronotopStore(s => s.currentModuleId);
  const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : null;

  const [rightTab, setRightTab] = useState<RightTab>('detail');
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [taskCount, setTaskCount] = useState(0);
  const [layoutPreset, setLayoutPreset] = useState<WorkbenchPresetId>('tasks');

  useEffect(() => {
    if (!moduleId) return;
    api.getTasks(moduleId)
      .then(tasks => setTaskCount(tasks.length))
      .catch(() => setTaskCount(0));
  }, [moduleId]);

  useEffect(() => {
    if (selectedEventId) {
      setRightTab('detail');
      setDetailTab('overview');
      setLayoutPreset(current => current === 'tasks' ? 'analysis' : current);
    }
  }, [selectedEventId]);

  const showTabs = taskCount > 0;

  useEffect(() => {
    if (!selectedEventId && taskCount > 0) {
      setRightTab('tasks');
      setLayoutPreset('tasks');
    }
  }, [selectedEventId, taskCount]);

  const showRightPanel = showTabs || !!selectedEventId;

  const peekLabel = selectedEvent
    ? loc(selectedEvent.title)
    : showTabs
      ? `${taskCount} Aufgaben`
      : 'Details';

  // Trigger zwingt das Bottom-Sheet auf Tablet zum Aufklappen bei neuer Auswahl
  // oder beim Wechsel in den Aufgaben-Modus.
  const inspectorTriggerKey = selectedEventId ?? (showTabs ? `tasks:${moduleId ?? ''}` : null);

  const handlePresetSelect = (preset: WorkbenchPresetId) => {
    setLayoutPreset(preset);
    if (preset === 'tasks' && showTabs) {
      setRightTab('tasks');
    } else if (preset !== 'map') {
      setRightTab('detail');
      setDetailTab(preset === 'sources' ? 'sources' : 'overview');
    }
  };

  return (
    <WorkbenchLayout
      storageKey={`learn:${moduleId ?? 'module'}`}
      map={<MapView />}
      timeline={<TimelineView />}
      inspectorVisible={!fullscreen && showRightPanel}
      inspectorLabel="Details, Quellen und Aufgaben"
      inspectorTriggerKey={inspectorTriggerKey}
      inspectorPeekLabel={peekLabel}
      activePreset={layoutPreset}
      onPresetSelect={handlePresetSelect}
      toolbarMeta={selectedEventId ? 'Ereignis ausgewählt' : showTabs ? 'Aufgabenmodus' : undefined}
      inspector={(
        <div className="h-full min-h-0 flex flex-col overflow-hidden">
          {showTabs && (
            <div className="shrink-0 flex border-b border-parchment-200 bg-parchment-50 text-sm">
              <button
                onClick={() => { setRightTab('detail'); setDetailTab('overview'); setLayoutPreset('analysis'); }}
                className={`flex-1 px-3 py-2 font-medium border-b-2 transition-colors ${
                  rightTab === 'detail'
                    ? 'text-burgundy-600 border-burgundy-500 bg-white'
                    : 'text-ink-500 border-transparent hover:text-ink-700 hover:bg-white/50'
                }`}
              >
                {selectedEventId ? 'Details' : 'Detail'}
              </button>
              <button
                onClick={() => { setRightTab('tasks'); setLayoutPreset('tasks'); }}
                className={`flex-1 px-3 py-2 font-medium border-b-2 transition-colors ${
                  rightTab === 'tasks'
                    ? 'text-burgundy-600 border-burgundy-500 bg-white'
                    : 'text-ink-500 border-transparent hover:text-ink-700 hover:bg-white/50'
                }`}
              >
                Aufgaben
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                  rightTab === 'tasks'
                    ? 'bg-burgundy-100 text-burgundy-600'
                    : 'bg-parchment-200 text-ink-500'
                }`}>
                  {taskCount}
                </span>
              </button>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-hidden">
            {rightTab === 'detail' || !showTabs
              ? <DetailPanel preferredTab={detailTab} />
              : <TaskPanel />
            }
          </div>
        </div>
      )}
    />
  );
}
