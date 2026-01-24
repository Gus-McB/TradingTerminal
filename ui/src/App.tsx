import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ContentArea } from './components/layout/ContentArea';
import { ConfigPage } from './pages/ConfigPage';
import { WidgetPage } from './pages/WidgetPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { UpgradePage } from './pages/UpgradePage';
import { useAuthStore } from './stores/authStore';
import { useEffect } from 'react';

export default function App() {
  const { initialize, isLoading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return <div className="h-screen bg-terminal-bg flex items-center justify-center">
            <span className="text-terminal-cyan">Loading...</span>
          </div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected routes with sidebar */}
        <Route element={<AppShell />}>
          <Route path="/" element={
            <ProtectedRoute>
              <ContentArea />
            </ProtectedRoute>
          } />
          <Route path="/config" element={
            <ProtectedRoute>
              <ConfigPage />
            </ProtectedRoute>
          } />
        </Route>
        
        {/* Protected standalone pages */}
        <Route path="/widget/:widgetType" element={
          <ProtectedRoute>
            <WidgetPage />
          </ProtectedRoute>
        } />
        <Route path="/workspace/:workspaceId" element={
          <ProtectedRoute>
            <WorkspacePage />
          </ProtectedRoute>
        } />

        {/* Upgrade page for role-gated features */}
        <Route path="/upgrade" element={<UpgradePage />} />
      </Routes>
    </BrowserRouter>
  );
}