import { Outlet } from 'react-router-dom';
import { Sidebar } from "./Sidebar";
import { TitleBar } from "./TitleBar";

export function AppShell() {
  return (
    <div className="h-screen flex flex-col bg-terminal-bg text-terminal-text overflow-hidden rounded-lg">
      <TitleBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <Outlet />  {/* Renders the matched child route */}
      </div>
    </div>
  );
}