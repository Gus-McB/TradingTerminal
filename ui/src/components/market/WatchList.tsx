import { type Ticker } from "../../data/mockMarket";
import { Panel } from "../common/Panel";

interface WatchListProps {
    tickers: Ticker[];
    selectedSymbol: string;
    onSelect: (symbol: string) => void;
    onRemove?: () => void;
}

export function Watchlist({ tickers, selectedSymbol, onSelect, onRemove}: WatchListProps) {
    return (
      <Panel title="WATCHLIST" widgetType="watchlist" className="h-full" onRemove={onRemove}>
        <div className="flex-1 overflow-y-auto">
          {tickers.map((ticker) => (
            <button
              key={ticker.symbol}
              onClick={() => onSelect(ticker.symbol)}
              className={`
                w-full px-3 py-2 flex justify-between items-center
                border-l-2 transition-all
                ${selectedSymbol === ticker.symbol
                  ? 'bg-terminal-cyan/10 border-terminal-cyan'
                  : 'border-transparent hover:bg-terminal-border/30'
                }
              `}
            >
              <div className="text-left">
                <div className="text-sm font-medium">{ticker.symbol}</div>
                <div className="text-xs text-terminal-muted">{ticker.name}</div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-mono ${
                  ticker.changePercent >= 0 ? 'text-terminal-green' : 'text-terminal-red'
                }`}>
                  ${ticker.price.toLocaleString(undefined, { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: ticker.price < 1 ? 4 : 2 
                  })}
                </div>
                <div className={`text-xs font-mono ${
                  ticker.changePercent >= 0 ? 'text-terminal-green' : 'text-terminal-red'
                }`}>
                  {ticker.changePercent >= 0 ? '▲' : '▼'} {Math.abs(ticker.changePercent).toFixed(2)}%
                </div>
              </div>
            </button>
          ))}
        </div>
      </Panel>
    );
} 