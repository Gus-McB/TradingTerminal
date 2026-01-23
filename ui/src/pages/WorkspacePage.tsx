import { useParams } from 'react-router-dom';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { WidgetTitleBar } from '../components/common/WidgetTitleBar';
import { DynamicContentArea } from '../components/layout/DynamicContentArea';

export function WorkspacePage() {
  const { workspaceId } = useParams();
  const workspace = useWorkspaceStore((state) => 
    state.workspaces.find(w => w.id === workspaceId)
  );

  if (!workspace) {
    return (
      <div className="h-screen bg-terminal-bg flex items-center justify-center">
        <div className="text-terminal-muted font-pixel text-xs">
          Workspace not found
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-terminal-bg text-terminal-text overflow-hidden">
      <WidgetTitleBar title={workspace.name} />
      <div className="flex-1 overflow-hidden">
        <DynamicContentArea workspaceId={workspace.id} />
      </div>
    </div>
  );
}