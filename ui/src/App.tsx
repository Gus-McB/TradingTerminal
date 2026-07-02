import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { WidgetPage } from './pages/WidgetPage';
import { WorkspaceConfigPage } from './pages/WorkspaceConfigPage';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { UpgradePage } from './pages/UpgradePage';
import { TerminalProvider } from './context/TerminalContext';
import { useAuthStore } from './stores/authStore';
import { useMarketStore } from './stores/marketStore';
import { useOrdersStore } from './stores/ordersStore';
import { useEffect } from 'react';

export default function App() {
  const { initialize, isLoading } = useAuthStore();
  const initSocket = useMarketStore((s) => s.initSocket);
  const cleanupSocket = useMarketStore((s) => s.cleanupSocket);
  const initOrders = useOrdersStore((s) => s.init);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    initSocket();
    initOrders();
    return () => cleanupSocket();
  }, []);

  if (isLoading) {
    return <div className="h-screen bg-terminal-bg flex items-center justify-center">
            <span className="text-terminal-cyan">Loading...</span>
          </div>;
  }

  return (
    <TerminalProvider>
      <HashRouter>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes with navbar shell */}
          <Route element={<AppShell />}>
            <Route path="/" element={
              <ProtectedRoute>
                <WidgetPage />
              </ProtectedRoute>
            } />
            <Route path="/config" element={
              <ProtectedRoute>
                <WorkspaceConfigPage />
              </ProtectedRoute>
            } />
          </Route>

          {/* Upgrade page for role-gated features */}
          <Route path="/upgrade" element={<UpgradePage />} />
        </Routes>
      </HashRouter>
    </TerminalProvider>
  );
}