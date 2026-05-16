import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useLocalized } from '../../i18n/useLocalized.js';

export function Header() {
  const { t } = useTranslation();
  const loc = useLocalized();
  const location = useLocation();
  const navigate = useNavigate();
  const moduleId = useChronotopStore(s => s.currentModuleId);
  const modules = useChronotopStore(s => s.modules);
  const searchQuery = useChronotopStore(s => s.searchQuery);
  const setSearchQuery = useChronotopStore(s => s.setSearchQuery);
  const currentModule = modules.find(m => m.id === moduleId);
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);

  const isActive = (path: string) => location.pathname.startsWith(path);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="bg-white text-ink-800 border-b border-ink-100 shrink-0 shadow-sm">
      <div className="px-3 md:px-5 py-2 flex flex-wrap lg:flex-nowrap items-center gap-2 md:gap-4">
        <Link to="/" className="flex items-center gap-3 hover:text-burgundy-600 transition-colors shrink-0">
          <span className="h-8 w-8 rounded-md bg-ink-800 text-white flex items-center justify-center font-serif font-semibold">
            C
          </span>
          <div className="min-w-0">
            <h1 className="text-sm md:text-base font-semibold leading-tight tracking-normal">
              {t('app.title')}
            </h1>
            <p className="hidden sm:block text-[11px] text-ink-400 leading-tight">
              {t('app.subtitle')}
            </p>
          </div>
        </Link>

        {currentModule && (
          <div className="hidden xl:flex min-w-0 items-center gap-2 pl-4 border-l border-ink-100">
            <span className="text-[10px] uppercase tracking-wide text-ink-400">
              Modul
            </span>
            <span className="truncate text-sm font-medium text-ink-700 max-w-[18rem] 2xl:max-w-[28rem]">
              {loc(currentModule.title)}
            </span>
          </div>
        )}

        {moduleId && (
          <div className="order-3 w-full sm:order-none sm:w-auto sm:ml-auto relative">
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Im Modul suchen..."
              className="w-full sm:w-52 lg:w-64 pl-8 pr-8 py-1.5 rounded-md text-sm bg-ink-50 border border-ink-100 placeholder-ink-300 text-ink-700 focus:outline-none focus:bg-white focus:border-burgundy-400"
              aria-label="Im Modul suchen"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-300 text-xs pointer-events-none">S</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-700 text-xs"
                aria-label="Suche zuruecksetzen"
              >
                x
              </button>
            )}
          </div>
        )}

        {moduleId && (
          <nav className="flex min-w-0 gap-1 overflow-x-auto text-sm">
            <NavLink to={`/learn/${moduleId}`} active={isActive('/learn')}>
              {t('nav.learn')}
            </NavLink>
            <NavLink to={`/concepts/${moduleId}`} active={isActive('/concepts')}>
              Begriffe
            </NavLink>
            <NavLink to={`/author/${moduleId}`} active={isActive('/author')}>
              {t('nav.author')}
            </NavLink>
            <NavLink to={`/export/${moduleId}`} active={isActive('/export')}>
              {t('nav.export')}
            </NavLink>
            <Link
              to={`/print/${moduleId}`}
              title="Druckversion / PDF-Export"
              className="px-3 py-1.5 rounded-md font-medium transition-all text-ink-500 hover:text-ink-800 hover:bg-ink-50"
            >
              Druck
            </Link>
          </nav>
        )}

        <div className={`flex items-center gap-2 shrink-0 ${!moduleId ? 'ml-auto' : ''}`}>
          {user ? (
            <>
              <span className="text-sm text-ink-500 hidden sm:block">{user.displayName}</span>
              <button
                onClick={handleLogout}
                className="text-xs text-ink-500 hover:text-ink-800 border border-ink-200 hover:border-ink-300 rounded-md px-2 py-1 transition-colors"
              >
                Abmelden
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="text-xs text-ink-500 hover:text-ink-800 border border-ink-200 hover:border-ink-300 rounded-md px-2 py-1 transition-colors"
            >
              Anmelden
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-md font-medium transition-all ${
        active
          ? 'bg-burgundy-600 text-white shadow-sm'
          : 'text-ink-500 hover:text-ink-800 hover:bg-ink-50'
      }`}
    >
      {children}
    </Link>
  );
}
