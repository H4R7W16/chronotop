import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Globale Error-Boundary. Verhindert, dass ein Render-Fehler in einer Komponente
 * die ganze App in den weißen Bildschirm schickt. Statt dessen sehen Nutzer:innen
 * eine Fehlermeldung und können neu laden.
 *
 * In Produktion würde hier zusätzlich ein Logging-Service (Sentry o.ä.)
 * benachrichtigt werden.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('[Chronotop] Unbehandelter Fehler:', error, info);
  }

  handleReload = (): void => {
    this.setState({ error: null });
    window.location.reload();
  };

  handleReset = (): void => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div role="alert" className="min-h-screen flex items-center justify-center p-6 bg-parchment-50">
        <div className="max-w-lg bg-white border border-burgundy-200 rounded-lg shadow-md p-6">
          <div className="text-3xl mb-3" aria-hidden>⚠</div>
          <h1 className="font-serif text-2xl font-semibold text-burgundy-700 mb-2">
            Ein unerwarteter Fehler ist aufgetreten
          </h1>
          <p className="text-ink-600 text-sm leading-relaxed mb-4">
            Die Anwendung ist auf ein Problem gestoßen, das nicht gefangen wurde.
            Das ist ein Bug. Du kannst die Seite neu laden — das sollte den
            normalen Zustand wiederherstellen.
          </p>
          <details className="text-xs text-ink-500 bg-parchment-100 rounded p-3 mb-4">
            <summary className="cursor-pointer font-medium">Technische Details</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px]">
              {error.message}
              {error.stack ? `\n\n${error.stack.split('\n').slice(0, 10).join('\n')}` : ''}
            </pre>
          </details>
          <div className="flex gap-2">
            <button onClick={this.handleReload}
              className="bg-burgundy-500 hover:bg-burgundy-600 text-white px-4 py-2 rounded-md font-medium text-sm">
              Seite neu laden
            </button>
            <button onClick={this.handleReset}
              className="border border-parchment-300 px-4 py-2 rounded-md text-sm text-ink-600 hover:bg-parchment-100">
              Trotzdem fortsetzen
            </button>
          </div>
        </div>
      </div>
    );
  }
}
