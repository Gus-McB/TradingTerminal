import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WidgetType = 'watchlist' | 'orderbook' | 'chart' | 'priceheader' | 'trades';

export interface Widget {
  id: string;
  type: WidgetType;
  config?: Record<string, unknown>;
}

export interface Workspace {
  id: string;
  name: string;
  widgets: Widget[];
}

interface WorkspaceStore {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  openWorkspaceIds: Set<string>;
  
  addWorkspace: (name: string) => string;
  removeWorkspace: (id: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  setActiveWorkspace: (id: string) => void;
  
  addWidget: (workspaceId: string, widgetType: WidgetType) => void;
  removeWidget: (workspaceId: string, widgetId: string) => void;
  toggleWidget: (workspaceId: string, widgetType: WidgetType) => void;
  
  markWorkspaceOpen: (id: string) => void;
  markWorkspaceClosed: (id: string) => void;
  isWorkspaceOpen: (id: string) => boolean;
}

const DEFAULT_WORKSPACE: Workspace = {
  id: 'main',
  name: 'Main Terminal',
  widgets: [
    { id: 'watchlist-1', type: 'watchlist' },
    { id: 'orderbook-1', type: 'orderbook' },
    { id: 'chart-1', type: 'chart' },
  ],
};

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      workspaces: [DEFAULT_WORKSPACE],
      activeWorkspaceId: 'main',
      openWorkspaceIds: new Set<string>(),

      addWorkspace: (name: string) => {
        const id = `workspace-${Date.now()}`;
        set((state) => ({
          workspaces: [...state.workspaces, { id, name, widgets: [] }],
        }));
        return id;
      },

      removeWorkspace: (id: string) => {
        if (id === 'main') return;
        set((state) => ({
          workspaces: state.workspaces.filter((w) => w.id !== id),
          activeWorkspaceId: state.activeWorkspaceId === id ? 'main' : state.activeWorkspaceId,
        }));
      },

      renameWorkspace: (id: string, name: string) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === id ? { ...w, name } : w
          ),
        }));
      },

      setActiveWorkspace: (id: string) => {
        set({ activeWorkspaceId: id });
      },

      addWidget: (workspaceId: string, widgetType: WidgetType) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId
              ? { ...w, widgets: [...w.widgets, { id: `${widgetType}-${Date.now()}`, type: widgetType }] }
              : w
          ),
        }));
      },

      removeWidget: (workspaceId: string, widgetId: string) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId
              ? { ...w, widgets: w.widgets.filter((widget) => widget.id !== widgetId) }
              : w
          ),
        }));
      },

      toggleWidget: (workspaceId: string, widgetType: WidgetType) => {
        set((state) => {
          const workspace = state.workspaces.find(w => w.id === workspaceId);
          if (!workspace) return {};
          
          const existing = workspace.widgets.find(w => w.type === widgetType);
          
          return {
            workspaces: state.workspaces.map((w) =>
              w.id === workspaceId
                ? {
                    ...w,
                    widgets: existing
                      ? w.widgets.filter((widget) => widget.id !== existing.id)
                      : [...w.widgets, { id: `${widgetType}-${Date.now()}`, type: widgetType }]
                  }
                : w
            ),
          };
        });
      },

      markWorkspaceOpen: (id: string) => {
        set((state) => ({
          openWorkspaceIds: new Set([...state.openWorkspaceIds, id]),
        }));
      },

      markWorkspaceClosed: (id: string) => {
        set((state) => {
          const newSet = new Set(state.openWorkspaceIds);
          newSet.delete(id);
          return { openWorkspaceIds: newSet };
        });
      },

      isWorkspaceOpen: (id: string) => {
        return get().openWorkspaceIds.has(id);
      },
    }),
    {
      name: 'trading-terminal-workspaces',
      // Only persist serializable state (exclude Set)
      partialize: (state) => ({
        workspaces: state.workspaces,
        activeWorkspaceId: state.activeWorkspaceId,
      }),
    }
  )
);

export const AVAILABLE_WIDGETS: { type: WidgetType; name: string; icon: string }[] = [
  { type: 'watchlist', name: 'Watchlist', icon: '📋' },
  { type: 'orderbook', name: 'Order Book', icon: '📊' },
  { type: 'chart', name: 'Chart', icon: '📈' },
  { type: 'priceheader', name: 'Price Header', icon: '💰' },
  { type: 'trades', name: 'Recent Trades', icon: '🔄' },
];
