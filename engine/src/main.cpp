#include <iostream>
#include <csignal>
#include <atomic>
#include <thread>
#include <chrono>
#include <unordered_map>

#ifdef _WIN32
#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <windows.h>
#include <timeapi.h>
#endif

#include "feed/mock_feed.h"
#include "publisher/zmq_publisher.h"
#include "orders/order_gateway.h"

static std::atomic<bool> g_running{true};

void signal_handler(int) {
    g_running = false;
}

int main() {
    std::signal(SIGINT, signal_handler);
    std::signal(SIGTERM, signal_handler);

#ifdef _WIN32
    // Default Windows timer tick is ~15.6 ms, which would quantize feed pacing
    // and any timed waits to that granularity. Request 1 ms resolution.
    timeBeginPeriod(1);

#ifdef PROCESS_POWER_THROTTLING_IGNORE_TIMER_RESOLUTION
    // Windows 11 ignores timer-resolution requests from background/hidden
    // processes unless the process explicitly opts out of that throttling.
    PROCESS_POWER_THROTTLING_STATE throttling{};
    throttling.Version = PROCESS_POWER_THROTTLING_CURRENT_VERSION;
    throttling.ControlMask = PROCESS_POWER_THROTTLING_IGNORE_TIMER_RESOLUTION;
    throttling.StateMask = 0;  // honor our timeBeginPeriod request
    SetProcessInformation(GetCurrentProcess(), ProcessPowerThrottling,
                          &throttling, sizeof(throttling));
#endif
#endif

    std::cout << "=== Trading Engine Starting ===" << std::endl;

    // Configuration
    const int events_per_second = 500;
    const int snapshot_interval = 100;       // publish full snapshot every N events per symbol
    const int ticker_throttle_ms = 500;      // throttle ticker updates

    // Initialize components
    trading::ZmqPublisher publisher("tcp://*:5555");
    trading::MockFeed feed(events_per_second);
    trading::OrderGateway gateway("tcp://*:5556",
        [&feed](const std::string& symbol) -> const trading::OrderBook* {
            return feed.has_book(symbol) ? &feed.get_book(symbol) : nullptr;
        });

    try {
        publisher.start();
        gateway.start();
    } catch (const std::exception& e) {
        std::cerr << "[Engine] Failed to bind ZMQ socket: " << e.what() << std::endl;
        std::cerr << "[Engine] Are ports 5555/5556 already in use? Kill any existing trading-engine process." << std::endl;
        return 1;
    }
    feed.start();

    // Per-symbol state tracking
    struct SymbolState {
        uint64_t sequence = 0;
        int event_count = 0;
        double last_ticker_price = 0.0;
        double initial_price = 0.0;
        double high_24h = 0.0;
        double low_24h = std::numeric_limits<double>::max();
        double volume = 0.0;
        std::chrono::steady_clock::time_point last_ticker_time;
    };

    std::unordered_map<std::string, SymbolState> states;

    // Initialize states and publish initial snapshots
    for (const auto& config : feed.symbols()) {
        auto& state = states[config.symbol];
        state.initial_price = config.base_price;
        state.last_ticker_price = config.base_price;
        state.high_24h = config.base_price;
        state.low_24h = config.base_price;
        state.last_ticker_time = std::chrono::steady_clock::now();

        // Publish initial snapshot
        const auto& book = feed.get_book(config.symbol);
        publisher.publish_snapshot(book, state.sequence++);
    }

    std::cout << "[Engine] Publishing market data for "
              << feed.symbols().size() << " symbols" << std::endl;
    std::cout << "[Engine] Target rate: " << events_per_second
              << " events/sec" << std::endl;
    std::cout << "[Engine] Press Ctrl+C to stop" << std::endl;

    // Main event loop
    trading::FeedEvent event;
    auto last_account_heartbeat = std::chrono::steady_clock::now();

    // Publish account state when fills changed it, plus a heartbeat so a
    // late-joining middleware picks up current state.
    auto maybe_publish_account = [&]() {
        auto now = std::chrono::steady_clock::now();
        bool heartbeat_due = (now - last_account_heartbeat) >= std::chrono::seconds(5);
        if (gateway.account().dirty() || heartbeat_due) {
            publisher.publish_account(gateway.account());
            gateway.account().clear_dirty();
            last_account_heartbeat = now;
        }
    };

    while (g_running) {
        // Process pending order requests (non-blocking)
        int orders_processed = gateway.poll();
        maybe_publish_account();

        if (!feed.poll(event)) {
            // No feed event ready — wait on the order socket instead of
            // sleeping: wakes immediately when an order arrives, or after
            // 1 ms to re-check the feed.
            if (orders_processed == 0) {
                gateway.wait(1);
            }
            continue;
        }

        auto& state = states[event.symbol];

        // Publish delta
        publisher.publish_delta(event, state.sequence++);
        state.event_count++;

        // Periodic full snapshot for late joiners
        if (state.event_count % snapshot_interval == 0) {
            const auto& book = feed.get_book(event.symbol);
            publisher.publish_snapshot(book, state.sequence++);
        }

        // Re-check resting limit orders against the updated book
        gateway.on_book_update(event.symbol, feed.get_book(event.symbol));
        maybe_publish_account();

        // Ticker updates (throttled)
        const auto& book = feed.get_book(event.symbol);
        double mid = book.mid_price();
        if (mid > 0.0) {
            auto now = std::chrono::steady_clock::now();
            auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
                now - state.last_ticker_time).count();

            if (elapsed >= ticker_throttle_ms) {
                // Update tracking
                state.high_24h = std::max(state.high_24h, mid);
                state.low_24h = std::min(state.low_24h, mid);
                state.volume += event.size * mid;  // approximate volume

                double change = mid - state.initial_price;
                double change_pct = (change / state.initial_price) * 100.0;

                publisher.publish_ticker(
                    event.symbol, mid, change, change_pct,
                    state.high_24h, state.low_24h, state.volume);

                state.last_ticker_price = mid;
                state.last_ticker_time = now;
            }
        }
    }

    std::cout << "\n[Engine] Shutting down..." << std::endl;
    feed.stop();
    gateway.stop();
    publisher.stop();

#ifdef _WIN32
    timeEndPeriod(1);
#endif

    return 0;
}
