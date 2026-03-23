#include "zmq_publisher.h"
#include "../generated/market_data_generated.h"
#include <chrono>
#include <iostream>

namespace trading {

static uint64_t now_microseconds() {
    auto now = std::chrono::system_clock::now();
    auto us = std::chrono::duration_cast<std::chrono::microseconds>(
        now.time_since_epoch());
    return static_cast<uint64_t>(us.count());
}

ZmqPublisher::ZmqPublisher(const std::string& endpoint)
    : ctx_(1)
    , pub_(ctx_, zmq::socket_type::pub)
    , endpoint_(endpoint)
    , builder_(1024)
{
}

ZmqPublisher::~ZmqPublisher() {
    stop();
}

void ZmqPublisher::start() {
    pub_.bind(endpoint_);
    running_ = true;
    std::cout << "[ZMQ] Publisher bound to " << endpoint_ << std::endl;
}

void ZmqPublisher::stop() {
    if (running_) {
        running_ = false;
        pub_.close();
    }
}

void ZmqPublisher::send(const std::string& topic, const uint8_t* buf, size_t size) {
    if (!running_) return;

    // Frame 1: topic string
    zmq::message_t topic_msg(topic.data(), topic.size());
    pub_.send(topic_msg, zmq::send_flags::sndmore);

    // Frame 2: FlatBuffer payload
    zmq::message_t data_msg(buf, size);
    pub_.send(data_msg, zmq::send_flags::none);
}

void ZmqPublisher::publish_snapshot(const OrderBook& book, uint64_t sequence) {
    builder_.Clear();

    // Build bid levels
    auto bids = book.top_bids();
    std::vector<flatbuffers::Offset<TradingTerminal::OrderBookLevel>> bid_offsets;
    bid_offsets.reserve(bids.size());
    for (const auto& [price, size] : bids) {
        bid_offsets.push_back(
            TradingTerminal::CreateOrderBookLevel(builder_, price, size));
    }

    // Build ask levels
    auto asks = book.top_asks();
    std::vector<flatbuffers::Offset<TradingTerminal::OrderBookLevel>> ask_offsets;
    ask_offsets.reserve(asks.size());
    for (const auto& [price, size] : asks) {
        ask_offsets.push_back(
            TradingTerminal::CreateOrderBookLevel(builder_, price, size));
    }

    auto symbol = builder_.CreateString(book.symbol());
    auto bids_vec = builder_.CreateVector(bid_offsets);
    auto asks_vec = builder_.CreateVector(ask_offsets);

    auto snapshot = TradingTerminal::CreateOrderBookSnapshot(
        builder_, symbol, bids_vec, asks_vec, sequence);

    auto envelope = TradingTerminal::CreateMarketEnvelope(
        builder_, now_microseconds(),
        TradingTerminal::MarketMessage_OrderBookSnapshot,
        snapshot.Union());

    builder_.Finish(envelope);

    send(book.symbol(), builder_.GetBufferPointer(), builder_.GetSize());
}

void ZmqPublisher::publish_delta(const FeedEvent& event, uint64_t sequence) {
    builder_.Clear();

    auto symbol = builder_.CreateString(event.symbol);

    auto level = TradingTerminal::CreateOrderBookLevel(
        builder_, event.price, event.size);

    auto side = (event.side == Side::Bid)
        ? TradingTerminal::Side_Bid
        : TradingTerminal::Side_Ask;

    TradingTerminal::UpdateType update_type;
    switch (event.type) {
        case UpdateType::New:    update_type = TradingTerminal::UpdateType_New; break;
        case UpdateType::Modify: update_type = TradingTerminal::UpdateType_Modify; break;
        case UpdateType::Delete: update_type = TradingTerminal::UpdateType_Delete; break;
    }

    auto delta = TradingTerminal::CreateOrderBookDelta(
        builder_, symbol, side, update_type, level, sequence);

    auto envelope = TradingTerminal::CreateMarketEnvelope(
        builder_, now_microseconds(),
        TradingTerminal::MarketMessage_OrderBookDelta,
        delta.Union());

    builder_.Finish(envelope);

    send(event.symbol, builder_.GetBufferPointer(), builder_.GetSize());
}

void ZmqPublisher::publish_ticker(const std::string& symbol, double price,
                                   double change24h, double change_percent,
                                   double high24h, double low24h, double volume) {
    builder_.Clear();

    auto sym = builder_.CreateString(symbol);

    auto ticker = TradingTerminal::CreateTickerUpdate(
        builder_, sym, price, change24h, change_percent,
        high24h, low24h, volume);

    auto envelope = TradingTerminal::CreateMarketEnvelope(
        builder_, now_microseconds(),
        TradingTerminal::MarketMessage_TickerUpdate,
        ticker.Union());

    builder_.Finish(envelope);

    send(symbol, builder_.GetBufferPointer(), builder_.GetSize());
}

} // namespace trading
