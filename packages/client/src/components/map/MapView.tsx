import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import maplibregl from 'maplibre-gl';
import {
  MAP_STYLES, DEFAULT_STYLE_ID, DEFAULT_CENTER, DEFAULT_ZOOM,
  buildHistoricStyle,
  type MapStyleOption,
} from '../../lib/mapStyle.js';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { isEventInTimeRange, sortEventsByDate, eventMatchesSearch, isPlaceValidInRange } from '../../lib/timelineUtils.js';
import { MapOverlay } from './MapOverlay.js';
import { eventMatchesAnalysisFocus, movementMatchesAnalysisFocus } from '../../lib/analysisFocus.js';
import {
  buildThemeOptions,
  certaintyLabel,
  classifyMovementKind,
  classifyVisualKind,
  eventMatchesTheme,
  geometryHint,
  movementColor,
  movementKindLabel,
  movementMatchesTheme,
  placeMatchesTheme,
  visualPalette,
  type MovementVisualKind,
} from '../../lib/themeFilters.js';
import i18n from '../../i18n/index.js';
import { localized } from '@chronotop/shared';
import type { Event as ChronotopEvent, Place, PlaceGeometry } from '@chronotop/shared';

interface MapViewProps {
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  drawMode?: 'polygon' | 'movement' | null;
  drawPoints?: number[][];
  onDrawClick?: (lngLat: { lng: number; lat: number }) => void;
}

interface MarkerEntry {
  marker: maplibregl.Marker;
  popup: maplibregl.Popup;
}

interface RevealPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface MapScaleState {
  label: string;
  width: number;
}

const SHAPE_SOURCE = 'event-shapes';
const SHAPE_FILL_LAYER = 'event-shapes-fill';
const SHAPE_OUTLINE_LAYER = 'event-shapes-outline';
const SHAPE_LINE_CASING_LAYER = 'event-shapes-line-casing';
const SHAPE_LINE_LAYER = 'event-shapes-line';
const SHAPE_SCHEMATIC_LINE_CASING_LAYER = 'event-shapes-schematic-line-casing';
const SHAPE_SCHEMATIC_LINE_LAYER = 'event-shapes-schematic-line';
const SHAPE_POINT_HALO_LAYER = 'event-shapes-point-halo';
const SHAPE_POINT_LAYER = 'event-shapes-point';
const DRAW_SOURCE = 'draw-preview';
const DRAW_FILL_LAYER = 'draw-preview-fill';
const DRAW_LINE_LAYER = 'draw-preview-line';
const DRAW_POINTS_LAYER = 'draw-preview-points';
const MOVEMENT_SOURCE = 'movement-lines';
const MOVEMENT_CASING_LAYER = 'movement-line-casing';
const MOVEMENT_LINE_LAYER = 'movement-line';
const MOVEMENT_SCHEMATIC_CASING_LAYER = 'movement-line-schematic-casing';
const MOVEMENT_SCHEMATIC_LINE_LAYER = 'movement-line-schematic';
const MOVEMENT_NODE_HALO_LAYER = 'movement-node-halo';
const MOVEMENT_NODE_LAYER = 'movement-node';
const MAP_HIT_TEST_PADDING = 10;
const MAP_AUTO_REVEAL_PADDING: RevealPadding = { top: 86, right: 48, bottom: 58, left: 56 };
const MAP_FORCE_REVEAL_PADDING: RevealPadding = { top: 92, right: 64, bottom: 70, left: 70 };
const INTERACTIVE_LAYER_PRIORITY = [
  MOVEMENT_NODE_LAYER,
  SHAPE_POINT_LAYER,
  SHAPE_POINT_HALO_LAYER,
  MOVEMENT_LINE_LAYER,
  MOVEMENT_SCHEMATIC_LINE_LAYER,
  MOVEMENT_CASING_LAYER,
  MOVEMENT_SCHEMATIC_CASING_LAYER,
  SHAPE_LINE_LAYER,
  SHAPE_SCHEMATIC_LINE_LAYER,
  SHAPE_LINE_CASING_LAYER,
  SHAPE_SCHEMATIC_LINE_CASING_LAYER,
  SHAPE_FILL_LAYER,
  SHAPE_OUTLINE_LAYER,
];

type MovementNodeRole = 'start' | 'stop' | 'end';
type MovementNodeLabel = { index: number; label: string; role: MovementNodeRole };

export function MapView({ onMapClick, drawMode, drawPoints, onDrawClick }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapLoadedRef = useRef(false);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null);
  const hasFittedRef = useRef(false);
  const handledFocusRequestRef = useRef(0);
  const handledAnalysisFocusRequestRef = useRef(0);

  const events = useChronotopStore(s => s.events);
  const places = useChronotopStore(s => s.places);
  const movements = useChronotopStore(s => s.movements);
  const concepts = useChronotopStore(s => s.concepts);
  const currentModule = useChronotopStore(s => s.currentModule);
  const selectedEventId = useChronotopStore(s => s.selectedEventId);
  const selectionOrigin = useChronotopStore(s => s.selectionOrigin);
  const selectionRevision = useChronotopStore(s => s.selectionRevision);
  const hoveredEventId = useChronotopStore(s => s.hoveredEventId);
  const mapFollowMode = useChronotopStore(s => s.mapFollowMode);
  const mapFocusRequest = useChronotopStore(s => s.mapFocusRequest);
  const analysisFocus = useChronotopStore(s => s.analysisFocus);
  const analysisFocusMapRequest = useChronotopStore(s => s.analysisFocusMapRequest);
  const timeFilter = useChronotopStore(s => s.timeFilter);
  const themeFilter = useChronotopStore(s => s.themeFilter);
  const searchQuery = useChronotopStore(s => s.searchQuery);
  const selectEvent = useChronotopStore(s => s.selectEvent);
  const hoverEvent = useChronotopStore(s => s.hoverEvent);
  const noteMapInteraction = useChronotopStore(s => s.noteMapInteraction);
  const requestMapFocus = useChronotopStore(s => s.requestMapFocus);
  const mapStyleId = useChronotopStore(s => s.mapStyleId);
  const setMapStyleId = useChronotopStore(s => s.setMapStyleId);
  const mapLayerVisibility = useChronotopStore(s => s.mapLayerVisibility);

  const [styleVersion, setStyleVersion] = useState(0);
  const [mapBearing, setMapBearing] = useState(0);
  const [scaleState, setScaleState] = useState<MapScaleState>({ label: '500 km', width: 84 });
  const [locationState, setLocationState] = useState<'idle' | 'locating' | 'error'>('idle');
  const showMarkers = mapLayerVisibility.markers;
  const showShapes = mapLayerVisibility.shapes;
  const showMovements = mapLayerVisibility.movements;
  const programmaticCameraRef = useRef(false);
  const programmaticCameraTimerRef = useRef<number | null>(null);

  function runProgrammaticCamera(map: maplibregl.Map, move: () => void) {
    programmaticCameraRef.current = true;
    if (programmaticCameraTimerRef.current) {
      window.clearTimeout(programmaticCameraTimerRef.current);
      programmaticCameraTimerRef.current = null;
    }
    const finish = () => {
      programmaticCameraRef.current = false;
      map.off('moveend', finish);
      if (programmaticCameraTimerRef.current) {
        window.clearTimeout(programmaticCameraTimerRef.current);
        programmaticCameraTimerRef.current = null;
      }
    };
    try {
      map.stop();
      map.once('moveend', finish);
      move();
      programmaticCameraTimerRef.current = window.setTimeout(finish, 1400);
    } catch {
      finish();
    }
  }
  const themeOptions = useMemo(
    () => buildThemeOptions(events, places, movements, concepts, i18n.language),
    [events, places, movements, concepts],
  );
  const eventById = useMemo(() => new Map(events.map(event => [event.id, event])), [events]);
  const focusedEventIds = useMemo(() => {
    if (!analysisFocus) return new Set<string>();
    return new Set(events.filter(event => eventMatchesAnalysisFocus(event, analysisFocus)).map(event => event.id));
  }, [analysisFocus, events]);
  const historicStyleOption = useMemo(
    () => currentModule?.basemapUrl
      ? buildHistoricStyle(currentModule.basemapUrl, currentModule.basemapLabel ?? 'Hist. Karte')
      : null,
    [currentModule?.basemapLabel, currentModule?.basemapUrl],
  );
  const availableMapStyles = useMemo(
    () => historicStyleOption ? [...MAP_STYLES, historicStyleOption] : MAP_STYLES,
    [historicStyleOption],
  );
  const effectiveMapStyleId = availableMapStyles.some(style => style.id === mapStyleId) ? mapStyleId : DEFAULT_STYLE_ID;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialStyle = MAP_STYLES.find(s => s.id === DEFAULT_STYLE_ID)!.spec;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: initialStyle,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: { compact: true },
    });

    (window as any).__chronotopMap = map;
    map.on('load', () => {
      mapLoadedRef.current = true;
      installCustomLayers(map, selectEvent);
      setStyleVersion(v => v + 1);
      updateMapChromeState(map, setMapBearing, setScaleState);
    });
    map.on('style.load', () => {
      installCustomLayers(map, selectEvent);
      setStyleVersion(v => v + 1);
    });
    const updateChrome = () => updateMapChromeState(map, setMapBearing, setScaleState);
    map.on('move', updateChrome);
    map.on('zoom', updateChrome);
    map.on('rotate', updateChrome);
    map.on('resize', updateChrome);

    mapRef.current = map;
    const ro = new ResizeObserver(() => mapRef.current?.resize());
    ro.observe(containerRef.current);

    return () => {
      if (programmaticCameraTimerRef.current) {
        window.clearTimeout(programmaticCameraTimerRef.current);
        programmaticCameraTimerRef.current = null;
      }
      map.off('move', updateChrome);
      map.off('zoom', updateChrome);
      map.off('rotate', updateChrome);
      map.off('resize', updateChrome);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
      hasFittedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;
    const opt = availableMapStyles.find(s => s.id === effectiveMapStyleId);
    if (opt) map.setStyle(opt.spec);
  }, [availableMapStyles, effectiveMapStyleId]);

  function zoomMap(delta: number) {
    const map = mapRef.current;
    if (!map) return;
    runProgrammaticCamera(map, () => {
      if (delta > 0) map.zoomIn({ duration: 260, essential: true });
      else map.zoomOut({ duration: 260, essential: true });
    });
  }

  function resetNorth() {
    const map = mapRef.current;
    if (!map) return;
    runProgrammaticCamera(map, () => {
      map.easeTo({ bearing: 0, pitch: 0, duration: 360, essential: true });
    });
  }

  function locateUser() {
    const map = mapRef.current;
    if (!map || !navigator.geolocation) {
      setLocationState('error');
      return;
    }
    setLocationState('locating');
    navigator.geolocation.getCurrentPosition(
      position => {
        setLocationState('idle');
        runProgrammaticCamera(map, () => {
          map.easeTo({
            center: [position.coords.longitude, position.coords.latitude],
            zoom: Math.max(map.getZoom(), 14),
            bearing: 0,
            pitch: 0,
            duration: 700,
            essential: true,
          });
        });
      },
      () => setLocationState('error'),
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 },
    );
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (e: maplibregl.MapMouseEvent) => {
      if ((e as any).defaultPrevented) return;
      const ll = { lng: e.lngLat.lng, lat: e.lngLat.lat };
      if ((drawMode === 'polygon' || drawMode === 'movement') && onDrawClick) {
        onDrawClick(ll);
        return;
      }
      const feature = findClickableFeature(map, e.point);
      const eventId = feature ? String(feature.properties?.eventId ?? '') : '';
      if (eventId) {
        selectEvent(eventId, { origin: 'map' });
        return;
      }
      if (onMapClick) onMapClick(ll);
    };
    map.on('click', handler);
    return () => { map.off('click', handler); };
  }, [onMapClick, drawMode, onDrawClick, selectEvent]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = drawMode === 'polygon' || drawMode === 'movement' ? 'crosshair' : '';
  }, [drawMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const pauseAutoFollow = () => {
      if (programmaticCameraRef.current) return;
      noteMapInteraction();
    };
    map.on('dragstart', pauseAutoFollow);
    map.on('zoomstart', pauseAutoFollow);
    map.on('rotatestart', pauseAutoFollow);
    map.on('pitchstart', pauseAutoFollow);
    return () => {
      map.off('dragstart', pauseAutoFollow);
      map.off('zoomstart', pauseAutoFollow);
      map.off('rotatestart', pauseAutoFollow);
      map.off('pitchstart', pauseAutoFollow);
    };
  }, [noteMapInteraction]);

  function renderShapesAndMarkers(map: maplibregl.Map, immediate = false) {
    if (!mapLoadedRef.current && !immediate) return;

    markersRef.current.forEach(m => { m.marker.remove(); m.popup.remove(); });
    markersRef.current.clear();

    const lang = i18n.language;
    const sortedEvents = sortEventsByDate(events).filter(e =>
      e.place
      && isEventInTimeRange(e, timeFilter.from, timeFilter.to)
      && eventMatchesSearch(e, searchQuery)
      && eventMatchesTheme(e, themeFilter, lang)
    );
    const eventPlaceIds = new Set(sortedEvents.map(e => e.placeId));

    const eventFeatures = sortedEvents
      .filter(e =>
        e.place?.geometry
        && showShapes
        && isPlaceValidInRange(e.place.validFrom, e.place.validTo, timeFilter.from, timeFilter.to)
      )
      .map((event, i) => {
        const place = event.place!;
        const order = sortedEvents.findIndex(e => e.id === event.id) + 1;
        const placeName = localized(place.name, lang);
        const focusMatch = !!analysisFocus && focusedEventIds.has(event.id);
        return {
          type: 'Feature' as const,
          id: i,
          properties: {
            kind: 'event-place',
            eventId: event.id,
            placeId: place.id,
            number: order,
            placeName,
            label: `${order}. ${placeName}`,
            certainty: place.certainty ?? 'certain',
            visualKind: classifyVisualKind(place, lang),
            geometryType: place.geometry!.type,
            focusMatch,
            focusMuted: !!analysisFocus && !focusMatch,
          },
          geometry: place.geometry!,
        };
      });

    const standaloneFeatures = places
      .filter(place =>
        place.geometry
        && showShapes
        && !eventPlaceIds.has(place.id)
        && isPlaceValidInRange(place.validFrom, place.validTo, timeFilter.from, timeFilter.to)
        && placeMatchesSearch(place, searchQuery, lang)
        && placeMatchesTheme(place, themeFilter, lang)
      )
      .map((place, i) => {
        const placeName = localized(place.name, lang);
        return {
          type: 'Feature' as const,
          id: eventFeatures.length + i,
          properties: {
            kind: 'standalone-place',
            eventId: '',
            placeId: place.id,
            number: '',
            placeName,
            label: placeName,
            certainty: place.certainty ?? 'certain',
            visualKind: classifyVisualKind(place, lang),
            geometryType: place.geometry!.type,
            focusMatch: false,
            focusMuted: !!analysisFocus,
          },
          geometry: place.geometry!,
        };
      });

    const features = [...eventFeatures, ...standaloneFeatures];
    const src = map.getSource(SHAPE_SOURCE) as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData({ type: 'FeatureCollection', features });

    features.forEach(f => {
      map.setFeatureState({ source: SHAPE_SOURCE, id: f.id }, {
        selected: f.properties.eventId === selectedEventId,
        hovered: f.properties.eventId === hoveredEventId,
      });
    });

    if (showMarkers) {
      sortedEvents.forEach((event, index) => {
        if (!event.place || event.place.geometry) return;
        addEventMarker(map, event, index + 1, lang);
      });
      places
        .filter(place =>
          !eventPlaceIds.has(place.id)
          && !place.geometry
          && isPlaceValidInRange(place.validFrom, place.validTo, timeFilter.from, timeFilter.to)
          && placeMatchesSearch(place, searchQuery, lang)
          && placeMatchesTheme(place, themeFilter, lang)
        )
        .forEach(place => addStandalonePlaceMarker(map, place, lang));
    }
  }

  function addEventMarker(map: maplibregl.Map, event: any, index: number, lang: string) {
    const isSelected = event.id === selectedEventId;
    const isHovered = event.id === hoveredEventId;
    const isFocused = focusedEventIds.has(event.id);
    const isMuted = !!analysisFocus && !isFocused && !isSelected;
    const hasShape = !!event.place.geometry;
    const palette = visualPalette(classifyVisualKind(event.place, lang));
    const el = document.createElement('div');
    el.className = 'chronotop-marker';
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', `${localized(event.title, lang)} - ${event.timeObject ? localized(event.timeObject.label, lang) : ''}`);
    el.style.cssText = `
      width: ${isSelected || isFocused ? 32 : 26}px;
      height: ${isSelected || isFocused ? 32 : 26}px;
      border-radius: 50%;
      background: ${isSelected
        ? `linear-gradient(135deg, ${palette.strong} 0%, ${palette.stroke} 100%)`
        : isFocused
        ? `linear-gradient(135deg, #ffffff 0%, ${palette.soft} 100%)`
        : isHovered
        ? `linear-gradient(135deg, ${palette.tint} 0%, ${palette.soft} 100%)`
        : `linear-gradient(135deg, #ffffff 0%, ${palette.tint} 100%)`};
      border: ${isFocused && !isSelected ? 3 : 2}px solid ${isSelected || isHovered || isFocused ? palette.stroke : palette.strong};
      box-shadow: 0 2px 6px rgba(35, 33, 29, ${isMuted ? 0.12 : 0.35})${hasShape || isFocused ? `, 0 0 0 ${isFocused ? 7 : 4}px ${palette.halo}` : ''};
      cursor: pointer;
      opacity: ${isMuted ? 0.35 : 1};
      display: flex; align-items: center; justify-content: center;
      font-family: Georgia, serif;
      font-weight: 700;
      font-size: ${isSelected || isFocused ? '14px' : '12px'};
      color: ${isSelected ? 'white' : palette.stroke};
      user-select: none;
    `;
    el.textContent = String(index);

    const popupHtml = `
      <div>
        <div style="font-size: 14px; font-weight: 700; color: #23211d; margin-bottom: 2px;">
          ${escapeHtml(localized(event.title, lang))}
        </div>
        <div style="font-size: 11px; color: #6f6c66;">
          ${escapeHtml(event.timeObject ? localized(event.timeObject.label, lang) : '')}${event.sources && event.sources.length > 0 ? ` &middot; ${event.sources.length} Quelle${event.sources.length > 1 ? 'n' : ''}` : ''}${hasShape ? ' &middot; Geometrie' : ''}
        </div>
      </div>
    `;
    const popup = new maplibregl.Popup({
      offset: 18, closeButton: false, closeOnClick: false, className: 'chronotop-popup',
    }).setHTML(popupHtml);

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([event.place.lng, event.place.lat])
      .setPopup(popup)
      .addTo(map);

    el.addEventListener('click', e => {
      e.stopPropagation();
      if (popup.isOpen()) marker.togglePopup();
      selectEvent(event.id, { origin: 'map' });
    });
    el.addEventListener('mouseenter', () => {
      hoverEvent(event.id);
      if (!popup.isOpen()) marker.togglePopup();
    });
    el.addEventListener('mouseleave', () => {
      hoverEvent(null);
      if (popup.isOpen()) marker.togglePopup();
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectEvent(event.id, { origin: 'map' });
      }
    });
    markersRef.current.set(event.id, { marker, popup });
  }

  function addStandalonePlaceMarker(map: maplibregl.Map, place: Place, lang: string) {
    const placeName = localized(place.name, lang);
    const palette = visualPalette(classifyVisualKind(place, lang));
    const el = document.createElement('div');
    el.className = 'chronotop-marker chronotop-place-marker';
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', placeName);
    el.style.cssText = `
      width: 24px;
      height: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    const glyph = document.createElement('span');
    glyph.style.cssText = `
      width: 16px;
      height: 16px;
      border-radius: 5px;
      background: ${palette.tint};
      border: 2px solid ${palette.stroke};
      box-shadow: 0 2px 8px rgba(35, 33, 29, 0.28);
      transform: rotate(45deg);
      pointer-events: none;
    `;
    el.appendChild(glyph);
    const popupHtml = `
      <div>
        <div style="font-size: 13px; font-weight: 700; color: #23211d; margin-bottom: 2px;">
          ${escapeHtml(placeName)}
        </div>
        <div style="font-size: 11px; color: #6f6c66;">
          importierter Kartenort${place.certainty && place.certainty !== 'certain' ? ` &middot; ${escapeHtml(certaintyLabel(place.certainty))}` : ''}
        </div>
      </div>
    `;
    const popup = new maplibregl.Popup({
      offset: 18, closeButton: false, closeOnClick: false, className: 'chronotop-popup',
    }).setHTML(popupHtml);
    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([place.lng, place.lat])
      .setPopup(popup)
      .addTo(map);
    el.addEventListener('mouseenter', () => { if (!popup.isOpen()) marker.togglePopup(); });
    el.addEventListener('mouseleave', () => { if (popup.isOpen()) marker.togglePopup(); });
    markersRef.current.set(`place-${place.id}`, { marker, popup });
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const run = () => renderShapesAndMarkers(map);
    if (mapLoadedRef.current) run();
    else map.once('load', run);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, places, selectedEventId, timeFilter, searchQuery, showMarkers, showShapes, themeFilter, styleVersion, analysisFocus, focusedEventIds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;
    const src: any = map.getSource(SHAPE_SOURCE);
    if (!src || !src._data) return;
    const fc = src._data as any;
    fc.features?.forEach((f: any) => {
      map.setFeatureState({ source: SHAPE_SOURCE, id: f.id }, {
        selected: f.properties?.eventId === selectedEventId,
        hovered: f.properties?.eventId === hoveredEventId,
      });
    });
  }, [hoveredEventId, selectedEventId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedEventId || !mapLoadedRef.current) return;
    const isExplicitFocusRequest = mapFocusRequest !== handledFocusRequestRef.current;
    if (!isExplicitFocusRequest && selectionOrigin === 'map') return;
    const isSelectionFromPanel = selectionOrigin !== null && selectionOrigin !== 'map';
    if (!isExplicitFocusRequest && !isSelectionFromPanel && mapFollowMode === 'paused') return;
    const event = events.find(e => e.id === selectedEventId);
    if (!event?.place) return;
    handledFocusRequestRef.current = mapFocusRequest;

    const selectedMovements = movements
      .filter(m => m.eventId === selectedEventId)
      .filter(m => !/(krankenmord|euthanasie|grafeneck|hadamar)/i.test(`${m.name ?? ''} ${m.description ?? ''}`));
    const movementCoords = selectedMovements
      .flatMap(m => m.coordinates)
      .filter(isLngLatPair);
    const routeText = selectedMovements.map(m => `${m.name ?? ''} ${m.description ?? ''}`).join(' ');

    revealSelectedEvent(map, event, movementCoords, {
      force: isExplicitFocusRequest || isSelectionFromPanel,
      routeMaxZoom: /deport|killesberg|nordbahnhof|riga|theresienstadt/i.test(routeText) ? 11 : 10,
      move: action => runProgrammaticCamera(map, action),
    });
  // Selection should move the camera only by origin-aware rules; filtering or layer toggles should not yank the view away.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId, selectionRevision, selectionOrigin, mapFollowMode, mapFocusRequest, events, movements, styleVersion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current || !analysisFocus) return;
    if (analysisFocusMapRequest === handledAnalysisFocusRequestRef.current) return;
    handledAnalysisFocusRequestRef.current = analysisFocusMapRequest;

    const coords: [number, number][] = [];
    events.forEach(event => {
      if (!focusedEventIds.has(event.id) || !event.place) return;
      if (event.place.geometry) coords.push(...collectCoordinates(event.place.geometry.coordinates));
      else coords.push([event.place.lng, event.place.lat]);
    });
    movements.forEach(movement => {
      if (!movementMatchesAnalysisFocus(movement, eventById.get(movement.eventId ?? ''), analysisFocus)) return;
      coords.push(...movement.coordinates.filter(isLngLatPair));
    });
    if (coords.length === 0) return;

    runProgrammaticCamera(map, () => {
      fitMapToCoordinates(map, coords, coords.length === 1 ? 13 : 11.4);
    });
  }, [analysisFocus, analysisFocusMapRequest, eventById, events, focusedEventIds, movements]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || hasFittedRef.current || (events.length === 0 && places.length === 0)) return;

    const fit = () => {
      if (hasFittedRef.current) return;
      const bounds = new maplibregl.LngLatBounds();
      const eventPlaces = events.filter(e => e.place).map(e => e.place!);
      [...eventPlaces, ...places].forEach(place => extendBoundsWithPlace(bounds, place));
      if (bounds.isEmpty()) return;
      try {
        runProgrammaticCamera(map, () => {
          map.fitBounds(bounds, { padding: 58, duration: 0, maxZoom: maxZoomForBounds(bounds) });
        });
        hasFittedRef.current = true;
      } catch { /* map not ready */ }
    };

    if (mapLoadedRef.current) fit();
    else map.once('load', fit);
  }, [events, places]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const render = () => {
      const src = map.getSource(MOVEMENT_SOURCE) as maplibregl.GeoJSONSource | undefined;
      if (!src) return;
      const features = showMovements
        ? movements.filter(mv => movementMatchesTheme(mv, themeFilter, eventById.get(mv.eventId ?? ''), i18n.language)).flatMap((mv, i) => {
            const visualKind = classifyMovementKind(mv);
            const color = mv.color || movementColor(visualKind);
            const focusMatch = movementMatchesAnalysisFocus(mv, eventById.get(mv.eventId ?? ''), analysisFocus);
            const line = {
              type: 'Feature' as const,
              id: `line-${i}`,
              properties: {
                kind: 'movement-line',
                movementId: mv.id,
                eventId: mv.eventId ?? '',
                name: mv.name,
                description: mv.description ?? '',
                color,
                visualKind,
                focusMatch,
                focusMuted: !!analysisFocus && !focusMatch,
              },
              geometry: { type: 'LineString' as const, coordinates: mv.coordinates },
            };
            return [line, ...movementNodeFeatures(mv, i, visualKind, color, focusMatch, !!analysisFocus && !focusMatch)];
          })
        : [];
      src.setData({ type: 'FeatureCollection', features });
    };

    if (mapLoadedRef.current) render();
    else map.once('load', render);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movements, showMovements, themeFilter, styleVersion, eventById, analysisFocus]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const src = map.getSource(DRAW_SOURCE) as maplibregl.GeoJSONSource | undefined;
      if (!src) return;
      const points = drawPoints ?? [];
      const features: any[] = points.map((p, i) => ({
        type: 'Feature', properties: { i },
        geometry: { type: 'Point', coordinates: p },
      }));
      if (points.length >= 2) features.push({
        type: 'Feature', properties: {},
        geometry: { type: 'LineString', coordinates: points },
      });
      if (points.length >= 3) {
        const ring = [...points, points[0]];
        features.push({
          type: 'Feature', properties: {},
          geometry: { type: 'Polygon', coordinates: [ring] },
        });
      }
      src.setData({ type: 'FeatureCollection', features });
    };

    if (mapLoadedRef.current) apply();
    else map.once('load', apply);
  }, [drawPoints]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      <MapTools
        styles={availableMapStyles}
        activeStyleId={effectiveMapStyleId}
        onStyleChange={setMapStyleId}
        onZoomIn={() => zoomMap(1)}
        onZoomOut={() => zoomMap(-1)}
        onResetNorth={resetNorth}
        onLocate={locateUser}
        bearing={mapBearing}
        scale={scaleState}
        locationState={locationState}
      />
      {selectedEventId && mapFollowMode === 'paused' && (
        <button
          type="button"
          onClick={requestMapFocus}
          className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-md border border-burgundy-200 bg-white/96 px-3 py-1.5 text-xs font-semibold text-burgundy-700 shadow-md backdrop-blur hover:bg-burgundy-50 focus:outline-none focus:ring-2 focus:ring-burgundy-300"
          title="Ausgewähltes Ereignis im Kartenausschnitt zeigen"
        >
          Zur Auswahl
        </button>
      )}
      <MapOverlay />
    </div>
  );

  function installCustomLayers(map: maplibregl.Map, selectEvent: (id: string | null, options?: { origin: 'map' }) => void) {
    if (!map.getSource(SHAPE_SOURCE)) {
      map.addSource(SHAPE_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    }
    if (!map.getLayer(SHAPE_FILL_LAYER)) {
      map.addLayer({
        id: SHAPE_FILL_LAYER,
        type: 'fill',
        source: SHAPE_SOURCE,
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], '#9a2b2b',
            ['boolean', ['feature-state', 'hovered'], false], '#b94c4a',
            ['boolean', ['get', 'focusMatch'], false], '#c27b2c',
            ['==', ['get', 'visualKind'], 'persecution'], '#7b2331',
            ['==', ['get', 'visualKind'], 'medicalCrime'], '#6f3b87',
            ['==', ['get', 'visualKind'], 'forcedLabor'], '#8a5a2b',
            ['==', ['get', 'visualKind'], 'liberation'], '#245b7d',
            ['==', ['get', 'visualKind'], 'civic'], '#7a6d58',
            '#6f8f7f',
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 0.36,
            ['boolean', ['feature-state', 'hovered'], false], 0.28,
            ['boolean', ['get', 'focusMatch'], false], 0.34,
            ['boolean', ['get', 'focusMuted'], false], 0.06,
            ['==', ['get', 'visualKind'], 'persecution'], 0.22,
            ['==', ['get', 'visualKind'], 'medicalCrime'], 0.20,
            ['==', ['get', 'visualKind'], 'forcedLabor'], 0.20,
            0.18,
          ],
        },
      });
    }
    if (!map.getLayer(SHAPE_OUTLINE_LAYER)) {
      map.addLayer({
        id: SHAPE_OUTLINE_LAYER,
        type: 'line',
        source: SHAPE_SOURCE,
        filter: ['==', ['geometry-type'], 'Polygon'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], '#7d2222',
            ['boolean', ['feature-state', 'hovered'], false], '#9a2b2b',
            ['boolean', ['get', 'focusMatch'], false], '#b46c1f',
            ['==', ['get', 'visualKind'], 'persecution'], '#7b2331',
            ['==', ['get', 'visualKind'], 'medicalCrime'], '#6f3b87',
            ['==', ['get', 'visualKind'], 'forcedLabor'], '#8a5a2b',
            ['==', ['get', 'visualKind'], 'liberation'], '#245b7d',
            ['==', ['get', 'visualKind'], 'civic'], '#7a6d58',
            '#3e6e62',
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 2.8,
            ['boolean', ['feature-state', 'hovered'], false], 2.25,
            ['boolean', ['get', 'focusMatch'], false], 2.5,
            1.35,
          ],
          'line-opacity': [
            'case',
            ['boolean', ['get', 'focusMuted'], false], 0.22,
            ['boolean', ['get', 'focusMatch'], false], 0.95,
            0.74,
          ],
        },
      });
    }
    if (!map.getLayer(SHAPE_LINE_CASING_LAYER)) {
      map.addLayer({
        id: SHAPE_LINE_CASING_LAYER,
        type: 'line',
        source: SHAPE_SOURCE,
        filter: ['all', ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false], ['!=', ['get', 'visualKind'], 'energy']],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#fffaf0',
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            7, 4.6,
            11, 6.2,
            14, 8,
          ],
          'line-opacity': [
            'case',
            ['boolean', ['get', 'focusMuted'], false], 0.18,
            0.82,
          ],
        },
      });
    }
    if (!map.getLayer(SHAPE_LINE_LAYER)) {
      map.addLayer({
        id: SHAPE_LINE_LAYER,
        type: 'line',
        source: SHAPE_SOURCE,
        filter: ['all', ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false], ['!=', ['get', 'visualKind'], 'energy']],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], '#7d2222',
            ['boolean', ['feature-state', 'hovered'], false], '#9a2b2b',
            ['==', ['get', 'visualKind'], 'rail'], '#5f3a2e',
            ['==', ['get', 'visualKind'], 'water'], '#236f8f',
            ['==', ['get', 'visualKind'], 'energy'], '#a8781c',
            ['==', ['get', 'visualKind'], 'persecution'], '#7b2331',
            ['==', ['get', 'visualKind'], 'medicalCrime'], '#6f3b87',
            ['==', ['get', 'visualKind'], 'forcedLabor'], '#8a5a2b',
            ['==', ['get', 'visualKind'], 'liberation'], '#245b7d',
            ['==', ['get', 'visualKind'], 'civic'], '#7a6d58',
            '#2f6f63',
          ],
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            7, [
              'case',
              ['boolean', ['feature-state', 'selected'], false], 3.4,
              ['boolean', ['feature-state', 'hovered'], false], 3,
              ['boolean', ['get', 'focusMatch'], false], 3.15,
              ['==', ['get', 'visualKind'], 'rail'], 2.4,
              ['==', ['get', 'visualKind'], 'water'], 2.2,
              1.8,
            ],
            11, [
              'case',
              ['boolean', ['feature-state', 'selected'], false], 4.8,
              ['boolean', ['feature-state', 'hovered'], false], 4.25,
              ['boolean', ['get', 'focusMatch'], false], 4.55,
              ['==', ['get', 'visualKind'], 'rail'], 3.55,
              ['==', ['get', 'visualKind'], 'water'], 3.35,
              2.7,
            ],
            14, [
              'case',
              ['boolean', ['feature-state', 'selected'], false], 6.2,
              ['boolean', ['feature-state', 'hovered'], false], 5.4,
              ['boolean', ['get', 'focusMatch'], false], 5.8,
              ['==', ['get', 'visualKind'], 'rail'], 4.8,
              ['==', ['get', 'visualKind'], 'water'], 4.5,
              3.7,
            ],
          ],
          'line-opacity': [
            'case',
            ['boolean', ['get', 'focusMuted'], false], 0.23,
            ['boolean', ['get', 'focusMatch'], false], 1,
            0.9,
          ],
        },
      });
    }
    if (!map.getLayer(SHAPE_SCHEMATIC_LINE_CASING_LAYER)) {
      map.addLayer({
        id: SHAPE_SCHEMATIC_LINE_CASING_LAYER,
        type: 'line',
        source: SHAPE_SOURCE,
        filter: ['all', ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false], ['==', ['get', 'visualKind'], 'energy']],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#fffaf0',
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            7, 4.3,
            11, 5.8,
            14, 7.4,
          ],
          'line-opacity': [
            'case',
            ['boolean', ['get', 'focusMuted'], false], 0.18,
            0.8,
          ],
          'line-dasharray': [2.4, 1.2],
        },
      });
    }
    if (!map.getLayer(SHAPE_SCHEMATIC_LINE_LAYER)) {
      map.addLayer({
        id: SHAPE_SCHEMATIC_LINE_LAYER,
        type: 'line',
        source: SHAPE_SOURCE,
        filter: ['all', ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false], ['==', ['get', 'visualKind'], 'energy']],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], '#7d2222',
            ['boolean', ['feature-state', 'hovered'], false], '#9a2b2b',
            ['boolean', ['get', 'focusMatch'], false], '#b46c1f',
            '#a8781c',
          ],
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            7, [
              'case',
              ['boolean', ['feature-state', 'selected'], false], 3.25,
              ['boolean', ['feature-state', 'hovered'], false], 2.9,
              ['boolean', ['get', 'focusMatch'], false], 3.1,
              2.25,
            ],
            11, [
              'case',
              ['boolean', ['feature-state', 'selected'], false], 4.5,
              ['boolean', ['feature-state', 'hovered'], false], 4.05,
              ['boolean', ['get', 'focusMatch'], false], 4.3,
              3.2,
            ],
            14, [
              'case',
              ['boolean', ['feature-state', 'selected'], false], 5.6,
              ['boolean', ['feature-state', 'hovered'], false], 5.05,
              ['boolean', ['get', 'focusMatch'], false], 5.35,
              4.2,
            ],
          ],
          'line-opacity': [
            'case',
            ['boolean', ['get', 'focusMuted'], false], 0.22,
            ['boolean', ['get', 'focusMatch'], false], 0.98,
            0.86,
          ],
          'line-dasharray': [2, 1.35],
        },
      });
    }
    if (!map.getLayer(SHAPE_POINT_HALO_LAYER)) {
      map.addLayer({
        id: SHAPE_POINT_HALO_LAYER,
        type: 'circle',
        source: SHAPE_SOURCE,
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 12,
            ['boolean', ['feature-state', 'hovered'], false], 10.5,
            ['boolean', ['get', 'focusMatch'], false], 12,
            8.5,
          ],
          'circle-color': '#fffaf0',
          'circle-opacity': [
            'case',
            ['boolean', ['get', 'focusMuted'], false], 0.25,
            0.9,
          ],
        },
      });
    }
    if (!map.getLayer(SHAPE_POINT_LAYER)) {
      map.addLayer({
        id: SHAPE_POINT_LAYER,
        type: 'circle',
        source: SHAPE_SOURCE,
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 8.2,
            ['boolean', ['feature-state', 'hovered'], false], 7.2,
            ['boolean', ['get', 'focusMatch'], false], 8.2,
            5.8,
          ],
          'circle-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], '#7d2222',
            ['boolean', ['feature-state', 'hovered'], false], '#b94c4a',
            ['boolean', ['get', 'focusMatch'], false], '#fff7df',
            ['==', ['get', 'visualKind'], 'rail'], '#f3e4c5',
            ['==', ['get', 'visualKind'], 'energy'], '#f0c96f',
            ['==', ['get', 'visualKind'], 'water'], '#d8edf5',
            ['==', ['get', 'visualKind'], 'persecution'], '#f0d6dc',
            ['==', ['get', 'visualKind'], 'medicalCrime'], '#eadcf0',
            ['==', ['get', 'visualKind'], 'forcedLabor'], '#f0dfc8',
            ['==', ['get', 'visualKind'], 'liberation'], '#d7e8f0',
            ['==', ['get', 'visualKind'], 'civic'], '#ebe3d4',
            '#ffffff',
          ],
          'circle-stroke-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], '#4f1717',
            ['boolean', ['feature-state', 'hovered'], false], '#7d2222',
            ['boolean', ['get', 'focusMatch'], false], '#b46c1f',
            ['==', ['get', 'visualKind'], 'persecution'], '#7b2331',
            ['==', ['get', 'visualKind'], 'medicalCrime'], '#6f3b87',
            ['==', ['get', 'visualKind'], 'forcedLabor'], '#8a5a2b',
            ['==', ['get', 'visualKind'], 'liberation'], '#245b7d',
            ['==', ['get', 'visualKind'], 'civic'], '#7a6d58',
            ['==', ['get', 'visualKind'], 'water'], '#236f8f',
            '#5f3a2e',
          ],
          'circle-stroke-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 2.8,
            ['boolean', ['feature-state', 'hovered'], false], 2.4,
            ['boolean', ['get', 'focusMatch'], false], 3,
            2,
          ],
          'circle-opacity': [
            'case',
            ['boolean', ['get', 'focusMuted'], false], 0.28,
            0.95,
          ],
        },
      });
    }
    {
      let hoveredFid: string | number | null = null;
      const onMove = (e: maplibregl.MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        if (hoveredFid !== null && hoveredFid !== f.id) {
          map.setFeatureState({ source: SHAPE_SOURCE, id: hoveredFid }, { hovered: false });
        }
        hoveredFid = f.id as string | number;
        const eid = String(f.properties?.eventId ?? '');
        if (eid) hoverEvent(eid);
        const html = `
          <div style="font-size:13px;font-weight:700;color:#23211d">${escapeHtml(String(f.properties?.label ?? ''))}</div>
          <div style="font-size:11px;color:#6f6c66;margin-top:2px">${escapeHtml(geometryHint(String(f.properties?.geometryType ?? ''), String(f.properties?.certainty ?? 'certain'), String(f.properties?.visualKind ?? '')))}</div>
        `;
        if (!hoverPopupRef.current) {
          hoverPopupRef.current = new maplibregl.Popup({
            closeButton: false, closeOnClick: false, className: 'chronotop-popup', offset: 8,
          });
        }
        hoverPopupRef.current.setLngLat(e.lngLat).setHTML(html).addTo(map);
      };
      const onLeave = () => {
        if (hoveredFid !== null) {
          map.setFeatureState({ source: SHAPE_SOURCE, id: hoveredFid }, { hovered: false });
          hoveredFid = null;
        }
        hoverEvent(null);
        hoverPopupRef.current?.remove();
      };
      const onShapeClick = (e: maplibregl.MapLayerMouseEvent) => {
        const f = e.features?.[0];
        const eid = String(f?.properties?.eventId ?? '');
        if (eid) {
          (e as any).preventDefault?.();
          selectEvent(eid, { origin: 'map' });
        }
      };
      map.on('mousemove', SHAPE_FILL_LAYER, onMove);
      map.on('mousemove', SHAPE_OUTLINE_LAYER, onMove);
      map.on('mousemove', SHAPE_LINE_CASING_LAYER, onMove);
      map.on('mousemove', SHAPE_LINE_LAYER, onMove);
      map.on('mousemove', SHAPE_SCHEMATIC_LINE_CASING_LAYER, onMove);
      map.on('mousemove', SHAPE_SCHEMATIC_LINE_LAYER, onMove);
      map.on('mousemove', SHAPE_POINT_HALO_LAYER, onMove);
      map.on('mousemove', SHAPE_POINT_LAYER, onMove);
      map.on('mouseleave', SHAPE_FILL_LAYER, onLeave);
      map.on('mouseleave', SHAPE_OUTLINE_LAYER, onLeave);
      map.on('mouseleave', SHAPE_LINE_CASING_LAYER, onLeave);
      map.on('mouseleave', SHAPE_LINE_LAYER, onLeave);
      map.on('mouseleave', SHAPE_SCHEMATIC_LINE_CASING_LAYER, onLeave);
      map.on('mouseleave', SHAPE_SCHEMATIC_LINE_LAYER, onLeave);
      map.on('mouseleave', SHAPE_POINT_HALO_LAYER, onLeave);
      map.on('mouseleave', SHAPE_POINT_LAYER, onLeave);
      map.on('click', SHAPE_FILL_LAYER, onShapeClick);
      map.on('click', SHAPE_OUTLINE_LAYER, onShapeClick);
      map.on('click', SHAPE_LINE_CASING_LAYER, onShapeClick);
      map.on('click', SHAPE_LINE_LAYER, onShapeClick);
      map.on('click', SHAPE_SCHEMATIC_LINE_CASING_LAYER, onShapeClick);
      map.on('click', SHAPE_SCHEMATIC_LINE_LAYER, onShapeClick);
      map.on('click', SHAPE_POINT_HALO_LAYER, onShapeClick);
      map.on('click', SHAPE_POINT_LAYER, onShapeClick);
      map.on('mouseenter', SHAPE_FILL_LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', SHAPE_FILL_LAYER, () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', SHAPE_OUTLINE_LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', SHAPE_OUTLINE_LAYER, () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', SHAPE_LINE_CASING_LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', SHAPE_LINE_CASING_LAYER, () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', SHAPE_LINE_LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', SHAPE_LINE_LAYER, () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', SHAPE_SCHEMATIC_LINE_CASING_LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', SHAPE_SCHEMATIC_LINE_CASING_LAYER, () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', SHAPE_SCHEMATIC_LINE_LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', SHAPE_SCHEMATIC_LINE_LAYER, () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', SHAPE_POINT_HALO_LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', SHAPE_POINT_HALO_LAYER, () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', SHAPE_POINT_LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', SHAPE_POINT_LAYER, () => { map.getCanvas().style.cursor = ''; });
    }

    if (!map.getSource(MOVEMENT_SOURCE)) {
      map.addSource(MOVEMENT_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }
    if (!map.getLayer(MOVEMENT_LINE_LAYER)) {
      map.addLayer({
        id: MOVEMENT_CASING_LAYER,
        type: 'line',
        source: MOVEMENT_SOURCE,
        filter: ['all',
          ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
          ['!=', ['get', 'visualKind'], 'schematic'],
          ['!=', ['get', 'visualKind'], 'deportationSchematic'],
        ],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#fffaf0',
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            7, ['case', ['boolean', ['get', 'focusMatch'], false], 6.4, 5.25],
            11, ['case', ['boolean', ['get', 'focusMatch'], false], 8.8, 7.25],
            14, ['case', ['boolean', ['get', 'focusMatch'], false], 11.2, 9.5],
          ],
          'line-opacity': [
            'case',
            ['boolean', ['get', 'focusMuted'], false], 0.2,
            ['boolean', ['get', 'focusMatch'], false], 0.96,
            0.88,
          ],
        },
      });
      map.addLayer({
        id: MOVEMENT_LINE_LAYER,
        type: 'line',
        source: MOVEMENT_SOURCE,
        filter: ['all',
          ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
          ['!=', ['get', 'visualKind'], 'schematic'],
          ['!=', ['get', 'visualKind'], 'deportationSchematic'],
        ],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            7, ['case', ['boolean', ['get', 'focusMatch'], false], 3.15, 2.25],
            11, ['case', ['boolean', ['get', 'focusMatch'], false], 4.75, 3.65],
            14, ['case', ['boolean', ['get', 'focusMatch'], false], 6.35, 5.2],
          ],
          'line-opacity': [
            'case',
            ['boolean', ['get', 'focusMuted'], false], 0.24,
            ['boolean', ['get', 'focusMatch'], false], 1,
            ['==', ['get', 'visualKind'], 'deportation'], 0.94,
            0.88,
          ],
        },
      });
    }
    if (!map.getLayer(MOVEMENT_SCHEMATIC_LINE_LAYER)) {
      map.addLayer({
        id: MOVEMENT_SCHEMATIC_CASING_LAYER,
        type: 'line',
        source: MOVEMENT_SOURCE,
        filter: ['all',
          ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
          ['match', ['get', 'visualKind'], ['schematic', 'deportationSchematic'], true, false],
        ],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#fffaf0',
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            7, ['case', ['boolean', ['get', 'focusMatch'], false], 6.1, 5],
            11, ['case', ['boolean', ['get', 'focusMatch'], false], 8.45, 7],
            14, ['case', ['boolean', ['get', 'focusMatch'], false], 10.8, 9],
          ],
          'line-opacity': [
            'case',
            ['boolean', ['get', 'focusMuted'], false], 0.2,
            ['boolean', ['get', 'focusMatch'], false], 0.96,
            0.86,
          ],
          'line-dasharray': [2.4, 1.25],
        },
      });
      map.addLayer({
        id: MOVEMENT_SCHEMATIC_LINE_LAYER,
        type: 'line',
        source: MOVEMENT_SOURCE,
        filter: ['all',
          ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
          ['match', ['get', 'visualKind'], ['schematic', 'deportationSchematic'], true, false],
        ],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            7, ['case', ['boolean', ['get', 'focusMatch'], false], 3, 2.15],
            11, ['case', ['boolean', ['get', 'focusMatch'], false], 4.45, 3.4],
            14, ['case', ['boolean', ['get', 'focusMatch'], false], 5.9, 4.75],
          ],
          'line-opacity': [
            'case',
            ['boolean', ['get', 'focusMuted'], false], 0.24,
            ['boolean', ['get', 'focusMatch'], false], 1,
            0.9,
          ],
          'line-dasharray': [1.2, 1.05],
        },
      });
    }
    if (!map.getLayer(MOVEMENT_NODE_LAYER)) {
      map.addLayer({
        id: MOVEMENT_NODE_HALO_LAYER,
        type: 'circle',
        source: MOVEMENT_SOURCE,
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': [
            'case',
            ['boolean', ['get', 'focusMatch'], false], 8.6,
            ['==', ['get', 'nodeRole'], 'stop'], 7.5,
            6.5,
          ],
          'circle-color': '#fffaf0',
          'circle-opacity': [
            'case',
            ['boolean', ['get', 'focusMuted'], false], 0.24,
            0.96,
          ],
        },
      });
      map.addLayer({
        id: MOVEMENT_NODE_LAYER,
        type: 'circle',
        source: MOVEMENT_SOURCE,
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': [
            'case',
            ['boolean', ['get', 'focusMatch'], false], 5.7,
            ['==', ['get', 'nodeRole'], 'stop'], 4.75,
            4,
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'nodeRole'], 'stop'], '#fffaf0',
            ['get', 'color'],
          ],
          'circle-stroke-color': ['get', 'color'],
          'circle-stroke-width': [
            'case',
            ['boolean', ['get', 'focusMatch'], false], 3,
            ['==', ['get', 'nodeRole'], 'stop'], 2.5,
            2,
          ],
          'circle-opacity': [
            'case',
            ['boolean', ['get', 'focusMuted'], false], 0.26,
            0.98,
          ],
        },
      });
    }
    {
      const onMvMove = (e: maplibregl.MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        const name = String(f.properties?.name ?? '');
        const color = String(f.properties?.color ?? '#7B2D42');
        const description = String(f.properties?.description ?? '');
        const visualKind = String(f.properties?.visualKind ?? 'route');
        const featureKind = String(f.properties?.kind ?? 'movement-line');
        const heading = featureKind === 'movement-node' ? 'Achsenpunkt' : 'Historische Achse';
        const html = `
          <div style="font-size:13px;font-weight:700;color:${escapeHtml(color)}">${heading}: ${escapeHtml(name)}</div>
          ${visualKind !== 'route' ? `<div style="font-size:11px;color:#6f6c66;margin-top:2px">${escapeHtml(movementKindLabel(visualKind))}</div>` : ''}
          ${description ? `<div style="font-size:11px;color:#6f6c66;margin-top:2px">${escapeHtml(description)}</div>` : ''}
        `;
        if (!hoverPopupRef.current) {
          hoverPopupRef.current = new maplibregl.Popup({
            closeButton: false, closeOnClick: false, className: 'chronotop-popup', offset: 8,
          });
        }
        hoverPopupRef.current.setLngLat(e.lngLat).setHTML(html).addTo(map);
      };
      const onMvLeave = () => { hoverPopupRef.current?.remove(); };
      const onMvClick = (e: maplibregl.MapLayerMouseEvent) => {
        const f = e.features?.[0];
        const eid = String(f?.properties?.eventId ?? '');
        if (eid) {
          (e as any).preventDefault?.();
          selectEvent(eid, { origin: 'map' });
        }
      };
      map.on('mousemove', MOVEMENT_LINE_LAYER, onMvMove);
      map.on('mousemove', MOVEMENT_SCHEMATIC_LINE_LAYER, onMvMove);
      map.on('mousemove', MOVEMENT_NODE_LAYER, onMvMove);
      map.on('mouseleave', MOVEMENT_LINE_LAYER, onMvLeave);
      map.on('mouseleave', MOVEMENT_SCHEMATIC_LINE_LAYER, onMvLeave);
      map.on('mouseleave', MOVEMENT_NODE_LAYER, onMvLeave);
      map.on('click', MOVEMENT_LINE_LAYER, onMvClick);
      map.on('click', MOVEMENT_SCHEMATIC_LINE_LAYER, onMvClick);
      map.on('click', MOVEMENT_NODE_LAYER, onMvClick);
      map.on('mouseenter', MOVEMENT_LINE_LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', MOVEMENT_LINE_LAYER, () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', MOVEMENT_SCHEMATIC_LINE_LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', MOVEMENT_SCHEMATIC_LINE_LAYER, () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', MOVEMENT_NODE_LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', MOVEMENT_NODE_LAYER, () => { map.getCanvas().style.cursor = ''; });
    }

    if (!map.getSource(DRAW_SOURCE)) {
      map.addSource(DRAW_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    }
    if (!map.getLayer(DRAW_FILL_LAYER)) {
      map.addLayer({
        id: DRAW_FILL_LAYER,
        type: 'fill',
        source: DRAW_SOURCE,
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': '#9a2b2b', 'fill-opacity': 0.18 },
      });
    }
    if (!map.getLayer(DRAW_LINE_LAYER)) {
      map.addLayer({
        id: DRAW_LINE_LAYER,
        type: 'line',
        source: DRAW_SOURCE,
        filter: ['!=', ['geometry-type'], 'Point'],
        paint: { 'line-color': '#9a2b2b', 'line-width': 2, 'line-dasharray': [2, 2] },
      });
    }
    if (!map.getLayer(DRAW_POINTS_LAYER)) {
      map.addLayer({
        id: DRAW_POINTS_LAYER,
        type: 'circle',
        source: DRAW_SOURCE,
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': 5,
          'circle-color': '#ffffff',
          'circle-stroke-color': '#9a2b2b',
          'circle-stroke-width': 2,
        },
      });
    }
  }
}

interface MapToolsProps {
  styles: MapStyleOption[];
  activeStyleId: MapStyleOption['id'];
  onStyleChange: (id: MapStyleOption['id']) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetNorth: () => void;
  onLocate: () => void;
  bearing: number;
  scale: MapScaleState;
  locationState: 'idle' | 'locating' | 'error';
}

function MapTools({
  styles,
  activeStyleId,
  onStyleChange,
  onZoomIn,
  onZoomOut,
  onResetNorth,
  onLocate,
  bearing,
  scale,
  locationState,
}: MapToolsProps) {
  return (
    <div
      data-chronotop-map-tools
      className="pointer-events-none absolute left-3 top-3 z-[60] flex max-w-[min(18rem,calc(100vw-1.5rem))] flex-col gap-2"
      aria-label="Kartenwerkzeuge"
    >
      <div className="pointer-events-auto overflow-hidden rounded-md border border-white/55 bg-white/72 shadow-xl backdrop-blur-md">
        <label className="block border-b border-white/55 px-2.5 py-1.5">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-500">Darstellung</span>
          <select
            value={activeStyleId}
            onChange={event => onStyleChange(event.target.value as MapStyleOption['id'])}
            className="mt-1 w-full bg-transparent text-sm font-semibold text-ink-800 outline-none"
            aria-label="Kartendarstellung auswählen"
          >
            {styles.map(style => (
              <option key={style.id} value={style.id}>
                {style.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-4 divide-x divide-white/55">
          <MapToolButton label="Vergrößern" onClick={onZoomIn}>+</MapToolButton>
          <MapToolButton label="Verkleinern" onClick={onZoomOut}>−</MapToolButton>
          <MapToolButton label="Karte nach Norden ausrichten" onClick={onResetNorth}>
            <span
              className="inline-block font-serif text-sm font-bold"
              style={{ transform: `rotate(${-bearing}deg)` }}
              aria-hidden="true"
            >
              N
            </span>
          </MapToolButton>
          <MapToolButton
            label={locationState === 'locating' ? 'Standort wird gesucht' : 'Eigenen Standort anzeigen'}
            onClick={onLocate}
          >
            {locationState === 'locating' ? '...' : 'Ort'}
          </MapToolButton>
        </div>
      </div>

      <div className="pointer-events-auto w-fit rounded-md border border-white/55 bg-white/68 px-2.5 py-1.5 text-ink-700 shadow-lg backdrop-blur-md">
        <div className="h-1 border-x border-t border-ink-700" style={{ width: scale.width }} aria-hidden="true" />
        <div className="mt-1 text-[11px] font-semibold leading-none">{scale.label}</div>
      </div>

      {locationState === 'error' && (
        <div className="pointer-events-auto max-w-[14rem] rounded-md border border-burgundy-200 bg-white/82 px-2.5 py-1.5 text-[11px] font-semibold text-burgundy-700 shadow-lg backdrop-blur-md">
          Standort nicht verfügbar
        </div>
      )}
    </div>
  );
}

function MapToolButton({ label, onClick, children }: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-9 min-w-10 items-center justify-center bg-white/34 text-base font-bold text-ink-700 transition-colors hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-burgundy-300"
    >
      {children}
    </button>
  );
}

function updateMapChromeState(
  map: maplibregl.Map,
  setBearing: (value: number) => void,
  setScale: (value: MapScaleState) => void,
) {
  setBearing(normalizeBearing(map.getBearing()));
  setScale(calculateScaleState(map));
}

function calculateScaleState(map: maplibregl.Map): MapScaleState {
  const canvas = map.getCanvas();
  const samplePx = 100;
  const y = Math.max(24, canvas.clientHeight - 72);
  const left = map.unproject([0, y]);
  const right = map.unproject([samplePx, y]);
  const metersForSample = Math.max(1, haversineMeters(left.lat, left.lng, right.lat, right.lng));
  const niceMeters = niceScaleDistance(metersForSample);
  return {
    label: formatScaleDistance(niceMeters),
    width: Math.max(42, Math.min(128, Math.round((niceMeters / metersForSample) * samplePx))),
  };
}

function normalizeBearing(value: number): number {
  const normalized = ((value % 360) + 360) % 360;
  return normalized > 180 ? normalized - 360 : normalized;
}

function niceScaleDistance(maxMeters: number): number {
  const exponent = Math.floor(Math.log10(maxMeters));
  const base = 10 ** exponent;
  const fraction = maxMeters / base;
  const niceFraction = fraction >= 5 ? 5 : fraction >= 2 ? 2 : 1;
  return niceFraction * base;
}

function formatScaleDistance(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    return `${km >= 10 ? Math.round(km) : Number(km.toFixed(1))} km`;
  }
  return `${Math.round(meters)} m`;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadius = 6371008.8;
  const toRad = Math.PI / 180;
  const phi1 = lat1 * toRad;
  const phi2 = lat2 * toRad;
  const dPhi = (lat2 - lat1) * toRad;
  const dLambda = (lon2 - lon1) * toRad;
  const a = Math.sin(dPhi / 2) ** 2
    + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface RevealSelectedEventOptions {
  force: boolean;
  routeMaxZoom: number;
  move: (action: () => void) => void;
}

function revealSelectedEvent(
  map: maplibregl.Map,
  event: ChronotopEvent,
  movementCoords: [number, number][],
  options: RevealSelectedEventOptions,
) {
  if (!event.place) return;
  const revealPadding = overlayAwareRevealPadding(
    map,
    options.force ? MAP_FORCE_REVEAL_PADDING : MAP_AUTO_REVEAL_PADDING,
  );
  const coords = movementCoords.length > 1
    ? movementCoords
    : event.place.geometry
      ? collectCoordinates(event.place.geometry.coordinates)
      : [[event.place.lng, event.place.lat] as [number, number]];
  if (coords.length === 0) return;

  if (!options.force && isScreenBoundsVisible(map, coords, revealPadding)) return;

  if (coords.length === 1) {
    const targetZoom = options.force
      ? Math.max(map.getZoom(), 13)
      : Math.max(map.getZoom(), 11.8);
    options.move(() => {
      map.easeTo({
        center: coords[0],
        zoom: targetZoom,
        padding: revealPadding,
        duration: options.force ? 640 : 480,
        essential: true,
      });
    });
    return;
  }

  const bounds = boundsFromCoordinates(coords);
  if (!bounds) return;
  const screenBox = screenBoundsForCoordinates(map, coords);
  const canPanAtCurrentZoom = !options.force
    && screenBox
    && screenBoxFitsSafeSize(map, screenBox, revealPadding, 0.86);

  if (canPanAtCurrentZoom) {
    options.move(() => {
      map.easeTo({
        center: bounds.getCenter(),
        zoom: map.getZoom(),
        padding: revealPadding,
        duration: 500,
        essential: true,
      });
    });
    return;
  }

  const isLine = movementCoords.length > 1 || event.place.geometry?.type.includes('LineString');
  options.move(() => {
    map.fitBounds(bounds, {
      padding: revealPadding,
      duration: options.force ? 720 : 560,
      maxZoom: isLine ? options.routeMaxZoom : maxZoomForBounds(bounds),
      essential: true,
    });
  });
}

function overlayAwareRevealPadding(map: maplibregl.Map, base: RevealPadding): RevealPadding {
  if (typeof document === 'undefined') return base;
  const mapRect = map.getContainer().getBoundingClientRect();
  const padding: RevealPadding = { ...base };
  const dock = document.querySelector<HTMLElement>('[data-chronotop-timeline-dock]');
  const sheet = document.querySelector<HTMLElement>('[data-chronotop-context-sheet]');
  const filterSheet = document.querySelector<HTMLElement>('[data-chronotop-filter-sheet]');

  if (dock) {
    const dockRect = dock.getBoundingClientRect();
    if (rectsOverlap(mapRect, dockRect)) {
      padding.bottom = Math.max(padding.bottom, Math.ceil(mapRect.bottom - Math.max(mapRect.top, dockRect.top) + 18));
    }
  }

  if (sheet) {
    const sheetRect = sheet.getBoundingClientRect();
    if (rectsOverlap(mapRect, sheetRect)) {
      if (sheetRect.left > mapRect.left + mapRect.width * 0.48) {
        padding.right = Math.max(padding.right, Math.ceil(mapRect.right - Math.max(mapRect.left, sheetRect.left) + 22));
      } else {
        padding.bottom = Math.max(padding.bottom, Math.ceil(mapRect.bottom - Math.max(mapRect.top, sheetRect.top) + 22));
      }
    }
  }

  if (filterSheet) {
    const filterRect = filterSheet.getBoundingClientRect();
    if (rectsOverlap(mapRect, filterRect)) {
      padding.right = Math.max(padding.right, Math.ceil(mapRect.right - Math.max(mapRect.left, filterRect.left) + 22));
    }
  }

  return clampRevealPadding(mapRect, padding);
}

function rectsOverlap(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function clampRevealPadding(rect: DOMRect, padding: RevealPadding): RevealPadding {
  const next = { ...padding };
  const maxHorizontal = Math.max(0, rect.width - 96);
  const horizontal = next.left + next.right;
  if (horizontal > maxHorizontal && horizontal > 0) {
    const scale = maxHorizontal / horizontal;
    next.left = Math.floor(next.left * scale);
    next.right = Math.floor(next.right * scale);
  }

  const maxVertical = Math.max(0, rect.height - 96);
  const vertical = next.top + next.bottom;
  if (vertical > maxVertical && vertical > 0) {
    const scale = maxVertical / vertical;
    next.top = Math.floor(next.top * scale);
    next.bottom = Math.floor(next.bottom * scale);
  }

  return next;
}

function boundsFromCoordinates(coords: [number, number][]): maplibregl.LngLatBounds | null {
  if (coords.length === 0) return null;
  const bounds = new maplibregl.LngLatBounds(coords[0], coords[0]);
  coords.slice(1).forEach(coord => bounds.extend(coord));
  return bounds;
}

function isScreenBoundsVisible(
  map: maplibregl.Map,
  coords: [number, number][],
  padding: { top: number; right: number; bottom: number; left: number },
): boolean {
  const box = screenBoundsForCoordinates(map, coords);
  if (!box) return false;
  const safe = safeScreenArea(map, padding);
  return box.minX >= safe.minX
    && box.maxX <= safe.maxX
    && box.minY >= safe.minY
    && box.maxY <= safe.maxY;
}

function screenBoxFitsSafeSize(
  map: maplibregl.Map,
  box: ScreenBounds,
  padding: { top: number; right: number; bottom: number; left: number },
  ratio: number,
): boolean {
  const safe = safeScreenArea(map, padding);
  return (box.maxX - box.minX) <= (safe.maxX - safe.minX) * ratio
    && (box.maxY - box.minY) <= (safe.maxY - safe.minY) * ratio;
}

interface ScreenBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function screenBoundsForCoordinates(map: maplibregl.Map, coords: [number, number][]): ScreenBounds | null {
  if (coords.length === 0) return null;
  return coords.reduce<ScreenBounds | null>((bounds, coord) => {
    const point = map.project(coord);
    if (!bounds) {
      return { minX: point.x, minY: point.y, maxX: point.x, maxY: point.y };
    }
    return {
      minX: Math.min(bounds.minX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxX: Math.max(bounds.maxX, point.x),
      maxY: Math.max(bounds.maxY, point.y),
    };
  }, null);
}

function safeScreenArea(
  map: maplibregl.Map,
  padding: { top: number; right: number; bottom: number; left: number },
): ScreenBounds {
  const canvas = map.getCanvas();
  return {
    minX: padding.left,
    minY: padding.top,
    maxX: canvas.clientWidth - padding.right,
    maxY: canvas.clientHeight - padding.bottom,
  };
}

function findClickableFeature(map: maplibregl.Map, point: maplibregl.PointLike): maplibregl.MapGeoJSONFeature | null {
  const layers = INTERACTIVE_LAYER_PRIORITY.filter(layer => !!map.getLayer(layer));
  if (layers.length === 0) return null;
  const p = normalizeScreenPoint(point);
  const bbox: [[number, number], [number, number]] = [
    [p.x - MAP_HIT_TEST_PADDING, p.y - MAP_HIT_TEST_PADDING],
    [p.x + MAP_HIT_TEST_PADDING, p.y + MAP_HIT_TEST_PADDING],
  ];
  const features = map.queryRenderedFeatures(bbox, { layers })
    .filter(feature => String(feature.properties?.eventId ?? ''));
  if (features.length === 0) return null;
  return features.sort((a, b) =>
    layerPriority(a.layer.id) - layerPriority(b.layer.id)
    || featureDistanceToPoint(map, a, p) - featureDistanceToPoint(map, b, p)
  )[0] ?? null;
}

function layerPriority(layerId: string): number {
  const index = INTERACTIVE_LAYER_PRIORITY.indexOf(layerId);
  return index === -1 ? INTERACTIVE_LAYER_PRIORITY.length : index;
}

function normalizeScreenPoint(point: maplibregl.PointLike): { x: number; y: number } {
  return Array.isArray(point) ? { x: point[0], y: point[1] } : { x: point.x, y: point.y };
}

function featureDistanceToPoint(
  map: maplibregl.Map,
  feature: maplibregl.MapGeoJSONFeature,
  point: { x: number; y: number },
): number {
  return geometryDistanceToPoint(map, feature.geometry, point);
}

function geometryDistanceToPoint(
  map: maplibregl.Map,
  geometry: GeoJSON.Geometry,
  point: { x: number; y: number },
): number {
  switch (geometry.type) {
    case 'Point':
      return lngLatDistance(map, geometry.coordinates, point);
    case 'MultiPoint':
      return Math.min(...geometry.coordinates.map(coord => lngLatDistance(map, coord, point)));
    case 'LineString':
      return lineDistance(map, geometry.coordinates, point);
    case 'MultiLineString':
      return Math.min(...geometry.coordinates.map(line => lineDistance(map, line, point)));
    case 'Polygon':
      return polygonDistance(map, geometry.coordinates, point);
    case 'MultiPolygon':
      return Math.min(...geometry.coordinates.map(polygon => polygonDistance(map, polygon, point)));
    default:
      return Number.POSITIVE_INFINITY;
  }
}

function lngLatDistance(map: maplibregl.Map, coord: GeoJSON.Position, point: { x: number; y: number }): number {
  const projected = map.project([coord[0], coord[1]]);
  return Math.hypot(projected.x - point.x, projected.y - point.y);
}

function lineDistance(map: maplibregl.Map, coords: GeoJSON.Position[], point: { x: number; y: number }): number {
  if (coords.length === 0) return Number.POSITIVE_INFINITY;
  const projected = coords.map(coord => normalizeScreenPoint(map.project([coord[0], coord[1]])));
  if (projected.length === 1) return pointDistance(projected[0], point);
  let min = Number.POSITIVE_INFINITY;
  for (let i = 1; i < projected.length; i += 1) {
    min = Math.min(min, segmentDistance(point, projected[i - 1], projected[i]));
  }
  return min;
}

function polygonDistance(map: maplibregl.Map, rings: GeoJSON.Position[][], point: { x: number; y: number }): number {
  const projectedRings = rings.map(ring => ring.map(coord => normalizeScreenPoint(map.project([coord[0], coord[1]]))));
  if (projectedRings.length === 0) return Number.POSITIVE_INFINITY;
  if (pointInPolygon(point, projectedRings)) return 0;
  return Math.min(...projectedRings.map(ring => ringDistance(ring, point)));
}

function ringDistance(ring: Array<{ x: number; y: number }>, point: { x: number; y: number }): number {
  if (ring.length === 0) return Number.POSITIVE_INFINITY;
  if (ring.length === 1) return pointDistance(ring[0], point);
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < ring.length; i += 1) {
    min = Math.min(min, segmentDistance(point, ring[i], ring[(i + 1) % ring.length]));
  }
  return min;
}

function pointInPolygon(point: { x: number; y: number }, rings: Array<Array<{ x: number; y: number }>>): boolean {
  if (rings.length === 0 || !pointInRing(point, rings[0])) return false;
  return !rings.slice(1).some(ring => pointInRing(point, ring));
}

function pointInRing(point: { x: number; y: number }, ring: Array<{ x: number; y: number }>): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const pi = ring[i];
    const pj = ring[j];
    const intersects = (pi.y > point.y) !== (pj.y > point.y)
      && point.x < ((pj.x - pi.x) * (point.y - pi.y)) / ((pj.y - pi.y) || Number.EPSILON) + pi.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function segmentDistance(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return pointDistance(point, start);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  return pointDistance(point, { x: start.x + t * dx, y: start.y + t * dy });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
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

function movementNodeFeatures(
  movement: { id: string; eventId?: string | null; name?: string; description?: string; coordinates: number[][] },
  movementIndex: number,
  visualKind: MovementVisualKind,
  color: string,
  focusMatch = false,
  focusMuted = false,
) {
  const labels = movementNodeLabels(movement);
  if (labels.length === 0) return [];
  return labels
    .filter(node => movement.coordinates[node.index])
    .map((node, nodeIndex) => ({
      type: 'Feature' as const,
      id: `node-${movementIndex}-${nodeIndex}`,
      properties: {
        kind: 'movement-node',
        movementId: movement.id,
        eventId: movement.eventId ?? '',
        name: node.label,
        description: movement.description ?? '',
        color,
        visualKind,
        nodeRole: node.role,
        focusMatch,
        focusMuted,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: movement.coordinates[node.index],
      },
    }));
}

function movementNodeLabels(movement: { id: string; name?: string; coordinates: number[][] }): MovementNodeLabel[] {
  const text = `${movement.id} ${movement.name ?? ''}`.toLowerCase();
  const last = movement.coordinates.length - 1;
  if (last < 1) return [];
  if (text.includes('es-mv02a')) {
    const nodes: MovementNodeLabel[] = [
      { index: 0, label: 'Esslingen Bahnhof', role: 'start' },
      { index: Math.min(3, last), label: 'Untertuerkheim / Neckartal', role: 'stop' },
      { index: Math.min(8, last), label: 'Bad Cannstatt Bahnraum', role: 'stop' },
      { index: last, label: 'Stuttgart Nordbahnhof', role: 'end' },
    ];
    return uniqueMovementNodes(nodes, last);
  }
  if (text.includes('es-mv02b')) {
    const nodes: MovementNodeLabel[] = [
      { index: 0, label: 'Killesberg Sammelplatz', role: 'stop' },
      { index: Math.min(2, last), label: 'Stuttgarter Stadtbezug', role: 'stop' },
      { index: last, label: 'Stuttgart Nordbahnhof', role: 'end' },
    ];
    return uniqueMovementNodes(nodes, last);
  }
  if (text.includes('pogromweg')) {
    return [
      { index: 0, label: 'Marktplatz', role: 'start' },
      { index: Math.min(2, last), label: 'Synagoge Im Heppaecher', role: 'stop' },
      { index: last, label: 'Wilhelmspflege', role: 'end' },
    ];
  }
  if (text.includes('kriegsende')) {
    const nodes: MovementNodeLabel[] = [
      { index: 0, label: 'Waeldenbronn', role: 'start' },
      { index: 1, label: 'Esslinger Innenstadt', role: 'stop' },
      { index: last, label: 'Pliensaubruecke', role: 'end' },
    ];
    return uniqueMovementNodes(nodes, last);
  }
  return [
    { index: 0, label: 'Start', role: 'start' },
    { index: last, label: 'Ziel', role: 'end' },
  ];
}

function uniqueMovementNodes(nodes: MovementNodeLabel[], last: number): MovementNodeLabel[] {
  return nodes.filter((node, index, all) =>
    node.index <= last && all.findIndex(other => other.index === node.index) === index
  );
}

function fitMapToCoordinates(map: maplibregl.Map, coords: [number, number][], maxZoom = 10) {
  if (coords.length === 0) return;
  if (coords.length === 1) {
    map.easeTo({
      center: coords[0],
      zoom: Math.max(map.getZoom(), maxZoom),
      duration: 650,
    });
    return;
  }
  const lngs = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);
  map.fitBounds([
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ], {
    padding: 84,
    maxZoom,
    duration: 900,
  });
}

function fitMapToGeometry(map: maplibregl.Map, geometry: PlaceGeometry, maxZoom?: number) {
  const coords = collectCoordinates(geometry.coordinates);
  if (coords.length === 1) {
    map.easeTo({
      center: coords[0],
      zoom: Math.max(map.getZoom(), maxZoom ?? 13),
      duration: 650,
    });
    return;
  }
  const bounds = computeGeometryBounds(geometry);
  if (!bounds) return;
  map.fitBounds(bounds, {
    padding: 80,
    maxZoom: maxZoom ?? maxZoomForBounds(bounds),
    duration: 650,
  });
}

function maxZoomForBounds(boundsLike: maplibregl.LngLatBoundsLike): number {
  const bounds = maplibregl.LngLatBounds.convert(boundsLike);
  const span = Math.max(
    Math.abs(bounds.getEast() - bounds.getWest()),
    Math.abs(bounds.getNorth() - bounds.getSouth()),
  );
  if (span < 0.025) return 14.5;
  if (span < 0.12) return 12.8;
  if (span < 0.3) return 11.5;
  if (span < 1.2) return 10;
  return 7;
}

function computeGeometryBounds(geom: PlaceGeometry): maplibregl.LngLatBoundsLike | null {
  const coords = collectCoordinates(geom.coordinates);
  if (coords.length === 0) return null;
  const lngs = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

function extendBoundsWithPlace(bounds: maplibregl.LngLatBounds, place: Place) {
  if (place.geometry) {
    collectCoordinates(place.geometry.coordinates).forEach(coord => bounds.extend(coord));
    return;
  }
  bounds.extend([place.lng, place.lat]);
}

function collectCoordinates(value: unknown): [number, number][] {
  const coords: [number, number][] = [];
  const visit = (v: unknown) => {
    if (Array.isArray(v) && typeof v[0] === 'number' && typeof v[1] === 'number') {
      coords.push([v[0], v[1]]);
    } else if (Array.isArray(v)) {
      v.forEach(visit);
    }
  };
  visit(value);
  return coords;
}

function isLngLatPair(value: unknown): value is [number, number] {
  return Array.isArray(value)
    && typeof value[0] === 'number'
    && typeof value[1] === 'number';
}
