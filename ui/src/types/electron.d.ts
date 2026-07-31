export interface DisplayInfo {
  index: number;
  id: number;
  label: string;
  bounds: { x: number; y: number; width: number; height: number };
  workArea: { x: number; y: number; width: number; height: number };
  scaleFactor: number;
  primary: boolean;
}

export interface OpenWidgetWindowOptions {
  type: string;
  symbol?: string;
  /** Monitor to open on; omitted → remembered position, else primary */
  displayIndex?: number;
  /** Join a symbol link channel instead of pinning to one symbol */
  linkGroup?: string;
}

export interface OpenWorkspaceWindowOptions {
  workspaceId: string;
  displayIndex?: number;
}

/** State mirrored across every terminal window (Phase C) */
export interface TerminalStatePatch {
  activeSymbol?: string;
  linkGroups?: Record<string, string>;
  theme?: 'dark' | 'light';
  alert?: { type: string; message: string };
}

/** Masked view of a saved provider connection — never contains secrets. */
export interface ConnectionSummaryDto {
  id: string;
  providerId: string;
  label: string;
  environment: 'paper' | 'live';
  maskedFields: Record<string, string>;
  createdAt: string;
  lastTestedAt?: string;
  lastTestOk?: boolean;
  lastTestMessage?: string;
  active: boolean;
}

export interface ConnectionTestDto {
  ok: boolean;
  message: string;
  details?: Record<string, string>;
  connection?: ConnectionSummaryDto;
}

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;

      credentials: {
        isAvailable: () => Promise<{ available: boolean }>;
        list: () => Promise<ConnectionSummaryDto[]>;
        save: (input: {
          id?: string;
          providerId: string;
          label: string;
          environment: 'paper';
          fields: Record<string, string>;
          secretKeys: string[];
        }) => Promise<{ ok: boolean; connection?: ConnectionSummaryDto; error?: string }>;
        remove: (id: string) => Promise<{ ok: boolean }>;
        test: (id: string) => Promise<ConnectionTestDto>;
        setActive: (id: string, active: boolean) => Promise<{ connection?: ConnectionSummaryDto }>;
      };

      providers: {
        status: () => Promise<{
          sourceId: string; label: string; live: boolean; symbols: string[]; error?: string | null;
        }>;
        activate: (opts: { providerId: string; connectionId?: string }) => Promise<{
          ok: boolean; message?: string;
          status?: { sourceId: string; label: string; live: boolean; symbols: string[]; error?: string | null };
        }>;
        deactivate: () => Promise<{
          ok: boolean; message?: string;
          status?: { sourceId: string; label: string; live: boolean; symbols: string[]; error?: string | null };
        }>;
      };

      minimize: () => void;
      maximize: () => void;
      close: () => void;

      listDisplays: () => Promise<DisplayInfo[]>;
      openWidgetWindow: (opts: OpenWidgetWindowOptions) => Promise<{ ok: boolean }>;
      openWorkspaceWindow: (opts: OpenWorkspaceWindowOptions) => Promise<{ ok: boolean }>;
      listWindows: () => Promise<string[]>;
      closeWindow: (key: string) => void;

      onDisplaysChanged: (cb: (displays: DisplayInfo[]) => void) => () => void;
      onWindowsChanged: (cb: (keys: string[]) => void) => () => void;

      publishTerminalState: (patch: TerminalStatePatch) => void;
      onTerminalState: (cb: (patch: TerminalStatePatch) => void) => () => void;
      getTerminalSnapshot?: () => Promise<TerminalStatePatch | undefined>;

      // Legacy channels
      openWidget: (type: string, symbol: string) => void;
      openWorkspace: (workspaceId: string) => void;
      notifyWorkspaceUpdated: (workspaceId: string) => void;
      onWorkspaceRefresh: (cb: (workspaceId: string) => void) => () => void;
    };
  }
}

export {};
