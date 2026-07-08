#pragma once

#include <string>
#include <map>
#include <cstdint>

#include "paper_matcher.h"

namespace trading {

// Per-symbol position state (quantity is signed; negative = short)
struct Position {
    double quantity = 0.0;
    double avg_price = 0.0;
    double realized_pnl = 0.0;
};

// Single paper-trading account fed by matcher fills.
// Cash and realized P&L are authoritative here; unrealized P&L is derived
// downstream from live tickers.
class PaperAccount {
public:
    explicit PaperAccount(double starting_cash = 100000.0)
        : cash_(starting_cash) {}

    // Apply one fill. Handles increases, reductions, and crossing through
    // zero (close + re-open at the fill price).
    void apply_fill(const std::string& symbol, OrderSide side,
                    double price, double quantity);

    double cash() const { return cash_; }
    double total_realized_pnl() const { return total_realized_; }
    const std::map<std::string, Position>& positions() const { return positions_; }

    // Set once consumed by the publisher loop
    bool dirty() const { return dirty_; }
    void clear_dirty() { dirty_ = false; }

private:
    double cash_;
    double total_realized_ = 0.0;
    std::map<std::string, Position> positions_;
    bool dirty_ = false;
};

} // namespace trading
