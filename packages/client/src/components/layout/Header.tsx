import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useLocalized } from '../../i18n/useLocalized.js';
import { useIsTablet } from '../../hooks/useMediaQuery.js';
import { isStaticDemo } from '../../config.js';
import { ModulePanel } from './ModulePanel.js';

export function Header() {
  const { t } = useTranslation();
  const loc = useLocalized();
  const location = useLocation();
  const navigate = useNavigate();
  const isTablet = useIsTablet();
  const moduleId = useChronotopStore(s => s.currentModuleId);
  const modules = useChronotopStore(s => s.modules);
  const currentModule = modules.find(m => m.id === moduleId);
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);

  const isActive = (path: string) => location.pathname.startsWith(path);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  if (isTablet) {
    return (
      <header className="bg-white text-ink-800 border-b border-ink-100 shrink-0 shadow-sm">
        <div className="px-3 py-1.5 flex items-center gap-2 min-h-[48px]">
          <Link to="/" className="flex items-center gap-2 hover:text-burgundy-600 transition-colors shrink-0" aria-label={t('app.title')}>
            <span className="h-8 w-8 rounded-md bg-ink-800 text-white flex items-center justify-center font-serif font-semibold">
              C
            </span>
            {currentModule && (
              <span className="hidden sm:block truncate text-sm font-medium text-ink-700 max-w-[10rem] md:max-w-[18rem]">
                {loc(currentModule.title)}
              </span>
            )}
          </Link>

          {moduleId && (
            <div className="ml-auto">
              <ModulePanel compact />
            </div>
          )}

          {moduleId && (
            <nav className="flex min-w-0 gap-1 overflow-x-auto" aria-label="Hauptnavigation">
              <NavLink to={`/learn/${moduleId}`} active={isActive('/learn')} compact>
                {t('nav.learn')}
              </NavLink>
              <NavLink to={`/concepts/${moduleId}`} active={isActive('/concepts')} compact>
                Begriffe
              </NavLink>
              <Link
                to={`/print/${moduleId}`}
                title="Druckversion / PDF-Export"
                className="min-h-[40px] px-3 flex items-center rounded-md text-sm font-medium text-ink-500 hover:text-ink-800 hover:bg-ink-50"
              >
                Druck
              </Link>
            </nav>
          )}

          {isStaticDemo ? (
            <span className="shrink-0 rounded-md border border-verdigris-200 bg-verdigris-50 px-2 py-1 text-[11px] font-medium text-verdigris-700">
              Beta
            </span>
          ) : user ? (
            <button
              onClick={handleLogout}
              className="shrink-0 min-h-[40px] text-xs font-medium text-ink-500 hover:text-ink-800 border border-ink-200 hover:border-ink-300 rounded-md px-3 transition-colors"
              title={user.displayName}
            >
              Abmelden
            </button>
          ) : (
            <Link
              to="/login"
              className="shrink-0 min-h-[40px] flex items-center text-xs font-medium text-ink-500 hover:text-ink-800 border border-ink-200 hover:border-ink-300 rounded-md px-3 transition-colors"
            >
              Anmelden
            </Link>
          )}
        </div>
      </header>
    );
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
          <div className="order-3 w-full sm:order-none sm:w-auto sm:ml-auto">
            <ModulePanel />
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
          {isStaticDemo ? (
            <span className="rounded-md border border-verdigris-200 bg-verdigris-50 px-2 py-1 text-xs font-medium text-verdigris-700">
              Beta-Demo
            </span>
          ) : user ? (
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

function NavLink({ to, active, children, compact }: { to: string; active: boolean; children: ReactNode; compact?: boolean }) {
  return (
    <Link
      to={to}
      className={`${compact ? 'min-h-[40px] flex items-center px-3' : 'px-3 py-1.5'} rounded-md text-sm font-medium transition-all ${
        active
          ? 'bg-burgundy-600 text-white shadow-sm'
          : 'text-ink-500 hover:text-ink-800 hover:bg-ink-50'
      }`}
    >
      {children}
    </Link>
  );
}
