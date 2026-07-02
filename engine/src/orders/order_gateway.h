#pragma once

#include <string>
#include <functional>
#include <zmq.hpp>
#include <flatbuffers/flatbuffers.h>

#include "paper_matcher.h"

namespace trading {

// ZMQ ROUTER endpoint accepting OrderRequest FlatBuffers and replying with
// OrderReply. Replies are addressed by routing identity, so resting-order
// fills can be pushed to the submitting client asynchronously.
class OrderGateway {
public:
    // Resolves a symbol to its live book; returns nullptr for unknown symbols.
    using BookLookup = std::function<const OrderBook*(const std::string&)>;

    OrderGateway(const std::string& endpoint, BookLookup books);
    ~OrderGateway();

    void start();
    void stop();

    // Drain pending order requests without blocking. Returns count processed.
    int poll(int max_messages = 16);

    // Block up to timeout_ms waiting for an inbound order. Wakes immediately
    // when one arrives — replaces sleep-based idling in the main loop, whose
    // effective resolution on Windows is the ~15.6 ms system timer tick.
    bool wait(int timeout_ms);

    // Re-check resting orders after a book update; pushes fill reports.
    void on_book_update(const std::string& symbol, const OrderBook& book);

    size_t resting_count() const { return matcher_.resting_count(); }

private:
    zmq::context_t ctx_;
    zmq::socket_t router_;
    std::string endpoint_;
    BookLookup books_;
    PaperMatcher matcher_;
    flatbuffers::FlatBufferBuilder builder_;
    bool running_ = false;

    void handle_request(const std::string& routing_id,
                        const uint8_t* data, size_t size,
                        uint64_t ts_engine_in_us);

    void send_reply(const std::string& routing_id,
                    const PaperOrder& order,
                    const MatchResult& result,
                    uint64_t ts_engine_in_us);
};

} // namespace trading
