declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      openWidget: (type: string, symbol: string) => void;
      openWorkspace: (workspaceId: string) => void;
      transferWidget: (widget: { id: string; type: string }, targetWorkspaceId: string) => void;
      onWidgetReceived: (callback: (widget: { id: string; type: string }) => void) => void;
      notifyWorkspaceUpdated: (workspaceId: string) => void;
      onWorkspaceRefresh: (callback: (workspaceId: string) => void) => void;
      onWorkspaceClosed: (callback: (workspaceId: string) => void) => void;
      isElectron: boolean;
    };
  }
}

export {};