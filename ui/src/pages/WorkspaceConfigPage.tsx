/**
 * WorkspaceConfigPage — full-screen workspace management + global terminal settings.
 * Replaces the old ConfigPage. Accessible from the navbar config button.
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Copy, Download, Upload, Trash2, Edit2, ArrowLeft,
    Settings, LayoutDashboard, Keyboard, Save,
} from 'lucide-react';

import { useWorkspaceStore, WORKSPACE_TEMPLATES } from '../stores/workspaceStore';
import { LayoutThumbnail } from '../components/LayoutThumbnail';
import { useTerminal } from '../context/TerminalContext';

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = 'workspaces' | 'settings' | 'hotkeys';

// ─── Hotkeys reference ────────────────────────────────────────────────────────

const HOTKEYS = [
    { key: 'Ctrl+E',     action: 'Toggle Edit Mode' },
    { key: 'Ctrl+S',     action: 'Save Layout' },
    { key: 'Ctrl+Z',     action: 'Discard Changes' },
    { key: 'Ctrl+N',     action: 'New Workspace' },
    { key: 'Ctrl+D',     action: 'Duplicate Workspace' },
    { key: 'Ctrl+/','action': 'Command Bar Focus' },
    { key: 'Esc',        action: 'Close Panel / Cancel' },
    { key: '1–9',        action: 'Switch to Workspace N' },
];

// ─── Global terminal settings (local state, not persisted in this demo) ───────

interface GlobalSettings {
    defaultSymbol:  string;
    defaultAccount: string;
    snapResolution: 'fine' | 'normal' | 'coarse';
    autoSave:       'off' | '1min' | '5min' | '10min';
}

// ─── Template card ────────────────────────────────────────────────────────────

const TEMPLATE_COLORS: Record<string, string> = {
    blank:            '#4a4a5a',
    dayTrader:        '#00a8ff',
    optionsTrader:    '#00ff6a',
    portfolioMonitor: '#ffaa00',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkspaceConfigPage() {
    const navigate  = useNavigate();
    const { state, setSymbol, setTheme } = useTerminal();

    const {
        workspaces, activeWorkspaceId,
        addWorkspace, removeWorkspace, renameWorkspace, duplicateWorkspace,
        exportWorkspace, importWorkspace, setActiveWorkspace,
    } = useWorkspaceStore();

    const [activeTab,    setActiveTab]    = useState<Tab>('workspaces');
    const [renamingId,   setRenamingId]   = useState<string | null>(null);
    const [renameValue,  setRenameValue]  = useState('');
    const [showTemplate, setShowTemplate] = useState(false);
    const [settings,     setSettings]     = useState<GlobalSettings>({
        defaultSymbol:  'BTC/USD',
        defaultAccount: 'U1234567',
        snapResolution: 'normal',
        autoSave:       '5min',
    });

    const importRef = useRef<HTMLInputElement>(null);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleRenameStart = (id: string, name: string) => {
        setRenamingId(id);
        setRenameValue(name);
    };

    const handleRenameConfirm = () => {
        if (renamingId && renameValue.trim()) {
            renameWorkspace(renamingId, renameValue.trim());
        }
        setRenamingId(null);
    };

    const handleExport = (id: string, name: string) => {
        const json = exportWorkspace(id);
        const blob = new Blob([json], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `${name.replace(/\s+/g, '_')}.workspace.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = () => importRef.current?.click();

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const json = ev.target?.result as string;
            const id = importWorkspace(json);
            if (!id) alert('Invalid workspace file.');
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleOpen = (id: string) => {
        setActiveWorkspace(id);
        navigate('/');
    };

    const handleDelete = (id: string, name: string) => {
        if (workspaces.length <= 1) return alert('Cannot delete the last workspace.');
        if (window.confirm(`Delete workspace "${name}"?`)) removeWorkspace(id);
    };

    // ─── Render ──────────────────────────────────────────────────────────────

    const labelStyle: React.CSSProperties = { fontSize: 10, color: '#6a6a7a', letterSpacing: '0.1em', marginBottom: 6 };
    const inputStyle: React.CSSProperties = {
        background: '#0d0f12', border: '1px solid #2a2a3a', color: '#e0e0e8',
        fontSize: 12, padding: '6px 10px', width: '100%', outline: 'none',
        fontFamily: 'monospace',
    };
    const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

    return (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0a0a0f', color: '#e0e0e8' }}>

            {/* Page header */}
            <div
                className="flex items-center gap-3 px-6 py-3 shrink-0"
                style={{ background: '#0d0f12', borderBottom: '1px solid #2a2a3a' }}
            >
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-1.5"
                    style={{ fontSize: 11, color: '#6a6a7a' }}
                >
                    <ArrowLeft size={13} /> Back
                </button>
                <div style={{ width: 1, height: 16, background: '#2a2a3a' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#e0e0e8', letterSpacing: '0.1em' }}>
                    WORKSPACE MANAGER
                </span>
            </div>

            {/* Tabs */}
            <div
                className="flex shrink-0"
                style={{ borderBottom: '1px solid #2a2a3a', background: '#0a0c0f' }}
            >
                {([
                    ['workspaces', 'My Workspaces',     LayoutDashboard],
                    ['settings',   'Terminal Settings', Settings],
                    ['hotkeys',    'Hotkeys',            Keyboard],
                ] as [Tab, string, React.ComponentType<{size?: number}>][]).map(([id, label, Icon]) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className="flex items-center gap-2 px-5 py-2.5"
                        style={{
                            fontSize: 11, fontWeight: 600,
                            color:    activeTab === id ? '#00f0ff' : '#6a6a7a',
                            borderBottom: activeTab === id ? '2px solid #00f0ff' : '2px solid transparent',
                            background: 'transparent',
                        }}
                    >
                        <Icon size={12} /> {label}
                    </button>
                ))}

                <div className="ml-auto flex items-center px-4 gap-2">
                    <button
                        onClick={handleImport}
                        className="flex items-center gap-1.5 px-3 py-1.5"
                        style={{ fontSize: 10, color: '#6a6a7a', border: '1px solid #2a2a3a', background: 'transparent' }}
                    >
                        <Upload size={11} /> Import
                    </button>
                    <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
                </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto p-6">

                {/* ── MY WORKSPACES ────────────────────────────────────── */}
                {activeTab === 'workspaces' && (
                    <div>
                        {/* Create new CTA */}
                        <div className="flex items-center justify-between mb-6">
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#e0e0e8' }}>
                                {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}
                            </span>
                            <button
                                onClick={() => setShowTemplate(v => !v)}
                                className="flex items-center gap-2 px-4 py-2"
                                style={{
                                    background: '#00a8ff', color: '#000',
                                    fontSize: 11, fontWeight: 700,
                                }}
                            >
                                <Plus size={13} /> New Workspace
                            </button>
                        </div>

                        {/* Template picker */}
                        {showTemplate && (
                            <div
                                className="mb-6 p-4"
                                style={{ background: '#12121a', border: '1px solid #2a2a3a' }}
                            >
                                <p style={{ fontSize: 11, color: '#6a6a7a', marginBottom: 12, letterSpacing: '0.1em' }}>
                                    SELECT TEMPLATE
                                </p>
                                <div className="grid grid-cols-2 gap-3" style={{ maxWidth: 600 }}>
                                    {Object.entries(WORKSPACE_TEMPLATES).map(([key, tpl]) => (
                                        <button
                                            key={key}
                                            onClick={() => {
                                                const name = window.prompt('Workspace name:', tpl.name);
                                                if (name?.trim()) {
                                                    addWorkspace(name.trim(), key);
                                                    setShowTemplate(false);
                                                }
                                            }}
                                            className="text-left p-3 flex flex-col gap-1"
                                            style={{
                                                background: '#0d0f12',
                                                borderLeft: `3px solid ${TEMPLATE_COLORS[key] ?? '#4a4a5a'}`,
                                                border: '1px solid #2a2a3a',
                                                borderLeftWidth: 3,
                                                borderLeftColor: TEMPLATE_COLORS[key] ?? '#4a4a5a',
                                            }}
                                        >
                                            <span style={{ fontSize: 12, fontWeight: 600, color: '#e0e0e8' }}>{tpl.name}</span>
                                            <span style={{ fontSize: 10, color: '#6a6a7a' }}>
                                                {tpl.widgets.length} widget{tpl.widgets.length !== 1 ? 's' : ''}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Workspace card grid */}
                        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                            {workspaces.map(ws => {
                                const isActive  = ws.id === activeWorkspaceId;
                                const isRenaming = renamingId === ws.id;
                                const updatedAt  = new Date(ws.updatedAt).toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                });

                                return (
                                    <div
                                        key={ws.id}
                                        className="flex flex-col overflow-hidden"
                                        style={{
                                            background: '#12121a',
                                            border: `1px solid ${isActive ? '#00a8ff55' : '#2a2a3a'}`,
                                            boxShadow: isActive ? '0 0 0 1px #00a8ff22' : 'none',
                                        }}
                                    >
                                        {/* Thumbnail */}
                                        <div style={{ background: '#0a0c0f', padding: 8, borderBottom: '1px solid #2a2a3a' }}>
                                            <LayoutThumbnail
                                                widgets={ws.layout.widgets}
                                                width={264}
                                                height={100}
                                            />
                                        </div>

                                        {/* Card body */}
                                        <div className="p-3 flex flex-col gap-2">
                                            {/* Name row */}
                                            <div className="flex items-center gap-2">
                                                {isRenaming ? (
                                                    <input
                                                        autoFocus
                                                        value={renameValue}
                                                        onChange={e => setRenameValue(e.target.value)}
                                                        onBlur={handleRenameConfirm}
                                                        onKeyDown={e => { if (e.key === 'Enter') handleRenameConfirm(); if (e.key === 'Escape') setRenamingId(null); }}
                                                        style={{ ...inputStyle, flex: 1, padding: '2px 6px', fontSize: 12 }}
                                                    />
                                                ) : (
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#e0e0e8', flex: 1 }}>
                                                        {ws.name}
                                                        {isActive && (
                                                            <span style={{ fontSize: 9, color: '#00a8ff', marginLeft: 6, verticalAlign: 'middle', letterSpacing: '0.1em' }}>
                                                                ACTIVE
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <span style={{ fontSize: 10, color: '#4a4a5a', fontFamily: 'monospace' }}>
                                                    {ws.layout.widgets.length} widgets
                                                </span>
                                                <span style={{ fontSize: 10, color: '#4a4a5a', fontFamily: 'monospace' }}>
                                                    {updatedAt}
                                                </span>
                                            </div>

                                            {/* Action buttons */}
                                            <div className="flex items-center gap-1 mt-1">
                                                <button
                                                    onClick={() => handleOpen(ws.id)}
                                                    className="flex-1 py-1.5"
                                                    style={{
                                                        fontSize: 10, fontWeight: 700,
                                                        background: '#00a8ff', color: '#000',
                                                    }}
                                                >
                                                    Open
                                                </button>
                                                <button
                                                    onClick={() => handleRenameStart(ws.id, ws.name)}
                                                    className="flex items-center justify-center"
                                                    style={{ width: 28, height: 28, color: '#6a6a7a', border: '1px solid #2a2a3a', background: 'transparent' }}
                                                    title="Rename"
                                                >
                                                    <Edit2 size={11} />
                                                </button>
                                                <button
                                                    onClick={() => duplicateWorkspace(ws.id)}
                                                    className="flex items-center justify-center"
                                                    style={{ width: 28, height: 28, color: '#6a6a7a', border: '1px solid #2a2a3a', background: 'transparent' }}
                                                    title="Duplicate"
                                                >
                                                    <Copy size={11} />
                                                </button>
                                                <button
                                                    onClick={() => handleExport(ws.id, ws.name)}
                                                    className="flex items-center justify-center"
                                                    style={{ width: 28, height: 28, color: '#6a6a7a', border: '1px solid #2a2a3a', background: 'transparent' }}
                                                    title="Export JSON"
                                                >
                                                    <Download size={11} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(ws.id, ws.name)}
                                                    className="flex items-center justify-center"
                                                    style={{ width: 28, height: 28, color: '#ff3366', border: '1px solid #ff336633', background: 'transparent' }}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={11} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── TERMINAL SETTINGS ────────────────────────────────── */}
                {activeTab === 'settings' && (
                    <div style={{ maxWidth: 480 }}>
                        <div className="flex flex-col gap-5">
                            <div>
                                <p style={labelStyle}>DEFAULT SYMBOL</p>
                                <input
                                    type="text"
                                    value={settings.defaultSymbol}
                                    onChange={e => setSettings(s => ({ ...s, defaultSymbol: e.target.value }))}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <p style={labelStyle}>DEFAULT ACCOUNT</p>
                                <select
                                    value={settings.defaultAccount}
                                    onChange={e => setSettings(s => ({ ...s, defaultAccount: e.target.value }))}
                                    style={selectStyle}
                                >
                                    <option value="U1234567">LIVE — #U1234567</option>
                                    <option value="U9999999">PAPER — #U9999999</option>
                                </select>
                            </div>
                            <div>
                                <p style={labelStyle}>THEME</p>
                                <div className="flex gap-2">
                                    {(['dark', 'light'] as const).map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setTheme(t)}
                                            className="px-4 py-2"
                                            style={{
                                                fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                                                background: state.theme === t ? '#00a8ff' : '#0d0f12',
                                                color:      state.theme === t ? '#000' : '#6a6a7a',
                                                border: '1px solid #2a2a3a',
                                            }}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p style={labelStyle}>GRID SNAP RESOLUTION</p>
                                <select
                                    value={settings.snapResolution}
                                    onChange={e => setSettings(s => ({ ...s, snapResolution: e.target.value as GlobalSettings['snapResolution'] }))}
                                    style={selectStyle}
                                >
                                    <option value="fine">Fine (1 col / 40px row)</option>
                                    <option value="normal">Normal (1 col / 80px row)</option>
                                    <option value="coarse">Coarse (2 col / 120px row)</option>
                                </select>
                            </div>
                            <div>
                                <p style={labelStyle}>AUTO-SAVE INTERVAL</p>
                                <select
                                    value={settings.autoSave}
                                    onChange={e => setSettings(s => ({ ...s, autoSave: e.target.value as GlobalSettings['autoSave'] }))}
                                    style={selectStyle}
                                >
                                    <option value="off">Off</option>
                                    <option value="1min">Every 1 minute</option>
                                    <option value="5min">Every 5 minutes</option>
                                    <option value="10min">Every 10 minutes</option>
                                </select>
                            </div>
                            <button
                                onClick={() => {
                                    setSymbol(settings.defaultSymbol);
                                    alert('Settings saved.');
                                }}
                                className="flex items-center gap-2 px-5 py-2.5 mt-2 w-fit"
                                style={{ background: '#00a8ff', color: '#000', fontSize: 11, fontWeight: 700 }}
                            >
                                <Save size={13} /> Save Settings
                            </button>
                        </div>
                    </div>
                )}

                {/* ── HOTKEYS ──────────────────────────────────────────── */}
                {activeTab === 'hotkeys' && (
                    <div style={{ maxWidth: 480 }}>
                        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #2a2a3a' }}>
                                    <th className="text-left pb-2" style={{ fontSize: 10, color: '#6a6a7a', letterSpacing: '0.1em', fontWeight: 600 }}>KEY</th>
                                    <th className="text-left pb-2" style={{ fontSize: 10, color: '#6a6a7a', letterSpacing: '0.1em', fontWeight: 600 }}>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {HOTKEYS.map(({ key, action }) => (
                                    <tr key={key} style={{ borderBottom: '1px solid #1a1a2a' }}>
                                        <td className="py-2 pr-8">
                                            <span
                                                style={{
                                                    fontFamily: 'monospace', fontSize: 11, fontWeight: 600,
                                                    color: '#00f0ff', background: '#001824',
                                                    padding: '2px 6px', border: '1px solid #00f0ff33',
                                                }}
                                            >
                                                {key}
                                            </span>
                                        </td>
                                        <td className="py-2" style={{ fontSize: 12, color: '#e0e0e8' }}>{action}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
