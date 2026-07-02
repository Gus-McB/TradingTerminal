#include "order_gateway.h"

#include <chrono>
#include <iostream>

#include "../generated/orders_generated.h"

namespace trading {

namespace fb = TradingTerminal;

static uint64_t now_microseconds() {
    return static_cast<uint64_t>(
        std::chrono::duration_cast<std::chrono::microseconds>(
            std::chrono::system_clock::now().time_since_epoch()).count());
}

OrderGateway::OrderGateway(const std::string& endpoint, BookLookup books)
    : ctx_(1)
    , router_(ctx_, zmq::socket_type::router)
    , endpoint_(endpoint)
    , books_(std::move(books))
    , builder_(512)
{
}

OrderGateway::~OrderGateway() {
    stop();
}

void OrderGateway::start() {
    router_.bind(endpoint_);
    running_ = true;
    std::cout << "[OrderGateway] Bound to " << endpoint_ << std::endl;
}

void OrderGateway::stop() {
    if (running_) {
        running_ = false;
        router_.close();
    }
}

bool OrderGateway::wait(int timeout_ms) {
    if (!running_) return false;
    zmq::pollitem_t items[] = {{ router_.handle(), 0, ZMQ_POLLIN, 0 }};
    zmq::poll(items, 1, std::chrono::milliseconds(timeout_ms));
    return (items[0].revents & ZMQ_POLLIN) != 0;
}

int OrderGateway::poll(int max_messages) {
    if (!running_) return 0;

    int processed = 0;
    while (processed < max_messages) {
        zmq::message_t identity;
        auto res = router_.recv(identity, zmq::recv_flags::dontwait);
        if (!res) break;

        const uint64_t ts_engine_in = now_microseconds();

        // DEALER peers send a single payload frame after the identity
        zmq::message_t payload;
        if (!identity.more() || !router_.recv(payload, zmq::recv_flags::none)) {
            continue;  // malformed multipart, drop
        }

        // Drain any unexpected extra frames
        while (payload.more()) {
            zmq::message_t extra;
            if (!router_.recv(extra, zmq::recv_flags::none)) break;
            payload = std::move(extra);
        }

        handle_request(identity.to_string(),
                       static_cast<const uint8_t*>(payload.data()),
                       payload.size(),
                       ts_engine_in);
        ++processed;
    }
    return processed;
}

void OrderGateway::handle_request(const std::string& routing_id,
                                  const uint8_t* data, size_t size,
                                  uint64_t ts_engine_in_us) {
    flatbuffers::Verifier verifier(data, size);
    if (!fb::VerifyOrderEnvelopeBuffer(verifier)) {
        std::cerr << "[OrderGateway] Dropping malformed order buffer ("
                  << size << " bytes)" << std::endl;
        return;
    }

    const auto* envelope = fb::GetOrderEnvelope(data);
    const auto* req = envelope->message_as_OrderRequest();
    if (!req) return;  // only requests are valid inbound

    PaperOrder order;
    order.client_order_id = req->client_order_id() ? req->client_order_id()->str() : "";
    order.symbol          = req->symbol() ? req->symbol()->str() : "";
    order.side            = req->side() == fb::OrderSide_Buy ? OrderSide::Buy : OrderSide::Sell;
    order.type            = req->type() == fb::OrderType_Market ? OrderType::Market : OrderType::Limit;
    order.quantity        = req->quantity();
    order.limit_price     = req->limit_price();
    order.ts_ui_submit_us = req->ts_ui_submit_us();
    order.ts_mw_in_us     = req->ts_mw_in_us();
    order.ts_mw_out_us    = req->ts_mw_out_us();
    order.ts_engine_in_us = ts_engine_in_us;
    order.routing_id      = routing_id;

    const OrderBook* book = books_(order.symbol);
    if (!book) {
        MatchResult rejected;
        rejected.status = OrderStatus::Rejected;
        rejected.reason = "unknown symbol: " + order.symbol;
        send_reply(routing_id, order, rejected, ts_engine_in_us);
        return;
    }

    MatchResult result = matcher_.submit(order, *book);

    // submit() matched against its own copy of the order; on this first pass
    // the cumulative fill state equals the fills it just produced.
    for (const auto& f : result.fills) {
        order.filled_quantity += f.quantity;
        order.filled_notional += f.price * f.quantity;
    }

    send_reply(routing_id, order, result, ts_engine_in_us);
}

void OrderGateway::on_book_update(const std::string& symbol, const OrderBook& book) {
    if (!running_) return;

    auto reports = matcher_.on_book_update(symbol, book);
    for (const auto& [order, result] : reports) {
        send_reply(order.routing_id, order, result, order.ts_engine_in_us);
    }
}

void OrderGateway::send_reply(const std::string& routing_id,
                              const PaperOrder& order,
                              const MatchResult& result,
                              uint64_t ts_engine_in_us) {
    builder_.Clear();

    std::vector<flatbuffers::Offset<fb::Fill>> fill_offsets;
    fill_offsets.reserve(result.fills.size());
    for (const auto& f : result.fills) {
        fill_offsets.push_back(fb::CreateFill(builder_, f.price, f.quantity));
    }

    auto client_order_id = builder_.CreateString(order.client_order_id);
    auto symbol = builder_.CreateString(order.symbol);
    auto fills = builder_.CreateVector(fill_offsets);
    auto reason = builder_.CreateString(result.reason);

    auto reply = fb::CreateOrderReply(
        builder_,
        client_order_id,
        symbol,
        static_cast<fb::OrderStatus>(result.status),
        order.filled_quantity,
        order.avg_fill_price(),
        fills,
        reason,
        order.ts_ui_submit_us,
        order.ts_mw_in_us,
        order.ts_mw_out_us,
        ts_engine_in_us,
        now_microseconds());

    auto envelope = fb::CreateOrderEnvelope(
        builder_, fb::OrderMessage_OrderReply, reply.Union());
    builder_.Finish(envelope);

    zmq::message_t id_msg(routing_id.data(), routing_id.size());
    zmq::message_t payload(builder_.GetBufferPointer(), builder_.GetSize());

    try {
        router_.send(id_msg, zmq::send_flags::sndmore);
        router_.send(payload, zmq::send_flags::dontwait);
    } catch (const zmq::error_t& e) {
        std::cerr << "[OrderGateway] Failed to send reply: " << e.what() << std::endl;
    }
}

} // namespace trading
