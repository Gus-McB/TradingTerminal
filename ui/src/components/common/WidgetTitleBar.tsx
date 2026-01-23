interface WidgetTitleBarProps {
    title: string;
  }
  
  export function WidgetTitleBar({ title }: WidgetTitleBarProps) {
    const handleClose = () => {
      window.close();  // Closes the pop-out window
    };
  
    return (
      <div
        className="h-7 bg-terminal-surface flex items-center justify-between px-2 select-none border-b border-terminal-border"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="font-pixel text-[8px] text-terminal-cyan truncate">
          {title}
        </span>
        
        <button
          onClick={handleClose}
          className="w-5 h-5 flex items-center justify-center hover:bg-terminal-red rounded transition-colors"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <span className="text-terminal-muted hover:text-white text-xs">✕</span>
        </button>
      </div>
    );
  }