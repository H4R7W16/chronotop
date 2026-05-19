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
  sidePanel?: ReactNode;
  sidePanelVisible?: boolean;
  sidePanelLabel?: string;
  timelineContentHeight?: number;
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
  sidePanel,
  sidePanelVisible = false,
  sidePanelLabel = 'Filter',
  timelineContentHeight,
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
        <div className="pointer-events-none absolute right-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center justify-end gap-2">
          {stageActions}
        </div>
      )}

      {sidePanel && (
        <aside
          data-chronotop-filter-sheet
          className={`absolute left-3 right-3 z-30 flex max-h-[min(62vh,38rem)] origin-right flex-col overflow-hidden rounded-md border border-white/45 bg-white/38 shadow-2xl backdrop-blur-[3px] transition-[opacity,transform] duration-200 ease-out lg:left-auto lg:right-4 lg:top-4 lg:w-[25rem] lg:max-h-none ${
            sidePanelVisible ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-[calc(100%+1.5rem)] opacity-0'
          }`}
          style={{
            bottom: `calc(${timelineHeight}px + 0.75rem)`,
          }}
          aria-label={sidePanelLabel}
          aria-hidden={!sidePanelVisible}
        >
          {sidePanel}
        </aside>
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
        contentMaxHeight={timelineContentHeight}
      >
        {renderTimeline}
      </TimelineDock>
    </div>
  );
}
