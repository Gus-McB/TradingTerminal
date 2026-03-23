#pragma once

#include "market_feed.h"
#include "../orderbook/order_book.h"
#include <vector>
#include <random>
#include <chrono>
#include <unordered_map>

namespace trading {

struct SymbolConfig {
    std::string symbol;
    double base_price;
    double volatility;     // price movement per tick as fraction of base price
    double tick_size;      // minimum price increment
};

class MockFeed : public MarketFeed {
public:
    explicit MockFeed(int events_per_second = 500);
    ~MockFeed() override = default;

    void start() override;
    void stop() override;
    bool poll(FeedEvent& event) override;

    // Access internal books for initial snapshot generation
    const OrderBook& get_book(const std::string& symbol) const;
    const std::vector<SymbolConfig>& symbols() const { return configs_; }

private:
    bool running_ = false;
    int events_per_second_;
    std::mt19937 rng_;

    std::vector<SymbolConfig> configs_;
    std::unordered_map<std::string, OrderBook> books_;
    size_t current_symbol_idx_ = 0;

    std::chrono::steady_clock::time_point last_event_time_;
    int min_interval_us_;  // minimum microseconds between events

    void init_symbols();
    void generate_initial_book(const SymbolConfig& config);
    FeedEvent generate_event(const SymbolConfig& config);
};

} // namespace trading
