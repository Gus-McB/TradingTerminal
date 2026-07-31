/**
 * windowStore — knows what monitors exist and opens pop-outs onto them.
 *
 * Outside Electron (browser dev) the API is absent, so `isElectron` is false
 * and the pop-out affordances hide themselves rather than failing.
 */
import { create } from 'zustand';
import type { DisplayInfo } from '../types/electron';
import type { WidgetType } from './workspaceStore';
import type { LinkGroup } from './terminalStore';

interface WindowStore {
    isElectron: boolean;
    displays: DisplayInfo[];
    openWindowKeys: string[];

    init: () => void;
    popOutWidget: (opts: {
        type: WidgetType;
        symbol?: string;
        linkGroup?: LinkGroup;
        displayIndex?: number;
    }) => void;
    popOutWorkspace: (workspaceId: string, displayIndex?: number) => void;
}

let initialized = false;

export const useWindowStore = create<WindowStore>((set) => ({
    isElectron: Boolean(window.electronAPI?.isElectron),
    displays: [],
    openWindowKeys: [],

    init: () => {
        const api = window.electronAPI;
        if (!api || initialized) return;
        initialized = true;

        void api.listDisplays().then(displays => set({ displays }));
        void api.listWindows().then(openWindowKeys => set({ openWindowKeys }));

        // Monitors can be attached/detached while the terminal runs
        api.onDisplaysChanged(displays => set({ displays }));
        api.onWindowsChanged(openWindowKeys => set({ openWindowKeys }));
    },

    popOutWidget: ({ type, symbol, linkGroup, displayIndex }) => {
        void window.electronAPI?.openWidgetWindow({ type, symbol, linkGroup, displayIndex });
    },

    popOutWorkspace: (workspaceId, displayIndex) => {
        void window.electronAPI?.openWorkspaceWindow({ workspaceId, displayIndex });
    },
}));
