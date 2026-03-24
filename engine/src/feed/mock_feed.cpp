#include "mock_feed.h"
#include <thread>
#include <cmath>

namespace trading {

MockFeed::MockFeed(int events_per_second)
    : events_per_second_(events_per_second)
    , rng_(std::random_device{}())
    , min_interval_us_(1000000 / std::max(events_per_second, 1))
{
    init_symbols();
}

void MockFeed::init_symbols() {
    configs_ = {
        {"BTC/USD",  67500.0, 0.0002, 0.01},
        {"ETH/USD",  3420.0,  0.0003, 0.01},
        {"SOL/USD",  187.0,   0.0005, 0.01},
        {"DOGE/USD", 0.087,   0.0008, 0.00001},
        {"XRP/USD",  2.34,    0.0004, 0.0001},
    };

    for (const auto& config : configs_) {
        books_.emplace(config.symbol, OrderBook(config.symbol, 25));
        generate_initial_book(config);
    }
}

void MockFeed::generate_initial_book(const SymbolConfig& config) {
    auto& book = books_.at(config.symbol);
    double mid = config.base_price;

    // Generate 25 bid levels below mid price
    for (int i = 1; i <= 25; ++i) {
        double price = mid - i * (mid * 0.0001);
        // Round to tick size
        price = std::round(price / config.tick_size) * config.tick_size;

        // Size decays exponentially away from mid
        std::exponential_distribution<double> size_dist(0.5);
        double size = size_dist(rng_) + 0.01;

        book.add_level(Side::Bid, price, size);
    }

    // Generate 25 ask levels above mid price
    for (int i = 1; i <= 25; ++i) {
        double price = mid + i * (mid * 0.0001);
        price = std::round(price / config.tick_size) * config.tick_size;

        std::exponential_distribution<double> size_dist(0.5);
        double size = size_dist(rng_) + 0.01;

        book.add_level(Side::Ask, price, size);
    }
}

void MockFeed::start() {
    running_ = true;
    last_event_time_ = std::chrono::steady_clock::now();
}

void MockFeed::stop() {
    running_ = false;
}

bool MockFeed::poll(FeedEvent& event) {
    if (!running_) return false;

    // Rate limiting: wait until minimum interval has passed
    auto now = std::chrono::steady_clock::now();
    auto elapsed_us = std::chrono::duration_cast<std::chrono::microseconds>(
        now - last_event_time_).count();

    // Add jitter: 0.5x to 1.5x of base interval
    std::uniform_real_distribution<double> jitter(0.5, 1.5);
    int target_us = static_cast<int>(min_interval_us_ * jitter(rng_));

    if (elapsed_us < target_us) {
        return false;
    }

    // Round-robin through symbols
    const auto& config = configs_[current_symbol_idx_];
    current_symbol_idx_ = (current_symbol_idx_ + 1) % configs_.size();

    event = generate_event(config);
    last_event_time_ = now;
    return true;
}

FeedEvent MockFeed::generate_event(const SymbolConfig& config) {
    auto& book = books_.at(config.symbol);
    FeedEvent event;
    event.symbol = config.symbol;

    std::uniform_real_distribution<double> action_dist(0.0, 1.0);
    double action = action_dist(rng_);

    // Choose side
    std::uniform_int_distribution<int> side_dist(0, 1);
    event.side = side_dist(rng_) == 0 ? Side::Bid : Side::Ask;

    if (action < 0.4) {
        // 40%: New level
        event.type = UpdateType::New;

        double mid = book.mid_price();
        if (mid <= 0.0) mid = config.base_price;

        // Generate price near the book edge
        std::normal_distribution<double> price_dist(0.0, mid * config.volatility * 5.0);
        double offset = std::abs(price_dist(rng_));

        if (event.side == Side::Bid) {
            event.price = mid - offset;
        } else {
            event.price = mid + offset;
        }

        // Round to tick size
        event.price = std::round(event.price / config.tick_size) * config.tick_size;
        if (event.price <= 0.0) event.price = config.tick_size;

        std::exponential_distribution<double> size_dist(1.0);
        event.size = size_dist(rng_) + 0.001;

        book.add_level(event.side, event.price, event.size);

    } else if (action < 0.8) {
        // 40%: Modify existing level
        event.type = UpdateType::Modify;

        size_t num_levels = (event.side == Side::Bid) ? book.bid_depth() : book.ask_depth();
        if (num_levels == 0) {
            event.type = UpdateType::New;
            event.price = config.base_price;
            event.size = 0.1;
            book.add_level(event.side, event.price, event.size);
            return event;
        }

        std::uniform_int_distribution<size_t> idx_dist(0, num_levels - 1);
        size_t chosen = idx_dist(rng_);
        double cur_size = 0.0;
        if (event.side == Side::Bid) {
            auto it = book.bids().begin();
            std::advance(it, chosen);
            event.price = it->first;
            cur_size = it->second;
        } else {
            auto it = book.asks().begin();
            std::advance(it, chosen);
            event.price = it->first;
            cur_size = it->second;
        }

        std::uniform_real_distribution<double> mod_dist(0.5, 1.5);
        event.size = cur_size * mod_dist(rng_);
        if (event.size < 0.001) event.size = 0.001;

        book.modify_level(event.side, event.price, event.size);

    } else {
        // 20%: Delete level
        event.type = UpdateType::Delete;

        size_t num_levels = (event.side == Side::Bid) ? book.bid_depth() : book.ask_depth();
        if (num_levels == 0) {
            event.type = UpdateType::New;
            event.price = config.base_price;
            event.size = 0.1;
            book.add_level(event.side, event.price, event.size);
            return event;
        }

        // Pick from the worse half of levels (further from mid)
        size_t half = std::max<size_t>(num_levels / 2, 1);
        std::uniform_int_distribution<size_t> idx_dist(half - 1, num_levels - 1);
        size_t chosen = idx_dist(rng_);
        if (event.side == Side::Bid) {
            auto it = book.bids().begin();
            std::advance(it, chosen);
            event.price = it->first;
        } else {
            auto it = book.asks().begin();
            std::advance(it, chosen);
            event.price = it->first;
        }
        event.size = 0.0;

        book.remove_level(event.side, event.price);
    }

    return event;
}

const OrderBook& MockFeed::get_book(const std::string& symbol) const {
    return books_.at(symbol);
}

} // namespace trading
