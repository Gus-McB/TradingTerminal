#pragma once

#include <string>
#include <zmq.hpp>
#include <flatbuffers/flatbuffers.h>
#include "../orderbook/order_book.h"
#include "../feed/market_feed.h"
#include "../orders/paper_account.h"

namespace trading {

class ZmqPublisher {
public:
    explicit ZmqPublisher(const std::string& endpoint = "tcp://*:5555");
    ~ZmqPublisher();

    void start();
    void stop();

    void publish_snapshot(const OrderBook& book, uint64_t sequence);
    void publish_delta(const FeedEvent& event, uint64_t sequence);
    void publish_ticker(const std::string& symbol, double price,
                        double change24h, double change_percent,
                        double high24h, double low24h, double volume);
    void publish_account(const PaperAccount& account);

private:
    zmq::context_t ctx_;
    zmq::socket_t pub_;
    std::string endpoint_;
    bool running_ = false;
    flatbuffers::FlatBufferBuilder builder_;

    void send(const std::string& topic, const uint8_t* buf, size_t size);
};

} // namespace trading
