import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ContentArea } from './components/layout/ContentArea';
import { ConfigPage } from './pages/ConfigPage';
import { WidgetPage } from './pages/WidgetPage';
import { WorkspacePage } from './pages/WorkspacePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main app with sidebar */}
        <Route element={<AppShell />}>
          <Route path="/" element={<ContentArea />} />
          <Route path="/config" element={<ConfigPage />} />
        </Route>
        
        {/* Standalone pages (no sidebar) */}
        <Route path="/widget/:widgetType" element={<WidgetPage />} />
        <Route path="/workspace/:workspaceId" element={<WorkspacePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;