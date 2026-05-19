import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import {
  dateToYear,
  eventMatchesSearch,
  getEventDate,
  getEventEndDate,
  isEventInTimeRange,
  sortEventsByDate,
} from '../../lib/timelineUtils.js';
import { analysisFocusSummary, eventMatchesAnalysisFocus } from '../../lib/analysisFocus.js';
import { getTimelineConfig } from '../../lib/timelineConfig.js';
import { buildTimelineScale, generateTimelineTicks, type TimelineScale } from '../../lib/timelineScale.js';
import {
  buildThemeOptions,
  certaintyLabel,
  dominantThemeOption,
  eventMatchesTheme,
  themePalette,
  type ThemeFilterId,
  type ThemeOption,
  type VisualPalette,
} from '../../lib/themeFilters.js';
import { useLocalized } from '../../i18n/useLocalized.js';
import type { CertaintyLevel, Event as ChronotopEvent } from '@chronotop/shared';

const PHASE_HEIGHT = 28;
const AXIS_HEIGHT = 36;
const TOP_PADDING = PHASE_HEIGHT + AXIS_HEIGHT;
const LANE_HEIGHT = 30;
const LANE_GAP = 8;
const MINIMAP_HEIGHT = 30;
const MIN_SPAN_WIDTH = 22;
const INSTANT_HIT_WIDTH = 32;
const EVENT_GAP = 10;
const PAN_DRAG_THRESHOLD_PX = 3;
const MAX_AUTO_ZOOM = 14;
const MAX_MANUAL_ZOOM = 20;

type FilterMode = 'all' | 'point' | 'range';
type TimelinePointerMode = 'pan' | 'range';

interface TimelinePointerState {
  pointerId: number;
  mode: TimelinePointerMode;
  startX: number;
  startYear: number;
  startPan: number;
}

interface TimelineItem {
  event: ChronotopEvent;
  startYear: number;
  endYear: number;
  lane: number;
  isInstant: boolean;
  baseX: number;
  baseX2: number;
  visualStart: number;
  visualEnd: number;
}

interface TimelineViewProps {
  density?: 'mini' | 'full';
}

export function TimelineView({ density = 'full' }: TimelineViewProps = {}) {
  const { t, i18n } = useTranslation();
  const loc = useLocalized();
  const currentModule = useChronotopStore(s => s.currentModule);
  const events = useChronotopStore(s => s.events);
  const places = useChronotopStore(s => s.places);
  const concepts = useChronotopStore(s => s.concepts);
  const movements = useChronotopStore(s => s.movements);
  const selectedEventId = useChronotopStore(s => s.selectedEventId);
  const selectionOrigin = useChronotopStore(s => s.selectionOrigin);
  const hoveredEventId = useChronotopStore(s => s.hoveredEventId);
  const analysisFocus = useChronotopStore(s => s.analysisFocus);
  const timeFilter = useChronotopStore(s => s.timeFilter);
  const themeFilter = useChronotopStore(s => s.themeFilter);
  const searchQuery = useChronotopStore(s => s.searchQuery);
  const selectEvent = useChronotopStore(s => s.selectEvent);
  const hoverEvent = useChronotopStore(s => s.hoverEvent);
  const setAnalysisFocus = useChronotopStore(s => s.setAnalysisFocus);

  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [tooltipState, setTooltipState] = useState<{ event: ChronotopEvent; x: number; y: number } | null>(null);
  const [cursorYear, setCursorYear] = useState<number | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [pointYear, setPointYear] = useState<number | null>(null);
  const [rangeYears, setRangeYears] = useState<{ from: number; to: number } | null>(null);
  const rangePreviewRef = useRef<{ from: number; to: number } | null>(null);
  const [isRangeDragging, setIsRangeDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pointerStateRef = useRef<TimelinePointerState | null>(null);

  const updateRangeYears = useCallback((next: { from: number; to: number } | null) => {
    rangePreviewRef.current = next;
    setRangeYears(next);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setWidth(Math.max(320, entry.contentRect.width));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setZoom(1);
    setPanX(0);
    setFilterMode('all');
    setPointYear(null);
    updateRangeYears(null);
  }, [currentModule?.id, updateRangeYears]);

  useEffect(() => {
    setPanX(current => clampPan(current, width, zoom));
  }, [width, zoom]);

  const lang = i18n.language;
  const themeOptions = useMemo(
    () => buildThemeOptions(events, places, movements, concepts, lang),
    [events, places, movements, concepts, lang],
  );

  const datedEvents = useMemo(
    () => sortEventsByDate(events).filter(event => !!getEventDate(event)),
    [events],
  );

  const moduleExtent = useMemo(() => computeEventExtent(datedEvents), [datedEvents]);
  const timelineConfig = useMemo(
    () => getTimelineConfig(currentModule?.id, moduleExtent.minYear, moduleExtent.maxYear),
    [currentModule?.id, moduleExtent.maxYear, moduleExtent.minYear],
  );

  const scale = useMemo(() => {
    const configured = timelineConfig.initialRange;
    const rawMin = configured ? configured.from : moduleExtent.minYear;
    const rawMax = configured ? configured.to : moduleExtent.maxYear;
    const minYear = Math.floor(Math.min(rawMin, moduleExtent.minYear));
    const maxYear = Math.ceil(Math.max(rawMax, moduleExtent.maxYear));
    return buildTimelineScale({
      minYear,
      maxYear,
      mode: timelineConfig.scaleMode,
      phases: timelineConfig.phases,
    });
  }, [moduleExtent.maxYear, moduleExtent.minYear, timelineConfig]);

  const candidateEvents = useMemo(
    () => datedEvents.filter(event =>
      eventMatchesSearch(event, searchQuery, lang)
      && eventMatchesTheme(event, themeFilter, lang)
    ),
    [datedEvents, searchQuery, themeFilter, lang],
  );

  const visibleEvents = useMemo(
    () => candidateEvents.filter(event => isEventInTimeRange(event, timeFilter.from, timeFilter.to)),
    [candidateEvents, timeFilter.from, timeFilter.to],
  );

  const visibleEventIds = useMemo(() => new Set(visibleEvents.map(event => event.id)), [visibleEvents]);
  const focusedEventIds = useMemo(() => {
    if (!analysisFocus) return new Set<string>();
    return new Set(candidateEvents.filter(event => eventMatchesAnalysisFocus(event, analysisFocus)).map(event => event.id));
  }, [analysisFocus, candidateEvents]);

  const orderIndex = useMemo(() => {
    const map = new Map<string, number>();
    visibleEvents
      .filter(event => event.place)
      .forEach((event, index) => map.set(event.id, index + 1));
    return map;
  }, [visibleEvents]);

  const innerWidth = width * zoom;

  const yearToX = useCallback((year: number) => {
    return scale.ratioForYear(year) * innerWidth + panX;
  }, [scale, innerWidth, panX]);

  const xToYear = useCallback((x: number) => {
    return scale.yearForRatio((x - panX) / innerWidth);
  }, [scale, innerWidth, panX]);

  const layoutItems = useMemo(
    () => layoutTimelineEvents(candidateEvents, scale, innerWidth),
    [candidateEvents, scale, innerWidth],
  );

  const selectedItem = useMemo(
    () => layoutItems.find(item => item.event.id === selectedEventId),
    [layoutItems, selectedEventId],
  );

  const centerOnYearRange = useCallback((from: number, to: number, preferredZoom?: number) => {
    const startRatio = scale.ratioForYear(Math.min(from, to));
    const endRatio = scale.ratioForYear(Math.max(from, to));
    const ratioWidth = Math.max(endRatio - startRatio, 0.018);
    const nextZoom = preferredZoom ?? Math.max(1, Math.min(MAX_AUTO_ZOOM, 0.78 / ratioWidth));
    const centerRatio = (startRatio + endRatio) / 2;
    const nextPan = width / 2 - centerRatio * width * nextZoom;
    setZoom(nextZoom);
    setPanX(clampPan(nextPan, width, nextZoom));
  }, [scale, width]);

  const centerOnEvent = useCallback((eventId: string | null) => {
    if (!eventId) return;
    const item = layoutItems.find(candidate => candidate.event.id === eventId);
    if (!item) return;
    const centerRatio = scale.ratioForYear((item.startYear + item.endYear) / 2);
    const nextPan = width / 2 - centerRatio * innerWidth;
    setPanX(clampPan(nextPan, width, zoom));
  }, [layoutItems, scale, width, innerWidth, zoom]);

  useEffect(() => {
    if (!selectedEventId) return;
    if (selectionOrigin === 'map' || selectionOrigin === 'timeline') return;
    centerOnEvent(selectedEventId);
  }, [selectedEventId, selectionOrigin, centerOnEvent]);

  const selectedStartX = selectedItem ? yearToX(selectedItem.startYear) : null;
  const selectedEndX = selectedItem ? yearToX(selectedItem.endYear) : null;
  const selectedOffscreen = selectedStartX != null && selectedEndX != null
    && (Math.max(selectedStartX, selectedEndX) < 32 || Math.min(selectedStartX, selectedEndX) > width - 32);
  const ticks = useMemo(() => generateTimelineTicks(scale, 7), [scale]);

  const totalLanes = Math.max(...layoutItems.map(item => item.lane + 1), 1);
  const trackHeight = Math.max(totalLanes * (LANE_HEIGHT + LANE_GAP), LANE_HEIGHT + LANE_GAP);
  const totalHeight = TOP_PADDING + trackHeight + 14;
  const cursorX = cursorYear != null ? yearToX(cursorYear) : null;
  const pointX = pointYear != null ? yearToX(pointYear) : null;
  const rangeFromX = rangeYears != null ? yearToX(Math.min(rangeYears.from, rangeYears.to)) : null;
  const rangeToX = rangeYears != null ? yearToX(Math.max(rangeYears.from, rangeYears.to)) : null;
  const miniViewStartX = Math.max(0, (-panX / innerWidth) * width);
  const miniViewWidth = Math.min(width / zoom, width - miniViewStartX);

  const applyRangeFilter = useCallback((from: number, to: number) => {
    const normalized = { from: Math.min(from, to), to: Math.max(from, to) };
    centerOnYearRange(normalized.from, normalized.to);
  }, [centerOnYearRange]);

  const zoomBy = useCallback((factor: number) => {
    const centerRatio = (width / 2 - panX) / innerWidth;
    const nextZoom = Math.max(1, Math.min(MAX_MANUAL_ZOOM, zoom * factor));
    const nextPan = width / 2 - centerRatio * width * nextZoom;
    setZoom(nextZoom);
    setPanX(clampPan(nextPan, width, nextZoom));
  }, [width, panX, innerWidth, zoom]);

  const zoomReset = useCallback(() => {
    setZoom(1);
    setPanX(0);
  }, []);

  const zoomToVisibleEvents = useCallback(() => {
    const extent = computeEventExtent(visibleEvents.length > 0 ? visibleEvents : candidateEvents);
    centerOnYearRange(extent.minYear, extent.maxYear);
  }, [visibleEvents, candidateEvents, centerOnYearRange]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const xLocal = event.clientX - rect.left;
    const year = xToYear(xLocal);
    setCursorYear(year);

    event.currentTarget.setPointerCapture(event.pointerId);
    pointerStateRef.current = {
      pointerId: event.pointerId,
      mode: 'pan',
      startX: event.clientX,
      startYear: year,
      startPan: panX,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const xLocal = event.clientX - rect.left;
    const year = xToYear(xLocal);
    setCursorYear(year);

    const pointerState = pointerStateRef.current;
    if (!pointerState || pointerState.pointerId !== event.pointerId) return;

    if (pointerState.mode === 'range') {
      updateRangeYears({ from: pointerState.startYear, to: year });
      return;
    }

    const dx = event.clientX - pointerState.startX;
    const hasMoved = Math.abs(dx) >= PAN_DRAG_THRESHOLD_PX;
    if (!hasMoved && !isDragging) return;
    if (hasMoved && !isDragging) setIsDragging(true);
    setPanX(clampPan(pointerState.startPan + dx, width, zoom));
  };

  const finishPointerInteraction = useCallback((event?: React.PointerEvent<HTMLDivElement>) => {
    const pointerState = pointerStateRef.current;
    if (!pointerState) {
      setIsDragging(false);
      setIsRangeDragging(false);
      return;
    }

    if (event?.currentTarget.hasPointerCapture(pointerState.pointerId)) {
      event.currentTarget.releasePointerCapture(pointerState.pointerId);
    }
    pointerStateRef.current = null;
    setIsDragging(false);

    if (pointerState.mode === 'range') {
      setIsRangeDragging(false);
      updateRangeYears(null);
    }
  }, [updateRangeYears]);

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    finishPointerInteraction(event);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    finishPointerInteraction(event);
  };

  const handlePointerLeave = () => {
    if (pointerStateRef.current) return;
    setCursorYear(null);
    setTooltipState(null);
    hoverEvent(null);
  };

  const handleWheel = (event: React.WheelEvent) => {
    const isZoomGesture = event.ctrlKey || event.metaKey;
    const horizontalDelta = event.shiftKey ? event.deltaY : event.deltaX;
    const isHorizontalPan = event.shiftKey || Math.abs(horizontalDelta) > Math.abs(event.deltaY);
    if (!isZoomGesture && !isHorizontalPan) return;

    event.preventDefault();
    if (!isZoomGesture) {
      setPanX(current => clampPan(current - horizontalDelta, width, zoom));
      return;
    }

    const nextZoom = Math.max(1, Math.min(MAX_MANUAL_ZOOM, zoom + (-event.deltaY * 0.002) * zoom));
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const ratioAtMouse = (mouseX - panX) / innerWidth;
    const nextPan = mouseX - ratioAtMouse * width * nextZoom;
    setZoom(nextZoom);
    setPanX(clampPan(nextPan, width, nextZoom));
  };

  const centerMiniMapAtRatio = useCallback((ratio: number) => {
    if (zoom <= 1) return;
    const nextPan = width / 2 - clamp(ratio, 0, 1) * innerWidth;
    setPanX(clampPan(nextPan, width, zoom));
  }, [zoom, width, innerWidth]);

  const handleMiniMapClick = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (zoom <= 1) return;
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / width;
    centerMiniMapAtRatio(ratio);
  }, [zoom, width, centerMiniMapAtRatio]);

  const panMiniMapByRatio = useCallback((delta: number) => {
    const centerRatio = (width / 2 - panX) / innerWidth;
    centerMiniMapAtRatio(centerRatio + delta);
  }, [width, panX, innerWidth, centerMiniMapAtRatio]);

  const handleMiniMapKeyDown = useCallback((event: React.KeyboardEvent<SVGSVGElement>) => {
    if (zoom <= 1) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      panMiniMapByRatio(-0.08 / zoom);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      panMiniMapByRatio(0.08 / zoom);
    } else if (event.key === 'Home') {
      event.preventDefault();
      centerMiniMapAtRatio(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      centerMiniMapAtRatio(1);
    }
  }, [zoom, panMiniMapByRatio, centerMiniMapAtRatio]);

  const cursorClass =
    filterMode === 'point' ? 'cursor-pointer'
    : filterMode === 'range' ? (isRangeDragging ? 'cursor-grabbing' : 'cursor-crosshair')
    : (isDragging ? 'cursor-grabbing' : 'cursor-grab');
  const timelineSummary = `${scale.mode === 'segmented' ? 'Phasenansicht' : `${formatYear(scale.minYear)} - ${formatYear(scale.maxYear)}`} · ${visibleEvents.length} von ${candidateEvents.length} Ereignissen`;

  const selectedEvent = selectedEventId ? events.find(event => event.id === selectedEventId) : null;
  const activeFilterLabels = [
    searchQuery.trim() ? `Suche: ${clipText(searchQuery.trim(), 18)}` : null,
    timeFilter.from || timeFilter.to ? formatTimeFilter(timeFilter) : null,
    themeFilter.length > 0 ? `${themeFilter.length} Themen` : null,
  ].filter(Boolean) as string[];

  if (events.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-parchment-50 p-4 text-sm text-ink-300">
        {t('event.noEvents')}
      </div>
    );
  }

  if (density === 'mini') {
    const miniWidth = Math.max(width, 1);
    return (
      <div ref={containerRef} className="h-full min-h-0 overflow-hidden bg-white/20 px-3 py-1">
        <div className="flex h-full min-h-0 items-center gap-3">
          <svg
            viewBox={`0 0 ${miniWidth} 18`}
            preserveAspectRatio="none"
            className="h-4 min-w-0 flex-1"
            aria-hidden="true"
          >
            <rect x={0} y={8} width={miniWidth} height={2} rx={1} fill="var(--color-ink-300)" opacity={0.45} />
            {scale.segments.map(segment => (
              <rect
                key={segment.id}
                x={segment.ratioStart * miniWidth}
                y={6}
                width={Math.max(1, (segment.ratioEnd - segment.ratioStart) * miniWidth)}
                height={6}
                rx={2}
                fill={phaseTint(segment.themeId, themeOptions)}
                opacity={0.72}
              />
            ))}
            {layoutItems.map(item => {
              const x = scale.ratioForYear(item.startYear) * miniWidth;
              const x2 = scale.ratioForYear(item.endYear) * miniWidth;
              const isSelected = item.event.id === selectedEventId;
              const isVisibleByTime = visibleEventIds.has(item.event.id);
              const option = dominantThemeOption(item.event, themeOptions, lang);
              return (
                <rect
                  key={item.event.id}
                  x={item.isInstant ? x - 1.8 : x}
                  y={isSelected ? 2 : 5}
                  width={item.isInstant ? 3.6 : Math.max(3.6, x2 - x)}
                  height={isSelected ? 14 : 8}
                  rx={1.8}
                  fill={isSelected ? 'var(--color-burgundy-600)' : option.color}
                  opacity={isSelected ? 1 : isVisibleByTime ? 0.82 : 0.22}
                />
              );
            })}
            {zoom > 1 && (
              <rect
                x={Math.max(0, (-panX / innerWidth) * miniWidth)}
                y={1}
                width={Math.max(5, Math.min(miniWidth / zoom, miniWidth))}
                height={16}
                rx={3}
                fill="none"
                stroke="var(--color-burgundy-500)"
                strokeWidth={1.5}
              />
            )}
          </svg>
          <span className="hidden max-w-[16rem] shrink-0 truncate text-[11px] font-medium text-ink-600 sm:block">
            {selectedEvent ? loc(selectedEvent.title) : timelineSummary}
          </span>
          {activeFilterLabels.length > 0 && (
            <span className="hidden shrink-0 truncate text-[11px] text-burgundy-700 md:block">
              {activeFilterLabels.join(' · ')}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col bg-white">
      <div className="shrink-0 border-b border-parchment-200 bg-parchment-50 px-3 py-2 text-xs text-ink-500">
        <div className="flex min-w-0 flex-wrap items-center gap-2 md:flex-nowrap">
          <span className="shrink-0 font-serif text-sm italic text-ink-700">Zeitleiste</span>
          {activeFilterLabels.map(label => (
            <span
              key={label}
              className="max-w-[14rem] shrink-0 truncate rounded-full border border-burgundy-200 bg-burgundy-50 px-2.5 py-1 text-[11px] font-semibold text-burgundy-700"
              title={label}
            >
              {label}
            </span>
          ))}

          {analysisFocus && (
            <button
              type="button"
              onClick={() => setAnalysisFocus(null)}
              className="min-w-0 max-w-full truncate rounded-full border border-gold-200 bg-gold-100 px-2.5 py-1 text-[11px] font-semibold text-gold-600 hover:bg-gold-200 md:max-w-[16rem] lg:max-w-[22rem]"
              title="Analysefokus entfernen"
            >
              {analysisFocusSummary(analysisFocus.kind)}: {analysisFocus.label} ×
            </button>
          )}

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <span className="hidden min-w-0 truncate text-[11px] text-ink-400 md:block">
              {timelineSummary}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              {selectedOffscreen && (
                <button
                  type="button"
                  onClick={() => centerOnEvent(selectedEventId)}
                  className="h-7 rounded border border-burgundy-200 bg-white px-2 text-[11px] font-semibold text-burgundy-700 hover:bg-burgundy-50"
                >
                  Zur Auswahl
                </button>
              )}
              <button
                type="button"
                onClick={zoomToVisibleEvents}
                className="h-7 rounded border border-parchment-300 bg-white px-2 text-[11px] font-medium text-ink-600 hover:bg-parchment-100"
              >
                Treffer
              </button>
              <button type="button" onClick={() => zoomBy(1 / 1.4)} aria-label="Verkleinern" className="flex h-7 w-7 items-center justify-center rounded text-sm font-bold text-ink-600 hover:bg-parchment-200">−</button>
              <button type="button" onClick={zoomReset} aria-label="Ansicht zurücksetzen" className="h-7 rounded px-2 text-[11px] font-semibold text-ink-500 hover:bg-parchment-200">
                {Math.round(zoom * 100)}%
              </button>
              <button type="button" onClick={() => zoomBy(1.4)} aria-label="Vergrößern" className="flex h-7 w-7 items-center justify-center rounded text-sm font-bold text-ink-600 hover:bg-parchment-200">+</button>
            </div>
          </div>
        </div>

      </div>

      <div className="shrink-0 border-b border-parchment-200 bg-parchment-50/80" style={{ height: MINIMAP_HEIGHT }}>
        <svg
          width={width}
          height={MINIMAP_HEIGHT}
          style={{ display: 'block', cursor: zoom > 1 ? 'pointer' : 'default' }}
          onClick={handleMiniMapClick}
          onKeyDown={handleMiniMapKeyDown}
          role="slider"
          tabIndex={zoom > 1 ? 0 : -1}
          aria-label="Zeitleisten-Übersicht: sichtbaren Ausschnitt verschieben"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(clamp((width / 2 - panX) / innerWidth, 0, 1) * 100)}
          aria-disabled={zoom <= 1}
        >
          <rect x={0} y={0} width={width} height={MINIMAP_HEIGHT} fill="transparent" />
          {scale.segments.map(segment => (
            <rect
              key={segment.id}
              x={segment.ratioStart * width}
              y={0}
              width={Math.max(1, (segment.ratioEnd - segment.ratioStart) * width)}
              height={MINIMAP_HEIGHT}
              fill={phaseTint(segment.themeId, themeOptions)}
              opacity={0.38}
            />
          ))}
          {layoutItems.map(item => {
            const option = dominantThemeOption(item.event, themeOptions, lang);
            const x = scale.ratioForYear(item.startYear) * width;
            const x2 = scale.ratioForYear(item.endYear) * width;
            const isSelected = item.event.id === selectedEventId;
            const isFocused = focusedEventIds.has(item.event.id);
            const isVisibleByTime = visibleEventIds.has(item.event.id);
            const w = item.isInstant ? 3.5 : Math.max(3.5, x2 - x);
            return (
              <rect
                key={item.event.id}
                x={item.isInstant ? x - w / 2 : x}
                y={5}
                width={w}
                height={MINIMAP_HEIGHT - 10}
                rx={1.5}
                fill={isSelected ? 'var(--color-burgundy-600)' : isFocused ? '#b46c1f' : option.color}
                opacity={isSelected || isFocused ? 1 : isVisibleByTime ? (analysisFocus ? 0.26 : 0.82) : 0.18}
              />
            );
          })}
          {zoom > 1 && (
            <rect
              x={miniViewStartX}
              y={1.5}
              width={Math.max(miniViewWidth, 5)}
              height={MINIMAP_HEIGHT - 3}
              rx={3}
              fill="var(--color-burgundy-500)"
              fillOpacity={0.12}
              stroke="var(--color-burgundy-500)"
              strokeWidth={1.5}
              strokeOpacity={0.72}
            />
          )}
        </svg>
      </div>

      <div
        ref={containerRef}
        className={`relative min-h-0 flex-1 select-none overflow-y-auto overflow-x-hidden ${cursorClass}`}
        style={{ touchAction: filterMode === 'all' ? 'pan-y' : 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
      >
        <svg width={width} height={Math.max(totalHeight, 1)} style={{ display: 'block' }}>
          <rect x={0} y={0} width={width} height={totalHeight} fill="#fffdf8" />

          {scale.segments.map(segment => {
            const x = segment.ratioStart * innerWidth + panX;
            const w = (segment.ratioEnd - segment.ratioStart) * innerWidth;
            if (x + w < -40 || x > width + 40) return null;
            return (
              <g
                key={segment.id}
                onPointerDown={event => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  applyRangeFilter(segment.startYear, segment.endYear);
                }}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={x}
                  y={0}
                  width={Math.max(w, 1)}
                  height={PHASE_HEIGHT}
                  fill={phaseTint(segment.themeId, themeOptions)}
                  opacity={0.78}
                  onClick={(event) => {
                    event.stopPropagation();
                    applyRangeFilter(segment.startYear, segment.endYear);
                  }}
                  onPointerDown={event => event.stopPropagation()}
                />
                {w > 76 && (
                  <text
                    x={x + Math.min(12, Math.max(7, w * 0.05))}
                    y={18}
                    fill="var(--color-ink-600)"
                    style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-sans)' }}
                  >
                    {clipText(segment.label, Math.floor((w - 18) / 6.5))}
                  </text>
                )}
                {scale.mode === 'segmented' && segment.ratioStart > 0 && (
                  <g opacity={0.65}>
                    <line x1={x} y1={3} x2={x} y2={PHASE_HEIGHT - 3} stroke="var(--color-ink-300)" strokeWidth={1} strokeDasharray="2,3" />
                    <path d={`M ${x - 4} 6 l 3 4 l -3 4 M ${x + 4} 6 l -3 4 l 3 4`} fill="none" stroke="var(--color-ink-300)" strokeWidth={1.1} />
                  </g>
                )}
              </g>
            );
          })}

          <rect x={0} y={PHASE_HEIGHT} width={width} height={AXIS_HEIGHT} fill="var(--color-parchment-50)" />
          <line x1={0} y1={TOP_PADDING - 2} x2={width} y2={TOP_PADDING - 2} stroke="var(--color-ink-300)" strokeWidth={1} />

          {ticks.map(tick => {
            const x = yearToX(tick.year);
            if (x < -60 || x > width + 60) return null;
            const labelX = clamp(x, 24, width - 24);
            const labelAnchor = x < 24 ? 'start' : x > width - 24 ? 'end' : 'middle';
            return (
              <g key={`${tick.year}-${tick.major ? 'M' : 'm'}`}>
                <line
                  x1={x}
                  y1={tick.major ? PHASE_HEIGHT + 8 : TOP_PADDING - 6}
                  x2={x}
                  y2={TOP_PADDING + (tick.major ? trackHeight + 6 : 3)}
                  stroke={tick.major ? 'var(--color-ink-400)' : 'var(--color-parchment-300)'}
                  strokeWidth={tick.major ? 1.1 : 0.8}
                  strokeDasharray={tick.major ? '2,5' : undefined}
                  opacity={tick.major ? 0.55 : 0.65}
                />
                {tick.major && (
                  <text
                    x={labelX}
                    y={PHASE_HEIGHT + 22}
                    textAnchor={labelAnchor}
                    fill="var(--color-ink-600)"
                    style={{ fontSize: 11, fontFamily: 'var(--font-sans)', fontWeight: 700 }}
                  >
                    {formatYear(tick.year)}
                  </text>
                )}
              </g>
            );
          })}

          {rangeFromX != null && rangeToX != null && rangeFromX !== rangeToX && (
            <rect
              x={Math.min(rangeFromX, rangeToX)}
              y={TOP_PADDING}
              width={Math.abs(rangeToX - rangeFromX)}
              height={trackHeight + 7}
              fill="var(--color-burgundy-200)"
              opacity={0.28}
            />
          )}

          {pointX != null && pointX >= 0 && pointX <= width && (
            <TimelineCursor x={pointX} top={PHASE_HEIGHT + 3} bottom={TOP_PADDING + trackHeight + 5} label={formatYear(pointYear!)} maxX={width} />
          )}

          {cursorX != null && cursorX >= 0 && cursorX <= width && filterMode !== 'point' && !isDragging && (
            <g pointerEvents="none" opacity={0.7}>
              <line x1={cursorX} y1={TOP_PADDING} x2={cursorX} y2={TOP_PADDING + trackHeight + 6} stroke="var(--color-burgundy-400)" strokeWidth={1} strokeDasharray="3,4" />
              <rect x={Math.min(Math.max(cursorX - 23, 2), width - 48)} y={PHASE_HEIGHT + 5} width={46} height={18} rx={4} fill="var(--color-burgundy-500)" />
              <text x={Math.min(Math.max(cursorX, 25), width - 25)} y={PHASE_HEIGHT + 18} textAnchor="middle" fill="white" style={{ fontSize: 10.5, fontWeight: 700, fontFamily: 'var(--font-sans)' }}>
                {formatYear(cursorYear!)}
              </text>
            </g>
          )}

          {layoutItems.map(item => {
            const x = yearToX(item.startYear);
            const x2 = yearToX(item.endYear);
            const y = TOP_PADDING + item.lane * (LANE_HEIGHT + LANE_GAP);
            const option = dominantThemeOption(item.event, themeOptions, lang);
            const palette = themePalette(option);
            const isSelected = item.event.id === selectedEventId;
            const isHovered = item.event.id === hoveredEventId;
            const isFocused = focusedEventIds.has(item.event.id);
            const isVisibleByTime = visibleEventIds.has(item.event.id);
            const itemWidth = item.isInstant ? INSTANT_HIT_WIDTH : Math.max(x2 - x, MIN_SPAN_WIDTH);
            const visualStart = item.isInstant ? x - INSTANT_HIT_WIDTH / 2 : x;
            if (visualStart + itemWidth < -60 || visualStart > width + 60) return null;

            return (
              <TimelineEventShape
                key={item.event.id}
                item={item}
                x={x}
                x2={x2}
                y={y}
                width={itemWidth}
                palette={palette}
                order={orderIndex.get(item.event.id)}
                selected={isSelected}
                hovered={isHovered}
                focused={isFocused}
                focusMuted={!!analysisFocus && !isFocused}
                visibleByTime={isVisibleByTime}
                label={loc(item.event.title)}
                certainty={eventCertainty(item.event)}
                sourceCount={item.event.sources?.length ?? 0}
                maxX={width}
                onSelect={() => selectEvent(item.event.id, { origin: 'timeline' })}
                onHover={(hovered) => {
                  hoverEvent(hovered ? item.event.id : null);
                  setTooltipState(hovered ? { event: item.event, x, y } : null);
                }}
              />
            );
          })}

          {tooltipState && (
            <TimelineTooltip
              event={tooltipState.event}
              x={tooltipState.x}
              y={tooltipState.y}
              maxX={width}
              orderIndex={orderIndex.get(tooltipState.event.id)}
            />
          )}
        </svg>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-parchment-200 bg-parchment-50 px-3 py-1.5 text-[10.5px] text-ink-400">
        <LegendItem kind="point" label="Zeitpunkt" />
        <LegendItem kind="span" label="Zeitraum" />
        <LegendItem kind="uncertain" label="unsicher/rekonstruiert" />
        {scale.mode === 'segmented' && <span className="font-medium text-ink-500">Phasenansicht</span>}
      </div>
    </div>
  );
}

function TimelineEventShape({
  item,
  x,
  x2,
  y,
  width,
  palette,
  order,
  selected,
  hovered,
  focused,
  focusMuted,
  visibleByTime,
  label,
  certainty,
  sourceCount,
  maxX,
  onSelect,
  onHover,
}: {
  item: TimelineItem;
  x: number;
  x2: number;
  y: number;
  width: number;
  palette: VisualPalette;
  order?: number;
  selected: boolean;
  hovered: boolean;
  focused: boolean;
  focusMuted: boolean;
  visibleByTime: boolean;
  label: string;
  certainty: CertaintyLevel;
  sourceCount: number;
  maxX: number;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
}) {
  const interactive = visibleByTime;
  const opacity = focusMuted ? 0.28 : visibleByTime ? 1 : 0.22;
  const strokeDasharray = certainty === 'certain' ? undefined : '4,3';
  const showLabel = selected || hovered || focused || (!item.isInstant && width > 138);
  const fill = selected
    ? palette.strong
    : focused
    ? palette.tint
    : hovered
    ? palette.soft
    : item.isInstant
    ? '#fffdfa'
    : palette.strong;
  const stroke = selected ? 'var(--color-ink-800)' : focused ? '#b46c1f' : palette.stroke;
  const textColor = focused && !selected ? '#5d4319' : item.isInstant && !selected ? palette.stroke : 'white';

  const handleKeyDown = (event: React.KeyboardEvent<SVGGElement>) => {
    if (!interactive) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  };

  const handleSelect = (event: React.MouseEvent<SVGGElement>) => {
    event.stopPropagation();
    if (!interactive) return;
    onSelect();
  };

  if (item.isInstant) {
    const labelWidth = Math.min(Math.max(label.length * 6.2 + 18, 88), 260);
    const labelX = x + 14;
    const safeLabelX = Math.min(Math.max(labelX, 4), Math.max(4, maxX - labelWidth - 4));
    return (
      <g
        role="button"
        tabIndex={interactive ? 0 : -1}
        aria-label={`${label}, ${formatYear(item.startYear)}`}
        aria-disabled={!interactive}
        style={{ cursor: interactive ? 'pointer' : 'default', opacity }}
        onPointerDown={event => event.stopPropagation()}
        onMouseDown={event => event.stopPropagation()}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onFocus={() => onHover(true)}
        onBlur={() => onHover(false)}
      >
        <line x1={x} y1={TOP_PADDING - 4} x2={x} y2={y + LANE_HEIGHT / 2 - 10} stroke={palette.stroke} strokeWidth={1} opacity={0.38} />
        <circle cx={x} cy={y + LANE_HEIGHT / 2} r={selected ? 10 : focused ? 9.6 : hovered ? 9 : 8} fill={fill} stroke={stroke} strokeWidth={selected ? 2.2 : focused ? 2.4 : 1.7} strokeDasharray={strokeDasharray} />
        <circle cx={x} cy={y + LANE_HEIGHT / 2} r={3.4} fill={selected ? 'white' : palette.stroke} />
        {order != null && (
          <text x={x} y={y + LANE_HEIGHT / 2 + 18} textAnchor="middle" fill={palette.stroke} style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-serif)' }}>
            {order}
          </text>
        )}
        {showLabel && (
          <g>
            <rect x={safeLabelX} y={y + 4} width={labelWidth} height={22} rx={4} fill="white" stroke={palette.stroke} strokeOpacity={0.35} />
            <text x={safeLabelX + 9} y={y + 19} fill={palette.stroke} style={{ fontSize: 11, fontWeight: 650, fontFamily: 'var(--font-sans)' }}>
              {clipText(label, Math.floor((labelWidth - 18) / 6.2))}
            </text>
          </g>
        )}
      </g>
    );
  }

  return (
    <g
      role="button"
      tabIndex={interactive ? 0 : -1}
      aria-label={`${label}, ${formatYear(item.startYear)} bis ${formatYear(item.endYear)}`}
      aria-disabled={!interactive}
      style={{ cursor: interactive ? 'pointer' : 'default', opacity }}
      onPointerDown={event => event.stopPropagation()}
      onMouseDown={event => event.stopPropagation()}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
    >
      <rect
        x={x}
        y={y}
        width={Math.max(x2 - x, MIN_SPAN_WIDTH)}
        height={LANE_HEIGHT}
        rx={5}
        fill={fill}
        stroke={stroke}
        strokeWidth={selected ? 2 : focused ? 2.2 : 1}
        strokeDasharray={strokeDasharray}
      />
      {focused && !selected && (
        <rect
          x={x - 3}
          y={y - 3}
          width={Math.max(x2 - x, MIN_SPAN_WIDTH) + 6}
          height={LANE_HEIGHT + 6}
          rx={7}
          fill="none"
          stroke="#b46c1f"
          strokeWidth={1.6}
          strokeOpacity={0.75}
        />
      )}
      <rect x={x + 2} y={y + 2} width={Math.max(x2 - x, MIN_SPAN_WIDTH) - 4} height={LANE_HEIGHT - 4} rx={4} fill="white" opacity={selected ? 0.07 : 0.12} />
      {order != null && (
        <g>
          <circle cx={x + 13} cy={y + LANE_HEIGHT / 2} r={9} fill="white" stroke={palette.stroke} strokeWidth={1.4} />
          <text x={x + 13} y={y + LANE_HEIGHT / 2 + 3.5} textAnchor="middle" fill={palette.stroke} style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-serif)' }}>
            {order}
          </text>
        </g>
      )}
      {showLabel && (
        <text x={x + (order != null ? 28 : 10)} y={y + LANE_HEIGHT / 2 + 4} fill={textColor} style={{ fontSize: 11, fontWeight: 650, fontFamily: 'var(--font-sans)' }}>
          {clipText(label, Math.floor((Math.max(x2 - x, MIN_SPAN_WIDTH) - (order != null ? 36 : 18)) / 6.4))}
        </text>
      )}
      {sourceCount > 0 && Math.max(x2 - x, MIN_SPAN_WIDTH) > 48 && (
        <text x={x + Math.max(x2 - x, MIN_SPAN_WIDTH) - 9} y={y + LANE_HEIGHT / 2 + 4} textAnchor="end" fill="white" opacity={0.82} style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-sans)' }}>
          Q{sourceCount}
        </text>
      )}
    </g>
  );
}

function TimelineCursor({ x, top, bottom, label, maxX }: { x: number; top: number; bottom: number; label: string; maxX: number }) {
  const labelX = Math.min(Math.max(x - 30, 2), maxX - 62);
  const textX = Math.min(Math.max(x, 32), maxX - 32);
  return (
    <g pointerEvents="none">
      <line x1={x} y1={top} x2={x} y2={bottom} stroke="var(--color-burgundy-600)" strokeWidth={2} />
      <polygon points={`${x - 5},${top} ${x + 5},${top} ${x},${top + 7}`} fill="var(--color-burgundy-600)" />
      <rect x={labelX} y={top + 9} width={60} height={18} rx={4} fill="var(--color-burgundy-600)" />
      <text x={textX} y={top + 22} textAnchor="middle" fill="white" style={{ fontSize: 10.5, fontWeight: 700, fontFamily: 'var(--font-sans)' }}>
        {label}
      </text>
    </g>
  );
}

function ModeButton({ active, onClick, children }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`h-7 px-2.5 text-[11px] font-semibold transition-colors ${
        active ? 'bg-burgundy-600 text-white' : 'bg-white text-ink-600 hover:bg-parchment-100'
      }`}
    >
      {children}
    </button>
  );
}

function ThemeChip({ active, label, option, onClick }: {
  active: boolean;
  label: string;
  option?: ThemeOption;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2 text-[11px] font-semibold transition-colors"
      style={{
        borderColor: option ? option.color : active ? '#23211d' : '#e8ddc8',
        background: active ? (option?.tint ?? '#23211d') : '#fff',
        color: active ? (option?.color ?? '#fff') : '#4a4842',
      }}
    >
      {option && (
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: option.color }}
        />
      )}
      <span>{label}</span>
    </button>
  );
}

function LegendItem({ kind, label }: { kind: 'point' | 'span' | 'uncertain'; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      {kind === 'point' && <span className="inline-block h-3 w-3 rounded-full border-2 border-verdigris-500 bg-white" />}
      {kind === 'span' && <span className="inline-block h-2.5 w-6 rounded-sm bg-verdigris-500" />}
      {kind === 'uncertain' && <span className="inline-block h-2.5 w-6 rounded-sm border border-dashed border-burgundy-500 bg-burgundy-50" />}
      <span>{label}</span>
    </span>
  );
}

interface TimelineTooltipProps {
  event: ChronotopEvent;
  x: number;
  y: number;
  maxX: number;
  orderIndex?: number;
}

function TimelineTooltip({ event, x, y, maxX, orderIndex }: TimelineTooltipProps) {
  const loc = useLocalized();
  const certainty = eventCertainty(event);
  const meta = [
    event.timeObject ? loc(event.timeObject.label) : '',
    event.place ? loc(event.place.name) : '',
  ].filter(Boolean).join(' · ');
  const quality = certainty !== 'certain' ? certaintyLabel(certainty) : '';
  const sourceInfo = event.sources && event.sources.length > 0 ? `${event.sources.length} Quelle${event.sources.length === 1 ? '' : 'n'}` : '';
  const secondLine = [meta, sourceInfo, quality].filter(Boolean).join(' · ');
  const title = `${orderIndex != null ? `${orderIndex}. ` : ''}${loc(event.title)}`;
  const longest = Math.max(title.length, secondLine.length);
  const w = Math.min(Math.max(longest * 6.4 + 24, 180), 360);
  const h = secondLine ? 50 : 32;
  let tx = x - w / 2;
  if (tx < 4) tx = 4;
  if (tx + w > maxX - 4) tx = maxX - w - 4;
  let ty = y - h - 10;
  let arrowDown = true;
  if (ty < 4) {
    ty = y + 34;
    arrowDown = false;
  }
  const arrowX = Math.max(tx + 12, Math.min(x, tx + w - 12));

  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={tx} y={ty} width={w} height={h} rx={7} fill="var(--color-ink-700)" opacity={0.97} />
      {arrowDown ? (
        <polygon points={`${arrowX - 5},${ty + h} ${arrowX + 5},${ty + h} ${arrowX},${ty + h + 6}`} fill="var(--color-ink-700)" opacity={0.97} />
      ) : (
        <polygon points={`${arrowX - 5},${ty} ${arrowX + 5},${ty} ${arrowX},${ty - 6}`} fill="var(--color-ink-700)" opacity={0.97} />
      )}
      <text x={tx + 11} y={ty + 19} fill="var(--color-parchment-50)" style={{ fontSize: 12, fontFamily: 'var(--font-serif)', fontWeight: 700 }}>
        {clipText(title, Math.floor((w - 22) / 6.4))}
      </text>
      {secondLine && (
        <text x={tx + 11} y={ty + 37} fill="var(--color-parchment-200)" style={{ fontSize: 10.5, fontFamily: 'var(--font-sans)' }}>
          {clipText(secondLine, Math.floor((w - 22) / 5.7))}
        </text>
      )}
    </g>
  );
}

function layoutTimelineEvents(events: ChronotopEvent[], scale: TimelineScale, innerWidth: number): TimelineItem[] {
  const sorted = sortEventsByDate(events);
  const laneEnds: number[] = [];
  const result: TimelineItem[] = [];

  for (const event of sorted) {
    const startDate = getEventDate(event);
    if (!startDate) continue;
    const startYear = dateToYear(startDate);
    const endDate = getEventEndDate(event);
    const endYear = endDate ? dateToYear(endDate) : startYear;
    const isInstant = event.timeObject?.type === 'instant' || Math.abs(endYear - startYear) < 0.01;
    const baseX = scale.ratioForYear(startYear) * innerWidth;
    const baseX2 = scale.ratioForYear(endYear) * innerWidth;
    const rawWidth = Math.max(baseX2 - baseX, 0);
    const visualStart = isInstant ? baseX - INSTANT_HIT_WIDTH / 2 : baseX;
    const visualEnd = isInstant ? baseX + INSTANT_HIT_WIDTH / 2 : baseX + Math.max(rawWidth, MIN_SPAN_WIDTH);

    let lane = 0;
    while (lane < laneEnds.length && laneEnds[lane] > visualStart - EVENT_GAP) lane++;
    laneEnds[lane] = visualEnd + EVENT_GAP;
    result.push({ event, startYear, endYear, lane, isInstant, baseX, baseX2, visualStart, visualEnd });
  }
  return result;
}

function computeEventExtent(events: ChronotopEvent[]): { minYear: number; maxYear: number } {
  const years = events.flatMap(event => {
    const start = getEventDate(event);
    if (!start) return [];
    const end = getEventEndDate(event);
    return [dateToYear(start), end ? dateToYear(end) : dateToYear(start)];
  });
  if (years.length === 0) return { minYear: 1900, maxYear: 2000 };
  const min = Math.min(...years);
  const max = Math.max(...years);
  const pad = Math.max((max - min) * 0.035, 1);
  return {
    minYear: Math.floor(min - pad),
    maxYear: Math.ceil(max + pad),
  };
}

function phaseTint(themeId: ThemeFilterId | undefined, options: ThemeOption[]): string {
  if (!themeId) return 'var(--color-parchment-100)';
  const option = options.find(candidate => candidate.id === themeId);
  return option?.tint ?? 'var(--color-parchment-100)';
}

function eventCertainty(event: ChronotopEvent): CertaintyLevel {
  return weakestCertainty(event.timeObject?.certainty ?? 'certain', event.place?.certainty ?? 'certain');
}

function weakestCertainty(a: CertaintyLevel, b: CertaintyLevel): CertaintyLevel {
  const rank: Record<CertaintyLevel, number> = {
    certain: 0,
    probable: 1,
    reconstructed: 2,
    contested: 3,
  };
  return rank[b] > rank[a] ? b : a;
}

function formatTimeFilter(filter: { from?: string; to?: string }): string {
  if (filter.from && filter.to) return `${formatYear(dateToYear(filter.from))} – ${formatYear(dateToYear(filter.to))}`;
  if (filter.from) return `ab ${formatYear(dateToYear(filter.from))}`;
  if (filter.to) return `bis ${formatYear(dateToYear(filter.to))}`;
  return 'alle Zeiten';
}

function formatYear(year: number): string {
  if (year < 0) return `${Math.round(-year)} v. Chr.`;
  return Math.round(year).toString();
}

function yearToIso(year: number): string {
  const wholeYear = Math.floor(year);
  const fraction = year - wholeYear;
  const dayOfYear = Math.max(0, Math.min(364, Math.round(fraction * 365)));
  const date = new Date(Date.UTC(wholeYear, 0, 1 + dayOfYear));
  if (Number.isNaN(date.getTime())) return `${wholeYear.toString().padStart(4, '0')}-01-01`;
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${date.getUTCFullYear().toString().padStart(4, '0')}-${month}-${day}`;
}

function clipText(text: string, maxChars: number): string {
  if (maxChars < 4) return '';
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1)}…`;
}

function clampPan(pan: number, width: number, zoom: number): number {
  const inner = width * zoom;
  const minPan = Math.min(0, width - inner);
  return Math.max(minPan, Math.min(0, pan));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
