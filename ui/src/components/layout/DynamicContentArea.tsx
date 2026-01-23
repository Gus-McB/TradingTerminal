import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useMarketData } from '../../stores/marketStore';
import { Watchlist } from '../market/WatchList';
import { OrderBookPanel } from '../market/OrderBookPanel';
import { PriceHeader } from '../market/PriceHeader';

interface DynamicContentAreaProps {
  workspaceId: string;
}

export function DynamicContentArea({ workspaceId }: DynamicContentAreaProps) {
  const workspace = useWorkspaceStore((state) => 
    state.workspaces.find(w => w.id === workspaceId)
  );
  const { tickers, selectedSymbol, setSelectedSymbol, selectedTicker, orderBook } = useMarketData();
  const removeWidget = useWorkspaceStore((state) => state.removeWidget);

  if (!workspace) return null;

  const hasWidget = (type: string) => workspace.widgets.some(w => w.type === type);

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
              const widget = workspace.widgets.find(w => w.type === 'watchlist');
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
          <div className="flex-1 bg-terminal-surface border border-terminal-border rounded-lg p-4 flex items-center justify-center">
            <span className="text-terminal-muted font-pixel text-xs">
              [ CHART PLACEHOLDER ]
            </span>
          </div>
        )}
      </div>

      {/* Right: Order Book */}
      {hasWidget('orderbook') && (
        <div className="w-72 flex-shrink-0">
          <OrderBookPanel 
            orderBook={orderBook}
            onRemove={() => {
              const widget = workspace.widgets.find(w => w.type === 'orderbook');
              if (widget) removeWidget(workspaceId, widget.id);
            }}
          />
        </div>
      )}
    </div>
  );
}