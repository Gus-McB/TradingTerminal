/**
 * cloudSync — persists workspaces + alerts to Supabase (table: user_state,
 * schema in scripts/supabase-schema.sql).
 *
 * Strategy: single JSONB row per user. On real (session-backed) login the
 * cloud row is pulled and wins; afterwards every local change is pushed with
 * a debounce. Without a session (dev login / offline) everything keeps
 * working from localStorage — sync just stays off.
 */
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore, type Workspace } from '../stores/workspaceStore';
import { alertEngine, type UserAlert } from './alertEngine';

const TABLE = 'user_state';
const PUSH_DEBOUNCE_MS = 2000;

interface WorkspacesBlob {
    workspaces: Workspace[];
    activeWorkspaceId: string;
}

let started = false;
let currentUserId: string | null = null;
let applyingRemote = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let lastPushedJson = '';

function snapshot(): { workspaces: WorkspacesBlob; alerts: UserAlert[] } {
    const ws = useWorkspaceStore.getState();
    return {
        workspaces: { workspaces: ws.workspaces, activeWorkspaceId: ws.activeWorkspaceId },
        alerts: alertEngine.getAlerts(),
    };
}

function schedulePush(): void {
    if (!currentUserId || applyingRemote) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => void push(), PUSH_DEBOUNCE_MS);
}

async function push(): Promise<void> {
    if (!currentUserId) return;
    const state = snapshot();
    const json = JSON.stringify(state);
    if (json === lastPushedJson) return;

    const { error } = await supabase.from(TABLE).upsert({
        user_id: currentUserId,
        workspaces: state.workspaces,
        alerts: state.alerts,
        updated_at: new Date().toISOString(),
    });

    if (error) {
        // Table missing / offline — stay silent, localStorage still has everything
        console.warn('[cloudSync] push failed:', error.message);
    } else {
        lastPushedJson = json;
    }
}

async function pull(userId: string): Promise<void> {
    const { data, error } = await supabase
        .from(TABLE)
        .select('workspaces, alerts')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        console.warn('[cloudSync] pull failed:', error.message);
        return;
    }

    if (!data) {
        // First login on this project — seed the cloud with local state
        void push();
        return;
    }

    applyingRemote = true;
    try {
        const ws = data.workspaces as WorkspacesBlob | null;
        if (ws?.workspaces?.length) {
            const activeValid = ws.workspaces.some(w => w.id === ws.activeWorkspaceId);
            useWorkspaceStore.setState({
                workspaces: ws.workspaces,
                activeWorkspaceId: activeValid ? ws.activeWorkspaceId : ws.workspaces[0].id,
            });
        }
        if (Array.isArray(data.alerts)) {
            alertEngine.replaceAlerts(data.alerts as UserAlert[]);
        }
        lastPushedJson = JSON.stringify(snapshot());
        console.log('[cloudSync] state restored from Supabase');
    } finally {
        applyingRemote = false;
    }
}

function handleAuthChange(): void {
    const { user, session } = useAuthStore.getState();
    // Only sync for real Supabase sessions (dev login has no session)
    const userId = session && user ? user.id : null;
    if (userId === currentUserId) return;
    currentUserId = userId;
    lastPushedJson = '';
    if (userId) void pull(userId);
}

/** Idempotent — call once at app start. */
export function startCloudSync(): void {
    if (started) return;
    started = true;

    handleAuthChange();
    useAuthStore.subscribe(handleAuthChange);

    useWorkspaceStore.subscribe(schedulePush);
    alertEngine.subscribeChanges(schedulePush);
}
