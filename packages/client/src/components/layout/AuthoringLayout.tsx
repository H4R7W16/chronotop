import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import { useModuleData } from '../../hooks/useModuleData.js';
import { useUrlSync } from '../../hooks/useUrlSync.js';
import { usePersistentPanelSize } from '../../hooks/usePersistentPanelSize.js';
import { MapView } from '../map/MapView.js';
import { TimelineView } from '../timeline/TimelineView.js';
import { DetailPanel } from '../detail/DetailPanel.js';
import { AuthorSidebar } from '../author/AuthorSidebar.js';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { useAuthStore, hasMinRole } from '../../store/useAuthStore.js';
import { DrawContext } from '../author/drawContext.js';
import { AuthorModeProvider } from '../author/authorModeContext.js';

type AuthorPreset = 'map' | 'edit' | 'review';

const AUTHOR_PRESETS: Record<AuthorPreset, { label: string; left: number; detail: number; timeline: number }> = {
  map:    { label: 'Karte', left: 320, detail: 360, timeline: 150 },
  edit:   { label: 'Bearbeiten', left: 400, detail: 460, timeline: 190 },
  review: { label: 'Prüfen', left: 340, detail: 560, timeline: 240 },
};

export function AuthoringLayout() {
  useModuleData();
  useUrlSync();
  const { moduleId } = useParams<{ moduleId: string }>();
  const selectedEventId = useChronotopStore(s => s.selectedEventId);
  const fullscreen = useChronotopStore(s => s.fullscreen);
  const setDemoDraftMode = useChronotopStore(s => s.setDemoDraftMode);
  const [mapClickLngLat, setMapClickLngLat] = useState<{ lng: number; lat: number } | null>(null);
  const [drawMode, setDrawMode] = useState<'polygon' | 'movement' | null>(null);
  const [drawPoints, setDrawPoints] = useState<number[][]>([]);
  const [preset, setPreset] = useState<AuthorPreset>('edit');

  const leftPanel = usePersistentPanelSize(`author:${moduleId ?? 'module'}:left`, 380, 300, 540);
  const detailPanel = usePersistentPanelSize(`author:${moduleId ?? 'module'}:detail`, 460, 340, 680);
  const timelinePanel = usePersistentPanelSize(`author:${moduleId ?? 'module'}:timeline`, 190, 128, 320);

  const user = useAuthStore(s => s.user);
  const moduleRoles = useAuthStore(s => s.moduleRoles);
  const fetchModuleRole = useAuthStore(s => s.fetchModuleRole);
  const effectiveRole = moduleId ? (moduleRoles[moduleId] ?? user?.role ?? 'viewer') : (user?.role ?? 'viewer');
  const canEdit = hasMinRole(effectiveRole, 'author');

  useEffect(() => {
    if (moduleId && user) fetchModuleRole(moduleId);
  }, [moduleId, user, fetchModuleRole]);

  useEffect(() => {
    setDemoDraftMode(!canEdit);
  }, [canEdit, setDemoDraftMode]);

  const handleMapClick = useCallback((lngLat: { lng: number; lat: number }) => {
    setMapClickLngLat(lngLat);
  }, []);

  const handleDrawClick = useCallback((lngLat: { lng: number; lat: number }) => {
    setDrawPoints(prev => [...prev, [lngLat.lng, lngLat.lat]]);
  }, []);

  const applyPreset = (next: AuthorPreset) => {
    const values = AUTHOR_PRESETS[next];
    setPreset(next);
    leftPanel.setSize(values.left);
    detailPanel.setSize(values.detail);
    timelinePanel.setSize(values.timeline);
  };

  return (
    <AuthorModeProvider canPersist={canEdit}>
      <DrawContext.Provider value={{ drawMode, setDrawMode, drawPoints, setDrawPoints }}>
        <div className="h-full min-h-0 flex flex-col bg-white">
          {!canEdit && (
            <div className="w-full bg-amber-50 border-b border-amber-300 px-3 md:px-4 py-2 text-xs md:text-sm text-amber-900 flex flex-wrap items-center gap-x-2 gap-y-1 shrink-0">
              <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold" aria-hidden="true">Demo</span>
              <strong>Autorentool zum Testen</strong>
              <span>Lokale Änderungen werden nicht gespeichert, können aber unter Exportieren heruntergeladen werden.</span>
            </div>
          )}

          <div className="shrink-0 border-b border-parchment-200 bg-parchment-50/95 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="font-serif italic text-ink-500">Autoren-Workbench</div>
            <div className="flex items-center gap-1 rounded-md border border-parchment-300 bg-white p-0.5">
              {(Object.keys(AUTHOR_PRESETS) as AuthorPreset[]).map(id => (
                <button
                  key={id}
                  type="button"
                  onClick={() => applyPreset(id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    preset === id
                      ? 'bg-burgundy-600 text-white'
                      : 'text-ink-500 hover:bg-parchment-100 hover:text-ink-800'
                  }`}
                >
                  {AUTHOR_PRESETS[id].label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col xl:flex-row">
            {!fullscreen && (
              <>
                <aside
                  className="w-full min-w-0 xl:w-[var(--author-left)] xl:min-w-[300px] xl:max-w-[540px] xl:h-full xl:border-r border-b xl:border-b-0 border-parchment-300 shrink-0 max-h-[38vh] xl:max-h-none"
                  style={{ '--author-left': `${leftPanel.size}px` } as CSSProperties}
                >
                  <AuthorSidebar mapClickLngLat={mapClickLngLat} />
                </aside>
                <button
                  type="button"
                  aria-label="Autorenliste verbreitern oder verkleinern"
                  onPointerDown={event => leftPanel.beginDrag(event, 'x', 1)}
                  className="hidden xl:block w-1.5 shrink-0 cursor-col-resize border-x border-parchment-200 bg-parchment-100 hover:bg-burgundy-100 focus:outline-none focus:ring-2 focus:ring-burgundy-300"
                  title="Autorenliste ziehen"
                />
              </>
            )}

            <div className="flex-1 min-w-0 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 relative">
                <MapView
                  onMapClick={handleMapClick}
                  drawMode={drawMode}
                  drawPoints={drawPoints}
                  onDrawClick={handleDrawClick}
                />
                {(drawMode === 'polygon' || drawMode === 'movement') && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white border border-burgundy-300 shadow-lg rounded-md px-4 py-2 text-sm flex flex-wrap items-center gap-3 z-10">
                    <span className="text-ink-700">
                      {drawMode === 'movement' ? 'Route zeichnen' : 'Polygon zeichnen'}: Klick fügt Punkt hinzu
                      <span className="text-ink-400 ml-2">({drawPoints.length} {drawPoints.length === 1 ? 'Punkt' : 'Punkte'})</span>
                    </span>
                    <button
                      onClick={() => setDrawPoints(prev => prev.slice(0, -1))}
                      disabled={drawPoints.length === 0}
                      className="text-xs px-2 py-1 border border-parchment-300 rounded hover:bg-parchment-100 disabled:opacity-40">
                      Letzten Punkt löschen
                    </button>
                    <button
                      onClick={() => { setDrawMode(null); setDrawPoints([]); }}
                      className="text-xs px-2 py-1 border border-parchment-300 rounded hover:bg-parchment-100">
                      Abbrechen
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                aria-label="Zeitleiste höher oder niedriger ziehen"
                onPointerDown={event => timelinePanel.beginDrag(event, 'y', -1)}
                className="h-1.5 shrink-0 cursor-row-resize border-y border-parchment-200 bg-parchment-100 hover:bg-burgundy-100 focus:outline-none focus:ring-2 focus:ring-burgundy-300"
                title="Zeitleiste ziehen"
              />
              <div className="shrink-0 min-h-[7rem] max-h-[20rem] border-t border-parchment-300 bg-white" style={{ height: timelinePanel.size }}>
                <TimelineView />
              </div>
            </div>

            {!fullscreen && selectedEventId && (
              <>
                <button
                  type="button"
                  aria-label="Detailbereich verbreitern oder verkleinern"
                  onPointerDown={event => detailPanel.beginDrag(event, 'x', -1)}
                  className="hidden xl:block w-1.5 shrink-0 cursor-col-resize border-x border-parchment-200 bg-parchment-100 hover:bg-burgundy-100 focus:outline-none focus:ring-2 focus:ring-burgundy-300"
                  title="Detailbereich ziehen"
                />
                <aside
                  className="w-full min-w-0 xl:w-[var(--author-detail)] xl:min-w-[340px] xl:max-w-[680px] bg-white border-t xl:border-t-0 xl:border-l border-parchment-300 shrink-0 transition-all overflow-hidden h-72 xl:h-auto"
                  style={{ '--author-detail': `${detailPanel.size}px` } as CSSProperties}
                >
                  <DetailPanel />
                </aside>
              </>
            )}
          </div>
        </div>
      </DrawContext.Provider>
    </AuthorModeProvider>
  );
}
