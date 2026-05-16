import { useToastStore } from './toast.js';

/**
 * Render-Container für Toasts. In `App.tsx` einmalig einbinden.
 * Toasts werden von überall im Code mit `toast.info(...)`, `toast.success(...)`,
 * `toast.error(...)` aus `./toast.js` ausgelöst.
 */
export function ToastHost() {
  const toasts = useToastStore(s => s.toasts);
  const dismiss = useToastStore(s => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Benachrichtigungen"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm"
    >
      {toasts.map(t => {
        const styles = {
          info:    'bg-ink-700 text-parchment-100 border-ink-600',
          success: 'bg-verdigris-500 text-white border-verdigris-600',
          error:   'bg-burgundy-500 text-white border-burgundy-700',
        }[t.kind];
        const icon = { info: 'ℹ', success: '✓', error: '⚠' }[t.kind];

        return (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto rounded-md shadow-lg border px-4 py-2.5 flex items-start gap-3 text-sm animate-in slide-in-from-right-4 ${styles}`}
          >
            <span className="text-base leading-none mt-0.5" aria-hidden>{icon}</span>
            <div className="flex-1 leading-snug">{t.message}</div>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Schließen"
              className="text-current/80 hover:text-current text-base leading-none"
            >×</button>
          </div>
        );
      })}
    </div>
  );
}
