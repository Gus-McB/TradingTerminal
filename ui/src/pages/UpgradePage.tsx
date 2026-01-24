import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

export function UpgradePage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    return (
        <div className="h-screen bg-terminal-bg flex items-center justify-center">
            <div className="bg-terminal-surface p-8 rounded-lg border border-terminal-border max-w-md">
                <h1 className="font-pixel text-terminal-cyan text-sm mb-4">UPGRADE REQUIRED</h1>
                
                <p className="text-terminal-text mb-6">
                    Your current plan ({user?.role || 'free'}) doesn't include access to this feature.
                    Upgrade to unlock premium capabilities.
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => {/* Handle upgrade */}}
                        className="w-full p-3 bg-terminal-cyan/20 border border-terminal-cyan rounded"
                    >
                        Upgrade to Premium
                    </button>
                    
                    <button
                        onClick={() => navigate(-1)}
                        className="w-full p-3 bg-terminal-surface border border-terminal-border rounded"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    );
}