import { useMarketData } from '../../stores/marketStore';
import { Watchlist } from '../market/WatchList';
import { WidgetTitleBar } from '../common/WidgetTitleBar';

export function WatchlistWidget() {
  const { tickers, selectedSymbol, setSelectedSymbol } = useMarketData();

  return (
    <div className="h-screen bg-terminal-bg flex flex-col">
      <WidgetTitleBar title="WATCHLIST" />
      <div className="flex-1 p-2 overflow-hidden">
        <Watchlist
          tickers={tickers}
          selectedSymbol={selectedSymbol}
          onSelect={setSelectedSymbol}
        />
      </div>
    </div>
  );
}