declare global {
    interface Window {
        electronAPI?: {
            minimize: () => void;
            maximize: () => void;
            close: () => void;
            openWidget: (type: string, symbol: string) => void;
            isElectron: boolean;
        };
    }
}

export {};