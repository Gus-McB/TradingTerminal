/**
 * dockUiStore — transient UI state for the dockview workspace.
 * Bridges the page, the custom tab components (which render inside dockview's
 * tree), and external launchers like the command palette. Never persisted.
 */
import { create } from 'zustand';
import type { DockviewApi } from 'dockview-react';
import type { WidgetType } from './workspaceStore';

interface DockUiStore {
    /** Live dockview API while a WorkspacePage is mounted */
    api: DockviewApi | null;
    /** Layout locked: no drag/close (view mode) */
    locked: boolean;
    /** Panel id whose config panel is open */
    configPanelId: string | null;
    /** Widgets queued by external launchers (command palette) for the next mount */
    pendingWidgets: WidgetType[];

    setApi: (api: DockviewApi | null) => void;
    setLocked: (locked: boolean) => void;
    setConfigPanel: (panelId: string | null) => void;
    queueWidget: (type: WidgetType) => void;
    drainPendingWidgets: () => WidgetType[];
}

export const useDockUiStore = create<DockUiStore>((set, get) => ({
    api: null,
    locked: false,
    configPanelId: null,
    pendingWidgets: [],

    setApi: (api) => set({ api }),
    setLocked: (locked) => set({ locked }),
    setConfigPanel: (configPanelId) => set({ configPanelId }),
    queueWidget: (type) => set(s => ({ pendingWidgets: [...s.pendingWidgets, type] })),
    drainPendingWidgets: () => {
        const pending = get().pendingWidgets;
        if (pending.length) set({ pendingWidgets: [] });
        return pending;
    },
}));
