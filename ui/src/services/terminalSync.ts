/**
 * terminalSync — keeps terminal state consistent across every window.
 *
 * Symbol channels are app-wide: retarget channel A on monitor 1 and the
 * channel-A chart on monitor 3 follows. Each window applies remote patches
 * locally and publishes its own changes, with an echo guard so a broadcast
 * can't bounce back and forth.
 *
 * Windows that opt out (Independent mode — pinned to their own symbol) simply
 * don't read the channel, so they're unaffected by any of this.
 */
import { useTerminalStore, type LinkGroup } from '../stores/terminalStore';
import { useAlertStore } from '../stores/alertStore';
import type { TerminalStatePatch } from '../types/electron';

let started = false;
/** True while applying a remote patch — suppresses re-publishing it. */
let applyingRemote = false;

function applyRemote(patch: TerminalStatePatch): void {
    applyingRemote = true;
    try {
        const store = useTerminalStore.getState();

        if (patch.activeSymbol && patch.activeSymbol !== store.activeSymbol) {
            store.setSymbol(patch.activeSymbol);
        }
        if (patch.linkGroups) {
            for (const [group, symbol] of Object.entries(patch.linkGroups)) {
                if (store.linkGroups[group as LinkGroup] !== symbol) {
                    store.setGroupSymbol(group as LinkGroup, symbol);
                }
            }
        }
        if (patch.theme && patch.theme !== store.theme) {
            store.setTheme(patch.theme);
        }
        if (patch.alert) {
            useAlertStore.getState().addAlert({
                type: patch.alert.type as 'info' | 'warn' | 'danger',
                message: patch.alert.message,
            });
        }
    } finally {
        applyingRemote = false;
    }
}

/** Idempotent — call once per window at startup. */
export function startTerminalSync(): void {
    const api = window.electronAPI;
    if (started || !api?.isElectron) return;
    started = true;

    // Adopt whatever the other windows are already showing
    void api.getTerminalSnapshot?.().then(snapshot => {
        if (snapshot) applyRemote(snapshot);
    });

    api.onTerminalState(applyRemote);

    // Publish local changes (symbol / channels / theme) to the other windows
    let last = {
        activeSymbol: useTerminalStore.getState().activeSymbol,
        linkGroups: useTerminalStore.getState().linkGroups,
        theme: useTerminalStore.getState().theme,
    };

    useTerminalStore.subscribe((state) => {
        if (applyingRemote) return;

        const patch: TerminalStatePatch = {};
        if (state.activeSymbol !== last.activeSymbol) patch.activeSymbol = state.activeSymbol;
        if (state.linkGroups !== last.linkGroups) patch.linkGroups = state.linkGroups;
        if (state.theme !== last.theme) patch.theme = state.theme;

        last = {
            activeSymbol: state.activeSymbol,
            linkGroups: state.linkGroups,
            theme: state.theme,
        };

        if (Object.keys(patch).length > 0) api.publishTerminalState(patch);
    });
}
