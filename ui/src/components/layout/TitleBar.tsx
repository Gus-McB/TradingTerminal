declare global {
    interface Window {
        electronAPI?: {
            minimize: () => void;
            maximize: () => void;
            close: () => void;
            isElectron: boolean;
        };
    }
}

export function TitleBar() {
    const isElectron = window.electronAPI?.isElectron ?? false;

    return (
        <div
            className="h-8 bg-terminal-surface flex items-center justify-between px select-none"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}    
        >
            <div className="flex items-center gap-2">
                <span className="ml-[10px] font-pixel text-[10px] text-terminal-cyan tracking-wider">
                    Trading Terminal
                </span>
                <span className="text-terminal-muted text-xs">v0.1.0</span>
            </div>
        

        {isElectron && (
            <div
                className="flex items-center gap-1"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
                <button
                    onClick={() => window.electronAPI?.minimize()}
                    className="w-8 h-6 flex items-center justify-center hover:bg-terminal-border transition-colors"
                >
                    <span className="text-terminal-muted text-xs">—</span>
                </button>
                <button
                    onClick={() => window.electronAPI?.maximize()}
                    className="w-8 h-6 flex items-center justify-center hover:bg-terminal-border transition-colors"
                >
                    <span className="text-terminal-muted text-xs">☐</span>
                </button>
                <button
                    onClick={() => window.electronAPI?.close()}
                    className="w-8 h-6 flex items-center justify-center hover:bg-terminal-red transition-colors group"
                >
                    <span className="text-terminal-muted group-hover:text-white text-xs">Х</span>
                </button>
            </div>
        )}
        </div>
    )
}