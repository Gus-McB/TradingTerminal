import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useMarketData } from '../../stores/marketStore';
import { OrderBookPanel } from '../market/OrderBookPanel';
import { WidgetTitleBar } from '../common/WidgetTitleBar';

export function OrderBookWidget() {
  const [searchParams] = useSearchParams();
  const symbol = searchParams.get('symbol') || 'BTC/USD';
  const { orderBook, setSelectedSymbol } = useMarketData();

  useEffect(() => {
    setSelectedSymbol(symbol);
  }, [symbol, setSelectedSymbol]);

  return (
    <div className="h-screen bg-terminal-bg flex flex-col">
      <WidgetTitleBar title={`ORDER BOOK - ${symbol}`} />
      <div className="flex-1 p-2 overflow-hidden">
        <OrderBookPanel orderBook={orderBook} />
      </div>
    </div>
  );
}