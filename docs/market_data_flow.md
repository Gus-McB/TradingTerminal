# Market Data Flow & Transformation Pipeline

> **Scope**: C++ trading engine (`engine/`) — from raw price generation through to the ZMQ wire format consumed by the middleware bridge.

---

## Overview

The engine produces market data in a three-stage pipeline:

```
┌─────────────────┐    FeedEvent     ┌─────────────────┐    ZMQ frames    ┌──────────────────┐
│    MockFeed     │ ───────────────► │   OrderBook     │ ───────────────► │  ZmqPublisher    │
│  (data source)  │                  │ (state + calc)  │                  │  (wire protocol) │
└─────────────────┘                  └─────────────────┘                  └──────────────────┘
         │                                    │                                     │
    Generates                         Maintains sorted                     Serializes to
    synthetic tick                    price levels,                        FlatBuffer binary,
    events at up to                   computes derived                     publishes over
    500 events/sec                    metrics                              tcp://*:5555
```

The middleware bridge subscribes to the ZMQ PUB socket and receives three distinct message types, each carrying a `MarketEnvelope` with a microsecond timestamp and a per-symbol monotonic sequence number.

---

## Stage 1 — Feed Layer (`src/feed/`)

### Interface contract (`market_feed.h`)

All feed implementations expose a non-blocking poll interface:

```
MarketFeed::poll(FeedEvent& event) → bool
```

Returns `true` and populates `event` when a tick is ready; `false` otherwise. The main loop busy-polls with a 100 µs sleep on misses to avoid spinning the CPU hard.

### `FeedEvent` structure

```
FeedEvent {
    symbol   : string      — e.g. "BTC/USD"
    side     : Side        — Bid | Ask
    type     : UpdateType  — New | Modify | Delete
    price    : double      — price level (rounded to tick size)
    size     : double      — quantity at that price (0.0 for Delete)
}
```

### MockFeed (`mock_feed.h` / `mock_feed.cpp`)

#### Symbol configuration

Five crypto pairs are hardcoded at construction time:

| Symbol    | Base price  | Volatility | Tick size  |
|-----------|-------------|------------|------------|
| BTC/USD   | 67,500.00   | 0.02%      | 0.01       |
| ETH/USD   |  3,420.00   | 0.03%      | 0.01       |
| SOL/USD   |    187.00   | 0.05%      | 0.01       |
| DOGE/USD  |      0.087  | 0.08%      | 0.00001    |
| XRP/USD   |      2.34   | 0.04%      | 0.0001     |

`volatility` controls the standard-deviation of price movements as a fraction of `base_price`. Smaller tick sizes on low-priced assets preserve meaningful precision.

#### Initial book seeding

Before the event loop begins, each symbol's `OrderBook` is pre-populated:

- **25 bid levels**: Spaced at `price = mid - i × (mid × 0.0001)` for `i = 1..25`, rounded to tick size, with sizes drawn from `Exponential(λ=0.5)` — levels close to mid are statistically larger.
- **25 ask levels**: Mirror image above mid.

These seeded books are used to generate the initial `OrderBookSnapshot` messages and serve as the starting state for subsequent deltas.

#### Event generation

The feed advances a round-robin symbol cursor each call to `poll()`. For the selected symbol, it samples a uniformly random `action` value and branches:

| Probability | Event type | Price selection | Size selection |
|-------------|-----------|-----------------|----------------|
| 40% | **New** level | `Normal(0, mid × volatility × 5)` offset from mid, sign dictated by side | `Exponential(λ=1.0) + 0.001` |
| 40% | **Modify** level | Randomly chosen existing level index | `current_size × Uniform(0.5, 1.5)` |
| 20% | **Delete** level | Chosen from the worse half of levels (furthest from mid) | 0.0 |

All generated prices are quantised to the symbol's `tick_size` via `round(price / tick_size) × tick_size`. Prices that round to ≤ 0 are clamped to `tick_size`.

If a Modify or Delete is attempted on an empty side, it degrades gracefully to a New event at `base_price` with size 0.1.

#### Rate control

Events are throttled to `events_per_second` (default 500). Between calls the feed checks elapsed time and applies multiplicative jitter:

```
target_interval_µs = (1,000,000 / events_per_second) × Uniform(0.5, 1.5)
```

If `elapsed < target`, `poll()` returns `false` immediately without generating an event. This introduces natural burstiness rather than perfectly uniform arrivals, which more closely resembles real exchange behaviour.

---

## Stage 2 — Order Book (`src/orderbook/`)

### Data structure

`OrderBook` maintains two sorted maps:

```
bids_: std::map<double, double, std::greater<double>>   // price → size, highest first
asks_: std::map<double, double, std::less<double>>      // price → size, lowest first
```

The descending/ascending sort order means `begin()` always yields the best (most competitive) price on each side, giving O(1) best-bid / best-ask access.

### Mutation operations

| Operation | Behaviour |
|-----------|-----------|
| `add_level(side, price, size)` | Inserts or overwrites the price level, then calls `trim_bids()`/`trim_asks()` to enforce `max_depth = 25`. |
| `modify_level(side, price, new_size)` | Updates `size` in-place; no-op if the price is not present. |
| `remove_level(side, price)` | Erases the price key; no-op if absent. |

Trimming evicts the *worst* level — the map's last iterator (lowest bid, highest ask) — ensuring the book always represents the 25 most competitive levels.

### Derived metrics

Computed on demand from the live map state:

| Field | Formula |
|-------|---------|
| `best_bid` | `bids_.begin()->first` (or 0.0 if empty) |
| `best_ask` | `asks_.begin()->first` (or `+∞` if empty) |
| `mid_price` | `(best_bid + best_ask) / 2` |
| `spread` | `best_ask - best_bid` |
| `spread_percent` | `(spread / mid_price) × 100` |

### Serialisation view

`top_bids(n)` and `top_asks(n)` walk the sorted map and return `vector<pair<double,double>>` of up to `n` (or `max_depth` if `n == 0`) levels. These vectors are the direct input to FlatBuffer construction in the publisher.

---

## Stage 3 — ZMQ Publisher (`src/publisher/`)

### Socket topology

```
ZmqPublisher binds:  tcp://*:5555  (ZMQ PUB socket)
Middleware subscribes: tcp://localhost:5555  (ZMQ SUB socket)
```

The PUB/SUB pattern means the engine publishes unconditionally; the middleware filters by topic prefix (symbol string). New subscribers miss messages sent before connection — the periodic full snapshot (every 100 deltas per symbol) allows late joiners to resync.

### Message framing

Every published message is a two-frame ZMQ multipart message:

```
Frame 1: topic   — UTF-8 symbol string, e.g. "BTC/USD"
Frame 2: payload — FlatBuffer binary blob (MarketEnvelope)
```

The topic frame enables topic-based subscription filtering on the ZMQ layer without the middleware needing to deserialise the payload to route messages.

### FlatBuffers schema (`schema/market_data.fbs`)

The schema defines the wire types under namespace `TradingTerminal`:

```
MarketEnvelope
├── timestamp_us : uint64      — microseconds since Unix epoch
└── message : MarketMessage    — union of one of:
    ├── OrderBookSnapshot
    │   ├── symbol   : string
    │   ├── bids     : [OrderBookLevel]   — 25 levels, best first
    │   ├── asks     : [OrderBookLevel]   — 25 levels, best first
    │   └── sequence : uint64
    ├── OrderBookDelta
    │   ├── symbol      : string
    │   ├── side        : Side            — Bid | Ask
    │   ├── update_type : UpdateType      — New | Modify | Delete
    │   ├── level       : OrderBookLevel  — { price: double, size: double }
    │   └── sequence    : uint64
    └── TickerUpdate
        ├── symbol         : string
        ├── price          : double
        ├── change_24h     : double
        ├── change_percent : double
        ├── high_24h       : double
        ├── low_24h        : double
        └── volume         : double
```

FlatBuffers serialises into a packed binary layout with no parsing overhead on the read path — the middleware can access any field by offset without full deserialisation.

### Message types and their triggers

#### `OrderBookSnapshot`

**When**: At startup (once per symbol) and every 100 deltas per symbol thereafter.

**Construction** (`publish_snapshot`):
1. `builder_.Clear()` — reuse the pre-allocated 1 KB builder.
2. Walk `book.top_bids()` → build vector of `OrderBookLevel` offsets.
3. Walk `book.top_asks()` → same.
4. `CreateOrderBookSnapshot(builder_, symbol, bids_vec, asks_vec, sequence)`.
5. Wrap in `MarketEnvelope` with `now_microseconds()` timestamp.
6. `builder_.Finish(envelope)` → call `send(symbol, buf, size)`.

The snapshot gives the middleware a complete authoritative book state. Sequence numbers allow it to detect and discard stale snapshots if messages arrive out of order.

#### `OrderBookDelta`

**When**: On every `FeedEvent` returned by `feed.poll()`.

**Construction** (`publish_delta`):
1. Map `FeedEvent::side` → `TradingTerminal::Side_Bid / Side_Ask`.
2. Map `FeedEvent::type` → `TradingTerminal::UpdateType_New / Modify / Delete`.
3. Build a single `OrderBookLevel` with `{event.price, event.size}`.
4. Build `OrderBookDelta` and wrap in `MarketEnvelope`.

The middleware should apply deltas to its own in-memory book replica using the sequence number to detect gaps. A gap means at least one delta was lost; the middleware should wait for the next snapshot before re-serving that symbol's book to clients.

#### `TickerUpdate`

**When**: At most once per 500 ms per symbol, triggered when `mid_price > 0`.

**Construction** (`publish_ticker`):

The main loop maintains per-symbol running statistics:

| Field | Calculation |
|-------|------------|
| `price` | Current `mid_price()` from OrderBook |
| `change_24h` | `mid - initial_price` (absolute) |
| `change_percent` | `(mid - initial_price) / initial_price × 100` |
| `high_24h` | Running `max(high_24h, mid)` |
| `low_24h` | Running `min(low_24h, mid)` |
| `volume` | Cumulative `sum(event.size × mid)` — approximate notional volume |

Note: `initial_price` is set to `config.base_price` at startup and never reset, so it represents session-relative change rather than true 24-hour change. In production this would be replaced with a rolling 24-hour window.

---

## Main Event Loop Orchestration (`src/main.cpp`)

```
Startup
│
├── Bind ZMQ PUB socket (tcp://*:5555)
├── Start MockFeed
└── For each symbol:
    ├── Initialise SymbolState { sequence=0, initial_price, high=base, low=base, ... }
    └── publish_snapshot(book, sequence++)

Loop (until SIGINT/SIGTERM)
│
├── feed.poll(event)
│   ├── [false] → sleep 100 µs, continue
│   └── [true]  →
│       ├── publish_delta(event, sequence++)
│       ├── state.event_count++
│       ├── [event_count % 100 == 0] → publish_snapshot(book, sequence++)
│       └── [elapsed ≥ 500 ms] →
│           ├── Update high/low/volume accumulators
│           └── publish_ticker(symbol, mid, change, pct, high, low, vol)
│
Shutdown
├── feed.stop()
└── publisher.stop() → pub_.close()
```

### Sequence number semantics

Each `SymbolState` holds a single `uint64_t sequence` counter incremented on every published message (delta or snapshot) for that symbol. The counter is **not** reset on snapshot publication — snapshots and deltas share the same monotonic space. This allows the middleware to:

1. Record the sequence of the last snapshot received.
2. Verify that subsequent deltas have contiguous sequence numbers.
3. Re-request (or wait for) a new snapshot if a gap is detected.

---

## Middleware Bridge Interface Contract

The middleware (Node.js, `middleware/`) should implement the following to correctly consume the engine's output:

### Connection

```
ZMQ SUB socket → connect("tcp://localhost:5555")
subscribe("")   — empty prefix subscribes to all topics
```

Or subscribe selectively per symbol: `subscribe("BTC/USD")`.

### Receive loop

```
frame1 = recv()          — topic string
frame2 = recv()          — FlatBuffer binary
envelope = GetMarketEnvelope(frame2.data())
```

Read `envelope.message_type()` to dispatch:

| Union type | Enum value | Handler |
|-----------|-----------|---------|
| `MarketMessage_OrderBookSnapshot` | 1 | Replace local book replica entirely; update last-known sequence |
| `MarketMessage_OrderBookDelta`    | 2 | Apply single level mutation; verify `delta.sequence == last_sequence + 1` |
| `MarketMessage_TickerUpdate`      | 3 | Update ticker display; no sequence check needed |

### Gap handling

```
if (delta.sequence != last_sequence + 1) {
    // Gap detected: discard deltas until next snapshot
    wait_for_snapshot = true
}
if (message_type == Snapshot && wait_for_snapshot) {
    // Resync complete
    wait_for_snapshot = false
}
```

### Data types on the middleware side

| FlatBuffer field | JS type after deserialise | Notes |
|-----------------|--------------------------|-------|
| `timestamp_us` | `BigInt` | Microseconds; divide by 1000 for ms |
| `sequence` | `BigInt` | Compare with `last_sequence + 1n` |
| `price`, `size` | `number` (float64) | Direct use; no scaling needed |
| `side` | `0` (Bid) / `1` (Ask) | Map to string for UI |
| `update_type` | `0` / `1` / `2` | New / Modify / Delete |

---

## Dependencies

| Library | Version | Role |
|---------|---------|------|
| libzmq | 4.3.5 (static) | Underlying ZMQ transport |
| cppzmq | 4.10.0 (header-only) | C++ wrapper around libzmq |
| FlatBuffers | 24.3.25 | Schema compiler (`flatc`) + runtime |

The `flatc` compiler is invoked at CMake configure time to generate `src/generated/market_data_generated.h` from `schema/market_data.fbs`. This file must exist before the engine sources compile. It is re-generated automatically whenever `market_data.fbs` changes.
