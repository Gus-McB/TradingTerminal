#include "order_book.h"
#include <algorithm>
#include <limits>

namespace trading {

OrderBook::OrderBook(const std::string& symbol, size_t max_depth)
    : symbol_(symbol), max_depth_(max_depth) {}

void OrderBook::add_level(Side side, double price, double size) {
    if (side == Side::Bid) {
        bids_[price] = size;
        trim_bids();
    } else {
        asks_[price] = size;
        trim_asks();
    }
}

void OrderBook::modify_level(Side side, double price, double new_size) {
    if (side == Side::Bid) {
        auto it = bids_.find(price);
        if (it != bids_.end()) {
            it->second = new_size;
        }
    } else {
        auto it = asks_.find(price);
        if (it != asks_.end()) {
            it->second = new_size;
        }
    }
}

void OrderBook::remove_level(Side side, double price) {
    if (side == Side::Bid) {
        bids_.erase(price);
    } else {
        asks_.erase(price);
    }
}

double OrderBook::best_bid() const {
    return bids_.empty() ? 0.0 : bids_.begin()->first;
}

double OrderBook::best_ask() const {
    return asks_.empty() ? std::numeric_limits<double>::max() : asks_.begin()->first;
}

double OrderBook::mid_price() const {
    if (bids_.empty() || asks_.empty()) return 0.0;
    return (best_bid() + best_ask()) / 2.0;
}

double OrderBook::spread() const {
    if (bids_.empty() || asks_.empty()) return 0.0;
    return best_ask() - best_bid();
}

double OrderBook::spread_percent() const {
    double mid = mid_price();
    if (mid <= 0.0) return 0.0;
    return (spread() / mid) * 100.0;
}

std::vector<std::pair<double, double>> OrderBook::top_bids(size_t n) const {
    size_t count = (n == 0) ? max_depth_ : std::min(n, bids_.size());
    std::vector<std::pair<double, double>> result;
    result.reserve(count);
    auto it = bids_.begin();
    for (size_t i = 0; i < count && it != bids_.end(); ++i, ++it) {
        result.emplace_back(it->first, it->second);
    }
    return result;
}

std::vector<std::pair<double, double>> OrderBook::top_asks(size_t n) const {
    size_t count = (n == 0) ? max_depth_ : std::min(n, asks_.size());
    std::vector<std::pair<double, double>> result;
    result.reserve(count);
    auto it = asks_.begin();
    for (size_t i = 0; i < count && it != asks_.end(); ++i, ++it) {
        result.emplace_back(it->first, it->second);
    }
    return result;
}

void OrderBook::trim_bids() {
    while (bids_.size() > max_depth_) {
        auto it = bids_.end();
        --it;  // worst (lowest) bid
        bids_.erase(it);
    }
}

void OrderBook::trim_asks() {
    while (asks_.size() > max_depth_) {
        auto it = asks_.end();
        --it;  // worst (highest) ask
        asks_.erase(it);
    }
}

} // namespace trading
