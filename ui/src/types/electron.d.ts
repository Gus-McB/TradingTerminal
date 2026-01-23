declare global {
    interface Window {
        electronAPI?: {
            minimize: () => void;
            maximize: () => void;
            close: () => void;
            openWidget: (type: string, symbol: string) => void;
            openWorkspace: (widgetspaceId: string) => void;
            transferWidget: (widget: { id: string; type: string }, targetWorkspaceId: string) => void;
            onWidgetReceived: (callback: (widget: {id: string; type: string }) => void) => void;
            isElectron: boolean;
        };
    }
}

export {};