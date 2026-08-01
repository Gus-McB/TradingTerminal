#include "paper_account.h"

#include <algorithm>
#include <cmath>

namespace trading {

namespace {
constexpr double kEps = 1e-9;
double sign_of(double v) { return v > 0 ? 1.0 : (v < 0 ? -1.0 : 0.0); }
}

void PaperAccount::apply_fill(const std::string& symbol, OrderSide side,
                              double price, double quantity) {
    if (quantity <= kEps || price <= kEps) return;

    const double s = (side == OrderSide::Buy) ? 1.0 : -1.0;
    Position& pos = positions_[symbol];

    // Cash moves opposite to the signed quantity
    cash_ -= s * price * quantity;

    const double old_qty = pos.quantity;

    if (std::abs(old_qty) <= kEps || sign_of(old_qty) == s) {
        // Opening or increasing: volume-weighted average price
        const double abs_old = std::abs(old_qty);
        pos.avg_price = (pos.avg_price * abs_old + price * quantity) / (abs_old + quantity);
        pos.quantity = old_qty + s * quantity;
    } else {
        // Reducing / closing / crossing zero
        const double closed = std::min(std::abs(old_qty), quantity);
        const double pnl = (price - pos.avg_price) * closed * sign_of(old_qty);
        pos.realized_pnl += pnl;
        total_realized_ += pnl;

        pos.quantity = old_qty + s * quantity;
        if (std::abs(pos.quantity) <= kEps) {
            pos.quantity = 0.0;
            pos.avg_price = 0.0;
        } else if (sign_of(pos.quantity) == s) {
            // Crossed through zero: remainder opens fresh at the fill price
            pos.avg_price = price;
        }
        // else: partial reduction — avg price of the remainder is unchanged
    }

    dirty_ = true;
}

} // namespace trading
