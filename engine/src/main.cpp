#include <iostream>
#include <csignal>
#include <atomic>
#include <thread>
#include <chrono>
#include <unordered_map>

#include "feed/mock_feed.h"
#include "publisher/zmq_publisher.h"

static std::atomic<bool> g_running{true};

void signal_handler(int) {
    g_running = false;
}

int main() {
    std::signal(SIGINT, signal_handler);
    std::signal(SIGTERM, signal_handler);

    std::cout << "=== Trading Engine Starting ===" << std::endl;

    // Configuration
    const int events_per_second = 500;
    const int snapshot_interval = 100;       // publish full snapshot every N events per symbol
    const int ticker_throttle_ms = 500;      // throttle ticker updates

    // Initialize components
    trading::ZmqPublisher publisher("tcp://*:5555");
    trading::MockFeed feed(events_per_second);

    try {
        publisher.start();
    } catch (const std::exception& e) {
        std::cerr << "[Engine] Failed to bind ZMQ socket: " << e.what() << std::endl;
        std::cerr << "[Engine] Is port 5555 already in use? Kill any existing trading-engine process." << std::endl;
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
    while (g_running) {
        if (!feed.poll(event)) {
            // No event ready yet, yield CPU briefly
            std::this_thread::sleep_for(std::chrono::microseconds(100));
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
    publisher.stop();

    return 0;
}
