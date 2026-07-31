/**
 * dataSourceManager — owns which provider is currently serving market data.
 *
 * The engine bridge is always connected because the paper account lives in the
 * C++ matcher, but its QUOTES can be silenced while another provider (Binance,
 * Alpaca) supplies the market data. Swapping happens at runtime: the old
 * source disconnects, the new one connects, and every symbol clients are
 * watching is re-subscribed so the UI never has to reconnect.
 *
 * Credentials arrive here in memory from the Electron vault and are never
 * written to disk or logged.
 */
const BinanceBridge = require('./ipc/binance-bridge');
const AlpacaBridge = require('./ipc/alpaca-bridge');

/** Providers that can serve market data, and whether they need credentials. */
const SOURCES = {
    engine:  { label: 'Simulated engine', needsCredentials: false },
    binance: { label: 'Binance',          needsCredentials: false }, // public streams
    alpaca:  { label: 'Alpaca',           needsCredentials: true },
};

class DataSourceManager {
    /**
     * @param {import('socket.io').Server} io
     * @param {object} engineBridge always-on bridge (account + fallback quotes)
     */
    constructor(io, engineBridge) {
        this.io = io;
        this.engineBridge = engineBridge;
        /** Bridge currently serving market data (null → the engine is) */
        this.externalBridge = null;
        this.sourceId = 'engine';
        /** Symbols clients are watching, so a swap can restore them */
        this.subscribed = new Set();
        this.lastError = null;
    }

    // ── Introspection ────────────────────────────────────────────────────────

    status() {
        return {
            sourceId: this.sourceId,
            label: SOURCES[this.sourceId]?.label ?? this.sourceId,
            live: this.sourceId !== 'engine',
            symbols: [...this.subscribed],
            error: this.lastError,
        };
    }

    /** The bridge that should answer market-data calls right now. */
    get active() {
        return this.externalBridge ?? this.engineBridge;
    }

    // ── Activation ───────────────────────────────────────────────────────────

    /**
     * Switch market data to `sourceId`.
     * @param {string} sourceId 'engine' | 'binance' | 'alpaca'
     * @param {object} [credentials] in-memory only
     */
    async activate(sourceId, credentials) {
        const source = SOURCES[sourceId];
        if (!source) throw new Error(`Unknown market data source: ${sourceId}`);
        if (source.needsCredentials && !credentials) {
            throw new Error(`${source.label} needs credentials to serve market data`);
        }

        // Tear down whatever external provider was running
        await this._disconnectExternal();
        this.lastError = null;

        if (sourceId === 'engine') {
            this.sourceId = 'engine';
            this.engineBridge.setMarketDataEnabled?.(true);
            this._announce();
            return this.status();
        }

        let bridge;
        if (sourceId === 'binance') bridge = new BinanceBridge(this.io);
        else if (sourceId === 'alpaca') bridge = new AlpacaBridge(this.io, credentials);

        try {
            await bridge.connect();
        } catch (err) {
            this.lastError = err.message;
            // Fall back to the engine rather than leaving the UI with no data
            this.engineBridge.setMarketDataEnabled?.(true);
            this.sourceId = 'engine';
            this._announce();
            throw err;
        }

        // Engine quotes step aside; its account stream keeps running
        this.engineBridge.setMarketDataEnabled?.(false);
        this.externalBridge = bridge;
        this.sourceId = sourceId;

        // Restore what clients were already watching
        for (const symbol of this.subscribed) {
            try { bridge.subscribe(symbol); } catch { /* provider may not list it */ }
        }

        console.log(`[DataSource] market data now served by ${source.label}`);
        this._announce();
        return this.status();
    }

    /** Return market data to the simulated engine. */
    async deactivate() {
        return this.activate('engine');
    }

    async _disconnectExternal() {
        if (!this.externalBridge) return;
        try {
            await this.externalBridge.disconnect();
        } catch (err) {
            console.error('[DataSource] error disconnecting previous source:', err.message);
        }
        this.externalBridge = null;
    }

    _announce() {
        this.io.emit('datasource:changed', this.status());
    }

    // ── Market-data proxy (index.js talks to this, not a bridge) ─────────────

    subscribe(symbol) {
        this.subscribed.add(symbol);
        this.active.subscribe(symbol);
    }

    unsubscribe(symbol) {
        // Only forget the symbol once no client is left in its room
        const room = this.io.sockets.adapter.rooms.get(symbol);
        if (!room || room.size === 0) this.subscribed.delete(symbol);
        this.active.unsubscribe(symbol);
    }

    getSnapshot(symbol) { return this.active.getSnapshot(symbol); }
    getTicker(symbol)   { return this.active.getTicker(symbol); }
    getKlines(symbol)   { return this.active.getKlines(symbol); }
    /** Account always comes from the engine, whatever serves market data. */
    getAccount()        { return this.engineBridge.getAccount?.() ?? null; }
}

module.exports = { DataSourceManager, SOURCES };
