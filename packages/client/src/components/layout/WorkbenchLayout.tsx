import { useCallback, useState, type CSSProperties, type ReactNode } from 'react';
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
  const stageStyle = {
    '--chronotop-map-tools-left': sidePanelVisible
      ? 'calc(1.5rem + min(25rem, calc(100% - 1.5rem)))'
      : '7rem',
    '--chronotop-map-tools-top': '0.75rem',
  } as CSSProperties;

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-ink-900">
      <div className="absolute inset-0" style={stageStyle}>
        {map}
      </div>

      {stageActions && (
        <div className="pointer-events-none absolute left-3 top-3 z-40 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2">
          {stageActions}
        </div>
      )}

      {sidePanel && (
        <aside
          data-chronotop-filter-sheet
          className={`absolute left-3 top-16 z-30 flex w-[min(25rem,calc(100%-1.5rem))] origin-left flex-col overflow-hidden rounded-md border border-white/50 bg-parchment-50/58 shadow-2xl backdrop-blur-md transition-[opacity,transform] duration-200 ease-out ${
            sidePanelVisible ? 'translate-x-0 opacity-100' : 'pointer-events-none -translate-x-[calc(100%+1.5rem)] opacity-0'
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
