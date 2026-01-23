import { useParams } from "react-router-dom";
import { WatchlistWidget } from "../components/widgets/WatchlistWidget";
import { OrderBookWidget } from "../components/widgets/OrderBookWidget";

const WIDGETS: Record<string, React.ComponentType> = {
    watchlist: WatchlistWidget,
    orderbook: OrderBookWidget,
};

export function WidgetPage() {
    const { widgetType } = useParams();

    const Widget = widgetType ? WIDGETS[widgetType] : null;

    if (!Widget) {
        return (
            <div className="h-screen bg-terminal-bg flex items-center justify-center text-terminal-muted">
                Unknown widget: {widgetType}
            </div>
        );
    }

    return <Widget />
}