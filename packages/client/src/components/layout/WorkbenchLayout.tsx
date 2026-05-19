import { useCallback, useState, type ReactNode } from 'react';
import { ContextSheet } from './ContextSheet.js';
import { TimelineDock, type TimelineDockMode } from './TimelineDock.js';

interface WorkbenchLayoutProps {
  storageKey: string;
  map: ReactNode;
  timeline: ReactNode | ((mode: TimelineDockMode) => ReactNode);
  inspector?: ReactNode;
  inspectorVisible: boolean;
  inspectorLabel: string;
  onInspectorClose?: () => void;
  stageActions?: ReactNode;
}

export function WorkbenchLayout({
  storageKey,
  map,
  timeline,
  inspector,
  inspectorVisible,
  inspectorLabel,
  onInspectorClose,
  stageActions,
}: WorkbenchLayoutProps) {
  const [timelineHeight, setTimelineHeight] = useState(64);
  const renderTimeline = useCallback((mode: TimelineDockMode) => (
    typeof timeline === 'function' ? timeline(mode) : timeline
  ), [timeline]);

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-ink-900">
      <div className="absolute inset-0">
        {map}
      </div>

      {stageActions && (
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2">
          {stageActions}
        </div>
      )}

      {inspectorVisible && inspector && (
        <ContextSheet
          title={inspectorLabel}
          timelineHeight={timelineHeight}
          onClose={onInspectorClose ?? (() => undefined)}
        >
          {inspector}
        </ContextSheet>
      )}

      <TimelineDock
        storageKey={`${storageKey}:timeline-dock`}
        onHeightChange={setTimelineHeight}
      >
        {renderTimeline}
      </TimelineDock>
    </div>
  );
}
