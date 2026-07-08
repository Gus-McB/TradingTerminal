/**
 * accountStore — live paper-trading account state.
 *
 * Cash, positions, and realized P&L come from the engine's matcher
 * (account:update over Socket.IO). Unrealized P&L and equity are derived
 * in widgets from live tickers.
 */
import { create } from 'zustand';
import { socketManager } from '../services/socketManager';
import type { AccountUpdatePayload, PositionState } from '@shared/types';

export type { PositionState };

const STARTING_CASH = 100_000;

interface AccountState {
    /** True once the first engine account update arrived */
    live: boolean;
    cash: number;
    realizedPnl: number;
    positions: PositionState[];
    init: () => void;
}

let initialized = false;

export const useAccountStore = create<AccountState>((set) => ({
    live: false,
    cash: STARTING_CASH,
    realizedPnl: 0,
    positions: [],

    init: () => {
        if (initialized) return;
        initialized = true;

        const socket = socketManager.connect();
        socket.on('account:update', (data: AccountUpdatePayload) => {
            set({
                live: true,
                cash: data.cash,
                realizedPnl: data.realizedPnl,
                positions: data.positions,
            });
        });
    },
}));
