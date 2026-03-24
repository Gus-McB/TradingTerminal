import { MousePointer2, TrendingUp, Minus, AlignJustify, Triangle, GitCommit, Square, Type, TrendingDown, ArrowRight } from 'lucide-react';

interface DrawingToolbarProps {
    activeTool: string | null;
    onSelectTool: (tool: string | null) => void;
}

interface ToolDef {
    key: string;
    label: string;
    icon: React.ReactNode;
}

const BORDER = '#2a2a3a';
const CYAN = '#00f0ff';
const TEXT = '#6a6a7a';
const BG = '#0e0e18';

const TOOL_GROUPS: ToolDef[][] = [
    [
        { key: 'pointer', label: 'Select', icon: <MousePointer2 size={13} /> },
    ],
    [
        { key: 'trendline',     label: 'Trend Line',    icon: <TrendingUp size={13} /> },
        { key: 'hline',         label: 'Horiz. Line',   icon: <Minus size={13} /> },
        { key: 'vline',         label: 'Vert. Line',    icon: <AlignJustify size={13} style={{ transform: 'rotate(90deg)' }} /> },
        { key: 'ray',           label: 'Ray',           icon: <ArrowRight size={13} /> },
    ],
    [
        { key: 'fib_ret',       label: 'Fib Ret.',      icon: <Triangle size={13} /> },
        { key: 'fib_ext',       label: 'Fib Ext.',      icon: <GitCommit size={13} /> },
    ],
    [
        { key: 'rectangle',     label: 'Rectangle',     icon: <Square size={13} /> },
        { key: 'text',          label: 'Text',          icon: <Type size={13} /> },
    ],
    [
        { key: 'long_position', label: 'Long',          icon: <TrendingUp size={13} style={{ color: '#00ff6a' }} /> },
        { key: 'short_position', label: 'Short',        icon: <TrendingDown size={13} style={{ color: '#ff3366' }} /> },
    ],
];

export function DrawingToolbar({ activeTool, onSelectTool }: DrawingToolbarProps) {
    return (
        <div
            style={{
                width: 30,
                flexShrink: 0,
                background: BG,
                borderRight: `1px solid ${BORDER}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: 4,
                gap: 0,
                overflowY: 'auto',
                fontFamily: "'JetBrains Mono', monospace",
            }}
        >
            {TOOL_GROUPS.map((group, gi) => (
                <div key={gi} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {gi > 0 && (
                        <div style={{ width: 20, height: 1, background: BORDER, margin: '3px 0' }} />
                    )}
                    {group.map(tool => {
                        const isActive = activeTool === tool.key;
                        return (
                            <button
                                key={tool.key}
                                title={tool.label}
                                onClick={() => onSelectTool(isActive ? null : tool.key)}
                                style={{
                                    width: 26,
                                    height: 26,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: isActive ? `${CYAN}22` : 'transparent',
                                    border: `1px solid ${isActive ? CYAN : 'transparent'}`,
                                    borderRadius: 3,
                                    color: isActive ? CYAN : TEXT,
                                    cursor: 'pointer',
                                    margin: '1px 0',
                                    padding: 0,
                                    transition: 'all 0.1s',
                                }}
                            >
                                {tool.icon}
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
