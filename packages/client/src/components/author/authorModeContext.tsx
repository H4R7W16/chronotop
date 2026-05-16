import { createContext, useContext, useMemo } from 'react';
import { toast } from '../system/toast.js';

interface AuthorModeValue {
  canPersist: boolean;
  isDemoMode: boolean;
  blockPersist: (action?: string) => boolean;
}

const AuthorModeContext = createContext<AuthorModeValue>({
  canPersist: true,
  isDemoMode: false,
  blockPersist: () => false,
});

export function AuthorModeProvider({
  canPersist,
  children,
}: {
  canPersist: boolean;
  children: React.ReactNode;
}) {
  const value = useMemo<AuthorModeValue>(() => ({
    canPersist,
    isDemoMode: !canPersist,
    blockPersist: (action = 'Diese Funktion') => {
      if (canPersist) return false;
      toast.info(`${action} braucht eine Anmeldung mit Autorenrolle. Normale Bearbeitungen werden in der Demo nur lokal im Browser gespeichert und koennen exportiert werden.`);
      return true;
    },
  }), [canPersist]);

  return (
    <AuthorModeContext.Provider value={value}>
      {children}
    </AuthorModeContext.Provider>
  );
}

export function useAuthorMode() {
  return useContext(AuthorModeContext);
}

export function DemoModeNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rounded border border-amber-200 bg-amber-50 text-amber-900 ${compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'}`}>
      <p className="font-semibold">Demo-Modus</p>
      <p className="mt-1 leading-relaxed">
        Du kannst das Autorentool testen und lokal im Browser bearbeiten.
        Die Änderungen werden nicht auf dem Server gespeichert, koennen aber als Modul-Entwurf exportiert werden.
      </p>
    </div>
  );
}
