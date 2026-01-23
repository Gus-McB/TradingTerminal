import { type Ticker } from '../../data/mockMarket';

interface PriceHeaderProps {
  ticker: Ticker;
}

export function PriceHeader({ ticker }: PriceHeaderProps) {
  const isPositive = ticker.changePercent >= 0;
  
  return (
    <div className="bg-terminal-surface border border-terminal-border rounded-lg p-4">
      <div className="flex items-baseline gap-4">
        <span className="font-pixel text-sm text-terminal-cyan">{ticker.symbol}</span>
        <span className={`text-2xl font-mono font-bold ${
          isPositive ? 'text-terminal-green' : 'text-terminal-red'
        }`}>
          ${ticker.price.toLocaleString(undefined, { 
            minimumFractionDigits: 2,
            maximumFractionDigits: ticker.price < 1 ? 4 : 2 
          })}
        </span>
        <span className={`text-sm font-mono ${
          isPositive ? 'text-terminal-green' : 'text-terminal-red'
        }`}>
          {isPositive ? '+' : ''}{ticker.change24h.toFixed(2)} ({isPositive ? '+' : ''}{ticker.changePercent.toFixed(2)}%)
        </span>
      </div>
      
      <div className="flex gap-6 mt-2 text-xs text-terminal-muted">
        <span>24h High: <span className="text-terminal-text">${ticker.high24h.toLocaleString()}</span></span>
        <span>24h Low: <span className="text-terminal-text">${ticker.low24h.toLocaleString()}</span></span>
        <span>Volume: <span className="text-terminal-text">${(ticker.volume / 1e9).toFixed(2)}B</span></span>
      </div>
    </div>
  );
}