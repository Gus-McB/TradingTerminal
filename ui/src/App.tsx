import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { WorkspacePage } from './pages/WorkspacePage';
import { WorkspaceConfigPage } from './pages/WorkspaceConfigPage';
import { NewsPage } from './pages/NewsPage';
import { AlertsPage } from './pages/AlertsPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { OrdersPage } from './pages/OrdersPage';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { UpgradePage } from './pages/UpgradePage';
import { PopoutWidgetPage } from './pages/PopoutWidgetPage';
import { PopoutWorkspacePage } from './pages/PopoutWorkspacePage';
import { useAuthStore } from './stores/authStore';
import { useMarketStore } from './stores/marketStore';
import { useOrdersStore } from './stores/ordersStore';
import { useAccountStore } from './stores/accountStore';
import { useWindowStore } from './stores/windowStore';
import { alertEngine } from './services/alertEngine';
import { startCloudSync } from './services/cloudSync';
import { startTerminalSync } from './services/terminalSync';
import { useEffect } from 'react';

export default function App() {
  const { initialize, isLoading } = useAuthStore();
  const initSocket = useMarketStore((s) => s.initSocket);
  const cleanupSocket = useMarketStore((s) => s.cleanupSocket);
  const initOrders = useOrdersStore((s) => s.init);
  const initAccount = useAccountStore((s) => s.init);
  const initWindows = useWindowStore((s) => s.init);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    initSocket();
    initOrders();
    initAccount();
    initWindows();     // display list + pop-out registry (Electron only)
    alertEngine.start();   // live alert evaluation, app-wide
    startCloudSync();      // Supabase persistence (no-op without a session)
    startTerminalSync();   // symbol channels shared across monitors (Electron)
    return () => {
      alertEngine.stop();
      cleanupSocket();
    };
  }, []);

  if (isLoading) {
    return <div className="h-screen bg-terminal-bg flex items-center justify-center">
            <span className="text-terminal-cyan">Loading...</span>
          </div>;
  }

  return (
      <HashRouter>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes with navbar shell */}
          <Route element={<AppShell />}>
            <Route path="/" element={
              <ProtectedRoute>
                <WorkspacePage />
              </ProtectedRoute>
            } />
            <Route path="/news" element={
              <ProtectedRoute>
                <NewsPage />
              </ProtectedRoute>
            } />
            <Route path="/alerts" element={
              <ProtectedRoute>
                <AlertsPage />
              </ProtectedRoute>
            } />
            <Route path="/watchlists" element={
              <ProtectedRoute>
                <WatchlistPage />
              </ProtectedRoute>
            } />
            <Route path="/portfolio" element={
              <ProtectedRoute>
                <PortfolioPage />
              </ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute>
                <OrdersPage />
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

          {/* Electron pop-out windows (frameless, no navbar shell) */}
          <Route path="/widget/:type" element={<PopoutWidgetPage />} />
          <Route path="/workspace/:id" element={<PopoutWorkspacePage />} />
        </Routes>
      </HashRouter>
  );
}