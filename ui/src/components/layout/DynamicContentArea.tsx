import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useMarketData } from '../../stores/marketStore';
import { Watchlist } from '../market/WatchList';
import { OrderBookPanel } from '../market/OrderBookPanel';
import { PriceHeader } from '../market/PriceHeader';
import { CandleChart } from '../market/CandleChart';
import { useEffect, useState } from 'react';

interface DynamicContentAreaProps {
  workspaceId: string;
}

export function DynamicContentArea({ workspaceId }: DynamicContentAreaProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  
  const workspace = useWorkspaceStore((state) => 
    state.workspaces.find(w => w.id === workspaceId)
  );
  const { tickers, selectedSymbol, setSelectedSymbol, selectedTicker, orderBook, candles } = useMarketData();
  const removeWidget = useWorkspaceStore((state) => state.removeWidget);

  useEffect(() => {
    if (useWorkspaceStore.persist.hasHydrated()) {
      setIsHydrated(true);
    } else {
      const unsub = useWorkspaceStore.persist.onFinishHydration(() => {
        setIsHydrated(true);
      });
      return unsub;
    }
  }, []);

  if (!isHydrated || !workspace) return null;

  const hasWidget = (type: string) => workspace.layout.widgets.some(w => (w.type as string) === type);

  return (
    <div className="flex-1 flex gap-2 p-2 overflow-hidden">
      {/* Left: Watchlist */}
      {hasWidget('watchlist') && (
        <div className="w-64 flex-shrink-0">
          <Watchlist 
            tickers={tickers}
            selectedSymbol={selectedSymbol}
            onSelect={setSelectedSymbol}
            onRemove={() => {
              const widget = workspace.layout.widgets.find(w => (w.type as string) === 'watchlist');
              if (widget) removeWidget(workspaceId, widget.id);
            }}
          />
        </div>
      )}

      {/* Center: Chart area */}
      <div className="flex-1 flex flex-col gap-2">
        {hasWidget('priceheader') && selectedTicker && (
          <PriceHeader ticker={selectedTicker} />
        )}
        
        {hasWidget('chart') && (
          <div className="flex-1 bg-terminal-surface border border-terminal-border rounded-lg overflow-hidden">
            <CandleChart
              symbol={selectedSymbol}
              candles={candles}
              currentPrice={selectedTicker?.price}
            />
          </div>
        )}
      </div>

      {/* Right: Order Book */}
      {hasWidget('orderbook') && (
        <div className="w-72 flex-shrink-0">
          <OrderBookPanel 
            orderBook={orderBook}
            onRemove={() => {
              const widget = workspace.layout.widgets.find(w => (w.type as string) === 'orderbook');
              if (widget) removeWidget(workspaceId, widget.id);
            }}
          />
        </div>
      )}
    </div>
  );
}