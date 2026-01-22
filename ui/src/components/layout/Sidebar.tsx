// ui/src/components/layout/IconSidebar.tsx
import { useState } from 'react';

type Workspace = 'markets' | 'trading' | 'portfolio' | 'settings';

const WORKSPACES: { id: Workspace; icon: string; label: string }[] = [
  { id: 'markets', icon: '📊', label: 'Markets' },
  { id: 'trading', icon: '📈', label: 'Trading' },
  { id: 'portfolio', icon: '📋', label: 'Portfolio' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
];

export function Sidebar() {
  const [active, setActive] = useState<Workspace>('markets');

  return (
    <div className="w-16 bg-[#08080c] flex flex-col items-center py-3 gap-2 border-r border-terminal-border">
      {/* Logo */}
      <div className="w-10 h-10 rounded-lg bg-terminal-cyan/20 flex items-center justify-center mb-2 border-2 border-terminal-cyan shadow-glow-cyan">
        <span className="font-pixel text-terminal-cyan text-xs">FX</span>
      </div>

      <div className="w-8 h-px bg-terminal-border my-2" />

      {/* Workspace Icons */}
      {WORKSPACES.map((ws) => (
        <button
          key={ws.id}
          onClick={() => setActive(ws.id)}
          title={ws.label}
          className={`
            w-10 h-10 rounded-lg flex items-center justify-center
            transition-all duration-200 relative group
            ${active === ws.id 
              ? 'bg-terminal-surface border-2 border-terminal-cyan shadow-glow-cyan' 
              : 'bg-terminal-surface/50 border-2 border-transparent hover:border-terminal-border'
            }
          `}
        >
          <span className="text-lg">{ws.icon}</span>
          
          {/* Active indicator */}
          {active === ws.id && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-5 bg-terminal-cyan rounded-r" />
          )}

          {/* Tooltip */}
          <div className="absolute left-14 px-2 py-1 bg-terminal-surface border border-terminal-border rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 font-mono text-xs">
            {ws.label}
          </div>
        </button>
      ))}
    </div>
  );
}