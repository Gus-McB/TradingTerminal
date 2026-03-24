import { Outlet } from 'react-router-dom';
import { TitleBar } from './TitleBar';
import { TradingNavbar } from './TradingNavbar';

export function AppShell() {
  return (
    <div className="h-screen flex flex-col bg-terminal-bg text-terminal-text overflow-hidden">
      {/* Electron drag bar */}
      <TitleBar />
      {/* Full-width taskbar navbar */}
      <TradingNavbar />
      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
