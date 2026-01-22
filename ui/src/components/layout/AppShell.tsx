import { Sidebar } from "./SideBar";
import { TitleBar } from "./TitleBar";


export function AppShell() {
    return (
        <div className="h-screen flex flex-col bg-terminal-bg text-terminal-text overflow-hidden">
            <TitleBar />
            <div className="flex-1 flex overflow-hidden">
                <Sidebar />
            </div>
        </div>
    );
}