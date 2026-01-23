import { useMarketData } from "../../stores/marketStore";
import { Watchlist } from "../market/WatchList";
import { PriceHeader } from "../market/PriceHeader";
import { OrderBookPanel } from "../market/OrderBookPanel";
import { useState } from 'react';

export function ContentArea() {
    const { tickers, selectedSymbol, setSelectedSymbol, selectedTicker, orderBook } = useMarketData();

    const [visiblePanels, setVisiblePanels] = useState({
        watchlist: true,
        orderbook: true,
    });

    const removePanel = (panel: keyof typeof visiblePanels) => {
        setVisiblePanels(prev => ({ ...prev, [panel]: false }));
    };

    return (
        <div className="flex-1 flex gap-2 p-2 overflow-hidden">
            {/* Watchlist - removable */}
            {visiblePanels.watchlist && (
                <div className="w-64 flex-shrink-0">
                    <Watchlist 
                        tickers={tickers}
                        selectedSymbol={selectedSymbol}
                        onSelect={setSelectedSymbol}
                        onRemove={() => removePanel('watchlist')}
                    />
                </div>
            )}

            <div className="flex-1 flex flex-col gap-2">
                {selectedTicker && <PriceHeader ticker={selectedTicker} />}
                
                <div className="flex-1 bg-terminal-surface border border-terminal-border rounded-lg p-4 flex items-center justify-center">
                    <span className="text-terminal-muted font-pixel text-xs">
                        [ CHART PLACEHOLDER ]
                    </span>
                </div>
            </div>

            {visiblePanels.orderbook && (
                <div className="w-72 flex-shrink-0">
                    <OrderBookPanel 
                        orderBook={orderBook} 
                        onRemove={() => removePanel('orderbook')}
                    />
                </div>
            )}
        </div>
    );
}