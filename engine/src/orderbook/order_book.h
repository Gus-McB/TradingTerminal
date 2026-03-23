#pragma once

#include <string>
#include <map>
#include <functional>
#include <vector>
#include <utility>

namespace trading {

enum class Side { Bid, Ask };

class OrderBook {
public:
    explicit OrderBook(const std::string& symbol, size_t max_depth = 25);

    void add_level(Side side, double price, double size);
    void modify_level(Side side, double price, double new_size);
    void remove_level(Side side, double price);

    const std::string& symbol() const { return symbol_; }
    size_t max_depth() const { return max_depth_; }

    // Bids sorted descending (highest first)
    const std::map<double, double, std::greater<double>>& bids() const { return bids_; }
    // Asks sorted ascending (lowest first)
    const std::map<double, double, std::less<double>>& asks() const { return asks_; }

    double best_bid() const;
    double best_ask() const;
    double mid_price() const;
    double spread() const;
    double spread_percent() const;

    // Get top N levels as vectors (price, size) for serialization
    std::vector<std::pair<double, double>> top_bids(size_t n = 0) const;
    std::vector<std::pair<double, double>> top_asks(size_t n = 0) const;

    size_t bid_depth() const { return bids_.size(); }
    size_t ask_depth() const { return asks_.size(); }

private:
    std::string symbol_;
    size_t max_depth_;
    std::map<double, double, std::greater<double>> bids_;  // price -> size, highest first
    std::map<double, double, std::less<double>> asks_;     // price -> size, lowest first

    void trim_bids();
    void trim_asks();
};

} // namespace trading
