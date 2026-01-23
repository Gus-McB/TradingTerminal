interface PanelProps {
    title: string;
    widgetType?: string;
    symbol?: string;
    children: React.ReactNode;
    className?: string;
    onRemove?: () => void;
}

export function Panel({ title, widgetType, symbol, children, className = '', onRemove}: PanelProps) {
    const canPopOut = widgetType && window.electronAPI?.isElectron;

    const handlePopOut = () => {
        window.electronAPI?.openWidget(widgetType!, symbol || '');
    };

    return (
        <div className={`bg-erminal-surface border border-terminal-border rounded-lg overflow-hidden flex flex-col ${className}`}>
            <div className="px-3 py-2 border-b border-terminal-border flex items-center justify-between">
                <span className="font-pixel text-[10px] text-terminal-cyan"> {title}</span>

                <div className="flex items-center gap-1">
                    {/* Pop-out button */}
                    {canPopOut && (
                        <button
                            className="w-5 h-5 flex items-center justify-center text-terminal-muted hover:text-terminal-cyan hover:bg-terminal-border rounded transition-colors"
                            title="Pop out to new window"
                            onClick={handlePopOut}
                        >
                            <span className="text-xs">⧉</span>
                        </button>
                    )}
                    
                    {/* Remove button */}
                    {onRemove && (
                        <button
                            className="w-5 h-5 flex items-center justify-center text-terminal-muted hover:text-terminal-red hover:bg-terminal-border rounded transition-colors"
                            title="Remove panel"
                            onClick={onRemove}
                        >
                            <span className="text-xs">✕</span>
                        </button>
                    )}
                </div>
            </div>
            <div className="flex-1 overflow-hidden">
                {children}
            </div>
        </div>
    );
}