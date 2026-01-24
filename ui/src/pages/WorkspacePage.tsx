import { useParams } from 'react-router-dom';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { WidgetTitleBar } from '../components/common/WidgetTitleBar';
import { DynamicContentArea } from '../components/layout/DynamicContentArea';
import { useEffect, useState } from 'react';

export function WorkspacePage() {
  const { workspaceId } = useParams();
  const [isHydrated, setIsHydrated] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const workspace = useWorkspaceStore((state) => 
    state.workspaces.find(w => w.id === workspaceId)
  );

  // Wait for store to hydrate from localStorage
  useEffect(() => {
    const unsub = useWorkspaceStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });
    
    if (useWorkspaceStore.persist.hasHydrated()) {
      setIsHydrated(true);
    }
    
    return unsub;
  }, []);

  // Listen for refresh signals from main window
  useEffect(() => {
    const handleRefresh = (updatedWorkspaceId: string) => {
      if (updatedWorkspaceId === workspaceId) {
        // Force re-read from localStorage and re-render
        useWorkspaceStore.persist.rehydrate();
        setRefreshKey(k => k + 1);
      }
    };
    
    window.electronAPI?.onWorkspaceRefresh(handleRefresh);
  }, [workspaceId]);

  if (!isHydrated) {
    return (
      <div className="h-screen bg-terminal-bg flex items-center justify-center">
        <div className="text-terminal-muted font-pixel text-xs">Loading...</div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="h-screen bg-terminal-bg flex items-center justify-center">
        <div className="text-terminal-muted font-pixel text-xs">Workspace not found</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-terminal-bg text-terminal-text overflow-hidden">
      <WidgetTitleBar title={workspace.name} />
      <div className="flex-1 overflow-hidden">
        <DynamicContentArea key={refreshKey} workspaceId={workspace.id} />
      </div>
    </div>
  );
}