#include "paper_matcher.h"

#include <algorithm>

namespace trading {

namespace {
constexpr double kEps = 1e-9;
}

std::vector<FillReport> PaperMatcher::cross(PaperOrder& order, const OrderBook& book) {
    std::vector<FillReport> fills;

    if (order.side == OrderSide::Buy) {
        // Consume asks, best (lowest) first
        for (const auto& [price, size] : book.asks()) {
            if (order.remaining() <= kEps) break;
            if (order.type == OrderType::Limit && price > order.limit_price + kEps) break;
            double qty = std::min(order.remaining(), size);
            fills.push_back({price, qty});
            order.filled_quantity += qty;
            order.filled_notional += price * qty;
        }
    } else {
        // Consume bids, best (highest) first
        for (const auto& [price, size] : book.bids()) {
            if (order.remaining() <= kEps) break;
            if (order.type == OrderType::Limit && price < order.limit_price - kEps) break;
            double qty = std::min(order.remaining(), size);
            fills.push_back({price, qty});
            order.filled_quantity += qty;
            order.filled_notional += price * qty;
        }
    }

    return fills;
}

MatchResult PaperMatcher::submit(PaperOrder order, const OrderBook& book) {
    MatchResult result;

    if (order.quantity <= kEps) {
        result.status = OrderStatus::Rejected;
        result.reason = "quantity must be > 0";
        return result;
    }
    if (order.type == OrderType::Limit && order.limit_price <= kEps) {
        result.status = OrderStatus::Rejected;
        result.reason = "limit price must be > 0";
        return result;
    }

    result.fills = cross(order, book);
    const bool fully_filled = order.remaining() <= kEps;

    if (fully_filled) {
        result.status = OrderStatus::Filled;
    } else if (order.type == OrderType::Market) {
        // Market remainder is canceled — never rests
        if (order.filled_quantity > kEps) {
            result.status = OrderStatus::PartiallyFilled;
        } else {
            result.status = OrderStatus::Rejected;
            result.reason = "no liquidity";
        }
    } else {
        // Limit remainder rests until the book crosses it
        result.status = order.filled_quantity > kEps
            ? OrderStatus::PartiallyFilled
            : OrderStatus::Resting;
        resting_[order.symbol].push_back(std::move(order));
    }

    return result;
}

std::vector<std::pair<PaperOrder, MatchResult>> PaperMatcher::on_book_update(
    const std::string& symbol, const OrderBook& book) {

    std::vector<std::pair<PaperOrder, MatchResult>> reports;

    auto it = resting_.find(symbol);
    if (it == resting_.end()) return reports;

    auto& orders = it->second;
    for (auto ord = orders.begin(); ord != orders.end();) {
        auto fills = cross(*ord, book);
        if (fills.empty()) {
            ++ord;
            continue;
        }

        MatchResult result;
        result.fills = std::move(fills);
        const bool fully_filled = ord->remaining() <= kEps;
        result.status = fully_filled ? OrderStatus::Filled : OrderStatus::PartiallyFilled;

        reports.emplace_back(*ord, std::move(result));

        if (fully_filled) {
            ord = orders.erase(ord);
        } else {
            ++ord;
        }
    }

    if (orders.empty()) resting_.erase(it);
    return reports;
}

size_t PaperMatcher::resting_count() const {
    size_t n = 0;
    for (const auto& [_, orders] : resting_) n += orders.size();
    return n;
}

} // namespace trading
