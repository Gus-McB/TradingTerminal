import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import type { useWorkspaceStore as StoreHook, Workspace } from '../src/stores/workspaceStore';

let useWorkspaceStore: typeof StoreHook;

beforeAll(async () => {
    // Store uses zustand persist backed by localStorage; stub it for node env
    const storage = new Map<string, string>();
    globalThis.localStorage = {
        getItem: (k: string) => storage.get(k) ?? null,
        setItem: (k: string, v: string) => void storage.set(k, v),
        removeItem: (k: string) => void storage.delete(k),
        clear: () => storage.clear(),
        key: (i: number) => [...storage.keys()][i] ?? null,
        get length() { return storage.size; },
    } as Storage;

    ({ useWorkspaceStore } = await import('../src/stores/workspaceStore'));
});

beforeEach(() => {
    // Reset to a single blank workspace before each test
    const store = useWorkspaceStore.getState();
    const ids = store.workspaces.map(w => w.id);
    const keepId = store.addWorkspace('test-base', 'blank');
    useWorkspaceStore.setState(s => ({
        workspaces: s.workspaces.filter(w => !ids.includes(w.id)),
        activeWorkspaceId: keepId,
    }));
});

function active(): Workspace {
    const s = useWorkspaceStore.getState();
    return s.workspaces.find(w => w.id === s.activeWorkspaceId)!;
}

describe('workspaceStore', () => {
    it('creates a workspace from a template', () => {
        const id = useWorkspaceStore.getState().addWorkspace('Scalping', 'dayTrader');
        const ws = useWorkspaceStore.getState().workspaces.find(w => w.id === id)!;
        expect(ws.name).toBe('Scalping');
        expect(ws.layout.widgets.length).toBeGreaterThan(0);
        expect(ws.layout.widgets.every(w => w.id)).toBe(true);
    });

    it('adds and removes widgets', () => {
        const { addWidget, removeWidget } = useWorkspaceStore.getState();
        const wsId = active().id;

        addWidget(wsId, { type: 'Chart', x: 0, y: 0, w: 4, h: 4, config: {} });
        expect(active().layout.widgets).toHaveLength(1);

        removeWidget(wsId, active().layout.widgets[0].id);
        expect(active().layout.widgets).toHaveLength(0);
    });

    it('saveWorkspace replaces the widget list atomically (edit-mode save path)', () => {
        const { addWidget, saveWorkspace } = useWorkspaceStore.getState();
        const wsId = active().id;
        addWidget(wsId, { type: 'Chart', x: 0, y: 0, w: 4, h: 4, config: {} });

        // Simulate a staged edit: rename + a fully different widget list
        const staged = {
            ...active(),
            name: 'renamed',
            layout: {
                ...active().layout,
                widgets: [
                    { id: 'Watchlist-abc123', type: 'Watchlist' as const, x: 0, y: 0, w: 3, h: 4, config: {} },
                ],
            },
        };
        saveWorkspace(staged);

        expect(active().name).toBe('renamed');
        expect(active().layout.widgets).toHaveLength(1);
        expect(active().layout.widgets[0].type).toBe('Watchlist');
    });

    it('exports and imports a workspace round-trip with a fresh id', () => {
        const { addWidget, exportWorkspace, importWorkspace } = useWorkspaceStore.getState();
        const wsId = active().id;
        addWidget(wsId, { type: 'Chart', x: 0, y: 0, w: 4, h: 4, config: { interval: '1m' } });

        const json = exportWorkspace(wsId);
        const importedId = importWorkspace(json);

        expect(importedId).toBeTruthy();
        expect(importedId).not.toBe(wsId);
        const imported = useWorkspaceStore.getState().workspaces.find(w => w.id === importedId)!;
        expect(imported.layout.widgets[0].config).toEqual({ interval: '1m' });
    });

    it('rejects malformed import JSON', () => {
        expect(useWorkspaceStore.getState().importWorkspace('{nope')).toBeNull();
    });
});
