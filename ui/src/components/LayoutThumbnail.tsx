import type { LayoutWidget, WidgetType } from '../stores/workspaceStore';

interface LayoutThumbnailProps {
    widgets: LayoutWidget[];
    width?: number;
    height?: number;
    className?: string;
}

const GRID_COLS = 12;

// Approximate row count for thumbnail scaling
function estimateRows(widgets: LayoutWidget[]): number {
    if (widgets.length === 0) return 9;
    return Math.max(...widgets.map(w => w.y + w.h), 9);
}

// Short label per type
const TYPE_LABEL: Record<WidgetType, string> = {
    Chart: 'CHT',
    Watchlist: 'WTCH',
    OrderEntry: 'ORD',
    OptionChain: 'OPT',
    Positions: 'POS',
    Orders: 'ORDS',
    MarketDepth: 'DOM',
    NewsFeed: 'NEWS',
    Scanner: 'SCAN',
    AccountSummary: 'ACCT',
    Alerts: 'ALRT',
    EconomicCalendar: 'ECON',
    Notes: 'NOTE',
    PriceAlert: 'PRCE',
    HeatMap: 'HEAT',
    Algo: 'ALGO',
};

// Subtle fill tints per widget category
function widgetFill(type: WidgetType): string {
    switch (type) {
        case 'Chart':           return '#0d1a2a';   // blue tint
        case 'OrderEntry':
        case 'Orders':
        case 'Positions':       return '#1a1500';   // gold tint
        case 'PriceAlert':
        case 'Alerts':          return '#1a0a0f';   // red tint
        case 'AccountSummary':  return '#0a1a12';   // green tint
        case 'NewsFeed':
        case 'EconomicCalendar':return '#141428';   // purple tint
        case 'Watchlist':       return '#0d1420';   // cyan-blue tint
        case 'MarketDepth':     return '#101828';   // indigo tint
        default:                return '#1a1d21';   // neutral
    }
}

function widgetStroke(type: WidgetType): string {
    switch (type) {
        case 'Chart':           return '#1a3050';
        case 'OrderEntry':
        case 'Orders':
        case 'Positions':       return '#3a2a00';
        case 'PriceAlert':
        case 'Alerts':          return '#3a1020';
        case 'AccountSummary':  return '#1a3a24';
        default:                return '#2a2d35';
    }
}

export function LayoutThumbnail({
    widgets,
    width = 200,
    height = 120,
    className,
}: LayoutThumbnailProps) {
    const rows = estimateRows(widgets);
    const cellW = width / GRID_COLS;
    const cellH = height / rows;
    const PAD = 1; // gap between rects

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={className}
            style={{ display: 'block', flexShrink: 0 }}
        >
            {/* Background */}
            <rect x={0} y={0} width={width} height={height} fill="var(--color-bg-deeper)" />

            {/* Grid lines (subtle) */}
            {Array.from({ length: GRID_COLS - 1 }).map((_, i) => (
                <line
                    key={`v${i}`}
                    x1={(i + 1) * cellW} y1={0}
                    x2={(i + 1) * cellW} y2={height}
                    stroke="var(--color-surface-hover)" strokeWidth={0.5}
                />
            ))}
            {Array.from({ length: rows - 1 }).map((_, i) => (
                <line
                    key={`h${i}`}
                    x1={0} y1={(i + 1) * cellH}
                    x2={width} y2={(i + 1) * cellH}
                    stroke="var(--color-surface-hover)" strokeWidth={0.5}
                />
            ))}

            {/* Widget rects */}
            {widgets.map(w => {
                const rx = w.x * cellW + PAD;
                const ry = w.y * cellH + PAD;
                const rw = w.w * cellW - PAD * 2;
                const rh = w.h * cellH - PAD * 2;
                const cx = rx + rw / 2;
                const cy = ry + rh / 2;
                const label = TYPE_LABEL[w.type] ?? w.type.slice(0, 4).toUpperCase();
                const fontSize = Math.min(8, rw / 5, rh / 2.2);

                return (
                    <g key={w.id}>
                        <rect
                            x={rx} y={ry} width={rw} height={rh}
                            fill={widgetFill(w.type)}
                            stroke={widgetStroke(w.type)}
                            strokeWidth={0.75}
                        />
                        {rw > 14 && rh > 8 && (
                            <text
                                x={cx} y={cy}
                                textAnchor="middle" dominantBaseline="middle"
                                fill="var(--color-text-muted)"
                                fontSize={fontSize}
                                fontFamily="monospace"
                                letterSpacing={0.5}
                            >
                                {label}
                            </text>
                        )}
                    </g>
                );
            })}

            {/* Outer border */}
            <rect
                x={0.5} y={0.5} width={width - 1} height={height - 1}
                fill="none" stroke="#2a2d35" strokeWidth={1}
            />
        </svg>
    );
}
