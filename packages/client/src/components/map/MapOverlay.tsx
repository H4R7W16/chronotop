import { useChronotopStore } from '../../store/useChronotopStore.js';

export function MapOverlay() {
  const fullscreen = useChronotopStore(s => s.fullscreen);
  const setFullscreen = useChronotopStore(s => s.setFullscreen);

  return (
    <div className="pointer-events-none absolute right-14 top-3 z-10 flex items-center gap-2">
      <button
        type="button"
        onClick={() => setFullscreen(!fullscreen)}
        title={fullscreen ? 'Vollbild beenden' : 'Karte im Vollbild anzeigen'}
        className="pointer-events-auto min-h-[40px] rounded-md border border-ink-100 bg-white/92 px-3 text-sm font-semibold text-ink-700 shadow-md backdrop-blur hover:bg-white"
        aria-label={fullscreen ? 'Vollbild beenden' : 'Vollbild'}
      >
        {fullscreen ? 'Verkleinern' : 'Vollbild'}
      </button>
    </div>
  );
}
