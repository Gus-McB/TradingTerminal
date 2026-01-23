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
  
  // Actions
  addWorkspace: (name: string) => string;
  removeWorkspace: (id: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  setActiveWorkspace: (id: string) => void;
  
  addWidget: (workspaceId: string, widgetType: WidgetType) => void;
  removeWidget: (workspaceId: string, widgetId: string) => void;
  toggleWidget: (workspaceId: string, widgetType: WidgetType) => void;
  hasWidget: (workspaceId: string, widgetType: WidgetType) => boolean;
  
  getWorkspace: (id: string) => Workspace | undefined;
  getActiveWorkspace: () => Workspace | undefined;
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
  
        addWorkspace: (name: string) => {
          const id = `workspace-${Date.now()}`;
          set((state) => ({
            workspaces: [
              ...state.workspaces,
              { id, name, widgets: [] },
            ],
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
            const workspace = get().getWorkspace(workspaceId);
            if (!workspace) return;
            
            const existing = workspace.widgets.find(w => w.type === widgetType);
            if (existing) {
              get().removeWidget(workspaceId, existing.id);
            } else {
              get().addWidget(workspaceId, widgetType);
            }
          },
    
          hasWidget: (workspaceId: string, widgetType: WidgetType) => {
            const workspace = get().getWorkspace(workspaceId);
            return workspace?.widgets.some(w => w.type === widgetType) || false;
          },
    
          getWorkspace: (id: string) => {
            return get().workspaces.find((w) => w.id === id);
          },
    
          getActiveWorkspace: () => {
            const state = get();
            return state.workspaces.find((w) => w.id === state.activeWorkspaceId);
          },
        }),
        {
          name: 'trading-terminal-workspaces',
        }
      )
    );
    
    // Available widget definitions
    export const AVAILABLE_WIDGETS: { type: WidgetType; name: string; icon: string }[] = [
      { type: 'watchlist', name: 'Watchlist', icon: '📋' },
      { type: 'orderbook', name: 'Order Book', icon: '📊' },
      { type: 'chart', name: 'Chart', icon: '📈' },
      { type: 'priceheader', name: 'Price Header', icon: '💰' },
      { type: 'trades', name: 'Recent Trades', icon: '🔄' },
    ];