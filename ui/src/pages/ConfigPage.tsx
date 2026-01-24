import { useState, useEffect } from 'react';
import { useWorkspaceStore, AVAILABLE_WIDGETS, type WidgetType } from '../stores/workspaceStore';
import { Panel } from '../components/common/Panel';

export function ConfigPage() {
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('main');

  // Use the hook properly - this subscribes to the whole store
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const openWorkspaceIds = useWorkspaceStore((s) => s.openWorkspaceIds);
  const addWorkspace = useWorkspaceStore((s) => s.addWorkspace);
  const removeWorkspace = useWorkspaceStore((s) => s.removeWorkspace);
  const toggleWidget = useWorkspaceStore((s) => s.toggleWidget);
  const markWorkspaceOpen = useWorkspaceStore((s) => s.markWorkspaceOpen);
  const markWorkspaceClosed = useWorkspaceStore((s) => s.markWorkspaceClosed);

  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);

  const handleToggle = (widgetType: WidgetType) => {
    toggleWidget(selectedWorkspaceId, widgetType);
    window.electronAPI?.notifyWorkspaceUpdated(selectedWorkspaceId);
  };

  const handleAddWorkspace = () => {
    if (newWorkspaceName.trim()) {
      const id = addWorkspace(newWorkspaceName.trim());
      setSelectedWorkspaceId(id);
      setNewWorkspaceName('');
    }
  };

  const handleOpenWorkspaceWindow = (workspaceId: string) => {
    markWorkspaceOpen(workspaceId);
    window.electronAPI?.openWorkspace(workspaceId);
  };

  const isOpen = (id: string) => openWorkspaceIds.has(id);

  useEffect(() => {
    const handleClosed = (workspaceId: string) => {
      markWorkspaceClosed(workspaceId);
    };
    window.electronAPI?.onWorkspaceClosed(handleClosed);
  }, [markWorkspaceClosed]);

  return (
    <div className="flex-1 p-4 overflow-auto">
      <h1 className="font-pixel text-sm text-terminal-cyan mb-6">{'>'} CONFIGURATION</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="TERMINAL WINDOWS">
          <div className="p-3 space-y-2">
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                onClick={() => setSelectedWorkspaceId(workspace.id)}
                className={`
                  p-3 rounded cursor-pointer flex items-center justify-between
                  ${workspace.id === selectedWorkspaceId 
                    ? 'bg-terminal-cyan/20 border border-terminal-cyan' 
                    : 'bg-terminal-border/30 border border-transparent hover:border-terminal-border'
                  }
                `}
              >
                <div>
                  <div className="text-sm font-medium">{workspace.name}</div>
                  <div className="text-xs text-terminal-muted">
                    {workspace.widgets.length} widgets
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {workspace.id !== 'main' && (
                    <>
                      {!isOpen(workspace.id) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenWorkspaceWindow(workspace.id);
                          }}
                          className="px-2 py-1 text-xs text-terminal-cyan hover:bg-terminal-cyan/20 rounded"
                          title="Open in new window"
                        >
                          ⧉ Open
                        </button>
                      )}
                      {isOpen(workspace.id) && (
                        <span className="px-2 py-1 text-xs text-terminal-muted">
                          ● Open
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeWorkspace(workspace.id);
                          if (selectedWorkspaceId === workspace.id) {
                            setSelectedWorkspaceId('main');
                          }
                        }}
                        className="px-2 py-1 text-xs text-terminal-red hover:bg-terminal-red/20 rounded"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            <div className="flex gap-2 mt-4 pt-4 border-t border-terminal-border">
              <input
                type="text"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="New terminal name..."
                className="flex-1 bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm focus:border-terminal-cyan outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleAddWorkspace()}
              />
              <button
                onClick={handleAddWorkspace}
                disabled={!newWorkspaceName.trim()}
                className="px-4 py-2 bg-terminal-cyan/20 border border-terminal-cyan rounded text-terminal-cyan text-sm hover:bg-terminal-cyan/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Add
              </button>
            </div>
          </div>
        </Panel>

        <Panel title={`WIDGETS - ${selectedWorkspace?.name || ''}`}>
          <div className="p-3">
            <p className="text-xs text-terminal-muted mb-4">
              Select which widgets to show in this terminal:
            </p>
            
            <div className="space-y-2">
              {AVAILABLE_WIDGETS.map((widget) => {
                const isChecked = selectedWorkspace?.widgets.some(w => w.type === widget.type) ?? false;
                return (
                  <label
                    key={widget.type}
                    className={`
                      flex items-center gap-3 p-3 rounded cursor-pointer border transition-colors
                      ${isChecked
                        ? 'bg-terminal-cyan/10 border-terminal-cyan'
                        : 'bg-terminal-surface border-terminal-border hover:border-terminal-muted'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggle(widget.type)}
                      className="w-4 h-4 accent-terminal-cyan"
                    />
                    <span className="text-xl">{widget.icon}</span>
                    <span className="text-sm">{widget.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}