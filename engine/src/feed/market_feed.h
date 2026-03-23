#pragma once

#include <string>
#include "../orderbook/order_book.h"

namespace trading {

enum class UpdateType { New, Modify, Delete };

struct FeedEvent {
    std::string symbol;
    Side side;
    UpdateType type;
    double price;
    double size;
};

// Abstract interface for market data feeds.
// Implement this to connect real exchange WebSocket feeds.
class MarketFeed {
public:
    virtual ~MarketFeed() = default;
    virtual void start() = 0;
    virtual void stop() = 0;
    // Returns true and populates event if one is available, false otherwise.
    virtual bool poll(FeedEvent& event) = 0;
};

} // namespace trading
