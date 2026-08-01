import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

let useTerminalStore: typeof import('../src/stores/terminalStore').useTerminalStore;
let useAlertStore: typeof import('../src/stores/alertStore').useAlertStore;

const fakeDataset: Record<string, string> = {};

beforeAll(async () => {
    // terminalStore.setTheme touches document; stub it for node env
    (globalThis as Record<string, unknown>).document = {
        documentElement: { dataset: fakeDataset },
    };
    ({ useTerminalStore } = await import('../src/stores/terminalStore'));
    ({ useAlertStore } = await import('../src/stores/alertStore'));
});

beforeEach(() => {
    useTerminalStore.setState({ activeSymbol: 'BTC/USD', theme: 'dark' });
    useAlertStore.setState({ alerts: [] });
});

describe('terminalStore', () => {
    it('owns the active symbol', () => {
        useTerminalStore.getState().setSymbol('ETH/USD');
        expect(useTerminalStore.getState().activeSymbol).toBe('ETH/USD');
    });

    it('link groups retarget independently of the global symbol', () => {
        useTerminalStore.getState().setSymbol('BTC/USD');
        useTerminalStore.getState().setGroupSymbol('A', 'AAPL');
        useTerminalStore.getState().setGroupSymbol('B', 'TSLA');

        const s = useTerminalStore.getState();
        expect(s.activeSymbol).toBe('BTC/USD');   // global untouched
        expect(s.linkGroups.A).toBe('AAPL');
        expect(s.linkGroups.B).toBe('TSLA');
        expect(s.linkGroups.C).toBeTruthy();       // other channels unaffected
    });

    it('setTheme updates state and flips the data-theme attribute', () => {
        useTerminalStore.getState().setTheme('light');
        expect(useTerminalStore.getState().theme).toBe('light');
        expect(fakeDataset.theme).toBe('light');

        useTerminalStore.getState().setTheme('dark');
        expect(fakeDataset.theme).toBe('dark');
    });
});

describe('alertStore', () => {
    it('adds alerts with generated id and timestamp', () => {
        useAlertStore.getState().addAlert({ type: 'info', message: 'hello' });
        const alerts = useAlertStore.getState().alerts;
        expect(alerts).toHaveLength(1);
        expect(alerts[0].id).toBeTruthy();
        expect(alerts[0].timestamp).toBeTruthy();
        expect(alerts[0].message).toBe('hello');
    });

    it('clears a single alert by id', () => {
        useAlertStore.getState().addAlert({ type: 'warn', message: 'a' });
        useAlertStore.getState().addAlert({ type: 'danger', message: 'b' });
        const first = useAlertStore.getState().alerts[0];

        useAlertStore.getState().clearAlert(first.id);
        const remaining = useAlertStore.getState().alerts;
        expect(remaining).toHaveLength(1);
        expect(remaining[0].message).toBe('b');
    });

    it('clearAll empties the list', () => {
        useAlertStore.getState().addAlert({ type: 'info', message: 'x' });
        useAlertStore.getState().clearAll();
        expect(useAlertStore.getState().alerts).toHaveLength(0);
    });

    it('caps the alert list', () => {
        for (let i = 0; i < 150; i++) {
            useAlertStore.getState().addAlert({ type: 'info', message: `m${i}` });
        }
        const alerts = useAlertStore.getState().alerts;
        expect(alerts.length).toBeLessThanOrEqual(100);
        // Newest alerts are kept
        expect(alerts[alerts.length - 1].message).toBe('m149');
    });
});
