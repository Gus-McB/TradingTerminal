/**
 * dockLayout — helpers for building and reading dockview layouts.
 *
 * Migration: legacy workspaces store a react-grid-layout widget list
 * (x/y/w/h). buildDockFromGrid approximates it as a dock tree: widgets are
 * grouped into rows by their y origin; rows stack vertically, row members
 * split horizontally. The first serialize after migration makes the dock
 * layout authoritative.
 */
import type { DockviewApi, AddPanelPositionOptions } from 'dockview-react';
import { WIDGET_REGISTRY } from '../widgets/registry';
import type { LayoutWidget, WidgetType } from '../stores/workspaceStore';

export const PANEL_COMPONENT = 'widget';
export const TAB_COMPONENT = 'widgetTab';

export interface WidgetPanelParams {
    type: WidgetType;
    config: Record<string, unknown>;
    [key: string]: unknown;
}

export function newPanelId(type: WidgetType): string {
    return `${type}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Add a widget panel (used by palette, palette queue, and migration). */
export function addWidgetPanel(
    api: DockviewApi,
    type: WidgetType,
    options: { id?: string; config?: Record<string, unknown>; position?: AddPanelPositionOptions } = {},
) {
    const entry = WIDGET_REGISTRY[type];
    return api.addPanel({
        id: options.id ?? newPanelId(type),
        component: PANEL_COMPONENT,
        tabComponent: TAB_COMPONENT,
        title: entry?.label ?? type,
        params: { type, config: options.config ?? {} } satisfies WidgetPanelParams,
        ...(options.position ? { position: options.position } : {}),
    });
}

/** Build a dock layout from a legacy grid widget list. */
export function buildDockFromGrid(api: DockviewApi, widgets: LayoutWidget[]): void {
    if (widgets.length === 0) return;

    // Group into rows by y origin (tolerance of 1 grid unit)
    const sorted = [...widgets].sort((a, b) => a.y - b.y || a.x - b.x);
    const rows: LayoutWidget[][] = [];
    let currentRow: LayoutWidget[] = [];
    let rowY = sorted[0].y;

    for (const w of sorted) {
        if (currentRow.length === 0 || Math.abs(w.y - rowY) <= 1) {
            currentRow.push(w);
            rowY = currentRow[0].y;
        } else {
            rows.push(currentRow);
            currentRow = [w];
            rowY = w.y;
        }
    }
    if (currentRow.length) rows.push(currentRow);

    let firstOfPrevRow: string | null = null;
    for (const row of rows) {
        let prevInRow: string | null = null;
        for (const w of row) {
            const position = prevInRow
                ? { referencePanel: prevInRow, direction: 'right' as const }
                : firstOfPrevRow
                    ? { referencePanel: firstOfPrevRow, direction: 'below' as const }
                    : undefined;
            const panel = addWidgetPanel(api, w.type, { id: w.id, config: w.config, position });
            if (!prevInRow) firstOfPrevRow = panel.id;
            prevInRow = panel.id;
        }
    }
}

/** Extract widget panels {id, type, config} from a serialized dock layout. */
export function panelsFromDockLayout(dockLayout: unknown): Array<{ id: string; type: WidgetType; config: Record<string, unknown> }> {
    const panels = (dockLayout as { panels?: Record<string, { params?: WidgetPanelParams }> } | null)?.panels;
    if (!panels) return [];
    return Object.entries(panels)
        .filter(([, p]) => p.params?.type)
        .map(([id, p]) => ({
            id,
            type: p.params!.type,
            config: p.params!.config ?? {},
        }));
}
