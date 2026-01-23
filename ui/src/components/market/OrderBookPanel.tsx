import { type OrderBook } from '../../data/mockMarket';
import { Panel } from '../common/Panel';

interface OrderBookPanelProps {
  orderBook: OrderBook;
  symbol?: string;
  onRemove?: () => void;
}

export function OrderBookPanel({ orderBook, symbol = 'BTC/USD', onRemove }: OrderBookPanelProps) {
  const maxTotal = Math.max(
    orderBook.bids[orderBook.bids.length - 1]?.total || 0,
    orderBook.asks[orderBook.asks.length - 1]?.total || 0
  );

  return (
    <Panel title='ORDER_BOOK' widgetType='orderbook' symbol={symbol} className='h-full' onRemove={onRemove}>

        {/* Header */}
        <div className="px-3 py-1 flex justify-between text-xs text-terminal-muted border-b border-terminal-border">
          <span>Price</span>
          <span>Size</span>
          <span>Total</span>
        </div>

        {/* Asks (reversed so lowest ask is at bottom) */}
        <div className="flex-1 overflow-hidden flex flex-col-reverse">
          {orderBook.asks.slice().reverse().map((level, i) => (
            <div key={`ask-${i}`} className="px-3 py-0.5 flex justify-between text-xs relative">
              <div 
                className="absolute right-0 top-0 bottom-0 bg-terminal-red/20"
                style={{ width: `${(level.total / maxTotal) * 100}%` }}
              />
              <span className="text-terminal-red relative z-10">{level.price.toFixed(2)}</span>
              <span className="relative z-10">{level.size.toFixed(3)}</span>
              <span className="text-terminal-muted relative z-10">{level.total.toFixed(3)}</span>
            </div>
          ))}
        </div>

        {/* Spread */}
        <div className="px-3 py-2 border-y border-terminal-border bg-terminal-bg/50 text-center">
          <span className="text-xs text-terminal-muted">
            Spread: <span className="text-terminal-gold">${orderBook.spread.toFixed(2)}</span>
            <span className="ml-2">({orderBook.spreadPercent.toFixed(3)}%)</span>
          </span>
        </div>

        {/* Bids */}
        <div className="flex-1 overflow-hidden">
          {orderBook.bids.map((level, i) => (
            <div key={`bid-${i}`} className="px-3 py-0.5 flex justify-between text-xs relative">
              <div 
                className="absolute right-0 top-0 bottom-0 bg-terminal-green/20"
                style={{ width: `${(level.total / maxTotal) * 100}%` }}
              />
              <span className="text-terminal-green relative z-10">{level.price.toFixed(2)}</span>
              <span className="relative z-10">{level.size.toFixed(3)}</span>
              <span className="text-terminal-muted relative z-10">{level.total.toFixed(3)}</span>
            </div>
          ))}
        </div>
    </Panel>
  );
}