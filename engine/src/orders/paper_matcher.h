#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <utility>
#include <cstdint>

#include "../orderbook/order_book.h"

namespace trading {

enum class OrderSide : uint8_t { Buy = 0, Sell = 1 };
enum class OrderType : uint8_t { Market = 0, Limit = 1 };

enum class OrderStatus : uint8_t {
    Accepted = 0,
    Filled = 1,
    PartiallyFilled = 2,
    Resting = 3,
    Rejected = 4,
    Canceled = 5,
};

struct FillReport {
    double price;
    double quantity;
};

struct PaperOrder {
    std::string client_order_id;
    std::string symbol;
    OrderSide side = OrderSide::Buy;
    OrderType type = OrderType::Market;
    double quantity = 0.0;
    double limit_price = 0.0;
    double filled_quantity = 0.0;
    double filled_notional = 0.0;   // sum(price * qty) for avg price

    // Hop timestamps echoed back in every reply (microseconds since epoch)
    uint64_t ts_ui_submit_us = 0;
    uint64_t ts_mw_in_us = 0;
    uint64_t ts_mw_out_us = 0;
    uint64_t ts_engine_in_us = 0;

    // ZMQ routing identity of the client that submitted the order,
    // so resting-order fills can be pushed back asynchronously.
    std::string routing_id;

    double remaining() const { return quantity - filled_quantity; }
    double avg_fill_price() const {
        return filled_quantity > 0.0 ? filled_notional / filled_quantity : 0.0;
    }
};

struct MatchResult {
    OrderStatus status = OrderStatus::Rejected;
    std::vector<FillReport> fills;  // fills from this matching pass
    std::string reason;
};

// Paper-trading matcher: fills orders against the live book without
// consuming its liquidity (the book simulates external market depth).
class PaperMatcher {
public:
    // Match an incoming order. Market remainders are canceled;
    // limit remainders rest and are re-checked on book updates.
    MatchResult submit(PaperOrder order, const OrderBook& book);

    // Re-check resting orders for a symbol after its book changed.
    // Returns (order snapshot, result) for each order that filled;
    // fully-filled orders are removed from the resting set.
    std::vector<std::pair<PaperOrder, MatchResult>> on_book_update(
        const std::string& symbol, const OrderBook& book);

    size_t resting_count() const;

private:
    std::unordered_map<std::string, std::vector<PaperOrder>> resting_;

    // Walk the opposite side of the book, filling up to remaining qty
    // within the limit price. Mutates the order's fill state.
    std::vector<FillReport> cross(PaperOrder& order, const OrderBook& book);
};

} // namespace trading
