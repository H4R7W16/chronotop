import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Header } from './components/layout/Header.js';
import { ModulePicker } from './components/module/ModulePicker.js';
import { LearningLayout } from './components/layout/LearningLayout.js';
import { AuthoringLayout } from './components/layout/AuthoringLayout.js';
import { ExportView } from './components/export/ExportView.js';
import { BegrifflicheView } from './components/concept/BegrifflicheView.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { PrintView } from './pages/PrintView.js';
import { useChronotopStore } from './store/useChronotopStore.js';
import { useAuthStore } from './store/useAuthStore.js';
import { ErrorBoundary } from './components/system/ErrorBoundary.js';
import { ToastHost } from './components/system/ToastHost.js';
import { isStaticDemo } from './config.js';

function AppShell({ children }: { children: React.ReactNode }) {
  const fullscreen = useChronotopStore(s => s.fullscreen);
  const setFullscreen = useChronotopStore(s => s.setFullscreen);

  // ESC beendet den Vollbild-Modus
  useEffect(() => {
    if (!fullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fullscreen, setFullscreen]);

  return (
    <div className="flex flex-col h-screen bg-white">
      {!fullscreen && <Header />}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}

export default function App() {
  const initAuth = useAuthStore(s => s.init);
  const Router = isStaticDemo ? HashRouter : BrowserRouter;

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={isStaticDemo ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/register" element={isStaticDemo ? <Navigate to="/" replace /> : <RegisterPage />} />
          <Route path="/print/:moduleId" element={<PrintView />} />
          <Route
            path="*"
            element={
              <AppShell>
                <Routes>
                  <Route path="/" element={<ModulePicker />} />
                  <Route path="/learn/:moduleId" element={<LearningLayout />} />
                  <Route path="/concepts/:moduleId" element={<BegrifflicheView />} />
                  <Route path="/author/:moduleId" element={<AuthoringLayout />} />
                  <Route path="/export/:moduleId" element={<ExportView />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppShell>
            }
          />
        </Routes>
      </Router>
      <ToastHost />
    </ErrorBoundary>
  );
}
